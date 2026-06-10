import { orderLineCompletesOnTerminalMarForFrequency } from "./medicationFrequencyEdHardening.js";
import { medicationDoseGatedMarEnabled } from "./medicationDoseMarFeatureFlags.js";
import type { MedicationSchedulingFeatureFlags } from "./medicationFrequencyEdHardening.js";
import type { MedicationScheduleClassification } from "./medicationScheduleClassification.js";

export type ShouldSkipOrderLineCompletionForDoseGatedMarInput = {
  featureFlags?: Partial<MedicationSchedulingFeatureFlags> | null;
  frequencyCode?: string | null;
  scheduleClassification?: MedicationScheduleClassification | null;
  /** True when MAR create used an eligible dose-gated path (medicationDoseInstanceId set). */
  doseGatedMarPathUsed: boolean;
};

/**
 * Returns true when OrderItem must NOT transition to COMPLETED after terminal MAR (M1.8B.7I).
 *
 * Integrates with orderLineCompletesOnTerminalMarForFrequency(): recurring scheduled
 * medications never complete on a single terminal MAR when dose-gated MAR is enabled.
 */
export function shouldSkipOrderLineCompletionForDoseGatedMar(
  input: ShouldSkipOrderLineCompletionForDoseGatedMarInput
): boolean {
  if (!medicationDoseGatedMarEnabled(input.featureFlags)) {
    return false;
  }

  if (input.doseGatedMarPathUsed) {
    return true;
  }

  if (input.scheduleClassification === "RECURRING") {
    return true;
  }

  return false;
}

/** Documents alignment between recurring schedules and the frequency completion contract. */
export function recurringFrequencySkipsSingleTerminalMarCompletion(
  frequencyCode: string | null | undefined
): boolean {
  return !orderLineCompletesOnTerminalMarForFrequency(frequencyCode);
}
