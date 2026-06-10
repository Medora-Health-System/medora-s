import {
  MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF,
  medicationSchedulingFeatureFlagsEnabled,
  type MedicationSchedulingFeatureFlags,
} from "./medicationFrequencyEdHardening.js";

/**
 * M1.8B.7J.1 — recurring IVPB dose scheduling feature flag (shared contract only).
 *
 * Default OFF. Requires base scheduling + dose-instance flags when wired in 7J.2+.
 */
export function medicationIvpbDoseSchedulingEnabled(
  flags: Partial<MedicationSchedulingFeatureFlags> | null | undefined
): boolean {
  const merged: MedicationSchedulingFeatureFlags = {
    ...MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF,
    ...flags,
  };
  return (
    medicationSchedulingFeatureFlagsEnabled(merged) &&
    merged.MEDICATION_IVPB_DOSE_SCHEDULING === true
  );
}
