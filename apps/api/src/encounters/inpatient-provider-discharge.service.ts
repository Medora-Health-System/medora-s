/**
 * INP.DIS.1B — Governed provider inpatient discharge documentation API service.
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  EncounterClinicalEventType,
  EncounterStatus,
  EncounterType,
  Prisma,
  RoleCode,
  AuditAction,
} from "@prisma/client";
import {
  assertSameClinicalAuthor,
  buildClinicalAuthorSnapshotPersist,
  emptyInpatientProviderDischarge,
  extractDischargePlanningFromClinicalOps,
  mergeInpatientProviderDischargeIntoDischargeSummary,
  mergeInpatientProviderDischargePayload,
  readInpatientClinicalOpsFromAdmissionSummary,
  readInpatientProviderDischargeFromSummary,
  sanitizeInpatientProviderDischargeClientPayload,
  validateInpatientProviderDischarge,
  type InpatientProviderDischargeSaveMode,
  type InpatientProviderDischargeV1B,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import {
  dischargeSummarySavedEventPayload,
  dischargeSummarySnapshotChanged,
} from "../utils/clinical-event-discharge-summary.util";

export type InpatientProviderDischargeActor = {
  userId: string;
  facilityId: string;
  role: RoleCode;
};

export const INPATIENT_PROVIDER_DISCHARGE_NOT_AUTHOR = "INPATIENT_PROVIDER_DISCHARGE_NOT_AUTHOR";

@Injectable()
export class InpatientProviderDischargeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private async resolveAuthorSnapshot(actor: InpatientProviderDischargeActor) {
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
        admissionSummaryJson: true,
      },
    });
    if (!enc) throw new NotFoundException("Encounter not found");
    if (enc.type !== EncounterType.INPATIENT) {
      throw new BadRequestException("Inpatient provider discharge requires an Inpatient encounter");
    }
    return enc;
  }

  private requireProviderWrite(actor: InpatientProviderDischargeActor) {
    if (actor.role !== RoleCode.PROVIDER) {
      throw new ForbiddenException("INPATIENT_PROVIDER_DISCHARGE_PROVIDER_ONLY");
    }
  }

  async get(actor: InpatientProviderDischargeActor, encounterId: string) {
    const enc = await this.loadInpatientEncounter(actor.facilityId, encounterId);
    const documentation =
      readInpatientProviderDischargeFromSummary(enc.dischargeSummaryJson) ??
      emptyInpatientProviderDischarge();
    const ops = readInpatientClinicalOpsFromAdmissionSummary(enc.admissionSummaryJson);
    const planning = extractDischargePlanningFromClinicalOps(ops);
    return {
      encounterId: enc.id,
      facilityId: enc.facilityId,
      status: enc.status,
      documentation,
      revision: documentation.revision ?? 0,
      planningContext: {
        plannedDestination: planning?.destination ?? null,
        plannedDischargeWorkflowState: planning?.workflowState ?? null,
        anticipatedDischargeDate: planning?.anticipatedDischargeDate ?? null,
      },
      canAuthor: actor.role === RoleCode.PROVIDER && enc.status === EncounterStatus.OPEN,
    };
  }

  async patch(
    actor: InpatientProviderDischargeActor,
    encounterId: string,
    body: Record<string, unknown>,
    options?: { ip?: string; userAgent?: string }
  ) {
    this.requireProviderWrite(actor);
    const enc = await this.loadInpatientEncounter(actor.facilityId, encounterId);
    if (enc.status !== EncounterStatus.OPEN) {
      throw new BadRequestException("Encounter is not open");
    }

    const existing =
      readInpatientProviderDischargeFromSummary(enc.dischargeSummaryJson) ??
      emptyInpatientProviderDischarge();

    if (existing.documentedByUserId) {
      const gate = assertSameClinicalAuthor({
        authorUserId: existing.documentedByUserId,
        actorUserId: actor.userId,
        code: INPATIENT_PROVIDER_DISCHARGE_NOT_AUTHOR,
      });
      if (!gate.ok) throw new ForbiddenException(gate.code);
    }

    const expectedRevision =
      body.expectedRevision != null && Number.isFinite(Number(body.expectedRevision))
        ? Number(body.expectedRevision)
        : null;
    const currentRevision = existing.revision ?? 0;
    if (expectedRevision != null && expectedRevision !== currentRevision) {
      throw new ConflictException("INPATIENT_PROVIDER_DISCHARGE_REVISION_CONFLICT");
    }

    const saveModeRaw = String(body.saveMode ?? "draft").trim().toLowerCase();
    const saveMode: InpatientProviderDischargeSaveMode =
      saveModeRaw === "complete" ? "complete" : "draft";

    const payloadRaw = body.documentation ?? body.doc ?? body;
    const sanitized = sanitizeInpatientProviderDischargeClientPayload(payloadRaw);
    const merged = mergeInpatientProviderDischargePayload(existing, sanitized);

    const validation = validateInpatientProviderDischarge(merged, saveMode);
    if (!validation.ok) {
      throw new BadRequestException({
        code: "INPATIENT_PROVIDER_DISCHARGE_VALIDATION",
        errors: validation.errors,
      });
    }

    const now = new Date().toISOString();
    const author = await this.resolveAuthorSnapshot(actor);
    const nextDoc: InpatientProviderDischargeV1B = {
      ...merged,
      revision: currentRevision + 1,
      documentedAt: existing.documentedAt ?? now,
      documentedByUserId: existing.documentedByUserId ?? actor.userId,
      documentedByDisplayNameSnapshot: author.displayNameSnapshot,
      documentedByProfessionalTitleSnapshot: author.professionalTitleSnapshot,
      lastUpdatedAt: now,
    };

    const prevSummary = enc.dischargeSummaryJson;
    const nextSummary = mergeInpatientProviderDischargeIntoDischargeSummary(
      enc.dischargeSummaryJson,
      nextDoc
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.encounter.update({
        where: { id: enc.id },
        data: {
          dischargeSummaryJson: nextSummary as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });

      if (dischargeSummarySnapshotChanged(prevSummary, nextSummary)) {
        const basePayload = dischargeSummarySavedEventPayload({
          snapshot: nextSummary,
          savedAt: new Date(),
          performerId: actor.userId,
          performerDisplayName: author.displayNameSnapshot,
          performerRoleTitle: author.professionalTitleSnapshot ?? "MD",
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
              inpatientNamespace: "inpatientProviderDischarge",
              saveMode,
              revision: nextDoc.revision,
            } as Prisma.InputJsonValue,
            createdByUserId: actor.userId,
          },
        });
      }
    });

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "InpatientProviderDischarge", {
      userId: actor.userId,
      facilityId: actor.facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      encounterId: enc.id,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {
        event: "INPATIENT_PROVIDER_DISCHARGE_SAVED",
        saveMode,
        revision: nextDoc.revision,
      },
    });

    return {
      encounterId: enc.id,
      documentation: nextDoc,
      revision: nextDoc.revision,
    };
  }
}
