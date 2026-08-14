import type { BillingClassification, FacilityBillingSiteType } from "@medora/shared";
import {
  mapBillingClassificationModeToSiteType,
  resolveEffectiveFacilityBillingWorkflow,
  type FacilityBillingClassificationMode,
  type FacilityBillingWorkflowConfig,
} from "@medora/shared";

export type FacilityBillingWorkflowRow = {
  billingClassificationMode: FacilityBillingClassificationMode | null;
  billingSiteType: FacilityBillingSiteType | null;
  allowedEncounterBillingClassifications: BillingClassification[];
  allowUrgentCareToEmergencyUpgrade: boolean;
  requireUcToEdPatientAcknowledgement: boolean;
  showEncounterBillingControls: boolean;
};

export const facilityBillingWorkflowSelect = {
  billingClassificationMode: true,
  billingSiteType: true,
  allowedEncounterBillingClassifications: true,
  allowUrgentCareToEmergencyUpgrade: true,
  requireUcToEdPatientAcknowledgement: true,
  showEncounterBillingControls: true,
} as const;

/**
 * MEDUI.D4C.9 — canonical effective billing workflow for all billing consumers.
 * Never guess LEGACY independently; uses resolveEffectiveFacilityBillingWorkflow.
 */
export function facilityWorkflowConfigFromRow(
  row: FacilityBillingWorkflowRow | null | undefined,
): FacilityBillingWorkflowConfig {
  const effective = resolveEffectiveFacilityBillingWorkflow({
    billingClassificationMode: row?.billingClassificationMode ?? null,
    billingSiteType: row?.billingSiteType ?? null,
    allowedEncounterBillingClassifications: row?.allowedEncounterBillingClassifications ?? [],
    allowUrgentCareToEmergencyUpgrade: row?.allowUrgentCareToEmergencyUpgrade,
    requireUcToEdPatientAcknowledgement: row?.requireUcToEdPatientAcknowledgement,
    showEncounterBillingControls: row?.showEncounterBillingControls,
  });
  return effective.config;
}

export function facilityWorkflowPatchData(dto: {
  billingClassificationMode?: FacilityBillingClassificationMode | null;
  allowedEncounterBillingClassifications?: BillingClassification[];
  allowUrgentCareToEmergencyUpgrade?: boolean;
  requireUcToEdPatientAcknowledgement?: boolean;
  showEncounterBillingControls?: boolean;
}) {
  const data: Record<string, unknown> = {};
  if (dto.billingClassificationMode !== undefined) {
    data.billingClassificationMode = dto.billingClassificationMode;
    if (dto.billingClassificationMode) {
      data.billingSiteType = mapBillingClassificationModeToSiteType(dto.billingClassificationMode);
      const isHybridOrHospital =
        dto.billingClassificationMode === "HYBRID_UC_ED" ||
        dto.billingClassificationMode === "HOSPITAL_ENTERPRISE";
      if (isHybridOrHospital && dto.allowUrgentCareToEmergencyUpgrade === undefined) {
        data.allowUrgentCareToEmergencyUpgrade = true;
      }
      if (isHybridOrHospital && dto.showEncounterBillingControls === undefined) {
        data.showEncounterBillingControls = true;
      }
    }
  }
  if (dto.allowedEncounterBillingClassifications !== undefined) {
    data.allowedEncounterBillingClassifications = dto.allowedEncounterBillingClassifications;
  }
  if (dto.allowUrgentCareToEmergencyUpgrade !== undefined) {
    data.allowUrgentCareToEmergencyUpgrade = dto.allowUrgentCareToEmergencyUpgrade;
  }
  if (dto.requireUcToEdPatientAcknowledgement !== undefined) {
    data.requireUcToEdPatientAcknowledgement = dto.requireUcToEdPatientAcknowledgement;
  }
  if (dto.showEncounterBillingControls !== undefined) {
    data.showEncounterBillingControls = dto.showEncounterBillingControls;
  }
  return data;
}
