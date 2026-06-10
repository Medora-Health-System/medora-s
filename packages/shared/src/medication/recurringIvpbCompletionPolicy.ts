import { medicationIvpbDoseSchedulingEnabled } from "./medicationIvpbDoseFeatureFlags.js";
import type { MedicationSchedulingFeatureFlags } from "./medicationFrequencyEdHardening.js";
import { isRecurringIvpbScheduleClassification } from "./medicationScheduleClassification.js";

export type ShouldCompleteRecurringIvpbOrderLineInput = {
  featureFlags?: Partial<MedicationSchedulingFeatureFlags> | null;
  scheduleClassification?: string | null;
  /** True when one IVPB_SESSION dose reached COMPLETED via STOP. */
  singleDoseCompleted?: boolean;
};

/**
 * Recurring IVPB order lines must stay active after one completed dose (M1.8B.7J.1).
 * Aligns with dose-gated recurring PO behavior (7I completion policy).
 */
export function shouldCompleteRecurringIvpbOrderLine(
  input: ShouldCompleteRecurringIvpbOrderLineInput
): boolean {
  if (!isRecurringIvpbScheduleClassification(input.scheduleClassification)) {
    return false;
  }

  if (!medicationIvpbDoseSchedulingEnabled(input.featureFlags)) {
    return false;
  }

  if (input.singleDoseCompleted === true) {
    return false;
  }

  return false;
}

/** Documents contract: recurring IVPB never completes on first dose. */
export function recurringIvpbSkipsSingleDoseOrderLineCompletion(
  scheduleClassification: string | null | undefined
): boolean {
  return isRecurringIvpbScheduleClassification(scheduleClassification);
}
