/** Phase 2B.2 — terminology feature flags (env-only; default off). */

export function isEnvFlagTrue(name: string): boolean {
  return process.env[name] === "true";
}

export function isTerminologyReadClassifierEnabled(): boolean {
  return isEnvFlagTrue("TERMINOLOGY_READ_CLASSIFIER");
}

export function isTerminologySearchClassifierEnabled(): boolean {
  return isEnvFlagTrue("TERMINOLOGY_SEARCH_CLASSIFIER");
}

export function isTerminologyBackfillEnabled(): boolean {
  return isEnvFlagTrue("TERMINOLOGY_BACKFILL_ENABLED");
}
