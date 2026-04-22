/**
 * Phase 7.1 — Structured claim completeness (single aggregation layer).
 * Phase 7.5 — Side-segmented readiness (professional vs facility) while preserving encounter-level fields.
 *
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
  /** Phase 7.4 — Auditable provider-role fallback hints (merged into professional warnings when a pro package exists). */
  roleResolutionWarnings?: readonly string[];
};

export type ClaimCompletenessResult = {
  /** Encounter-level: true iff union of all side blockers is empty (and legacy semantics). */
  claimReady: boolean;
  blockers: string[];
  warnings: string[];
  info: string[];
  professionalClaimReady: boolean;
  professionalClaimBlockers: string[];
  professionalClaimWarnings: string[];
  professionalClaimInfo: string[];
  facilityClaimReady: boolean;
  facilityClaimBlockers: string[];
  facilityClaimWarnings: string[];
  facilityClaimInfo: string[];
};

/** Identity gap codes that apply to any billable package (payer / subscriber / coverage). */
const SHARED_IDENTITY_GAP_CODES = new Set([
  "MISSING_PAYER_CONTEXT",
  "MISSING_PRIMARY_COVERAGE",
  "MULTIPLE_PRIMARY_COVERAGE",
  "MISSING_SUBSCRIBER_RELATIONSHIP",
  "MISSING_SUBSCRIBER_NAME",
  "MISSING_PAYER_SOURCE",
  "AMBIGUOUS_PAYER",
]);

/** Identity gap codes that apply only when a professional export package exists. */
const PROFESSIONAL_ONLY_IDENTITY_GAP_CODES = new Set([
  "MISSING_RENDERING_PROVIDER",
  "MISSING_BILLING_PROVIDER",
  "MISSING_RENDERING_PROVIDER_NPI",
  "MISSING_BILLING_PROVIDER_NPI",
  "MISSING_PROVIDER_NPI",
]);

/** Identity gap codes that apply only when a facility export package exists. */
const FACILITY_ONLY_IDENTITY_GAP_CODES = new Set(["MISSING_FACILITY_EXPORT_CONTEXT"]);

const ALL_PROMOTED_IDENTITY_CODES = new Set([
  ...SHARED_IDENTITY_GAP_CODES,
  ...PROFESSIONAL_ONLY_IDENTITY_GAP_CODES,
  ...FACILITY_ONLY_IDENTITY_GAP_CODES,
]);

function addAll(target: Set<string>, codes: readonly string[]): void {
  for (const c of codes) {
    const t = c?.trim();
    if (t) target.add(t);
  }
}

function addSharedToSides(
  codes: readonly string[],
  prof: Set<string>,
  fac: Set<string>,
  hasProfessionalPackage: boolean,
  hasFacilityPackage: boolean
): void {
  for (const c of codes) {
    if (hasProfessionalPackage) prof.add(c);
    if (hasFacilityPackage) fac.add(c);
  }
}

/**
 * Deterministic completeness for one encounter export build.
 * Side fields: when a package does not exist, that side is treated as ready (nothing to export on that side).
 */
export function evaluateClaimCompleteness(input: ClaimCompletenessInput): ClaimCompletenessResult {
  const gapSet = new Set(input.identityGaps);

  const profBlockers = new Set<string>();
  const facBlockers = new Set<string>();
  /** Blockers when no export package exists on either side (identity / encounter validation still applies). */
  const encounterOnlyBlockers = new Set<string>();
  const hasSide = input.hasProfessionalPackage || input.hasFacilityPackage;

  const routeSharedBlockers = (codes: readonly string[]): void => {
    if (hasSide) {
      addSharedToSides(codes, profBlockers, facBlockers, input.hasProfessionalPackage, input.hasFacilityPackage);
    } else {
      addAll(encounterOnlyBlockers, codes);
    }
  };

  for (const g of gapSet) {
    if (!ALL_PROMOTED_IDENTITY_CODES.has(g)) continue;
    if (SHARED_IDENTITY_GAP_CODES.has(g)) {
      routeSharedBlockers([g]);
    } else if (PROFESSIONAL_ONLY_IDENTITY_GAP_CODES.has(g)) {
      if (input.hasProfessionalPackage) profBlockers.add(g);
      else if (!hasSide) encounterOnlyBlockers.add(g);
    } else if (FACILITY_ONLY_IDENTITY_GAP_CODES.has(g)) {
      if (input.hasFacilityPackage) facBlockers.add(g);
      else if (!hasSide) encounterOnlyBlockers.add(g);
    }
  }

  routeSharedBlockers(input.encounterValidationSummaryBlockers);
  addAll(profBlockers, input.professionalBlockers);
  addAll(facBlockers, input.facilityBlockers);

  const hasAnyPackage = input.hasProfessionalPackage || input.hasFacilityPackage;
  if (hasAnyPackage && input.diagnosisCodes.length === 0) {
    routeSharedBlockers(["NO_DIAGNOSIS_CODES"]);
  }

  const profWarnings = new Set<string>();
  const facWarnings = new Set<string>();
  const encounterOnlyWarnings = new Set<string>();

  const routeSharedWarnings = (codes: readonly string[]): void => {
    if (hasSide) {
      addSharedToSides(codes, profWarnings, facWarnings, input.hasProfessionalPackage, input.hasFacilityPackage);
    } else {
      addAll(encounterOnlyWarnings, codes);
    }
  };

  routeSharedWarnings(input.encounterValidationSummaryWarnings);
  addAll(profWarnings, input.professionalWarnings);
  addAll(facWarnings, input.facilityWarnings);

  if (gapSet.has("MISSING_SUBSCRIBER_DATA") && !gapSet.has("MISSING_PAYER_CONTEXT")) {
    routeSharedWarnings(["INCOMPLETE_SUBSCRIBER_DATA"]);
  }

  if (input.contextWarnings.includes("EXPORT_CONTEXT_NO_SERVICE_DATE_RANGE")) {
    routeSharedWarnings(["INCOMPLETE_SERVICE_DATES"]);
  }

  const hasProviderHardGap = [
    "MISSING_RENDERING_PROVIDER",
    "MISSING_BILLING_PROVIDER",
    "MISSING_RENDERING_PROVIDER_NPI",
    "MISSING_BILLING_PROVIDER_NPI",
    "MISSING_PROVIDER_NPI",
  ].some((code) => gapSet.has(code));
  if (input.contextWarnings.includes("EXPORT_CONTEXT_NO_PROVIDER_ON_ENCOUNTER") && !hasProviderHardGap) {
    if (input.hasProfessionalPackage) profWarnings.add("EXPORT_CONTEXT_NO_PROVIDER_ON_ENCOUNTER");
    else if (!hasSide) encounterOnlyWarnings.add("EXPORT_CONTEXT_NO_PROVIDER_ON_ENCOUNTER");
  }

  if (input.hasProfessionalPackage) {
    addAll(profWarnings, input.roleResolutionWarnings ?? []);
  }

  if (input.hasFacilityPackage) {
    const missingRev = input.facilityExportLines.some((l) => !l.revenueCode?.trim());
    if (missingRev) {
      facWarnings.add("FACILITY_LINE_MISSING_REVENUE_CODE");
    }
  }

  const professionalClaimBlockers = [...profBlockers].sort((a, b) => a.localeCompare(b));
  const facilityClaimBlockers = [...facBlockers].sort((a, b) => a.localeCompare(b));

  const professionalClaimReady = !input.hasProfessionalPackage || professionalClaimBlockers.length === 0;
  const facilityClaimReady = !input.hasFacilityPackage || facilityClaimBlockers.length === 0;

  const unionBlockers = new Set<string>([...encounterOnlyBlockers, ...profBlockers, ...facBlockers]);
  /** Overall: every present package side must be ready; plus encounter-only blockers when no packages (Phase 7.5). */
  const encounterReady =
    encounterOnlyBlockers.size === 0 &&
    (!input.hasProfessionalPackage || professionalClaimReady) &&
    (!input.hasFacilityPackage || facilityClaimReady);

  const professionalClaimWarnings = [...profWarnings].sort((a, b) => a.localeCompare(b));
  const facilityClaimWarnings = [...facWarnings].sort((a, b) => a.localeCompare(b));

  const info = new Set<string>(["INFO_EXPORT_NOT_INTERCHANGE_SUBMISSION"]);
  const professionalClaimInfo = input.hasProfessionalPackage ? [...info].sort((a, b) => a.localeCompare(b)) : [];
  const facilityClaimInfo = input.hasFacilityPackage ? [...info].sort((a, b) => a.localeCompare(b)) : [];
  const infoList = [...info].sort((a, b) => a.localeCompare(b));

  const blockers = [...unionBlockers].sort((a, b) => a.localeCompare(b));
  const warnings = [...new Set([...encounterOnlyWarnings, ...profWarnings, ...facWarnings])].sort((a, b) =>
    a.localeCompare(b)
  );

  return {
    claimReady: encounterReady,
    blockers,
    warnings,
    info: infoList,
    professionalClaimReady,
    professionalClaimBlockers,
    professionalClaimWarnings,
    professionalClaimInfo,
    facilityClaimReady,
    facilityClaimBlockers,
    facilityClaimWarnings,
    facilityClaimInfo,
  };
}
