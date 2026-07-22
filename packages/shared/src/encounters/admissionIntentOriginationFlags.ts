/**
 * D3E.8A — Admission intent origination feature flags.
 * Production defaults OFF.
 */

function isTruthyFlag(value: string | undefined | null): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export type AdmissionIntentOriginationFlagEnv = {
  EARLY_ADMISSION_CORRELATION_ENABLED?: string | null;
  NEXT_PUBLIC_EARLY_ADMISSION_CORRELATION_ENABLED?: string | null;
  OBSERVATION_INPATIENT_CONVERSION_ENABLED?: string | null;
  NEXT_PUBLIC_OBSERVATION_INPATIENT_CONVERSION_ENABLED?: string | null;
  ADMISSION_CORRELATION_RECONCILIATION_ENABLED?: string | null;
  NEXT_PUBLIC_ADMISSION_CORRELATION_RECONCILIATION_ENABLED?: string | null;
  NODE_ENV?: string | null;
};

export function admissionIntentOriginationFlagsFromProcessEnv(
  processEnv: NodeJS.ProcessEnv = typeof process !== "undefined" ? process.env : {}
): AdmissionIntentOriginationFlagEnv {
  return {
    EARLY_ADMISSION_CORRELATION_ENABLED: processEnv.EARLY_ADMISSION_CORRELATION_ENABLED,
    NEXT_PUBLIC_EARLY_ADMISSION_CORRELATION_ENABLED:
      processEnv.NEXT_PUBLIC_EARLY_ADMISSION_CORRELATION_ENABLED,
    OBSERVATION_INPATIENT_CONVERSION_ENABLED:
      processEnv.OBSERVATION_INPATIENT_CONVERSION_ENABLED,
    NEXT_PUBLIC_OBSERVATION_INPATIENT_CONVERSION_ENABLED:
      processEnv.NEXT_PUBLIC_OBSERVATION_INPATIENT_CONVERSION_ENABLED,
    ADMISSION_CORRELATION_RECONCILIATION_ENABLED:
      processEnv.ADMISSION_CORRELATION_RECONCILIATION_ENABLED,
    NEXT_PUBLIC_ADMISSION_CORRELATION_RECONCILIATION_ENABLED:
      processEnv.NEXT_PUBLIC_ADMISSION_CORRELATION_RECONCILIATION_ENABLED,
    NODE_ENV: processEnv.NODE_ENV,
  };
}

export function earlyAdmissionCorrelationEnabled(
  env?: AdmissionIntentOriginationFlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.EARLY_ADMISSION_CORRELATION_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_EARLY_ADMISSION_CORRELATION_ENABLED)
  );
}

export function observationInpatientConversionEnabled(
  env?: AdmissionIntentOriginationFlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.OBSERVATION_INPATIENT_CONVERSION_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_OBSERVATION_INPATIENT_CONVERSION_ENABLED)
  );
}

export function admissionCorrelationReconciliationEnabled(
  env?: AdmissionIntentOriginationFlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.ADMISSION_CORRELATION_RECONCILIATION_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_ADMISSION_CORRELATION_RECONCILIATION_ENABLED)
  );
}

export function admissionIntentOriginationProductionDefaultsAreOff(
  env: AdmissionIntentOriginationFlagEnv = {}
): boolean {
  return (
    !earlyAdmissionCorrelationEnabled(env) &&
    !observationInpatientConversionEnabled(env) &&
    !admissionCorrelationReconciliationEnabled(env)
  );
}

/** @alias admissionIntentOriginationFlagsFromProcessEnv */
export const fromProcessEnv = admissionIntentOriginationFlagsFromProcessEnv;

/** @alias admissionIntentOriginationProductionDefaultsAreOff */
export const productionDefaultsAreOff = admissionIntentOriginationProductionDefaultsAreOff;
