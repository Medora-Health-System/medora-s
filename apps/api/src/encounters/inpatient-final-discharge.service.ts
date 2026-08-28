/**
 * INP.DIS.1E — Governed final discharge convergence gate.
 * Revalidates readiness server-side, then reuses InpatientLifecycleService.dischargeEncounter().
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
  RoleCode,
} from "@prisma/client";
import {
  buildClinicalAuthorSnapshotPersist,
  buildInpatientFinalDischargeRecord,
  INPATIENT_FINAL_DISCHARGE_NURSING_REVISION_CONFLICT,
  INPATIENT_FINAL_DISCHARGE_PROVIDER_REVISION_CONFLICT,
  mergeInpatientFinalDischargeIntoDischargeSummary,
  projectInpatientFinalDischargeReadiness,
  readInpatientFinalDischargeFromSummary,
  resolveFinalDischargeRevisionRequirements,
  validateFinalDischargeRevisionPayload,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { InpatientLifecycleService } from "./inpatient-lifecycle.service";

export type InpatientFinalDischargeActor = {
  userId: string;
  facilityId: string;
  role: RoleCode;
};

@Injectable()
export class InpatientFinalDischargeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly lifecycle: InpatientLifecycleService
  ) {}

  private async resolveAuthorSnapshot(actor: InpatientFinalDischargeActor) {
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
        version: true,
      },
    });
    if (!enc) throw new NotFoundException("Encounter not found");
    if (enc.type !== EncounterType.INPATIENT) {
      throw new BadRequestException("Final discharge requires an Inpatient encounter");
    }
    return enc;
  }

  /**
   * Role gate for final discharge HTTP (INP.DIS.1E):
   * @see InpatientOperationsController — POST encounters/:id/inpatient-final-discharge
   * (@RequireRoles PROVIDER, RN, ADMIN). ADMIN is permitted by existing lifecycle policy,
   * not a final-discharge-specific broadening.
   */
  private requireFinalDischargeActor(actor: InpatientFinalDischargeActor) {
    if (
      actor.role !== RoleCode.PROVIDER &&
      actor.role !== RoleCode.RN &&
      actor.role !== RoleCode.ADMIN
    ) {
      throw new ForbiddenException("INPATIENT_FINAL_DISCHARGE_FORBIDDEN");
    }
  }

  async getReadiness(actor: InpatientFinalDischargeActor, encounterId: string) {
    this.requireFinalDischargeActor(actor);
    const enc = await this.loadInpatientEncounter(actor.facilityId, encounterId);
    const readiness = projectInpatientFinalDischargeReadiness({
      dischargeSummaryJson: enc.dischargeSummaryJson,
      encounterStatus: enc.status,
    });
    const completed = readInpatientFinalDischargeFromSummary(enc.dischargeSummaryJson);
    return {
      encounterId: enc.id,
      status: enc.status,
      readiness,
      completed,
      canExecute:
        enc.status === EncounterStatus.OPEN &&
        readiness.ready &&
        (actor.role === RoleCode.PROVIDER ||
          actor.role === RoleCode.RN ||
          actor.role === RoleCode.ADMIN),
    };
  }

  async execute(
    actor: InpatientFinalDischargeActor,
    encounterId: string,
    body: Record<string, unknown>,
    options?: { ip?: string; userAgent?: string }
  ) {
    this.requireFinalDischargeActor(actor);
    const enc = await this.loadInpatientEncounter(actor.facilityId, encounterId);
    if (enc.status !== EncounterStatus.OPEN) {
      throw new ConflictException({
        code: "ENCOUNTER_ALREADY_CLOSED",
        message: "Encounter is already closed",
      });
    }

    const revisionRequirements = resolveFinalDischargeRevisionRequirements(
      enc.dischargeSummaryJson
    );
    const revisionValidation = validateFinalDischargeRevisionPayload({
      body,
      requirements: revisionRequirements,
    });
    if (!revisionValidation.ok) {
      if (revisionValidation.httpStatus === 409) {
        throw new ConflictException({
          code: revisionValidation.code,
          message:
            revisionValidation.code === INPATIENT_FINAL_DISCHARGE_PROVIDER_REVISION_CONFLICT
              ? "Provider discharge changed. Refresh and review before continuing."
              : "Nursing discharge changed. Refresh and review before continuing.",
        });
      }
      throw new BadRequestException({
        code: revisionValidation.code,
        message: "Expected discharge revisions are required from the latest readiness response.",
      });
    }

    const readiness = projectInpatientFinalDischargeReadiness({
      dischargeSummaryJson: enc.dischargeSummaryJson,
      encounterStatus: enc.status,
    });
    if (!readiness.ready) {
      throw new BadRequestException({
        code: "INPATIENT_FINAL_DISCHARGE_BLOCKED",
        errors: readiness.blockers.map((b) => b.code),
        blockers: readiness.blockers,
      });
    }

    const author = await this.resolveAuthorSnapshot(actor);
    const dischargedAt =
      readiness.departedAt && Number.isFinite(new Date(readiness.departedAt).getTime())
        ? readiness.departedAt
        : new Date().toISOString();

    const finalRecord = buildInpatientFinalDischargeRecord({
      readiness,
      actorUserId: actor.userId,
      displayNameSnapshot: author.displayNameSnapshot,
      professionalTitleSnapshot: author.professionalTitleSnapshot,
      dischargedAt,
    });

    const nextSummary = mergeInpatientFinalDischargeIntoDischargeSummary(
      enc.dischargeSummaryJson,
      finalRecord
    );

    const result = await this.lifecycle.dischargeEncounter(
      actor.facilityId,
      encounterId,
      actor.userId,
      {
        disposition: finalRecord.clinicalDispositionCode,
        clinicalDispositionCode: finalRecord.clinicalDispositionCode,
        dischargedAt,
        destination: readiness.dispositionLabel,
        nursingDischargeComplete: true,
        medReconStatus:
          readiness.medicationReconciliation === "complete"
            ? "COMPLETE"
            : readiness.medicationReconciliation === "not_applicable"
              ? "N_A"
              : null,
        dischargeSummaryJson: nextSummary,
        dischargeStatus: finalRecord.lifecycleStatus,
        clinicalEventOnClose: {
          eventType: EncounterClinicalEventType.DISCHARGE_SUMMARY_SAVED,
          createdByUserId: actor.userId,
          payloadJson: {
            inpatientNamespace: "inpatientFinalDischarge",
            event: "INPATIENT_FINAL_DISCHARGE_COMPLETED",
            clinicalDispositionCode: finalRecord.clinicalDispositionCode,
            lifecycleStatus: finalRecord.lifecycleStatus,
            providerRevision: finalRecord.providerRevision,
            nursingRevision: finalRecord.nursingRevision,
            departedAt: finalRecord.departedAt,
            dischargedAt: finalRecord.dischargedAt,
            encounterClosed: true,
          },
        },
      },
      options
    );

    // Best-effort telemetry — clinical event persists inside dischargeEncounter transaction.
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "InpatientFinalDischarge", {
      userId: actor.userId,
      facilityId: actor.facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      encounterId: enc.id,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {
        event: "INPATIENT_FINAL_DISCHARGE_COMPLETED",
        clinicalDispositionCode: finalRecord.clinicalDispositionCode,
        lifecycleStatus: finalRecord.lifecycleStatus,
        providerRevision: finalRecord.providerRevision,
        nursingRevision: finalRecord.nursingRevision,
      },
    });

    return {
      encounterId: enc.id,
      status: result.status,
      readiness: projectInpatientFinalDischargeReadiness({
        dischargeSummaryJson: nextSummary,
        encounterStatus: "CLOSED",
      }),
      completed: finalRecord,
      clinicalDispositionCode: finalRecord.clinicalDispositionCode,
      lifecycleStatus: finalRecord.lifecycleStatus,
    };
  }
}
