import { Injectable, NotFoundException } from "@nestjs/common";
import {
  resolveEffectiveFacilityBillingWorkflow,
  type FacilityBillingWorkflowPatchDto,
} from "@medora/shared";
import { AuditAction } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  facilityBillingWorkflowSelect,
  facilityWorkflowPatchData,
} from "./facility-billing-workflow.util";

@Injectable()
export class FacilityBillingWorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  async getForFacility(facilityId: string) {
    const row = await this.prisma.facility.findFirst({
      where: { id: facilityId },
      select: {
        id: true,
        name: true,
        ...facilityBillingWorkflowSelect,
      },
    });
    if (!row) throw new NotFoundException("Facility not found");
    const effective = resolveEffectiveFacilityBillingWorkflow({
      billingClassificationMode: row.billingClassificationMode,
      billingSiteType: row.billingSiteType,
      allowedEncounterBillingClassifications: row.allowedEncounterBillingClassifications,
      allowUrgentCareToEmergencyUpgrade: row.allowUrgentCareToEmergencyUpgrade,
      requireUcToEdPatientAcknowledgement: row.requireUcToEdPatientAcknowledgement,
      showEncounterBillingControls: row.showEncounterBillingControls,
    });
    // Keep billingClassificationMode as effective for legacy clients; expose configured separately.
    return {
      facilityId: row.id,
      facilityName: row.name,
      ...effective.config,
      configuredMode: effective.configuredMode,
      effectiveMode: effective.effectiveMode,
      source: effective.source,
    };
  }

  async updateForFacility(
    facilityId: string,
    dto: FacilityBillingWorkflowPatchDto,
    actorUserId?: string
  ) {
    const row = await this.prisma.facility.findFirst({
      where: { id: facilityId },
      select: { id: true, ...facilityBillingWorkflowSelect },
    });
    if (!row) throw new NotFoundException("Facility not found");
    const previous = resolveEffectiveFacilityBillingWorkflow({
      billingClassificationMode: row.billingClassificationMode,
      billingSiteType: row.billingSiteType,
      allowedEncounterBillingClassifications: row.allowedEncounterBillingClassifications,
      allowUrgentCareToEmergencyUpgrade: row.allowUrgentCareToEmergencyUpgrade,
      requireUcToEdPatientAcknowledgement: row.requireUcToEdPatientAcknowledgement,
      showEncounterBillingControls: row.showEncounterBillingControls,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.facility.update({
        where: { id: facilityId },
        data: facilityWorkflowPatchData(dto),
        select: {
          id: true,
          name: true,
          ...facilityBillingWorkflowSelect,
        },
      });
      if (actorUserId) {
        const after = resolveEffectiveFacilityBillingWorkflow({
          billingClassificationMode: next.billingClassificationMode,
          billingSiteType: next.billingSiteType,
          allowedEncounterBillingClassifications: next.allowedEncounterBillingClassifications,
          allowUrgentCareToEmergencyUpgrade: next.allowUrgentCareToEmergencyUpgrade,
          requireUcToEdPatientAcknowledgement: next.requireUcToEdPatientAcknowledgement,
          showEncounterBillingControls: next.showEncounterBillingControls,
        });
        await tx.auditLog.create({
          data: {
            facilityId,
            userId: actorUserId,
            action: AuditAction.FACILITY_CARE_PROFILE_UPDATED,
            entityType: "Facility",
            entityId: facilityId,
            metadata: {
              event: "FACILITY_BILLING_WORKFLOW_UPDATED",
              certificationId: "MEDUI.D4C.9",
              previousConfiguredMode: previous.configuredMode,
              previousEffectiveMode: previous.effectiveMode,
              newConfiguredMode: after.configuredMode,
              newEffectiveMode: after.effectiveMode,
              source: after.source,
            },
          },
        });
      }
      return next;
    });

    const effective = resolveEffectiveFacilityBillingWorkflow({
      billingClassificationMode: updated.billingClassificationMode,
      billingSiteType: updated.billingSiteType,
      allowedEncounterBillingClassifications: updated.allowedEncounterBillingClassifications,
      allowUrgentCareToEmergencyUpgrade: updated.allowUrgentCareToEmergencyUpgrade,
      requireUcToEdPatientAcknowledgement: updated.requireUcToEdPatientAcknowledgement,
      showEncounterBillingControls: updated.showEncounterBillingControls,
    });
    return {
      facilityId: updated.id,
      facilityName: updated.name,
      ...effective.config,
      configuredMode: effective.configuredMode,
      effectiveMode: effective.effectiveMode,
      source: effective.source,
    };
  }
}
