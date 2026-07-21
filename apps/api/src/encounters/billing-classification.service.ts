import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ENCOUNTER_CORE_SELECT, ENCOUNTER_NESTED_CORE_SELECT } from "./encounter-query-contracts";
import {
  type BillingClassification,
  type BillingClassificationTransitionEntry,
  type EncounterBillingClassificationPatchDto,
  resolveAllowedTargetClassifications,
  resolveDefaultBillingClassification,
  validateFacilityBillingTransition,
} from "@medora/shared";
import { AuditAction, EncounterStatus, RoleCode, type FacilityBillingSiteType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { toEncounterClinicResponse } from "./encounter-response.util";
import {
  facilityBillingWorkflowSelect,
  facilityWorkflowConfigFromRow,
} from "./facility-billing-workflow.util";

@Injectable()
export class BillingClassificationService {
  private readonly logger = new Logger(BillingClassificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  resolveDefaultForCreate(params: {
    facilityBillingSiteType: FacilityBillingSiteType | null;
    encounterType: "OUTPATIENT" | "INPATIENT" | "EMERGENCY" | "URGENT_CARE";
  }): BillingClassification {
    return resolveDefaultBillingClassification({
      facilityBillingSiteType: params.facilityBillingSiteType,
      encounterType: params.encounterType,
    });
  }

  async getTransitionOptions(params: { encounterId: string; facilityId: string; userId: string }) {
    const { encounterId, facilityId, userId } = params;
    const userRoles = await this.rolesForUser(userId, facilityId);
    const isAdmin = userRoles.includes(RoleCode.ADMIN) || userRoles.includes(RoleCode.MEDORA_SUPER_ADMIN);

    const [encounter, facility] = await Promise.all([
      this.prisma.encounter.findFirst({
        where: { id: encounterId, facilityId },
        select: { id: true, billingClassification: true, status: true },
      }),
      this.prisma.facility.findFirst({
        where: { id: facilityId },
        select: facilityBillingWorkflowSelect,
      }),
    ]);

    if (!encounter) throw new NotFoundException("Encounter not found");
    if (!facility) throw new NotFoundException("Facility not found");

    const facilityConfig = facilityWorkflowConfigFromRow(facility);
    const current = encounter.billingClassification as BillingClassification;
    const allowedTargets = resolveAllowedTargetClassifications({
      from: current,
      facilityConfig,
      isAdmin,
    });

    const result = {
      currentClassification: current,
      allowedTargets,
      showControls: facilityConfig.showEncounterBillingControls,
      allowChange:
        facilityConfig.showEncounterBillingControls &&
        encounter.status !== EncounterStatus.CLOSED &&
        allowedTargets.length > 0,
      requireAcknowledgment: facilityConfig.requireUcToEdPatientAcknowledgement,
      facilityConfig: {
        billingClassificationMode: facilityConfig.billingClassificationMode,
        allowUrgentCareToEmergencyUpgrade: facilityConfig.allowUrgentCareToEmergencyUpgrade,
        showEncounterBillingControls: facilityConfig.showEncounterBillingControls,
      },
    };

    if (process.env.BILLING_WORKFLOW_DEBUG === "1") {
      this.logger.debug(
        JSON.stringify({
          facilityId,
          encounterId,
          mode: facilityConfig.billingClassificationMode,
          showControls: facilityConfig.showEncounterBillingControls,
          allowUcToEd: facilityConfig.allowUrgentCareToEmergencyUpgrade,
          currentClassification: current,
          allowedTargets,
          allowChange: result.allowChange,
        }),
      );
    }

    return result;
  }

  async changeBillingClassification(params: {
    encounterId: string;
    facilityId: string;
    userId: string;
    dto: EncounterBillingClassificationPatchDto;
    ip?: string;
    userAgent?: string;
  }) {
    const { encounterId, facilityId, userId, dto, ip, userAgent } = params;
    const userRoles = await this.rolesForUser(userId, facilityId);
    const isAdmin = userRoles.includes(RoleCode.ADMIN) || userRoles.includes(RoleCode.MEDORA_SUPER_ADMIN);

    const [encounter, facility] = await Promise.all([
      this.prisma.encounter.findFirst({
      select: ENCOUNTER_CORE_SELECT,
      where: { id: encounterId, facilityId } }),
      this.prisma.facility.findFirst({
        where: { id: facilityId },
        select: facilityBillingWorkflowSelect,
      }),
    ]);

    if (!encounter) throw new NotFoundException("Encounter not found");
    if (!facility) throw new NotFoundException("Facility not found");

    if (encounter.status === EncounterStatus.CLOSED && !isAdmin) {
      throw new ForbiddenException("Closed encounter billing classification requires admin policy");
    }

    const facilityConfig = facilityWorkflowConfigFromRow(facility);
    const from = encounter.billingClassification as BillingClassification;
    const to = dto.classification;

    const transitionCheck = validateFacilityBillingTransition({
      from,
      to,
      facilityConfig,
      isAdmin,
    });
    if (!transitionCheck.allowed) {
      throw new ForbiddenException(transitionCheck.code ?? "Billing classification transition not allowed");
    }

    const requiresAck =
      transitionCheck.requiresAcknowledgment && facilityConfig.requireUcToEdPatientAcknowledgement;
    if (requiresAck && !dto.patientAcknowledged) {
      throw new BadRequestException("Patient acknowledgment required for this billing classification change");
    }

    const now = new Date();
    const priorTransitions = Array.isArray(encounter.billingClassificationTransitionJson)
      ? (encounter.billingClassificationTransitionJson as BillingClassificationTransitionEntry[])
      : [];

    const entry: BillingClassificationTransitionEntry = {
      from,
      to,
      reasonCode: dto.reasonCode,
      freeTextReasonPresent: Boolean(dto.changeReason?.trim()),
      patientAcknowledged: dto.patientAcknowledged,
      acknowledgmentMethod: dto.acknowledgmentMethod,
      changedAt: now.toISOString(),
      changedById: userId,
      facilityId,
    };

    const updated = await this.prisma.encounter.update({
      where: { id: encounterId },
      data: {
        billingClassification: to,
        billingClassificationChangedAt: now,
        billingClassificationChangedByUserId: userId,
        billingClassificationChangeReason: dto.changeReason?.trim()?.slice(0, 512) || null,
        billingClassificationAcknowledgedAt: dto.patientAcknowledged ? now : null,
        billingClassificationAcknowledgedByUserId: dto.patientAcknowledged ? userId : null,
        billingClassificationAcknowledgmentMethod: dto.acknowledgmentMethod,
        billingClassificationTransitionJson: [...priorTransitions, entry],
        version: { increment: 1 },
      },
      select: {
        ...ENCOUNTER_CORE_SELECT,
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });

    const auditMeta = {
      fromClassification: from,
      toClassification: to,
      reasonCode: dto.reasonCode,
      patientAcknowledged: dto.patientAcknowledged,
      acknowledgmentMethod: dto.acknowledgmentMethod,
      actorId: userId,
      timestamp: now.toISOString(),
    };

    await this.audit.log(AuditAction.ENCOUNTER_BILLING_CLASSIFICATION_CHANGED, "ENCOUNTER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
      metadata: auditMeta,
    });

    if (from === "URGENT_CARE" && to === "EMERGENCY_DEPARTMENT") {
      if (dto.patientAcknowledged) {
        await this.audit.log(AuditAction.UC_TO_ED_PATIENT_ACKNOWLEDGED, "ENCOUNTER", {
          userId,
          facilityId,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          entityId: encounter.id,
          ip,
          userAgent,
          metadata: {
            acknowledgmentMethod: dto.acknowledgmentMethod,
            actorId: userId,
            timestamp: now.toISOString(),
          },
        });
      }
      await this.audit.log(AuditAction.UC_TO_ED_CONVERSION_COMPLETED, "ENCOUNTER", {
        userId,
        facilityId,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        entityId: encounter.id,
        ip,
        userAgent,
        metadata: auditMeta,
      });
    }

    return toEncounterClinicResponse(updated);
  }

  private async rolesForUser(userId: string, facilityId: string): Promise<RoleCode[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId, facilityId },
      include: { role: true },
    });
    return rows.flatMap((r) => (r.role ? [r.role.code] : []));
  }
}
