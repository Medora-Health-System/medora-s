import { BillingSide, type BillingEvent } from "@prisma/client";
import {
  billingLedgerDiagnosisStringHasCode,
  billingLedgerRowHasUsableCode,
  billingLedgerRowIsDiagnosisLedgerLine,
  billingLedgerRowIsNonBillableDocumentationSource,
} from "@medora/shared";

/** Minimal package shape for validation (avoids circular import with claim-builder). */
export type ClaimPackageInput = {
  lines: unknown[];
  totalLines: number;
  missingCodes: number;
  /** Assembled line refs from claim assembly (Phase 5.3+). */
  claimLines?: ClaimValidationLineRef[];
};

/** Lightweight line shape for validation (mirrors assembled `ClaimLine` fields used in rules). */
export type ClaimValidationLineRef = {
  sourceModule: string;
  code: string;
  mergedFromCount?: number;
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
  | "NO_ASSEMBLED_LINES"
  | "SUPPRESSED_LINES_PRESENT"
  | "E_M_MISSING_FOR_PROFESSIONAL_PACKAGE"
  | "E_M_MULTIPLE_VISIBLE"
  | "E_M_LEVEL_SUSPECT"
  | "MODIFIER_POTENTIALLY_REQUIRED"
  | "PROCEDURE_WITHOUT_DIAGNOSIS_LINK"
  | "FACILITY_PACKAGE_WITHOUT_TECHNICAL_LINES"
  | "PROFESSIONAL_PACKAGE_WITHOUT_PROFESSIONAL_LINES"
  | "MED_ADMIN_ROUTE_MISSING_FOR_ADMIN_CPT"
  | "CLAIM_PACKAGE_INCONSISTENT"
  | "ENCOUNTER_BILLING_SIDE_MIX_REVIEW";

export type ClaimValidationIssue = {
  code: ClaimValidationIssueCode;
  severity: "warning" | "blocker";
  meta?: {
    suppressedCount?: number;
  };
};

export type ClaimPackageValidation = {
  ready: boolean;
  blockers: ClaimValidationIssue[];
  warnings: ClaimValidationIssue[];
};

/** Deterministic counts for API/debug (Phase 5.3). */
export type ClaimEncounterValidationMeta = {
  visibleEncounterEmCountProfessional: number;
  visibleEncounterEmCountFacility: number;
  diagnosisLinked: boolean;
  professionalLineCount: number;
  facilityLineCount: number;
};

export type ClaimEncounterValidation = {
  meta: ClaimEncounterValidationMeta;
  summary: {
    ready: boolean;
    blockers: ClaimValidationIssue[];
    warnings: ClaimValidationIssue[];
  };
  professional: ClaimPackageValidation;
  facility: ClaimPackageValidation;
};

function issue(
  code: ClaimValidationIssueCode,
  severity: "warning" | "blocker",
  meta?: ClaimValidationIssue["meta"]
): ClaimValidationIssue {
  return meta !== undefined ? { code, severity, meta } : { code, severity };
}

function pushUnique(into: ClaimValidationIssue[], item: ClaimValidationIssue): void {
  if (item.code === "SUPPRESSED_LINES_PRESENT" && item.severity === "warning") {
    const existing = into.find((x) => x.code === "SUPPRESSED_LINES_PRESENT" && x.severity === "warning");
    if (existing) {
      const a = existing.meta?.suppressedCount ?? 0;
      const b = item.meta?.suppressedCount ?? 0;
      existing.meta = { suppressedCount: a + b };
      return;
    }
  }
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

function isMedAdminModule(sm: string | undefined): boolean {
  const s = sm?.trim() ?? "";
  return s === "MED_ADMIN" || s === "MEDICATION_ADMINISTRATION";
}

function isEncounterEmModule(sm: string): boolean {
  return sm === "ENCOUNTER_EM";
}

function profClaimLines(claimLines: ClaimValidationLineRef[] | undefined): ClaimValidationLineRef[] {
  return claimLines ?? [];
}

function diagnosisPresentOnEncounter(active: BillingEvent[]): boolean {
  for (const ev of active) {
    if (billingLedgerDiagnosisStringHasCode(ev.diagnosisCodes)) return true;
    if (billingLedgerRowIsDiagnosisLedgerLine(ev.sourceModule) && ev.code?.trim()) return true;
  }
  return false;
}

function countMedAdminProcedureCptWithMissingRouteWhenMetadataPresent(active: BillingEvent[]): number {
  let n = 0;
  for (const ev of active) {
    if (!isMedAdminModule(ev.sourceModule)) continue;
    if (!ev.procedureCode?.trim()) continue;
    const m = ev.metadata;
    if (m == null || typeof m !== "object" || Array.isArray(m)) continue;
    const route = (m as Record<string, unknown>).route;
    if (typeof route === "string" && route.trim()) continue;
    n++;
  }
  return n;
}

function countDistinctEncounterEmProcedureCodesOnLedger(active: BillingEvent[]): number {
  const set = new Set<string>();
  for (const ev of active) {
    if ((ev.sourceModule as string) !== "ENCOUNTER_EM") continue;
    const pc = ev.procedureCode?.trim();
    if (pc) set.add(pc);
  }
  return set.size;
}

function inProfLedgerScope(side: BillingSide): boolean {
  return side === BillingSide.PROFESSIONAL || side === BillingSide.BOTH || side === BillingSide.UNKNOWN;
}

function inFacLedgerScope(side: BillingSide): boolean {
  return side === BillingSide.FACILITY || side === BillingSide.BOTH || side === BillingSide.UNKNOWN;
}

function countLedgerCodedRowsInScope(
  active: BillingEvent[],
  omitFromClaimAssembly: (ev: Pick<BillingEvent, "sourceModule" | "codeType" | "procedureCode" | "hcpcsCode" | "code">) => boolean,
  scope: (side: BillingSide) => boolean
): number {
  let n = 0;
  for (const ev of active) {
    if (omitFromClaimAssembly(ev)) continue;
    if (billingLedgerRowIsDiagnosisLedgerLine(ev.sourceModule)) continue;
    if (billingLedgerRowIsNonBillableDocumentationSource(ev.sourceModule)) continue;
    if (!scope(ev.billingSide)) continue;
    if (!billingLedgerRowHasUsableCode(ev)) continue;
    n++;
  }
  return n;
}

function countUnknownAndBothSides(
  active: BillingEvent[],
  omitFromClaimAssembly: (ev: Pick<BillingEvent, "sourceModule" | "codeType" | "procedureCode" | "hcpcsCode" | "code">) => boolean
): { unknown: number; both: number } {
  let unknown = 0;
  let both = 0;
  for (const ev of active) {
    if (omitFromClaimAssembly(ev)) continue;
    if (ev.billingSide === BillingSide.UNKNOWN) unknown++;
    if (ev.billingSide === BillingSide.BOTH) both++;
  }
  return { unknown, both };
}

function visibleEmCount(refs: ClaimValidationLineRef[]): number {
  return refs.filter((r) => isEncounterEmModule(r.sourceModule)).length;
}

function hasEmExpectationTrigger(refs: ClaimValidationLineRef[]): boolean {
  return refs.some((r) => {
    const m = r.sourceModule;
    return m === "PROCEDURE" || isMedAdminModule(m);
  });
}

function hasProcedureOrTechnicalProfessionalLine(refs: ClaimValidationLineRef[]): boolean {
  return refs.some((r) => {
    const m = r.sourceModule;
    return m === "PROCEDURE" || m === "IMAGING_RESULT" || m === "LAB_RESULT";
  });
}

function hasAnyProcedureLikeLine(profRefs: ClaimValidationLineRef[], facRefs: ClaimValidationLineRef[]): boolean {
  return [...profRefs, ...facRefs].some((r) => {
    const m = r.sourceModule;
    return m === "PROCEDURE" || m === "IMAGING_RESULT" || m === "LAB_RESULT";
  });
}

/**
 * Phase 5.2–5.3 — deterministic claim validation (no payer rules, no pricing).
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

  const profRefs = profClaimLines(professional.claimLines);
  const facRefs = profClaimLines(facility.claimLines);

  const diagnosisLinked = diagnosisPresentOnEncounter(active);
  const medAdminRouteMissingWhenMetadataPresent = countMedAdminProcedureCptWithMissingRouteWhenMetadataPresent(active);
  const emDistinctCodesLedger = countDistinctEncounterEmProcedureCodesOnLedger(active);
  const ledgerProfCodedRows = countLedgerCodedRowsInScope(active, omitFromClaimAssembly, inProfLedgerScope);
  const ledgerFacCodedRows = countLedgerCodedRowsInScope(active, omitFromClaimAssembly, inFacLedgerScope);
  const sideMix = countUnknownAndBothSides(active, omitFromClaimAssembly);

  const visibleEmProf = visibleEmCount(profRefs);
  const visibleEmFac = visibleEmCount(facRefs);

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
    pushUnique(profWarnings, issue("SUPPRESSED_LINES_PRESENT", "warning", { suppressedCount: ctx.multipleEmSuppressedProf }));
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

  if (visibleEmProf > 1) {
    pushUnique(profBlockers, issue("E_M_MULTIPLE_VISIBLE", "blocker"));
  }
  if (
    profRefs.length > 0 &&
    visibleEmProf === 0 &&
    hasEmExpectationTrigger(profRefs) &&
    professional.missingCodes === 0
  ) {
    pushUnique(profWarnings, issue("E_M_MISSING_FOR_PROFESSIONAL_PACKAGE", "warning"));
  }
  if (emDistinctCodesLedger > 1) {
    pushUnique(profWarnings, issue("E_M_LEVEL_SUSPECT", "warning"));
  }
  if (profRefs.some((r) => (r.mergedFromCount ?? 1) > 1)) {
    pushUnique(profWarnings, issue("MODIFIER_POTENTIALLY_REQUIRED", "warning"));
  }
  if (hasProcedureOrTechnicalProfessionalLine(profRefs) && !diagnosisLinked && professional.totalLines > 0) {
    pushUnique(profWarnings, issue("PROCEDURE_WITHOUT_DIAGNOSIS_LINK", "warning"));
  }
  if (
    ledgerProfCodedRows > 0 &&
    professional.totalLines === 0 &&
    professional.missingCodes === 0
  ) {
    pushUnique(profWarnings, issue("PROFESSIONAL_PACKAGE_WITHOUT_PROFESSIONAL_LINES", "warning"));
  }
  if (medAdminRouteMissingWhenMetadataPresent > 0) {
    pushUnique(profWarnings, issue("MED_ADMIN_ROUTE_MISSING_FOR_ADMIN_CPT", "warning"));
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
    pushUnique(facWarnings, issue("SUPPRESSED_LINES_PRESENT", "warning", { suppressedCount: ctx.multipleEmSuppressedFac }));
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

  if (visibleEmFac > 1) {
    pushUnique(facBlockers, issue("E_M_MULTIPLE_VISIBLE", "blocker"));
  }
  if (facRefs.some((r) => (r.mergedFromCount ?? 1) > 1)) {
    pushUnique(facWarnings, issue("MODIFIER_POTENTIALLY_REQUIRED", "warning"));
  }
  if (
    ledgerFacCodedRows > 0 &&
    facility.totalLines === 0 &&
    facility.missingCodes === 0
  ) {
    pushUnique(facWarnings, issue("FACILITY_PACKAGE_WITHOUT_TECHNICAL_LINES", "warning"));
  }

  /* --- Encounter summary --- */
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
  if (totalAssembled > 0 && (ctx.blockingNoExtractBoth > 0 || ctx.blockingNoExtractUnknown > 0)) {
    pushUnique(sumWarnings, issue("CLAIM_PACKAGE_INCONSISTENT", "warning"));
  }
  if (sideMix.unknown > 0 && sideMix.both > 0) {
    pushUnique(sumWarnings, issue("ENCOUNTER_BILLING_SIDE_MIX_REVIEW", "warning"));
  }
  if (hasAnyProcedureLikeLine(profRefs, facRefs) && !diagnosisLinked && totalAssembled > 0) {
    pushUnique(sumWarnings, issue("PROCEDURE_WITHOUT_DIAGNOSIS_LINK", "warning"));
  }
  if (medAdminRouteMissingWhenMetadataPresent > 0) {
    pushUnique(sumWarnings, issue("MED_ADMIN_ROUTE_MISSING_FOR_ADMIN_CPT", "warning"));
  }
  if (emDistinctCodesLedger > 1) {
    pushUnique(sumWarnings, issue("E_M_LEVEL_SUSPECT", "warning"));
  }

  /** Roll up package issues into encounter summary (dedupe by code + severity; SUPPRESSED_LINES_PRESENT merges counts). */
  for (const x of profBlockers) pushUnique(sumBlockers, x);
  for (const x of facBlockers) pushUnique(sumBlockers, x);
  for (const x of profWarnings) pushUnique(sumWarnings, x);
  for (const x of facWarnings) pushUnique(sumWarnings, x);

  const profReady = profBlockers.length === 0;
  const facReady = facBlockers.length === 0;
  const sumReady = sumBlockers.length === 0;

  return {
    meta: {
      visibleEncounterEmCountProfessional: visibleEmProf,
      visibleEncounterEmCountFacility: visibleEmFac,
      diagnosisLinked,
      professionalLineCount: professional.totalLines,
      facilityLineCount: facility.totalLines,
    },
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
