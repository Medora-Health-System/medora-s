import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { AuditAction, EncounterClinicalEventType, RoleCode, type Triage } from "@prisma/client";
import { buildVitalsRecordedPayloadJson } from "../utils/clinical-event-vitals.util";
import { computeDisplayNameInitials } from "../utils/clinical-event-nursing-assessment-json.util";
import {
  triageAssessmentSavedEventPayload,
  triageAssessmentSnapshotChanged,
} from "../utils/clinical-event-triage-assessment.util";
import { hasNonEmptyVitalsJson } from "../utils/patient-sex-map";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";

@Injectable()
export class TriageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async getTriage(encounterId: string, facilityId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    const row = await this.prisma.triage.findUnique({
      where: { encounterId },
    });
    return this.enrichTriageWithDisplay(row);
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
    },
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      include: { patient: true },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    assertEncounterNotSigned(encounter);

    const existing = await this.prisma.triage.findUnique({
      where: { encounterId },
    });

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

    if (data.vitalsJson !== undefined && hasNonEmptyVitalsJson(data.vitalsJson)) {
      await this.prisma.triageVitalsReading.create({
        data: {
          facilityId,
          patientId: encounter.patientId,
          encounterId,
          triageId: triage.id,
          vitalsJson: data.vitalsJson as object,
          triageCompleteAt: data.triageCompleteAt ?? null,
        },
      });
      await this.prisma.patient.update({
        where: { id: encounter.patientId },
        data: {
          latestVitalsJson: data.vitalsJson as object,
          latestVitalsAt: new Date(),
        },
      });
      if (userId) {
        await this.prisma.encounterClinicalEvent.create({
          data: {
            facilityId,
            encounterId,
            patientId: encounter.patientId,
            eventType: EncounterClinicalEventType.VITALS_RECORDED,
            payloadJson: buildVitalsRecordedPayloadJson(
              data.vitalsJson as Record<string, unknown>,
              "TRIAGE"
            ),
            createdByUserId: userId,
          },
        });
      }
    }

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

    return this.enrichTriageWithDisplay(triage);
  }
}

