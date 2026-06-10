import {
  MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF,
  type MedicationSchedulingFeatureFlags,
} from "./medicationFrequencyEdHardening.js";

/**
 * M1.8B.7I.1 — dose-gated MAR feature flag gate (shared contract only).
 *
 * Requires all three scheduling/dose/MAR flags — distinct from HOSPITAL_EMAR (UI/readiness).
 */
export function medicationDoseGatedMarEnabled(
  flags: Partial<MedicationSchedulingFeatureFlags> | null | undefined
): boolean {
  const merged: MedicationSchedulingFeatureFlags = {
    ...MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF,
    ...flags,
  };
  return (
    merged.MEDICATION_SCHEDULING_V1 === true &&
    merged.MEDICATION_DOSE_INSTANCES === true &&
    merged.MEDICATION_DOSE_GATED_MAR === true
  );
}
