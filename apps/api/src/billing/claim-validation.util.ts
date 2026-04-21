import type { BillingEvent } from "@prisma/client";

/** Minimal package shape for validation (avoids circular import with claim-builder). */
export type ClaimPackageInput = {
  lines: unknown[];
  totalLines: number;
  missingCodes: number;
};

/** Stable validation codes for UI i18n (`billingPage.claimValidation_<CODE>`). */
export type ClaimValidationIssueCode =
  | "MISSING_BILLABLE_CODES"
  | "NO_CLAIM_LINES"
  | "MULTIPLE_ENCOUNTER_EM"
  | "MED_ADMIN_HCPCS_WITHOUT_PROCEDURE_CPT"
  | "NO_PRIMARY_PROFESSIONAL_CODE"
  | "NO_FACILITY_LINES"
  | "UNRESOLVED_UNKNOWN_SIDE"
  | "UNRESOLVED_BOTH_SIDE"
  | "NO_BILLABLE_EVENTS"
  | "EMPTY_PACKAGE_WITH_BLOCKERS"
  | "NO_ASSEMBLED_LINES";

export type ClaimValidationIssue = {
  code: ClaimValidationIssueCode;
  severity: "warning" | "blocker";
};

export type ClaimPackageValidation = {
  ready: boolean;
  blockers: ClaimValidationIssue[];
  warnings: ClaimValidationIssue[];
};

export type ClaimEncounterValidation = {
  summary: {
    ready: boolean;
    blockers: ClaimValidationIssue[];
    warnings: ClaimValidationIssue[];
  };
  professional: ClaimPackageValidation;
  facility: ClaimPackageValidation;
};

function issue(code: ClaimValidationIssueCode, severity: "warning" | "blocker"): ClaimValidationIssue {
  return { code, severity };
}

function pushUnique(into: ClaimValidationIssue[], item: ClaimValidationIssue): void {
  if (!into.some((x) => x.code === item.code && x.severity === item.severity)) into.push(item);
}

/** Context from claim assembly (deterministic counters only). */
export type ClaimAssemblyValidationContext = {
  blockingNoExtractBoth: number;
  blockingNoExtractUnknown: number;
  medAdminHcpcsWithoutProcedure: number;
  multipleEmSuppressedProf: number;
  multipleEmSuppressedFac: number;
};

/**
 * Phase 5.2 — deterministic claim validation (no payer rules, no pricing).
 * Derived only from ledger rows + assembled packages.
 */
export function buildEncounterClaimValidation(
  active: BillingEvent[],
  omitFromClaimAssembly: (ev: Pick<BillingEvent, "sourceModule" | "codeType" | "procedureCode" | "hcpcsCode" | "code">) => boolean,
  professional: ClaimPackageInput,
  facility: ClaimPackageInput,
  summaryMissing: number,
  ctx: ClaimAssemblyValidationContext
): ClaimEncounterValidation {
  const eligibleForAssembly = active.filter((ev) => !omitFromClaimAssembly(ev));
  const eligibleCount = eligibleForAssembly.length;

  const profBlockers: ClaimValidationIssue[] = [];
  const profWarnings: ClaimValidationIssue[] = [];
  const facBlockers: ClaimValidationIssue[] = [];
  const facWarnings: ClaimValidationIssue[] = [];
  const sumBlockers: ClaimValidationIssue[] = [];
  const sumWarnings: ClaimValidationIssue[] = [];

  /* --- Professional package --- */
  if (professional.missingCodes > 0 && professional.lines.length === 0) {
    pushUnique(profBlockers, issue("EMPTY_PACKAGE_WITH_BLOCKERS", "blocker"));
  } else if (professional.missingCodes > 0) {
    pushUnique(profBlockers, issue("MISSING_BILLABLE_CODES", "blocker"));
  }
  if (professional.lines.length === 0 && professional.missingCodes === 0) {
    pushUnique(profWarnings, issue("NO_CLAIM_LINES", "warning"));
  }
  if (ctx.multipleEmSuppressedProf > 0) {
    pushUnique(profWarnings, issue("MULTIPLE_ENCOUNTER_EM", "warning"));
  }
  if (ctx.medAdminHcpcsWithoutProcedure > 0) {
    pushUnique(profWarnings, issue("MED_ADMIN_HCPCS_WITHOUT_PROCEDURE_CPT", "warning"));
  }
  if (ctx.blockingNoExtractUnknown > 0) {
    pushUnique(profWarnings, issue("UNRESOLVED_UNKNOWN_SIDE", "warning"));
  }
  if (ctx.blockingNoExtractBoth > 0) {
    pushUnique(profWarnings, issue("UNRESOLVED_BOTH_SIDE", "warning"));
  }
  if (
    professional.lines.length === 0 &&
    facility.lines.length > 0 &&
    summaryMissing === 0 &&
    professional.missingCodes === 0
  ) {
    pushUnique(profWarnings, issue("NO_PRIMARY_PROFESSIONAL_CODE", "warning"));
  }

  /* --- Facility package --- */
  if (facility.missingCodes > 0 && facility.lines.length === 0) {
    pushUnique(facBlockers, issue("EMPTY_PACKAGE_WITH_BLOCKERS", "blocker"));
  } else if (facility.missingCodes > 0) {
    pushUnique(facBlockers, issue("MISSING_BILLABLE_CODES", "blocker"));
  }
  if (facility.lines.length === 0 && facility.missingCodes === 0) {
    pushUnique(facWarnings, issue("NO_CLAIM_LINES", "warning"));
  }
  if (ctx.multipleEmSuppressedFac > 0) {
    pushUnique(facWarnings, issue("MULTIPLE_ENCOUNTER_EM", "warning"));
  }
  if (ctx.medAdminHcpcsWithoutProcedure > 0) {
    pushUnique(facWarnings, issue("MED_ADMIN_HCPCS_WITHOUT_PROCEDURE_CPT", "warning"));
  }
  if (ctx.blockingNoExtractUnknown > 0) {
    pushUnique(facWarnings, issue("UNRESOLVED_UNKNOWN_SIDE", "warning"));
  }
  if (ctx.blockingNoExtractBoth > 0) {
    pushUnique(facWarnings, issue("UNRESOLVED_BOTH_SIDE", "warning"));
  }
  if (
    facility.lines.length === 0 &&
    professional.lines.length > 0 &&
    summaryMissing === 0 &&
    facility.missingCodes === 0
  ) {
    pushUnique(facWarnings, issue("NO_FACILITY_LINES", "warning"));
  }

  /* --- Encounter summary (rollup; avoid duplicate blockers already implied by summaryMissing) --- */
  if (summaryMissing > 0) {
    pushUnique(sumBlockers, issue("MISSING_BILLABLE_CODES", "blocker"));
  }
  if (eligibleCount === 0) {
    pushUnique(sumWarnings, issue("NO_BILLABLE_EVENTS", "warning"));
  }
  const totalAssembled = professional.totalLines + facility.totalLines;
  if (totalAssembled === 0 && summaryMissing === 0 && active.length > 0) {
    pushUnique(sumWarnings, issue("NO_ASSEMBLED_LINES", "warning"));
  }
  if (ctx.blockingNoExtractUnknown > 0) {
    pushUnique(sumWarnings, issue("UNRESOLVED_UNKNOWN_SIDE", "warning"));
  }
  if (ctx.blockingNoExtractBoth > 0) {
    pushUnique(sumWarnings, issue("UNRESOLVED_BOTH_SIDE", "warning"));
  }
  if (ctx.medAdminHcpcsWithoutProcedure > 0) {
    pushUnique(sumWarnings, issue("MED_ADMIN_HCPCS_WITHOUT_PROCEDURE_CPT", "warning"));
  }
  if (ctx.multipleEmSuppressedProf + ctx.multipleEmSuppressedFac > 0) {
    pushUnique(sumWarnings, issue("MULTIPLE_ENCOUNTER_EM", "warning"));
  }

  /** Roll up package issues into encounter summary (dedupe by code + severity). */
  for (const x of profBlockers) pushUnique(sumBlockers, x);
  for (const x of facBlockers) pushUnique(sumBlockers, x);
  for (const x of profWarnings) pushUnique(sumWarnings, x);
  for (const x of facWarnings) pushUnique(sumWarnings, x);

  const profReady = profBlockers.length === 0;
  const facReady = facBlockers.length === 0;
  const sumReady = sumBlockers.length === 0;

  return {
    summary: {
      ready: sumReady,
      blockers: sumBlockers,
      warnings: sumWarnings,
    },
    professional: {
      ready: profReady,
      blockers: profBlockers,
      warnings: profWarnings,
    },
    facility: {
      ready: facReady,
      blockers: facBlockers,
      warnings: facWarnings,
    },
  };
}
