import { describe, expect, it } from "vitest";
import {
  buildBillingGovernanceAnalytics,
  deriveBillingGovernanceWarnings,
  FORBIDDEN_BILLING_GOVERNANCE_ANALYTICS_KEYS,
  incrementGovernanceCount,
  type BillingGovernanceAnalyticsInput,
} from "./billingGovernanceAnalytics.js";

const emptyInput: BillingGovernanceAnalyticsInput = {
  totals: {
    encountersReviewed: 0,
    openEncounters: 0,
    closedEncounters: 0,
    readinessSampleSize: 0,
  },
  byClassification: {},
  byFacility: [],
  byExportReadinessRoute: {},
  byLedgerProfessionalStatus: {},
  byLedgerFacilityStatus: {},
  byFacilityFeeStatus: {},
  byChargeReviewStatus: {},
  byCodingReviewStatus: {},
  byClaimAssemblyStatus: {},
  conversionSummary: {
    ucToEdCount: 0,
    edToUcCount: 0,
    acknowledgmentCapturedCount: 0,
    missingAcknowledgmentCount: 0,
    byFacility: [],
  },
  observationSummary: {
    reviewRequiredCount: 0,
    extendedObservationCount: 0,
    activeObservationCount: 0,
    holdForPendingResultsCount: 0,
  },
  claimAssemblySummary: {
    readyForExportReviewCount: 0,
    notReadyCount: 0,
    manualReviewRequiredCount: 0,
    professionalReadyCount: 0,
    facilityReadyCount: 0,
  },
  facilityConfiguration: {
    missingClassificationModeCount: 0,
    hybridControlsDisabledCount: 0,
    missingBillingIdentityCount: 0,
    hospitalEnterpriseIncompleteCount: 0,
  },
  manualReviewRequiredCount: 0,
  pendingResultsCount: 0,
};

describe("billingGovernanceAnalytics (19UCED.9)", () => {
  it("aggregate model has no PHI keys", () => {
    const result = buildBillingGovernanceAnalytics({
      ...emptyInput,
      totals: { encountersReviewed: 10, openEncounters: 2, closedEncounters: 8, readinessSampleSize: 10 },
      byClassification: { URGENT_CARE: 6, EMERGENCY_DEPARTMENT: 4 },
    });
    for (const forbidden of FORBIDDEN_BILLING_GOVERNANCE_ANALYTICS_KEYS) {
      expect(result).not.toHaveProperty(forbidden);
    }
    expect(JSON.stringify(result)).not.toContain("claimPayload");
    expect(result.previewOnly).toBe(true);
  });

  it("severity derives OK/WATCH/REVIEW/BLOCKED", () => {
    const ok = deriveBillingGovernanceWarnings(emptyInput);
    expect(ok).toHaveLength(0);

    const watch = deriveBillingGovernanceWarnings({
      ...emptyInput,
      byCodingReviewStatus: { NEEDS_DOCUMENTATION_COMPLETION: 6 },
    });
    expect(watch.some((w) => w.severity === "WATCH" && w.reason === "MANY_CODING_REVIEWS")).toBe(true);

    const review = deriveBillingGovernanceWarnings({
      ...emptyInput,
      byChargeReviewStatus: { NEEDS_CODER_REVIEW: 16 },
    });
    expect(review.some((w) => w.severity === "REVIEW_REQUIRED" && w.reason === "MANY_CHARGE_REVIEWS")).toBe(
      true,
    );

    const blocked = deriveBillingGovernanceWarnings({
      ...emptyInput,
      facilityConfiguration: {
        ...emptyInput.facilityConfiguration,
        missingBillingIdentityCount: 1,
      },
    });
    expect(blocked.some((w) => w.severity === "BLOCKED" && w.reason === "MISSING_FACILITY_IDENTITY")).toBe(true);
  });

  it("classification totals aggregate correctly", () => {
    const result = buildBillingGovernanceAnalytics({
      ...emptyInput,
      byClassification: {
        URGENT_CARE: 12,
        EMERGENCY_DEPARTMENT: 8,
        CLINIC_VISIT: 3,
      },
    });
    expect(result.byClassification.find((b) => b.key === "URGENT_CARE")?.count).toBe(12);
    expect(result.byClassification.find((b) => b.key === "EMERGENCY_DEPARTMENT")?.count).toBe(8);
  });

  it("conversion totals aggregate correctly", () => {
    const result = buildBillingGovernanceAnalytics({
      ...emptyInput,
      conversionSummary: {
        ucToEdCount: 5,
        edToUcCount: 2,
        acknowledgmentCapturedCount: 4,
        missingAcknowledgmentCount: 1,
        byFacility: [{ facilityId: "f1", ucToEdCount: 5, edToUcCount: 2 }],
      },
    });
    expect(result.conversionSummary.ucToEdCount).toBe(5);
    expect(result.conversionSummary.edToUcCount).toBe(2);
    expect(result.conversionSummary.acknowledgmentCapturedCount).toBe(4);
  });

  it("facility warnings aggregate correctly", () => {
    const warnings = deriveBillingGovernanceWarnings({
      ...emptyInput,
      facilityConfiguration: {
        missingClassificationModeCount: 1,
        hybridControlsDisabledCount: 1,
        missingBillingIdentityCount: 0,
        hospitalEnterpriseIncompleteCount: 1,
      },
    });
    expect(warnings.some((w) => w.domain === "FACILITY_CONFIGURATION" && w.reason === "CONFIGURATION_INCOMPLETE")).toBe(
      true,
    );
  });

  it("incrementGovernanceCount accumulates", () => {
    const map: Partial<Record<"A" | "B", number>> = {};
    incrementGovernanceCount(map, "A");
    incrementGovernanceCount(map, "A");
    incrementGovernanceCount(map, "B");
    expect(map.A).toBe(2);
    expect(map.B).toBe(1);
  });
});
