import type { MedicationSafetyGovernanceDisplayInput, MedicationSafetyGovernanceSnapshot } from "@medora/shared";
import {
  controlledScheduleRequiresPharmacyVerification,
  lasaMarRequiresAcknowledgement,
  marAdministrationRequiresDoubleCheck,
  marPharmacyBlockingWorkflowVisible,
} from "@medora/shared";
import type { MarLasaFormState } from "@/components/medication/MarLasaFields";

export type OrderItemMedicationGovernanceSource = {
  medicationSafetyGovernance?: MedicationSafetyGovernanceSnapshot | null;
  catalogMedication?: {
    isControlled?: boolean | null;
    controlledSchedule?: string | null;
    requiresWitness?: boolean | null;
    requiresDoubleSign?: boolean | null;
  } | null;
};

/**
 * Build MAR governance display input from enriched order item (M1.7A.8).
 * Derives blocking flags when optional enrichment omitted fields.
 */
export function orderItemToMedicationSafetyGovernanceDisplay(
  item: OrderItemMedicationGovernanceSource,
  options?: { highRiskNameMatch?: boolean }
): MedicationSafetyGovernanceDisplayInput {
  const gov = item.medicationSafetyGovernance;
  const cm = item.catalogMedication;

  const controlledSchedule = gov?.controlledSchedule ?? cm?.controlledSchedule ?? null;
  const isControlled = gov?.isControlled ?? cm?.isControlled ?? false;
  const requiresWitness = gov?.requiresWitness ?? cm?.requiresWitness ?? false;
  const requiresDoubleSign = gov?.requiresDoubleSign ?? cm?.requiresDoubleSign ?? false;
  const highAlertClass = gov?.highAlertClass ?? null;
  const isHighAlert =
    gov?.isHighAlert === true ||
    Boolean(highAlertClass && highAlertClass !== "HIGH_ALERT_NONE") ||
    options?.highRiskNameMatch === true;

  const requiresPharmacyVerification =
    gov?.requiresPharmacyVerification === true ||
    controlledScheduleRequiresPharmacyVerification(controlledSchedule) ||
    (gov?.pharmacyVerificationStatus != null &&
      gov.pharmacyVerificationStatus !== "NOT_REQUIRED");

  const pharmacyVerificationStatus =
    gov?.pharmacyVerificationStatus ??
    (requiresPharmacyVerification ? ("PENDING" as const) : null);

  return {
    isControlled,
    controlledSchedule,
    isHighAlert,
    highAlertClass,
    lasaGroupId: gov?.lasaGroupId ?? null,
    lasaGroupLabel: gov?.lasaGroupLabel ?? null,
    lasaSeverity: gov?.lasaSeverity ?? null,
    requiresWitness,
    requiresDoubleSign,
    wasteDocumentationRecommended: gov?.wasteDocumentationRecommended ?? null,
    pharmacyVerificationStatus,
    requiresPharmacyVerification,
    pharmacyVerifiedAt: gov?.pharmacyVerifiedAt ?? null,
    pharmacyVerifiedByDisplay: gov?.pharmacyVerifiedByDisplay ?? null,
    highRiskNameMatch: options?.highRiskNameMatch,
  };
}

/** True when MAR modal must show blocking governance workflow sections. */
export function marBlockingGovernanceWorkflowVisible(
  governance: MedicationSafetyGovernanceDisplayInput,
  marAction: string
): boolean {
  if (marAction !== "administered") return false;
  if (marPharmacyBlockingWorkflowVisible(governance, marAction)) return true;
  if (governance.isControlled === true && governance.requiresWitness === true) return true;
  if (
    marAdministrationRequiresDoubleCheck({
      isHighAlert: governance.isHighAlert === true,
      requiresDoubleSign: governance.requiresDoubleSign === true,
      highAlertClass: governance.highAlertClass,
    })
  ) {
    return true;
  }
  if (lasaMarRequiresAcknowledgement({
    lasaGroupId: governance.lasaGroupId,
    lasaSeverity: governance.lasaSeverity,
  })) {
    return true;
  }
  return false;
}

/** Client-side LASA acknowledgement completeness before MAR save (M1.7B.2). */
export function marLasaAcknowledgementComplete(form: MarLasaFormState): boolean {
  if (form.useOverride) {
    return (
      form.lasaOverrideAcknowledged === true &&
      form.lasaOverrideReason.trim().length >= 8
    );
  }
  return form.lasaAcknowledged === true && form.lasaMedicationSelectionConfirmed === true;
}
