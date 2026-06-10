import {
  resolveScheduleClassification,
  type MedicationCatalogSnapshotInput,
  type MedicationScheduleClassification,
} from "./medicationScheduleClassification.js";

/**
 * M1.8B.7F.1 — dose expansion eligibility (classification invariants only).
 * Does not generate doses, read flags, or touch persistence.
 */
export const MEDICATION_DOSE_EXPANSION_REASONS = [
  "RECURRING_MEDICATION_ELIGIBLE",
  "DIRECT_MAR_NEVER_EXPANDS",
  "INFUSION_LIFECYCLE_NEVER_EXPANDS",
  "ON_DEMAND_PRN_DOES_NOT_PREGENERATE",
  "UNSUPPORTED_CLASSIFICATION",
] as const;

export type MedicationDoseExpansionReason = (typeof MEDICATION_DOSE_EXPANSION_REASONS)[number];

export type MedicationDoseExpansionResult = {
  shouldExpand: boolean;
  reason: MedicationDoseExpansionReason;
  classification: MedicationScheduleClassification;
};

export type MedicationDoseExpansionInput = {
  frequencyCode?: string | null;
  catalog?: MedicationCatalogSnapshotInput | null;
  orderRoute?: string | null;
};

/**
 * Resolves schedule classification then applies dose-expansion invariants from M1.8B.7F audit.
 *
 * - DIRECT_MAR (NOW / STAT / ONCE / legacy): never expand
 * - INFUSION_LIFECYCLE (blood, continuous, IVPB route, infusion catalog): never expand
 * - ON_DEMAND (PRN): schedule may exist; standing doses must not be pre-generated
 * - RECURRING: eligible for future rolling-horizon expansion
 */
export function evaluateMedicationDoseExpansionEligibility(
  input: MedicationDoseExpansionInput
): MedicationDoseExpansionResult {
  const classification = resolveScheduleClassification({
    frequencyCode: input.frequencyCode,
    catalog: input.catalog ?? null,
    orderRoute: input.orderRoute ?? null,
  });

  return evaluateMedicationDoseExpansionForClassification(classification);
}

export function evaluateMedicationDoseExpansionForClassification(
  classification: MedicationScheduleClassification
): MedicationDoseExpansionResult {
  switch (classification) {
    case "RECURRING":
      return {
        shouldExpand: true,
        reason: "RECURRING_MEDICATION_ELIGIBLE",
        classification,
      };
    case "DIRECT_MAR":
      return {
        shouldExpand: false,
        reason: "DIRECT_MAR_NEVER_EXPANDS",
        classification,
      };
    case "INFUSION_LIFECYCLE":
      return {
        shouldExpand: false,
        reason: "INFUSION_LIFECYCLE_NEVER_EXPANDS",
        classification,
      };
    case "ON_DEMAND":
      return {
        shouldExpand: false,
        reason: "ON_DEMAND_PRN_DOES_NOT_PREGENERATE",
        classification,
      };
    default: {
      const _exhaustive: never = classification;
      return {
        shouldExpand: false,
        reason: "UNSUPPORTED_CLASSIFICATION",
        classification: _exhaustive,
      };
    }
  }
}
