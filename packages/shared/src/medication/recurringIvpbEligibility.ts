import {
  parseMedicationFrequencyCode,
  type MedicationFrequencyCode,
} from "./medicationFrequencyCatalog.js";
import {
  isDirectMarFrequency,
  isInfusionIsolatedFrequency,
} from "./medicationFrequencyEdHardening.js";
import { isBloodProductMedicationCatalog } from "./marAdministrationGovernancePolicy.js";
import { isStructuredMedicationOrderRouteIvpb } from "./medicationOrderRoute.js";
import type { MedicationCatalogSnapshotInput } from "./medicationScheduleClassification.js";

/**
 * Recurring-interval frequencies eligible for RECURRING_IVPB scheduling (M1.8B.7J.1).
 * Excludes meal-anchored / calendar codes not used for ED antibiotic IVPB passes.
 */
export const MEDICATION_RECURRING_IVPB_FREQUENCY_CODES = [
  "Q4H",
  "Q6H",
  "Q8H",
  "Q12H",
  "Q24H",
  "BID",
  "TID",
  "QID",
] as const satisfies readonly MedicationFrequencyCode[];

export type MedicationRecurringIvpbFrequencyCode =
  (typeof MEDICATION_RECURRING_IVPB_FREQUENCY_CODES)[number];

const RECURRING_IVPB_FREQUENCY_SET = new Set<string>(MEDICATION_RECURRING_IVPB_FREQUENCY_CODES);

export const MEDICATION_RECURRING_IVPB_ELIGIBILITY_REASONS = [
  "RECURRING_IVPB_ELIGIBLE",
  "NOT_IVPB_ROUTE",
  "MISSING_FREQUENCY_CODE",
  "INVALID_FREQUENCY_CODE",
  "DIRECT_MAR_FREQUENCY",
  "PRN_FREQUENCY",
  "CONTINUOUS_FREQUENCY",
  "BLOOD_PRODUCT",
  "FREQUENCY_NOT_RECURRING_IVPB",
] as const;

export type MedicationRecurringIvpbEligibilityReason =
  (typeof MEDICATION_RECURRING_IVPB_ELIGIBILITY_REASONS)[number];

export type EvaluateRecurringIvpbEligibilityInput = {
  orderRoute?: string | null;
  frequencyCode?: string | null;
  catalog?: MedicationCatalogSnapshotInput | null;
};

export type MedicationRecurringIvpbEligibilityResult = {
  eligible: boolean;
  reason: MedicationRecurringIvpbEligibilityReason;
  frequencyCode: MedicationFrequencyCode | null;
};

export function isRecurringIvpbFrequencyCode(
  code: MedicationFrequencyCode | string | null | undefined
): code is MedicationRecurringIvpbFrequencyCode {
  const parsed = parseMedicationFrequencyCode(code == null ? null : String(code));
  return parsed != null && RECURRING_IVPB_FREQUENCY_SET.has(parsed);
}

/**
 * Pure contract: whether an order line may use RECURRING_IVPB schedule architecture (M1.8B.7J).
 * Does not read feature flags or persist schedules.
 */
export function evaluateRecurringIvpbEligibility(
  input: EvaluateRecurringIvpbEligibilityInput
): MedicationRecurringIvpbEligibilityResult {
  if (!isStructuredMedicationOrderRouteIvpb(input.orderRoute)) {
    return {
      eligible: false,
      reason: "NOT_IVPB_ROUTE",
      frequencyCode: null,
    };
  }

  const catalog = input.catalog ?? null;
  if (
    catalog &&
    isBloodProductMedicationCatalog({
      catalogCode: catalog.catalogCode,
      therapeuticClass: catalog.therapeuticClass,
      genericName: catalog.genericName,
    })
  ) {
    return {
      eligible: false,
      reason: "BLOOD_PRODUCT",
      frequencyCode: parseMedicationFrequencyCode(
        input.frequencyCode == null ? null : String(input.frequencyCode)
      ),
    };
  }

  if (input.frequencyCode == null || String(input.frequencyCode).trim() === "") {
    return {
      eligible: false,
      reason: "MISSING_FREQUENCY_CODE",
      frequencyCode: null,
    };
  }

  const parsed = parseMedicationFrequencyCode(String(input.frequencyCode));
  if (!parsed) {
    return {
      eligible: false,
      reason: "INVALID_FREQUENCY_CODE",
      frequencyCode: null,
    };
  }

  if (isDirectMarFrequency(parsed)) {
    return {
      eligible: false,
      reason: "DIRECT_MAR_FREQUENCY",
      frequencyCode: parsed,
    };
  }

  if (parsed === "PRN") {
    return {
      eligible: false,
      reason: "PRN_FREQUENCY",
      frequencyCode: parsed,
    };
  }

  if (isInfusionIsolatedFrequency(parsed)) {
    return {
      eligible: false,
      reason: "CONTINUOUS_FREQUENCY",
      frequencyCode: parsed,
    };
  }

  if (!isRecurringIvpbFrequencyCode(parsed)) {
    return {
      eligible: false,
      reason: "FREQUENCY_NOT_RECURRING_IVPB",
      frequencyCode: parsed,
    };
  }

  return {
    eligible: true,
    reason: "RECURRING_IVPB_ELIGIBLE",
    frequencyCode: parsed,
  };
}
