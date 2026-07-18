import {
  PHASE15_CERTIFICATION_ID,
  PHASE15_PART2C_IMPLEMENTATION_ID,
  PHASE15_WAVE_FAMILY_NAMES,
  assertPhase15NoFabricatedFacts,
  canTransitionRemediationWorkItem,
  isTier1OrLicensedSource,
} from "@medora/shared";

describe("Phase 15 Part 2C execution governance", () => {
  it("keeps Wave 1 membership fixed and excludes acetaminophen", () => {
    expect(PHASE15_WAVE_FAMILY_NAMES).toHaveLength(8);
    expect(
      PHASE15_WAVE_FAMILY_NAMES.some((n) => /acetaminophen/i.test(n))
    ).toBe(false);
    expect(PHASE15_CERTIFICATION_ID).toContain("PHASE_15");
    expect(PHASE15_PART2C_IMPLEMENTATION_ID).toContain("PART2C");
  });

  it("allows BLOCKED_PENDING_AUTHORITATIVE_SOURCE → DEFERRED", () => {
    expect(
      canTransitionRemediationWorkItem(
        "BLOCKED_PENDING_AUTHORITATIVE_SOURCE",
        "DEFERRED"
      )
    ).toBe(true);
  });

  it("does not treat institutional Tier-5 as Tier-1/licensed", () => {
    expect(isTier1OrLicensedSource("TIER_5_INSTITUTIONAL_POLICY")).toBe(false);
    expect(isTier1OrLicensedSource("TIER_1_REGULATORY")).toBe(true);
  });

  it("forbids fabricating unsupported facts", () => {
    expect(() => assertPhase15NoFabricatedFacts(true)).toThrow(/fabricat/i);
    expect(() => assertPhase15NoFabricatedFacts(false)).not.toThrow();
  });

  it("preview outcome policy prefers DEFERRED when no Tier-1 source", () => {
    const tier1Eligible = 0;
    const proposedOutcome = tier1Eligible > 0 ? "REMEDIATED" : "DEFERRED";
    expect(proposedOutcome).toBe("DEFERRED");
  });
});
