/**
 * INP.DIS.1D — Governed nursing inpatient discharge execution API.
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AuditAction,
  EncounterClinicalEventType,
  EncounterStatus,
  EncounterType,
  Prisma,
  RoleCode,
} from "@prisma/client";
import {
  assertSameClinicalAuthor,
  buildClinicalAuthorSnapshotPersist,
  buildProviderDispositionSnapshot,
  detectProviderDispositionMismatch,
  emptyInpatientNursingDischarge,
  hasPatientInstructionsInSummary,
  hydrateInpatientNursingDischarge,
  isMedReconCompleteInSummary,
  mergeInpatientNursingDischargeIntoDischargeSummary,
  nursingRequiresProviderFinalize,
  projectInpatientNursingDischargeReadiness,
  readInpatientNursingDischargeFromSummary,
  readProviderDischargeFromSummary,
  sanitizeInpatientNursingDischargeClientPayload,
  validateInpatientNursingDischarge,
  type InpatientNursingDischargeSaveMode,
  type InpatientNursingDischargeV1D,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import {
  dischargeSummarySavedEventPayload,
  dischargeSummarySnapshotChanged,
} from "../utils/clinical-event-discharge-summary.util";

export type InpatientNursingDischargeActor = {
  userId: string;
  facilityId: string;
  role: RoleCode;
};

export const INPATIENT_NURSING_DISCHARGE_NOT_AUTHOR = "INPATIENT_NURSING_DISCHARGE_NOT_AUTHOR";

@Injectable()
export class InpatientNursingDischargeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private async resolveAuthorSnapshot(actor: InpatientNursingDischargeActor) {
    const [user, roles] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: actor.userId },
        select: { firstName: true, lastName: true },
      }),
      this.prisma.userRole.findMany({
        where: { userId: actor.userId, facilityId: actor.facilityId, isActive: true },
        select: { professionCode: true },
      }),
    ]);
    return buildClinicalAuthorSnapshotPersist({
      userId: actor.userId,
      firstName: user?.firstName,
      lastName: user?.lastName,
      professionCodes: roles.map((r) => r.professionCode),
      roleCode: actor.role,
    });
  }

  private async loadInpatientEncounter(facilityId: string, encounterId: string) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        facilityId: true,
        patientId: true,
        type: true,
        status: true,
        dischargeSummaryJson: true,
      },
    });
    if (!enc) throw new NotFoundException("Encounter not found");
    if (enc.type !== EncounterType.INPATIENT) {
      throw new BadRequestException("Inpatient nursing discharge requires an Inpatient encounter");
    }
    return enc;
  }

  private requireNurseWrite(actor: InpatientNursingDischargeActor) {
    if (actor.role !== RoleCode.RN) {
      throw new ForbiddenException("INPATIENT_NURSING_DISCHARGE_RN_ONLY");
    }
  }

  private buildContext(enc: {
    dischargeSummaryJson: unknown;
    status: EncounterStatus;
  }, actor: InpatientNursingDischargeActor) {
    const documentation =
      readInpatientNursingDischargeFromSummary(enc.dischargeSummaryJson) ??
      emptyInpatientNursingDischarge();
    const provider = readProviderDischargeFromSummary(enc.dischargeSummaryJson);
    const medReconComplete = isMedReconCompleteInSummary(enc.dischargeSummaryJson);
    const instructionsAvailable = hasPatientInstructionsInSummary(enc.dischargeSummaryJson);
    const mismatch = detectProviderDispositionMismatch({ nursing: documentation, provider });
    const nursingWithMismatch: InpatientNursingDischargeV1D = {
      ...documentation,
      dispositionMismatch: mismatch,
    };
    const readiness = projectInpatientNursingDischargeReadiness({
      nursing: nursingWithMismatch,
      provider,
      medReconComplete,
      instructionsAvailable,
    });
    const providerFinalized = Boolean(provider?.providerDocumentationFinalizedAt);
    const dispositionCode = provider?.finalDisposition?.code ?? null;

    const summaryRoot =
      enc.dischargeSummaryJson &&
      typeof enc.dischargeSummaryJson === "object" &&
      !Array.isArray(enc.dischargeSummaryJson)
        ? (enc.dischargeSummaryJson as Record<string, unknown>)
        : {};
    const medReconRaw =
      summaryRoot.inpatientMedRecon &&
      typeof summaryRoot.inpatientMedRecon === "object" &&
      !Array.isArray(summaryRoot.inpatientMedRecon)
        ? (summaryRoot.inpatientMedRecon as Record<string, unknown>)
        : null;
    const medicationReconciliationLines = Array.isArray(medReconRaw?.lines)
      ? (medReconRaw!.lines as unknown[])
      : [];
    const medicationReconciliationFinalizedAt =
      typeof medReconRaw?.finalizedAt === "string" ? medReconRaw.finalizedAt : null;

    return {
      documentation: nursingWithMismatch,
      provider,
      providerFinalDisposition: provider?.finalDisposition ?? null,
      providerFinalized,
      providerDispositionSnapshot: buildProviderDispositionSnapshot(provider),
      medicationReconciliationStatus:
        medReconComplete === true
          ? "COMPLETE"
          : medReconComplete === false
            ? "INCOMPLETE"
            : "UNKNOWN",
      /** INP.DIS.1G.1 — expose saved discharge recon lines for board preload/reload. */
      medicationReconciliationLines,
      medicationReconciliationFinalizedAt,
      instructionsAvailable,
      readiness,
      canAuthor: actor.role === RoleCode.RN && enc.status === EncounterStatus.OPEN,
      canComplete:
        actor.role === RoleCode.RN &&
        enc.status === EncounterStatus.OPEN &&
        !mismatch?.detected &&
        (providerFinalized || !nursingRequiresProviderFinalize(dispositionCode)),
      revision: documentation.revision ?? 0,
    };
  }

  async get(actor: InpatientNursingDischargeActor, encounterId: string) {
    const enc = await this.loadInpatientEncounter(actor.facilityId, encounterId);
    const ctx = this.buildContext(enc, actor);
    return {
      encounterId: enc.id,
      facilityId: enc.facilityId,
      status: enc.status,
      ...ctx,
    };
  }

  async patch(
    actor: InpatientNursingDischargeActor,
    encounterId: string,
    body: Record<string, unknown>,
    options?: { ip?: string; userAgent?: string }
  ) {
    this.requireNurseWrite(actor);
    const enc = await this.loadInpatientEncounter(actor.facilityId, encounterId);
    if (enc.status !== EncounterStatus.OPEN) {
      throw new BadRequestException("Encounter is not open");
    }

    const existing =
      readInpatientNursingDischargeFromSummary(enc.dischargeSummaryJson) ??
      emptyInpatientNursingDischarge();
    const provider = readProviderDischargeFromSummary(enc.dischargeSummaryJson);

    if (existing.completedByUserId) {
      const gate = assertSameClinicalAuthor({
        authorUserId: existing.completedByUserId,
        actorUserId: actor.userId,
        code: INPATIENT_NURSING_DISCHARGE_NOT_AUTHOR,
      });
      if (!gate.ok) throw new ForbiddenException(gate.code);
    }

    const expectedRevision =
      body.expectedRevision != null && Number.isFinite(Number(body.expectedRevision))
        ? Number(body.expectedRevision)
        : null;
    const currentRevision = existing.revision ?? 0;
    if (expectedRevision != null && expectedRevision !== currentRevision) {
      throw new ConflictException("INPATIENT_NURSING_DISCHARGE_REVISION_CONFLICT");
    }

    const saveModeRaw = String(body.saveMode ?? "draft").trim().toLowerCase();
    const saveMode: InpatientNursingDischargeSaveMode =
      saveModeRaw === "complete" ? "complete" : "draft";

    const sanitized = sanitizeInpatientNursingDischargeClientPayload(
      body.documentation ?? body.doc ?? body
    );
    const snapshot =
      existing.providerDispositionSnapshot ?? buildProviderDispositionSnapshot(provider);
    const merged: InpatientNursingDischargeV1D = {
      ...emptyInpatientNursingDischarge(),
      ...existing,
      ...sanitized,
      schemaVersion: "INP.DIS.1D",
      providerDispositionSnapshot: snapshot,
      dispositionMismatch: detectProviderDispositionMismatch({
        nursing: { ...existing, providerDispositionSnapshot: snapshot },
        provider,
      }),
    };

    const medReconComplete = isMedReconCompleteInSummary(enc.dischargeSummaryJson);
    const validation = validateInpatientNursingDischarge({
      nursing: merged,
      mode: saveMode,
      provider,
      medReconComplete,
    });
    if (!validation.ok) {
      throw new BadRequestException({
        code: "INPATIENT_NURSING_DISCHARGE_VALIDATION",
        errors: validation.errors,
      });
    }

    const now = new Date().toISOString();
    const author = await this.resolveAuthorSnapshot(actor);
    const nextDoc: InpatientNursingDischargeV1D = {
      ...merged,
      revision: currentRevision + 1,
      lastUpdatedAt: now,
      executionStatus:
        saveMode === "complete"
          ? "COMPLETED"
          : merged.executionStatus === "NOT_STARTED"
            ? "IN_PROGRESS"
            : merged.executionStatus,
      completedAt: saveMode === "complete" ? now : merged.completedAt ?? null,
      completedByUserId:
        saveMode === "complete"
          ? actor.userId
          : merged.completedByUserId ?? existing.completedByUserId ?? null,
      completedByDisplayNameSnapshot:
        saveMode === "complete"
          ? author.displayNameSnapshot
          : merged.completedByDisplayNameSnapshot ?? author.displayNameSnapshot,
      completedByProfessionalTitleSnapshot:
        saveMode === "complete"
          ? author.professionalTitleSnapshot
          : merged.completedByProfessionalTitleSnapshot ?? author.professionalTitleSnapshot,
    };

    // Never allow nursing to rewrite provider disposition
    const prevSummary = enc.dischargeSummaryJson as Record<string, unknown> | null;
    const providerBefore = prevSummary?.inpatientProviderDischarge;
    const nextSummary = mergeInpatientNursingDischargeIntoDischargeSummary(
      enc.dischargeSummaryJson,
      nextDoc,
      provider
    );
    if (
      providerBefore &&
      JSON.stringify(nextSummary.inpatientProviderDischarge) !== JSON.stringify(providerBefore)
    ) {
      nextSummary.inpatientProviderDischarge = providerBefore;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.encounter.update({
        where: { id: enc.id },
        data: {
          dischargeSummaryJson: nextSummary as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });

      if (dischargeSummarySnapshotChanged(enc.dischargeSummaryJson, nextSummary)) {
        const basePayload = dischargeSummarySavedEventPayload({
          snapshot: nextSummary,
          savedAt: new Date(),
          performerId: actor.userId,
          performerDisplayName: author.displayNameSnapshot,
          performerRoleTitle: author.professionalTitleSnapshot ?? "RN",
          performerInitials: author.displayNameSnapshot
            .split(/\s+/)
            .map((p) => p[0] ?? "")
            .join("")
            .slice(0, 3),
        });
        await tx.encounterClinicalEvent.create({
          data: {
            facilityId: actor.facilityId,
            patientId: enc.patientId,
            encounterId: enc.id,
            eventType: EncounterClinicalEventType.DISCHARGE_SUMMARY_SAVED,
            payloadJson: {
              ...(JSON.parse(JSON.stringify(basePayload)) as Record<string, unknown>),
              inpatientNamespace: "inpatientNursingDischarge",
              saveMode,
              revision: nextDoc.revision,
              nursingCompleted: saveMode === "complete",
              encounterClosed: false,
            } as Prisma.InputJsonValue,
            createdByUserId: actor.userId,
          },
        });
      }
    });

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "InpatientNursingDischarge", {
      userId: actor.userId,
      facilityId: actor.facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      encounterId: enc.id,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {
        event:
          saveMode === "complete"
            ? "INPATIENT_NURSING_DISCHARGE_COMPLETED"
            : "INPATIENT_NURSING_DISCHARGE_SAVED",
        saveMode,
        revision: nextDoc.revision,
        note: "Nursing discharge completion does not close the encounter",
      },
    });

    const refreshed = await this.loadInpatientEncounter(actor.facilityId, encounterId);
    const ctx = this.buildContext(
      { dischargeSummaryJson: nextSummary, status: refreshed.status },
      actor
    );

    return {
      encounterId: enc.id,
      documentation: nextDoc,
      revision: nextDoc.revision,
      readiness: ctx.readiness,
      encounterStatus: refreshed.status,
      encounterClosed: false,
    };
  }
}
