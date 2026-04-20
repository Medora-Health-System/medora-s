/**
 * Phase 4 — Claim packaging summaries (professional vs facility) from ledger rows.
 * No payer submission; readiness for later claim assembly only.
 */

import { billingLedgerRowMissingBillableCodeBlocksReadiness } from "./billingLedgerCoding.js";

/** BillingSide values as stored on BillingEvent (mirrors Prisma enum). */
export type BillingSideValue = "UNKNOWN" | "PROFESSIONAL" | "FACILITY" | "BOTH";

/** Review status values as on BillingEvent. */
export type BillingReviewStatusValue = "CAPTURED" | "REVIEWED" | "VOIDED" | "SKIPPED";

export type ClaimPackageLedgerRow = {
  billingSide: BillingSideValue;
  reviewStatus: BillingReviewStatusValue;
  sourceModule?: string | null;
  procedureCode: string | null;
  hcpcsCode: string | null;
  code: string | null;
  diagnosisCodes: string | null;
};

export type ClaimPackageBlocker = { code: string; detail?: string };
export type ClaimPackageWarning = { code: string; detail?: string };

export type ClaimPackageSummary = {
  totalLines: number;
  uncodedLines: number;
  linesNeedingReview: number;
  unknownSideLines: number;
  blockers: ClaimPackageBlocker[];
  warnings: ClaimPackageWarning[];
  ready: boolean;
};

export type ClaimPackagesResult = {
  professional: ClaimPackageSummary;
  facility: ClaimPackageSummary;
  overall: {
    readyForProfessionalClaim: boolean;
    readyForFacilityClaim: boolean;
  };
};

function emptySummary(): ClaimPackageSummary {
  return {
    totalLines: 0,
    uncodedLines: 0,
    linesNeedingReview: 0,
    unknownSideLines: 0,
    blockers: [],
    warnings: [],
    ready: true,
  };
}

function inProfessionalScope(side: BillingSideValue): boolean {
  return side === "PROFESSIONAL" || side === "BOTH" || side === "UNKNOWN";
}

function inFacilityScope(side: BillingSideValue): boolean {
  return side === "FACILITY" || side === "BOTH" || side === "UNKNOWN";
}

function accumulate(
  rows: ClaimPackageLedgerRow[],
  scope: (side: BillingSideValue) => boolean
): Omit<ClaimPackageSummary, "blockers" | "warnings" | "ready"> {
  let totalLines = 0;
  let uncodedLines = 0;
  let linesNeedingReview = 0;
  let unknownSideLines = 0;
  for (const r of rows) {
    if (!scope(r.billingSide)) continue;
    totalLines++;
    if (billingLedgerRowMissingBillableCodeBlocksReadiness(r)) uncodedLines++;
    if (r.reviewStatus === "CAPTURED") linesNeedingReview++;
    if (r.billingSide === "UNKNOWN") unknownSideLines++;
  }
  return { totalLines, uncodedLines, linesNeedingReview, unknownSideLines };
}

function finalizeSummary(counts: ReturnType<typeof accumulate>): ClaimPackageSummary {
  const blockers: ClaimPackageBlocker[] = [];
  const warnings: ClaimPackageWarning[] = [];
  if (counts.uncodedLines > 0) {
    blockers.push({ code: "package_uncoded_lines", detail: String(counts.uncodedLines) });
  }
  if (counts.unknownSideLines > 0) {
    blockers.push({ code: "billing_side_unknown", detail: String(counts.unknownSideLines) });
  }
  if (counts.linesNeedingReview > 0) {
    warnings.push({ code: "package_lines_pending_review", detail: String(counts.linesNeedingReview) });
  }
  const ready = blockers.length === 0;
  return {
    totalLines: counts.totalLines,
    uncodedLines: counts.uncodedLines,
    linesNeedingReview: counts.linesNeedingReview,
    unknownSideLines: counts.unknownSideLines,
    blockers,
    warnings,
    ready,
  };
}

/**
 * Derives professional vs facility package readiness from ledger rows.
 * UNKNOWN side is included in both scopes until classified (blocker when any UNKNOWN in scope).
 */
export function computeClaimPackageSummaries(rows: ClaimPackageLedgerRow[]): ClaimPackagesResult {
  if (rows.length === 0) {
    const empty = emptySummary();
    empty.ready = false;
    empty.blockers.push({ code: "no_billing_events_captured" });
    return {
      professional: { ...empty },
      facility: { ...empty },
      overall: {
        readyForProfessionalClaim: false,
        readyForFacilityClaim: false,
      },
    };
  }

  const profCounts = accumulate(rows, inProfessionalScope);
  const facCounts = accumulate(rows, inFacilityScope);

  const professional = finalizeSummary(profCounts);
  const facility = finalizeSummary(facCounts);

  return {
    professional,
    facility,
    overall: {
      readyForProfessionalClaim: professional.ready,
      readyForFacilityClaim: facility.ready,
    },
  };
}
