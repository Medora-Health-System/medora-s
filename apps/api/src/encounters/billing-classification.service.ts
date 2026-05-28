import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  type BillingClassification,
  type BillingClassificationTransitionEntry,
  type EncounterBillingClassificationPatchDto,
  resolveDefaultBillingClassification,
  validateBillingClassificationTransition,
} from "@medora/shared";
import { AuditAction, EncounterStatus, RoleCode, type FacilityBillingSiteType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { toEncounterClinicResponse } from "./encounter-response.util";

@Injectable()
export class BillingClassificationService {
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

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    if (encounter.status === EncounterStatus.CLOSED && !isAdmin) {
      throw new ForbiddenException("Closed encounter billing classification requires admin policy");
    }

    const from = encounter.billingClassification as BillingClassification;
    const to = dto.classification;

    const transitionCheck = validateBillingClassificationTransition({ from, to, isAdmin });
    if (!transitionCheck.allowed) {
      throw new ForbiddenException(transitionCheck.code ?? "Billing classification transition not allowed");
    }

    if (transitionCheck.requiresAcknowledgment && !dto.patientAcknowledged) {
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
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });

    await this.audit.log(AuditAction.ENCOUNTER_BILLING_CLASSIFICATION_CHANGED, "ENCOUNTER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
      metadata: {
        fromClassification: from,
        toClassification: to,
        reasonCode: dto.reasonCode,
        patientAcknowledged: dto.patientAcknowledged,
        acknowledgmentMethod: dto.acknowledgmentMethod,
        actorId: userId,
        timestamp: now.toISOString(),
      },
    });

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
