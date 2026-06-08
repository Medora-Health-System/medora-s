import {
  MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF,
  type MedicationSchedulingFeatureFlags,
} from "@medora/shared";

function envFlagTrue(key: string): boolean {
  const v = process.env[key];
  if (v == null || v.trim() === "") return false;
  const normalized = v.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

/** Reads scheduling flags from environment — all default OFF in production. */
export function getMedicationSchedulingFeatureFlagsFromEnv(): MedicationSchedulingFeatureFlags {
  return {
    ...MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF,
    MEDICATION_SCHEDULING_V1: envFlagTrue("MEDICATION_SCHEDULING_V1"),
    MEDICATION_DOSE_INSTANCES: envFlagTrue("MEDICATION_DOSE_INSTANCES"),
    MEDICATION_RESPONSE_ENGINE: envFlagTrue("MEDICATION_RESPONSE_ENGINE"),
    HOSPITAL_EMAR: envFlagTrue("HOSPITAL_EMAR"),
  };
}
