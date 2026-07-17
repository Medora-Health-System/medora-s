export const RXNORM_IMPORT_MODE_VALUES = [
  "VALIDATE_ONLY",
  "STAGE_ONLY",
  "CANDIDATE_MAPPING",
  "ACTIVATE_REFERENCE_RELEASE",
  "ROLLBACK_RELEASE",
] as const;

export type RxNormImportMode = (typeof RXNORM_IMPORT_MODE_VALUES)[number];

export const RXNORM_RELEASE_STATUS_VALUES = [
  "REGISTERED",
  "VALIDATING",
  "STAGING",
  "STAGED",
  "FAILED",
  "ACTIVE",
  "SUPERSEDED",
  "ROLLED_BACK",
] as const;

export type RxNormReleaseStatus = (typeof RXNORM_RELEASE_STATUS_VALUES)[number];

export const RXNORM_CANDIDATE_STATUS_VALUES = [
  "CANDIDATE",
  "NEEDS_REVIEW",
  "VERIFIED",
  "REJECTED",
  "AMBIGUOUS",
  "CONFLICT",
  "DEFERRED",
  "RETIRED",
] as const;

export type RxNormCandidateStatus = (typeof RXNORM_CANDIDATE_STATUS_VALUES)[number];

export const RXNORM_IMPORT_JOB_STATUS_VALUES = [
  "PENDING",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
] as const;

export type RxNormImportJobStatus = (typeof RXNORM_IMPORT_JOB_STATUS_VALUES)[number];

/** Phase 3 guardrail — automatic verification is forbidden. */
export function assertCandidateNotAutoVerified(autoVerified: boolean): void {
  if (autoVerified) {
    throw new Error(
      "Automatic RxNorm candidate verification is forbidden in Phase 3 (autoVerified must remain false)."
    );
  }
}
