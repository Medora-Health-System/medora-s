import type { MedicationSafetyGovernanceDisplayInput, MedicationSafetyGovernanceSnapshot } from "@medora/shared";

export type OrderItemMedicationGovernanceSource = {
  medicationSafetyGovernance?: MedicationSafetyGovernanceSnapshot | null;
  catalogMedication?: {
    isControlled?: boolean | null;
    controlledSchedule?: string | null;
    requiresWitness?: boolean | null;
    requiresDoubleSign?: boolean | null;
  } | null;
};

export function orderItemToMedicationSafetyGovernanceDisplay(
  item: OrderItemMedicationGovernanceSource,
  options?: { highRiskNameMatch?: boolean }
): MedicationSafetyGovernanceDisplayInput {
  const gov = item.medicationSafetyGovernance;
  const cm = item.catalogMedication;

  return {
    isControlled: gov?.isControlled ?? cm?.isControlled ?? false,
    controlledSchedule: gov?.controlledSchedule ?? cm?.controlledSchedule ?? null,
    isHighAlert: gov?.isHighAlert ?? null,
    highAlertClass: gov?.highAlertClass ?? null,
    lasaGroupId: gov?.lasaGroupId ?? null,
    lasaGroupLabel: gov?.lasaGroupLabel ?? null,
    lasaSeverity: gov?.lasaSeverity ?? null,
    requiresWitness: gov?.requiresWitness ?? cm?.requiresWitness ?? false,
    requiresDoubleSign: gov?.requiresDoubleSign ?? cm?.requiresDoubleSign ?? false,
    wasteDocumentationRecommended: gov?.wasteDocumentationRecommended ?? null,
    pharmacyVerificationStatus: gov?.pharmacyVerificationStatus ?? null,
    highRiskNameMatch: options?.highRiskNameMatch,
  };
}
