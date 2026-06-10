import { evaluateMedicationDoseExpansionEligibility } from "./medicationDoseExpansion.js";
import { medicationDoseGatedMarEnabled } from "./medicationDoseMarFeatureFlags.js";
import { isDoseAdministrableNow } from "./medicationDoseMarWindowPolicy.js";
import type { MedicationDoseKind } from "./medicationDoseKind.js";
import { parseMedicationDoseKind } from "./medicationDoseKind.js";
import type { MedicationDoseStatus } from "./medicationDoseStatus.js";
import {
  isTerminalMedicationDoseStatus,
  parseMedicationDoseStatus,
} from "./medicationDoseStatus.js";
import type { MedicationSchedulingFeatureFlags } from "./medicationFrequencyEdHardening.js";
import type {
  MedicationCatalogSnapshotInput,
  MedicationScheduleClassification,
} from "./medicationScheduleClassification.js";

export const MEDICATION_DOSE_GATED_MAR_ELIGIBILITY_REASONS = [
  "DOSE_GATED_MAR_ELIGIBLE",
  "DOSE_GATED_MAR_FLAGS_OFF",
  "SCHEDULE_NOT_ACTIVE",
  "NOT_RECURRING",
  "NOT_FIXED_ADMINISTRATION",
  "INFUSION_LIFECYCLE",
  "DIRECT_MAR",
  "ON_DEMAND",
  "DOSE_ALREADY_TERMINAL",
  "DOSE_STATUS_NOT_ADMINISTRABLE",
  "DOSE_OUTSIDE_ADMINISTRATION_WINDOW",
  "DOSE_ALREADY_HAS_TERMINAL_MAR",
  "ORDER_ITEM_MISMATCH",
  "ENCOUNTER_MISMATCH",
  "FACILITY_MISMATCH",
  "EXPANSION_INELIGIBLE",
] as const;

export type MedicationDoseGatedMarEligibilityReason =
  (typeof MEDICATION_DOSE_GATED_MAR_ELIGIBILITY_REASONS)[number];

export type MedicationDoseGatedMarEligibilityResult = {
  eligible: boolean;
  reason: MedicationDoseGatedMarEligibilityReason;
  scheduleClassification: MedicationScheduleClassification | null;
};

export const MEDICATION_ORDER_SCHEDULE_STATUS_ACTIVE = "ACTIVE" as const;

export type MedicationDoseGatedMarEligibilityInput = {
  featureFlags?: Partial<MedicationSchedulingFeatureFlags> | null;
  scheduleClassification: MedicationScheduleClassification | string;
  scheduleStatus: string;
  doseKind: MedicationDoseKind | string;
  doseStatus: MedicationDoseStatus | string;
  terminalMedicationAdministrationId?: string | null;
  frequencyCode?: string | null;
  catalog?: MedicationCatalogSnapshotInput | null;
  orderRoute?: string | null;
  doseOrderItemId: string;
  requestOrderItemId: string;
  doseEncounterId: string;
  requestEncounterId: string;
  doseFacilityId: string;
  requestFacilityId: string;
  /** Required for window policy when status is PLANNED */
  now?: Date;
  dueWindowStartAt?: Date;
  dueWindowEndAt?: Date;
};

export class DoseGatedMarEligibilityError extends Error {
  constructor(
    public readonly reason: MedicationDoseGatedMarEligibilityReason,
    message: string
  ) {
    super(message);
    this.name = "DoseGatedMarEligibilityError";
  }
}

function ineligible(
  reason: MedicationDoseGatedMarEligibilityReason,
  scheduleClassification: MedicationScheduleClassification | null = null
): MedicationDoseGatedMarEligibilityResult {
  return { eligible: false, reason, scheduleClassification };
}

/**
 * Evaluates whether a MedicationDoseInstance may be used as the gate for MAR create (M1.8B.7I).
 */
export function evaluateDoseGatedMarEligibility(
  input: MedicationDoseGatedMarEligibilityInput
): MedicationDoseGatedMarEligibilityResult {
  const classification = input.scheduleClassification as MedicationScheduleClassification;

  if (!medicationDoseGatedMarEnabled(input.featureFlags)) {
    return ineligible("DOSE_GATED_MAR_FLAGS_OFF", classification);
  }

  if (input.scheduleStatus !== MEDICATION_ORDER_SCHEDULE_STATUS_ACTIVE) {
    return ineligible("SCHEDULE_NOT_ACTIVE", classification);
  }

  if (classification !== "RECURRING") {
    if (classification === "DIRECT_MAR") return ineligible("DIRECT_MAR", classification);
    if (classification === "ON_DEMAND") return ineligible("ON_DEMAND", classification);
    if (classification === "INFUSION_LIFECYCLE") {
      return ineligible("INFUSION_LIFECYCLE", classification);
    }
    return ineligible("NOT_RECURRING", classification);
  }

  const doseKind = parseMedicationDoseKind(input.doseKind);
  if (doseKind !== "FIXED_ADMINISTRATION") {
    return ineligible("NOT_FIXED_ADMINISTRATION", classification);
  }

  const expansion = evaluateMedicationDoseExpansionEligibility({
    frequencyCode: input.frequencyCode,
    catalog: input.catalog ?? null,
    orderRoute: input.orderRoute ?? null,
  });
  if (!expansion.shouldExpand) {
    if (expansion.classification === "INFUSION_LIFECYCLE") {
      return ineligible("INFUSION_LIFECYCLE", classification);
    }
    if (expansion.classification === "DIRECT_MAR") {
      return ineligible("DIRECT_MAR", classification);
    }
    if (expansion.classification === "ON_DEMAND") {
      return ineligible("ON_DEMAND", classification);
    }
    return ineligible("EXPANSION_INELIGIBLE", classification);
  }

  const doseStatus = parseMedicationDoseStatus(input.doseStatus);
  if (!doseStatus) {
    return ineligible("DOSE_STATUS_NOT_ADMINISTRABLE", classification);
  }

  if (isTerminalMedicationDoseStatus(doseStatus)) {
    return ineligible("DOSE_ALREADY_TERMINAL", classification);
  }

  if (doseStatus === "HELD") {
    return ineligible("DOSE_STATUS_NOT_ADMINISTRABLE", classification);
  }

  if (input.terminalMedicationAdministrationId?.trim()) {
    return ineligible("DOSE_ALREADY_HAS_TERMINAL_MAR", classification);
  }

  if (input.doseOrderItemId !== input.requestOrderItemId) {
    return ineligible("ORDER_ITEM_MISMATCH", classification);
  }

  if (input.doseEncounterId !== input.requestEncounterId) {
    return ineligible("ENCOUNTER_MISMATCH", classification);
  }

  if (input.doseFacilityId !== input.requestFacilityId) {
    return ineligible("FACILITY_MISMATCH", classification);
  }

  const now = input.now ?? new Date();
  if (input.dueWindowStartAt && input.dueWindowEndAt) {
    if (
      !isDoseAdministrableNow({
        doseStatus,
        now,
        dueWindowStartAt: input.dueWindowStartAt,
        dueWindowEndAt: input.dueWindowEndAt,
      })
    ) {
      return ineligible("DOSE_OUTSIDE_ADMINISTRATION_WINDOW", classification);
    }
  } else if (
    doseStatus === "PLANNED" ||
    !["DUE", "OVERDUE", "IN_PROGRESS"].includes(doseStatus)
  ) {
    return ineligible("DOSE_STATUS_NOT_ADMINISTRABLE", classification);
  }

  return {
    eligible: true,
    reason: "DOSE_GATED_MAR_ELIGIBLE",
    scheduleClassification: classification,
  };
}

export function isDoseGatedMarEligible(
  input: MedicationDoseGatedMarEligibilityInput
): boolean {
  return evaluateDoseGatedMarEligibility(input).eligible;
}

export function assertDoseGatedMarEligibility(
  input: MedicationDoseGatedMarEligibilityInput
): MedicationDoseGatedMarEligibilityResult {
  const result = evaluateDoseGatedMarEligibility(input);
  if (!result.eligible) {
    throw new DoseGatedMarEligibilityError(
      result.reason,
      `Dose-gated MAR not eligible: ${result.reason}`
    );
  }
  return result;
}
