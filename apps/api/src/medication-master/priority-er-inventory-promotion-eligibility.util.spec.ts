import { evaluatePriorityErPromotionEligibility } from "./priority-er-inventory-promotion-eligibility.util";
import { medicationFormularyImportStagingPromotionFixture } from "./medication-formulary-import-staging.types";

const baseRow = medicationFormularyImportStagingPromotionFixture({
  id: "st-1",
  batchId: "pri-er-inv-1",
  sourceRowId: "PRI_ER_Sheet_1",
  sourceInventorySku: null,
  sourceInventoryDescription: "Acetaminophen 500mg Tablet",
  rawJson: {
    medication: "Acetaminophen",
    dose: "500mg",
    form: "Tablet",
    __preservation: { phase: "19E.1", rule: "priority_er_inventory_exact_source" },
    __sourceTrace: {
      exactSourceText: "Acetaminophen 500mg Tablet",
      sourceNameExact: "Acetaminophen",
      sourceStrengthExact: "500mg",
      sourceRouteExact: "Tablet",
      sourcePackageExact: "Tablet",
      sourceReviewStatus: "MANUAL_REVIEW_REQUIRED",
    },
    __reconciliation: { matchedConceptIds: [], matchedProductIds: [], duplicateWarnings: [] },
  },
  reconciliationStatus: "NEW_CANDIDATE",
  reviewFlags: ["MANUAL_REVIEW_REQUIRED"],
  importedByUserId: "user-1",
});

describe("evaluatePriorityErPromotionEligibility", () => {
  it("allows NEW_CANDIDATE with exact source fields", () => {
    expect(evaluatePriorityErPromotionEligibility(baseRow)).toEqual({ eligible: true });
  });

  it("blocks unresolved POSSIBLE_DUPLICATE", () => {
    const out = evaluatePriorityErPromotionEligibility({
      ...baseRow,
      reconciliationStatus: "POSSIBLE_DUPLICATE",
      reviewFlags: ["MANUAL_REVIEW_REQUIRED", "POSSIBLE_DUPLICATE"],
    });
    expect(out.eligible).toBe(false);
    expect(out.eligible === false && out.reasons.some((r) => r.code === "UNRESOLVED_DUPLICATE")).toBe(true);
  });

  it("blocks missing dose", () => {
    const rawJson = baseRow.rawJson as Record<string, unknown>;
    const trace = rawJson.__sourceTrace as Record<string, unknown>;
    const out = evaluatePriorityErPromotionEligibility({
      ...baseRow,
      rawJson: {
        ...rawJson,
        __sourceTrace: {
          ...trace,
          sourceStrengthExact: "",
        },
      },
      reviewFlags: ["MISSING_DOSE"],
    });
    expect(out.eligible).toBe(false);
  });

  it("blocks billing activation when BILLING_REVIEW_REQUIRED", () => {
    const out = evaluatePriorityErPromotionEligibility(
      {
        ...baseRow,
        reviewFlags: ["BILLING_REVIEW_REQUIRED"],
      },
      { activateBilling: true }
    );
    expect(out.eligible).toBe(false);
    expect(out.eligible === false && out.reasons.some((r) => r.code === "BILLING_REVIEW")).toBe(true);
  });

  it("blocks NDC package activation when NDC_REVIEW_REQUIRED", () => {
    const out = evaluatePriorityErPromotionEligibility(
      {
        ...baseRow,
        reviewFlags: ["NDC_REVIEW_REQUIRED"],
      },
      { activatePackageWithNdc: true }
    );
    expect(out.eligible).toBe(false);
  });

  it("blocks when governance decision is BLOCKED_DUPLICATE", () => {
    const rawJson = {
      ...(baseRow.rawJson as Record<string, unknown>),
      __governance: {
        governanceDecision: "BLOCKED_DUPLICATE",
        duplicateResolutionStatus: "BLOCKED_DUPLICATE",
      },
    };
    const out = evaluatePriorityErPromotionEligibility({
      ...baseRow,
      rawJson,
      reviewFlags: ["GOVERNANCE_BLOCKED"],
    });
    expect(out.eligible).toBe(false);
    expect(out.eligible === false && out.reasons.some((r) => r.code === "GOVERNANCE_BLOCKED")).toBe(true);
  });

  it("allows POSSIBLE_DUPLICATE when governance approves create new", () => {
    const rawJson = {
      ...(baseRow.rawJson as Record<string, unknown>),
      __governance: {
        governanceDecision: "CREATE_NEW_APPROVED",
        duplicateResolutionStatus: "CREATE_NEW_APPROVED",
      },
    };
    const out = evaluatePriorityErPromotionEligibility({
      ...baseRow,
      reconciliationStatus: "POSSIBLE_DUPLICATE",
      rawJson,
      reviewFlags: ["POSSIBLE_DUPLICATE"],
    });
    expect(out.eligible).toBe(true);
  });
});
