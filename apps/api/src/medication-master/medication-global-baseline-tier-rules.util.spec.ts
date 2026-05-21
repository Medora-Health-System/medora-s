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

  it("tier 2 for duplicate candidate", () => {
    const r = evaluateGlobalBaselineTier(
      baseInput({ reconciliationStatus: "POSSIBLE_DUPLICATE" })
    );
    expect(r.tier).toBe(2);
    expect(r.tier2Reasons).toContain("POSSIBLE_DUPLICATE");
  });

  it("tier 2 for high-alert", () => {
    const r = evaluateGlobalBaselineTier(baseInput({ isHighAlert: true }));
    expect(r.tier).toBe(2);
    expect(r.tier2Reasons).toContain("HIGH_ALERT");
  });

  it("tier 2 for controlled substance", () => {
    const r = evaluateGlobalBaselineTier(baseInput({ isControlled: true }));
    expect(r.tier).toBe(2);
    expect(r.tier2Reasons).toContain("CONTROLLED_SUBSTANCE");
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
});
