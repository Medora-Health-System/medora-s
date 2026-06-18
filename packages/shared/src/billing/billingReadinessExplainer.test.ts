import { describe, expect, it } from "vitest";
import {
  buildBillingReadinessExplainerSummary,
  resolveBillingReadinessPrimaryReason,
  type BillingReadinessExplainerInput,
} from "./billingReadinessExplainer.js";
import type { ClaimPackagesResult } from "../billingClaimPackages.js";

function emptyClaimPackages(overrides?: Partial<ClaimPackagesResult>): ClaimPackagesResult {
  const readySummary = {
    totalLines: 1,
    uncodedLines: 0,
    linesNeedingReview: 0,
    unknownSideLines: 0,
    blockers: [],
    warnings: [],
    ready: true,
  };
  return {
    professional: readySummary,
    facility: readySummary,
    overall: {
      readyForProfessionalClaim: true,
      readyForFacilityClaim: true,
    },
    ...overrides,
  };
}

function baseInput(overrides: Partial<BillingReadinessExplainerInput> = {}): BillingReadinessExplainerInput {
  return {
    readiness: {
      isReady: true,
      blockers: [],
      warnings: [],
      counts: {
        totalBillingEvents: 2,
        uncodedLines: 0,
        ledgerLinesNeedingReview: 0,
        diagnosisCount: 1,
      },
    },
    ledger: {
      total: 2,
      needsReview: 0,
      missingCode: 0,
      unmappedLinesCount: 0,
    },
    claimPackages: emptyClaimPackages(),
    manualReview: {
      unresolvedCount: 0,
      requiresReviewCount: 0,
    },
    hasAttendingProvider: true,
    ...overrides,
  };
}

describe("billingReadinessExplainer (MEDUI.BILLING.READINESS.EXPLAINER.1)", () => {
  it("ready encounter shows no blockers", () => {
    const summary = buildBillingReadinessExplainerSummary(baseInput());
    expect(summary.isReady).toBe(true);
    expect(summary.blockerCount).toBe(0);
    expect(summary.primaryReason).toBeNull();
  });

  it("uncoded lines produce CODING blocker", () => {
    const summary = buildBillingReadinessExplainerSummary(
      baseInput({
        readiness: {
          isReady: false,
          blockers: [{ code: "uncoded_billing_lines", detail: "3" }],
          warnings: [],
          counts: {
            totalBillingEvents: 3,
            uncodedLines: 3,
            ledgerLinesNeedingReview: 0,
            diagnosisCount: 1,
          },
        },
        ledger: { total: 3, needsReview: 0, missingCode: 3, unmappedLinesCount: 0 },
      })
    );
    expect(summary.items.some((item) => item.category === "CODING" && item.blocksBilling)).toBe(true);
  });

  it("unmapped lines produce CHARGE_MAPPING blocker", () => {
    const summary = buildBillingReadinessExplainerSummary(
      baseInput({
        ledger: { total: 4, needsReview: 0, missingCode: 0, unmappedLinesCount: 4 },
      })
    );
    const mapping = summary.items.find((item) => item.category === "CHARGE_MAPPING" && item.blocksBilling);
    expect(mapping?.count).toBe(4);
  });

  it("missing payer produces PAYER blocker", () => {
    const summary = buildBillingReadinessExplainerSummary(
      baseInput({ identityGaps: ["MISSING_PAYER_CONTEXT", "MISSING_PRIMARY_COVERAGE"] })
    );
    expect(summary.items.some((item) => item.category === "PAYER")).toBe(true);
  });

  it("missing provider produces PROVIDER blocker", () => {
    const summary = buildBillingReadinessExplainerSummary(
      baseInput({ identityGaps: ["MISSING_RENDERING_PROVIDER"] })
    );
    expect(summary.items.some((item) => item.category === "PROVIDER" && item.blocksBilling)).toBe(true);
  });

  it("missing facility identity produces FACILITY blocker", () => {
    const summary = buildBillingReadinessExplainerSummary(
      baseInput({ identityGaps: ["MISSING_FACILITY_EXPORT_CONTEXT"] })
    );
    expect(summary.items.some((item) => item.category === "FACILITY")).toBe(true);
  });

  it("claim assembly missing lines produces CLAIM_ASSEMBLY blocker", () => {
    const summary = buildBillingReadinessExplainerSummary(
      baseInput({
        claimPackages: emptyClaimPackages({
          overall: { readyForProfessionalClaim: false, readyForFacilityClaim: true },
          professional: {
            totalLines: 2,
            uncodedLines: 2,
            linesNeedingReview: 0,
            unknownSideLines: 0,
            blockers: [{ code: "package_uncoded_lines", detail: "2" }],
            warnings: [],
            ready: false,
          },
        }),
      })
    );
    expect(summary.items.some((item) => item.category === "CLAIM_ASSEMBLY")).toBe(true);
  });

  it("export not ready produces EXPORT blocker", () => {
    const summary = buildBillingReadinessExplainerSummary(
      baseInput({
        readiness: {
          isReady: false,
          blockers: [{ code: "no_billing_events_captured" }],
          warnings: [],
          counts: {
            totalBillingEvents: 0,
            uncodedLines: 0,
            ledgerLinesNeedingReview: 0,
            diagnosisCount: 0,
          },
        },
      })
    );
    expect(summary.items.some((item) => item.category === "EXPORT")).toBe(true);
  });

  it("unknown blocker appears as UNKNOWN", () => {
    const summary = buildBillingReadinessExplainerSummary(
      baseInput({
        readiness: {
          isReady: false,
          blockers: [{ code: "custom_unmapped_rule" }],
          warnings: [],
          counts: {
            totalBillingEvents: 1,
            uncodedLines: 0,
            ledgerLinesNeedingReview: 0,
            diagnosisCount: 1,
          },
        },
      })
    );
    expect(summary.items.some((item) => item.category === "UNKNOWN")).toBe(true);
  });

  it("approved manual review does not block", () => {
    const summary = buildBillingReadinessExplainerSummary(
      baseInput({
        manualReview: { unresolvedCount: 0, requiresReviewCount: 2 },
      })
    );
    expect(summary.items.some((item) => item.category === "MANUAL_REVIEW" && item.blocksBilling)).toBe(false);
    expect(summary.items.some((item) => item.category === "MANUAL_REVIEW" && item.label.includes("complete"))).toBe(
      true
    );
  });

  it("pending manual review blocks", () => {
    const summary = buildBillingReadinessExplainerSummary(
      baseInput({ manualReview: { unresolvedCount: 3, requiresReviewCount: 3 } })
    );
    const manual = summary.items.find((item) => item.category === "MANUAL_REVIEW");
    expect(manual?.blocksBilling).toBe(true);
    expect(manual?.count).toBe(3);
  });

  it("bulk-approved manual items are excluded via unresolvedCount zero", () => {
    const summary = buildBillingReadinessExplainerSummary(
      baseInput({
        manualReview: { unresolvedCount: 0, requiresReviewCount: 5 },
        ledger: { total: 5, needsReview: 2, missingCode: 0, unmappedLinesCount: 0 },
      })
    );
    expect(summary.items.find((item) => item.category === "MANUAL_REVIEW" && item.blocksBilling)).toBeUndefined();
    expect(summary.items.some((item) => item.category === "MANUAL_REVIEW" && item.severity === "info")).toBe(true);
    expect(summary.items.some((item) => item.category === "CHARGE_MAPPING")).toBe(true);
  });

  it("stale needsReview ledger count is not treated as manual review blocker", () => {
    const summary = buildBillingReadinessExplainerSummary(
      baseInput({
        manualReview: { unresolvedCount: 0, requiresReviewCount: 0 },
        ledger: { total: 4, needsReview: 3, missingCode: 0, unmappedLinesCount: 0 },
      })
    );
    expect(summary.items.some((item) => item.category === "MANUAL_REVIEW" && item.blocksBilling)).toBe(false);
    expect(summary.items.some((item) => item.category === "CHARGE_MAPPING")).toBe(true);
  });

  it("blocker count sums categories", () => {
    const summary = buildBillingReadinessExplainerSummary(
      baseInput({
        manualReview: { unresolvedCount: 2, requiresReviewCount: 2 },
        ledger: { total: 5, needsReview: 0, missingCode: 3, unmappedLinesCount: 1 },
      })
    );
    expect(summary.blockerCount).toBeGreaterThanOrEqual(3);
  });

  it("primary reason selects highest priority blocker", () => {
    const items = buildBillingReadinessExplainerSummary(
      baseInput({
        manualReview: { unresolvedCount: 1, requiresReviewCount: 1 },
        ledger: { total: 5, needsReview: 0, missingCode: 8, unmappedLinesCount: 0 },
      })
    ).items;
    const primary = resolveBillingReadinessPrimaryReason(items);
    expect(primary?.category).toBe("MANUAL_REVIEW");
  });
});
