import { isPrnMedicationOrder } from "../mar/medicationAdministrationPrnGovernance.js";
import {
  isDirectMarFrequency,
  orderLineCompletesOnTerminalMarForFrequency,
} from "./medicationFrequencyEdHardening.js";
import { medicationDoseGatedMarEnabled } from "./medicationDoseMarFeatureFlags.js";
import type { MedicationSchedulingFeatureFlags } from "./medicationFrequencyEdHardening.js";
import {
  resolveScheduleClassification,
  type MedicationScheduleClassification,
} from "./medicationScheduleClassification.js";

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

export type ShouldSkipOrderLineCompletionForMarInput = {
  featureFlags?: Partial<MedicationSchedulingFeatureFlags> | null;
  frequencyCode?: string | null;
  directionsSig?: string | null;
  orderRoute?: string | null;
  scheduleClassification?: MedicationScheduleClassification | null;
  doseGatedMarPathUsed: boolean;
};

/**
 * Classification-based MAR completion policy (MEDUI.ED.MAR.H2).
 *
 * Repeating PRN / ON_DEMAND orders remain active after a single terminal MAR.
 * Direct-MAR one-time frequencies (NOW, STAT, ONCE) still complete on terminal MAR.
 */
export function shouldSkipOrderLineCompletionForMar(
  input: ShouldSkipOrderLineCompletionForMarInput
): boolean {
  if (
    shouldSkipOrderLineCompletionForDoseGatedMar({
      featureFlags: input.featureFlags,
      frequencyCode: input.frequencyCode,
      scheduleClassification: input.scheduleClassification,
      doseGatedMarPathUsed: input.doseGatedMarPathUsed,
    })
  ) {
    return true;
  }

  const classification =
    input.scheduleClassification ??
    resolveScheduleClassification({
      frequencyCode: input.frequencyCode,
      orderRoute: input.orderRoute,
    });

  if (classification === "ON_DEMAND") {
    return true;
  }

  if (
    isPrnMedicationOrder({
      frequencyCode: input.frequencyCode,
      directionsSig: input.directionsSig,
    }) &&
    !isDirectMarFrequency(input.frequencyCode)
  ) {
    return true;
  }

  return false;
}

export type ShouldAllowOrderLineCompletionDespitePrnContinuityInput = {
  skipForPrnContinuity: boolean;
  marAction: string;
  prescribedQuantity: number | null | undefined;
  priorAdministeredSum: number;
  administrationIncrement: number | null | undefined;
};

/**
 * When PRN continuity would skip completion, still allow COMPLETED when the
 * prescribed quantity is exhausted by this administration.
 */
export function shouldAllowOrderLineCompletionDespitePrnContinuity(
  input: ShouldAllowOrderLineCompletionDespitePrnContinuityInput
): boolean {
  if (!input.skipForPrnContinuity) return false;
  if (input.marAction !== "administered") return false;

  const prescribed = input.prescribedQuantity;
  if (prescribed == null || !Number.isFinite(Number(prescribed)) || Number(prescribed) <= 0) {
    return false;
  }

  const increment = input.administrationIncrement;
  if (increment == null || !Number.isFinite(Number(increment)) || Number(increment) <= 0) {
    return false;
  }

  return input.priorAdministeredSum + Number(increment) >= Number(prescribed);
}

/** Documents alignment between recurring schedules and the frequency completion contract. */
export function recurringFrequencySkipsSingleTerminalMarCompletion(
  frequencyCode: string | null | undefined
): boolean {
  return !orderLineCompletesOnTerminalMarForFrequency(frequencyCode);
}
