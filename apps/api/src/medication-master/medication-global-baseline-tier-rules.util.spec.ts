import { evaluateGlobalBaselineTier } from "./medication-global-baseline-tier-rules.util";

function baseInput(
  overrides: Partial<Parameters<typeof evaluateGlobalBaselineTier>[0]> = {}
) {
  return {
    sourceNameExact: "Acetaminophen",
    sourceStrengthExact: "500mg",
    sourceRouteExact: "Tablet",
    exactSourceText: "Acetaminophen 500mg Tablet",
    reconciliationStatus: "NEW_CANDIDATE",
    reviewFlags: [] as string[],
    isHighAlert: false,
    isControlled: false,
    requiresInfusionSession: false,
    administrationType: "OTHER",
    governanceStatus: "REVIEW_REQUIRED",
    baselineAvailable: false,
    alreadyActivationApproved: false,
    governanceBlocked: false,
    ...overrides,
  };
}

describe("evaluateGlobalBaselineTier (19I)", () => {
  it("tier 1 for clean low-risk row", () => {
    expect(evaluateGlobalBaselineTier(baseInput())).toEqual({ tier: 1, tier2Reasons: [] });
  });

  it("tier 1 for duplicate candidate when otherwise low-risk (19I.2)", () => {
    expect(
      evaluateGlobalBaselineTier(
        baseInput({ reconciliationStatus: "POSSIBLE_DUPLICATE", reviewFlags: ["DUPLICATE_WARNING"] })
      )
    ).toEqual({ tier: 1, tier2Reasons: [] });
  });

  it("tier 1 for high-alert and controlled when not high-risk class (19I.2)", () => {
    expect(evaluateGlobalBaselineTier(baseInput({ isHighAlert: true }))).toEqual({
      tier: 1,
      tier2Reasons: [],
    });
    expect(evaluateGlobalBaselineTier(baseInput({ isControlled: true }))).toEqual({
      tier: 1,
      tier2Reasons: [],
    });
  });

  it("tier 1 for reconciliation review and manual review flags (19I.2)", () => {
    expect(
      evaluateGlobalBaselineTier(
        baseInput({
          reconciliationStatus: "REVIEW_REQUIRED",
          reviewFlags: ["MANUAL_REVIEW_REQUIRED", "NDC_REVIEW_REQUIRED", "INFUSION_REVIEW_REQUIRED"],
          requiresInfusionSession: true,
          administrationType: "INFUSION",
        })
      )
    ).toEqual({ tier: 1, tier2Reasons: [] });
  });

  it("tier 2 for insulin and opioid patterns", () => {
    expect(
      evaluateGlobalBaselineTier(baseInput({ sourceNameExact: "Regular Insulin" })).tier
    ).toBe(2);
    expect(
      evaluateGlobalBaselineTier(baseInput({ sourceNameExact: "Morphine sulfate" })).tier
    ).toBe(2);
    expect(
      evaluateGlobalBaselineTier(baseInput({ sourceNameExact: "Lorazepam 2mg" })).tier
    ).toBe(2);
    expect(
      evaluateGlobalBaselineTier(baseInput({ sourceNameExact: "Rocuronium" })).tier
    ).toBe(2);
  });

  it("tier 2 for malformed dose", () => {
    const r = evaluateGlobalBaselineTier(baseInput({ sourceStrengthExact: "see pkg" }));
    expect(r.tier).toBe(2);
    expect(r.tier2Reasons).toContain("AMBIGUOUS_DOSE");
  });

  it("tier 2 when already baseline approved", () => {
    const r = evaluateGlobalBaselineTier(
      baseInput({ baselineAvailable: true, alreadyActivationApproved: true })
    );
    expect(r.tier).toBe(2);
    expect(r.tier2Reasons).toContain("ALREADY_BASELINE_APPROVED");
  });

  it("tier 2 for governance blocked or retired", () => {
    expect(evaluateGlobalBaselineTier(baseInput({ governanceBlocked: true }))).toEqual({
      tier: 2,
      tier2Reasons: ["GOVERNANCE_BLOCKED"],
    });
    expect(evaluateGlobalBaselineTier(baseInput({ governanceStatus: "BLOCKED" }))).toEqual({
      tier: 2,
      tier2Reasons: ["GOVERNANCE_BLOCKED"],
    });
    expect(evaluateGlobalBaselineTier(baseInput({ governanceStatus: "RETIRED" }))).toEqual({
      tier: 2,
      tier2Reasons: ["GOVERNANCE_BLOCKED"],
    });
  });

  it("tier 2 reasons are only emitted union members (19I.2B)", () => {
    const emitted = new Set([
      "MISSING_MEDICATION_NAME",
      "MISSING_DOSE",
      "MISSING_FORM",
      "MISSING_EXACT_SOURCE",
      "HIGH_RISK_MEDICATION",
      "AMBIGUOUS_DOSE",
      "GOVERNANCE_BLOCKED",
      "ALREADY_BASELINE_APPROVED",
    ]);
    const cases = [
      baseInput(),
      baseInput({ reconciliationStatus: "POSSIBLE_DUPLICATE", reviewFlags: ["DUPLICATE_WARNING"] }),
      baseInput({ sourceNameExact: "Morphine" }),
      baseInput({ sourceStrengthExact: "see pkg" }),
      baseInput({ governanceStatus: "RETIRED" }),
    ];
    for (const input of cases) {
      const r = evaluateGlobalBaselineTier(input);
      if (r.tier === 2) {
        for (const reason of r.tier2Reasons) {
          expect(emitted.has(reason)).toBe(true);
        }
      }
    }
  });
});
