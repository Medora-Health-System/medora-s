import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import {
  AuditAction,
  EncounterClinicalEventType,
  EncounterType,
  Prisma,
  RoleCode,
  TriageVitalsReadingStatus,
  type Triage,
} from "@prisma/client";
import { hasMeaningfulVitalMeasurement, resolveLatestMeaningfulVitalsReading } from "@medora/shared";
import { PatientClinicalHistoryService } from "../patients/patient-clinical-history.service";
import { buildVitalsRecordedPayloadJson } from "../utils/clinical-event-vitals.util";
import { computeDisplayNameInitials } from "../utils/clinical-event-nursing-assessment-json.util";
import {
  triageAssessmentSavedEventPayload,
  triageAssessmentSnapshotChanged,
} from "../utils/clinical-event-triage-assessment.util";
import { hasNonEmptyVitalsJson } from "../utils/patient-sex-map";
import {
  assertEncounterNotSigned,
  assertEncounterOpenForClinicalMutation,
} from "../encounters/encounter-sign-lock.util";
import {
  normalizeVitalsMeasurementContext,
  resolveMeasuredAt,
} from "../utils/vitals-measurement-context.util";
import { throwTriageConcurrentModification } from "./triage-concurrency.util";
import { ENCOUNTER_TRIAGE_SELECT } from "../encounters/encounter-query-contracts";

@Injectable()
export class TriageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly patientClinicalHistory: PatientClinicalHistoryService
  ) {}

  async getTriage(encounterId: string, facilityId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: ENCOUNTER_TRIAGE_SELECT,
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    const row = await this.prisma.triage.findUnique({
      where: { encounterId },
    });
    return this.enrichTriageWithDisplay(row);
  }

  /**
   * Project Patient.latestVitals* from newest ACTIVE meaningful reading only.
   * Context-only / empty rows (e.g. Room air alone) are excluded.
   */
  private async refreshPatientLatestMeaningfulVitals(patientId: string, facilityId: string) {
    const readings = await this.prisma.triageVitalsReading.findMany({
      where: {
        patientId,
        facilityId,
        status: TriageVitalsReadingStatus.ACTIVE,
      },
      orderBy: [{ measuredAt: "desc" }, { recordedAt: "desc" }],
      take: 40,
    });
    const newest = resolveLatestMeaningfulVitalsReading(readings);
    await this.prisma.patient.update({
      where: { id: patientId },
      data: {
        latestVitalsJson: newest ? (newest.vitalsJson as Prisma.InputJsonValue) : Prisma.DbNull,
        latestVitalsAt: newest ? newest.measuredAt : null,
      },
    });
  }

  /** Ajoute `updatedByDisplayFr` pour l’UI (sans changement de schéma). */
  private async enrichTriageWithDisplay(triage: Triage | null) {
    if (!triage) {
      return null;
    }
    if (!triage.updatedByUserId) {
      return triage;
    }
    const u = await this.prisma.user.findUnique({
      where: { id: triage.updatedByUserId },
      select: { firstName: true, lastName: true },
    });
    if (!u) {
      return { ...triage, updatedByDisplayFr: null };
    }
    return { ...triage, updatedByDisplayFr: `${u.firstName} ${u.lastName}`.trim() };
  }

  /**
   * Resolve performer identity (display name + role title + initials) for a TRIAGE_ASSESSMENT_SAVED
   * clinical event. Mirrors the priority used by the summary-document events on EncountersService
   * so reads across the chart are visually consistent: PROVIDER first, RN second, ADMIN third.
   * Triage at the bedside is most often documented by RN, but a provider re-documenting at
   * critical-event handoffs is supported and surfaces with a stable role title.
   *
   * Returns a snapshot with `null`/empty fallbacks if the user record cannot be loaded — the
   * event row is still written; absent identity simply renders as "—" in any future history view.
   */
  private async resolveTriagePerformer(
    facilityId: string,
    userId: string | null | undefined
  ): Promise<{
    performerId: string | null;
    performerDisplayName: string;
    performerRoleTitle: string;
    performerInitials: string;
  }> {
    if (!userId) {
      return {
        performerId: null,
        performerDisplayName: "",
        performerRoleTitle: "",
        performerInitials: "",
      };
    }
    const actor = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!actor) {
      return {
        performerId: userId,
        performerDisplayName: "",
        performerRoleTitle: "",
        performerInitials: "",
      };
    }
    const display = `${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim();
    const initials = computeDisplayNameInitials(display);

    const rows = await this.prisma.userRole.findMany({
      where: { userId, facilityId, isActive: true },
      select: { role: { select: { code: true } } },
    });
    const codes = new Set(rows.map((r) => r.role.code));
    const order: RoleCode[] = [RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN];
    let chosen: RoleCode | null = null;
    for (const rc of order) {
      if (codes.has(rc)) {
        chosen = rc;
        break;
      }
    }
    const title =
      chosen === RoleCode.PROVIDER
        ? "MD"
        : chosen === RoleCode.RN
        ? "RN"
        : chosen === RoleCode.ADMIN
        ? "ADMIN"
        : "";

    return {
      performerId: actor.id,
      performerDisplayName: display,
      performerRoleTitle: title,
      performerInitials: initials,
    };
  }

  async upsertTriage(
    encounterId: string,
    facilityId: string,
    data: {
      chiefComplaint?: string;
      onsetAt?: Date | null;
      esi?: number | null;
      vitalsJson?: any;
      strokeScreen?: any;
      sepsisScreen?: any;
      triageCompleteAt?: Date | null;
      /**
       * Optional optimistic-concurrency token (ISO string of the `Triage.updatedAt` the caller
       * loaded). When present AND the save would materially change non-vitals flat fields AND
       * the existing row's `updatedAt` no longer matches, we reject with 409. Vitals-only saves
       * and no-op saves bypass this guard so append-only vitals history is never blocked.
       * Older clients that don't send the token still work — the server simply doesn't enforce
       * the check (additive rollout). First-save (no existing triage row) also bypasses the
       * check because there is no prior content to overwrite.
       */
      lastKnownTriageUpdatedAt?: string | null;
      /** Clinician-selected clinical measurement time (distinct from server recordedAt). */
      measuredAt?: Date | string | null;
    },
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: ENCOUNTER_TRIAGE_SELECT,
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    assertEncounterOpenForClinicalMutation(encounter);
    assertEncounterNotSigned(encounter);

    let normalizedIncomingVitals: Record<string, unknown> | undefined;
    let resolvedMeasuredAt: Date | undefined;
    let createVitalsReading = false;
    if (data.vitalsJson !== undefined && hasNonEmptyVitalsJson(data.vitalsJson)) {
      const rawVitals =
        data.vitalsJson && typeof data.vitalsJson === "object" && !Array.isArray(data.vitalsJson)
          ? (data.vitalsJson as Record<string, unknown>)
          : {};
      const measuredAtFromJson = rawVitals.measuredAt;
      const measuredAtExplicit =
        (data.measuredAt !== undefined && data.measuredAt !== null && data.measuredAt !== "") ||
        (measuredAtFromJson != null && measuredAtFromJson !== "");
      normalizedIncomingVitals = normalizeVitalsMeasurementContext(rawVitals);
      resolvedMeasuredAt = resolveMeasuredAt(
        data.measuredAt !== undefined && data.measuredAt !== null
          ? data.measuredAt
          : measuredAtFromJson
      );
      data.vitalsJson = normalizedIncomingVitals;
      // Require an explicit measuredAt so full Save triage that only preserves prior vitalsJson
      // does not append a duplicate TriageVitalsReading.
      createVitalsReading =
        measuredAtExplicit && hasMeaningfulVitalMeasurement(normalizedIncomingVitals);
    }

    const existing = await this.prisma.triage.findUnique({
      where: { encounterId },
    });

    // Context-only / empty vital payloads must not wipe a meaningful triage snapshot or spawn readings.
    // Independent Save vitals always sends measuredAt — reject empty measurement sets with 400.
    if (
      data.vitalsJson !== undefined &&
      normalizedIncomingVitals &&
      !hasMeaningfulVitalMeasurement(normalizedIncomingVitals)
    ) {
      if (data.measuredAt !== undefined && data.measuredAt !== null) {
        throw new BadRequestException(
          "Enter at least one vital-sign measurement before saving."
        );
      }
      if (existing && hasMeaningfulVitalMeasurement(existing.vitalsJson)) {
        data.vitalsJson = existing.vitalsJson as object;
      } else if (existing?.vitalsJson != null) {
        data.vitalsJson = existing.vitalsJson as object;
      } else {
        data.vitalsJson = null;
      }
      createVitalsReading = false;
      normalizedIncomingVitals = undefined;
    }

    /**
     * Optimistic-concurrency guard for non-vitals triage flat fields (multi-user safety).
     *
     * Pre-existing behavior: triage upsert is a single-row last-writer-wins operation. Two
     * users opening the same triage and saving in parallel could silently overwrite each
     * other's `chiefComplaint`, `esi`, `strokeScreen`, `sepsisScreen`, `onsetAt`, or
     * `triageCompleteAt`. ESI and screening flags are clinical-priority drivers — silent
     * overwrite is unsafe.
     *
     * New behavior: when the caller sends `lastKnownTriageUpdatedAt` AND a triage row already
     * exists AND the candidate save would materially change non-vitals flat fields AND the
     * stored `updatedAt` no longer matches the token, we throw a 409 with code
     * `TRIAGE_CONCURRENT_MODIFICATION`. The frontend prompts the user to refresh; the local
     * draft is preserved so no work is lost.
     *
     * Vitals are intentionally excluded from this check — they already have an append-only
     * history (`TriageVitalsReading` + `VITALS_RECORDED`) and merging is done by the caller
     * against the latest server state. A vitals-only save (no flat-field change) skips the
     * guard so the quick-vitals editor and re-fetched bedside flow continue to work even when
     * a token mismatch would otherwise trip.
     *
     * No-op saves (no flat-field change) also skip the guard to avoid spurious 409s on a
     * client that simply re-saves the loaded form.
     *
     * No schema/migration changes: `Triage.updatedAt` (`@updatedAt`) already exists.
     */
    if (existing && typeof data.lastKnownTriageUpdatedAt === "string" && data.lastKnownTriageUpdatedAt.trim()) {
      const candidateNext = {
        chiefComplaint:
          data.chiefComplaint !== undefined ? data.chiefComplaint : existing.chiefComplaint,
        esi: data.esi !== undefined ? data.esi : existing.esi,
        onsetAt: data.onsetAt !== undefined ? data.onsetAt : existing.onsetAt,
        strokeScreen:
          data.strokeScreen !== undefined ? data.strokeScreen : existing.strokeScreen,
        sepsisScreen:
          data.sepsisScreen !== undefined ? data.sepsisScreen : existing.sepsisScreen,
        triageCompleteAt:
          data.triageCompleteAt !== undefined ? data.triageCompleteAt : existing.triageCompleteAt,
      };
      const flatFieldsChanging = triageAssessmentSnapshotChanged(existing, candidateNext);
      if (flatFieldsChanging) {
        const existingIso = existing.updatedAt.toISOString();
        if (existingIso !== data.lastKnownTriageUpdatedAt.trim()) {
          throwTriageConcurrentModification();
        }
      }
    }

    const triageData: any = {
      encounterId,
      facilityId,
      chiefComplaint: data.chiefComplaint,
      onsetAt: data.onsetAt,
      esi: data.esi,
      vitalsJson: data.vitalsJson,
      strokeScreen: data.strokeScreen,
      sepsisScreen: data.sepsisScreen,
      triageCompleteAt: data.triageCompleteAt,
      updatedByUserId: userId,
    };

    if (!existing) {
      triageData.createdByUserId = userId;
    }

    const triage = await this.prisma.triage.upsert({
      where: { encounterId },
      update: triageData,
      create: triageData,
    });

    if (createVitalsReading && normalizedIncomingVitals && resolvedMeasuredAt) {
      if (!userId) {
        throw new BadRequestException("Authenticated user required to record vital signs");
      }
      await this.prisma.triageVitalsReading.create({
        data: {
          facilityId,
          patientId: encounter.patientId,
          encounterId,
          triageId: triage.id,
          vitalsJson: normalizedIncomingVitals as object,
          triageCompleteAt: data.triageCompleteAt ?? null,
          measuredAt: resolvedMeasuredAt,
          recordedByUserId: userId,
        },
      });
      await this.prisma.encounterClinicalEvent.create({
        data: {
          facilityId,
          encounterId,
          patientId: encounter.patientId,
          eventType: EncounterClinicalEventType.VITALS_RECORDED,
          payloadJson: buildVitalsRecordedPayloadJson(
            normalizedIncomingVitals,
            normalizedIncomingVitals.recordingContext === "NURSING_DISCHARGE"
              ? "NURSING_DISCHARGE"
              : "TRIAGE"
          ),
          createdByUserId: userId,
        },
      });
    }

    await this.refreshPatientLatestMeaningfulVitals(encounter.patientId, facilityId);

    /**
     * Append-only TRIAGE_ASSESSMENT_SAVED event lifecycle (multi-user safety, S15D).
     *
     * Pre-existing behavior: `Triage` is a single row per encounter (encounterId is unique) and
     * the upsert above replaces all flat fields in place — last writer wins. Only the most
     * recent `updatedByUserId` is preserved on the row. Vitals already have their own append-
     * only history (`TriageVitalsReading` rows + `VITALS_RECORDED` events), but the other
     * triage flat fields (chief complaint, ESI, stroke screen, sepsis screen, onset time,
     * triage-complete timestamp) had NO recoverable history before this PR. ESI level and
     * legal screening results are clinical-priority drivers; silent overwrite by a second user
     * is unsafe.
     *
     * New behavior: every triage upsert that materially changes a non-vitals flat field writes
     * an INSERT-only EncounterClinicalEvent row with the post-upsert snapshot and a denormalized
     * performer identity snapshot. Vitals are intentionally excluded from this event to avoid
     * duplication with the existing VITALS_RECORDED history.
     *
     * INSERT-only by design: there is no UPDATE branch and no caller path mutates these rows. A
     * vitals-only save (no flat-field change) does NOT emit a triage-assessment event — the
     * vitals event already carries the per-reading history. A no-op save (no field change) does
     * NOT emit an event either, to avoid timeline noise.
     */
    if (userId && triageAssessmentSnapshotChanged(existing, triage)) {
      const performer = await this.resolveTriagePerformer(facilityId, userId);
      await this.prisma.encounterClinicalEvent.create({
        data: {
          facilityId,
          encounterId,
          patientId: encounter.patientId,
          eventType: EncounterClinicalEventType.TRIAGE_ASSESSMENT_SAVED,
          payloadJson: triageAssessmentSavedEventPayload({
            snapshot: {
              chiefComplaint: triage.chiefComplaint,
              esi: triage.esi,
              onsetAt: triage.onsetAt,
              strokeScreen: triage.strokeScreen,
              sepsisScreen: triage.sepsisScreen,
              triageCompleteAt: triage.triageCompleteAt,
            },
            savedAt: new Date(),
            performerId: performer.performerId,
            performerDisplayName: performer.performerDisplayName,
            performerRoleTitle: performer.performerRoleTitle,
            performerInitials: performer.performerInitials,
          }),
          createdByUserId: userId,
        },
      });
    }

    await this.audit.log(AuditAction.TRIAGE_SAVE, "TRIAGE", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId,
      entityId: triage.id,
      ip,
      userAgent,
      metadata: { esi: data.esi, complete: !!data.triageCompleteAt },
    });

    let clinicalHistoryReconciliation = null;
    if (encounter.type === EncounterType.EMERGENCY && data.vitalsJson !== undefined) {
      clinicalHistoryReconciliation = await this.patientClinicalHistory.reconcileFromEncounterTriage({
        patientId: encounter.patientId,
        facilityId,
        encounterId,
        encounterDate: triage.updatedAt.toISOString(),
        vitalsJson: data.vitalsJson,
        reviewerId: userId,
        ip,
        userAgent,
      });
    }

    const enriched = await this.enrichTriageWithDisplay(triage);
    return clinicalHistoryReconciliation
      ? { ...enriched, clinicalHistoryReconciliation }
      : enriched;
  }
}

