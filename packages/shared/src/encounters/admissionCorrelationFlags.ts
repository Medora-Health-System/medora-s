/**
 * D3E.8 — Admission correlation feature flags.
 * Production defaults OFF. Wrong-reuse prevention is always on in shared policy;
 * new persistence UI / diagnostics surfaces may remain gated.
 */

function isTruthyFlag(value: string | undefined | null): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export type AdmissionCorrelationFlagEnv = {
  ADMISSION_CORRELATION_ENABLED?: string | null;
  NEXT_PUBLIC_ADMISSION_CORRELATION_ENABLED?: string | null;
  NODE_ENV?: string | null;
};

export function admissionCorrelationFlagsFromProcessEnv(
  processEnv: NodeJS.ProcessEnv = typeof process !== "undefined" ? process.env : {}
): AdmissionCorrelationFlagEnv {
  return {
    ADMISSION_CORRELATION_ENABLED: processEnv.ADMISSION_CORRELATION_ENABLED,
    NEXT_PUBLIC_ADMISSION_CORRELATION_ENABLED:
      processEnv.NEXT_PUBLIC_ADMISSION_CORRELATION_ENABLED,
    NODE_ENV: processEnv.NODE_ENV,
  };
}

/** New UI / diagnostics surfaces — production OFF. */
export function admissionCorrelationUiEnabled(
  env?: AdmissionCorrelationFlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.ADMISSION_CORRELATION_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_ADMISSION_CORRELATION_ENABLED)
  );
}

export function admissionCorrelationProductionDefaultsAreOff(
  env: AdmissionCorrelationFlagEnv = {}
): boolean {
  return (
    !isTruthyFlag(env.ADMISSION_CORRELATION_ENABLED) &&
    !isTruthyFlag(env.NEXT_PUBLIC_ADMISSION_CORRELATION_ENABLED)
  );
}

/**
 * Safe correctness: wrong open-IP reuse prevention is always enforced in
 * resolveReceivingEncounterReuse / concurrent policy — not gated by this flag.
 */
export function wrongOpenInpatientReusePreventionAlwaysOn(): true {
  return true;
}
