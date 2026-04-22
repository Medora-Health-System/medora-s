/**
 * Phase 7.1 — Structured claim completeness (single aggregation layer).
 * Composes encounter validation, identity gaps, export context, and line-level checks.
 * Does not re-run Prisma identity queries; callers pass `identityGaps` from `evaluateClaimIdentityGaps`.
 */

export type ClaimCompletenessInput = {
  /** Output of `evaluateClaimIdentityGaps` (stable MISSING_* codes). */
  identityGaps: readonly string[];
  /** Encounter-level validation blocker codes from `claim-validation.util`. */
  encounterValidationSummaryBlockers: readonly string[];
  encounterValidationSummaryWarnings: readonly string[];
  professionalBlockers: readonly string[];
  professionalWarnings: readonly string[];
  facilityBlockers: readonly string[];
  facilityWarnings: readonly string[];
  /** Export context hints (e.g. EXPORT_CONTEXT_NO_SERVICE_DATE_RANGE). */
  contextWarnings: readonly string[];
  /** Distinct diagnosis tokens already collected for export. */
  diagnosisCodes: readonly string[];
  hasProfessionalPackage: boolean;
  hasFacilityPackage: boolean;
  /** Facility-side export lines only (for revenue code presence). */
  facilityExportLines: readonly { revenueCode?: string | null }[];
  /** Phase 7.4 — Auditable provider-role fallback hints (merged into `warnings`). */
  roleResolutionWarnings?: readonly string[];
};

export type ClaimCompletenessResult = {
  claimReady: boolean;
  blockers: string[];
  warnings: string[];
  info: string[];
};

const IDENTITY_BLOCKERS = new Set([
  "MISSING_FACILITY_EXPORT_CONTEXT",
  "MISSING_PAYER_CONTEXT",
  "MISSING_PRIMARY_COVERAGE",
  "MULTIPLE_PRIMARY_COVERAGE",
  "MISSING_SUBSCRIBER_RELATIONSHIP",
  "MISSING_SUBSCRIBER_NAME",
  "MISSING_PAYER_SOURCE",
  "AMBIGUOUS_PAYER",
  "MISSING_RENDERING_PROVIDER",
  "MISSING_BILLING_PROVIDER",
  "MISSING_RENDERING_PROVIDER_NPI",
  "MISSING_BILLING_PROVIDER_NPI",
  /** Legacy identity code; retained for older stored payloads. */
  "MISSING_PROVIDER_NPI",
]);

function addAll(target: Set<string>, codes: readonly string[]): void {
  for (const c of codes) {
    const t = c?.trim();
    if (t) target.add(t);
  }
}

/**
 * Deterministic completeness for one encounter export build.
 * `claimReady` is true iff `blockers` is empty after merge.
 */
export function evaluateClaimCompleteness(input: ClaimCompletenessInput): ClaimCompletenessResult {
  const blockers = new Set<string>();
  const warnings = new Set<string>();
  const info = new Set<string>();

  info.add("INFO_EXPORT_NOT_INTERCHANGE_SUBMISSION");

  const gapSet = new Set(input.identityGaps);
  for (const g of gapSet) {
    if (IDENTITY_BLOCKERS.has(g)) {
      blockers.add(g);
    }
  }
  if (gapSet.has("MISSING_SUBSCRIBER_DATA") && !gapSet.has("MISSING_PAYER_CONTEXT")) {
    warnings.add("INCOMPLETE_SUBSCRIBER_DATA");
  }

  const hasAnyPackage = input.hasProfessionalPackage || input.hasFacilityPackage;
  if (hasAnyPackage && input.diagnosisCodes.length === 0) {
    blockers.add("NO_DIAGNOSIS_CODES");
  }

  addAll(blockers, input.encounterValidationSummaryBlockers);
  addAll(blockers, input.professionalBlockers);
  addAll(blockers, input.facilityBlockers);

  addAll(warnings, input.encounterValidationSummaryWarnings);
  addAll(warnings, input.professionalWarnings);
  addAll(warnings, input.facilityWarnings);
  addAll(warnings, input.roleResolutionWarnings ?? []);

  if (input.contextWarnings.includes("EXPORT_CONTEXT_NO_SERVICE_DATE_RANGE")) {
    warnings.add("INCOMPLETE_SERVICE_DATES");
  }
  const hasProviderHardGap = [
    "MISSING_RENDERING_PROVIDER",
    "MISSING_BILLING_PROVIDER",
    "MISSING_RENDERING_PROVIDER_NPI",
    "MISSING_BILLING_PROVIDER_NPI",
    "MISSING_PROVIDER_NPI",
  ].some((code) => gapSet.has(code));
  if (input.contextWarnings.includes("EXPORT_CONTEXT_NO_PROVIDER_ON_ENCOUNTER") && !hasProviderHardGap) {
    warnings.add("EXPORT_CONTEXT_NO_PROVIDER_ON_ENCOUNTER");
  }

  if (input.hasFacilityPackage) {
    const missingRev = input.facilityExportLines.some((l) => !l.revenueCode?.trim());
    if (missingRev) {
      warnings.add("FACILITY_LINE_MISSING_REVENUE_CODE");
    }
  }

  const blockerList = [...blockers].sort((a, b) => a.localeCompare(b));
  const warningList = [...warnings].sort((a, b) => a.localeCompare(b));
  const infoList = [...info].sort((a, b) => a.localeCompare(b));

  return {
    claimReady: blockerList.length === 0,
    blockers: blockerList,
    warnings: warningList,
    info: infoList,
  };
}
