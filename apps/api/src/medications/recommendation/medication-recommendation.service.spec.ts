import {
  PHASE16_PROGRAM_KEY,
  PHASE16_WAVE_FAMILY_NAMES,
  assertPhase16SafetyDefaults,
  isPhase16LifecycleTransitionAllowed,
  isRecommendationExposableToProviders,
} from "@medora/shared";

describe("Phase 16 recommendation engine governance wiring", () => {
  it("keeps Wave 1 scope and program key stable", () => {
    expect(PHASE16_WAVE_FAMILY_NAMES).toHaveLength(8);
    expect(PHASE16_PROGRAM_KEY).toContain("SHADOW_RECOMMENDATION");
    expect(() => assertPhase16SafetyDefaults()).not.toThrow();
  });

  it("blocks Pilot/Active transitions at Phase 16 ceiling", () => {
    expect(
      isPhase16LifecycleTransitionAllowed(
        "SHADOW_RECOMMENDATION",
        "CONTROLLED_PILOT"
      )
    ).toBe(false);
    expect(
      isPhase16LifecycleTransitionAllowed("APPROVED", "SHADOW_RECOMMENDATION")
    ).toBe(true);
  });

  it("exposes only shadow recommendations to providers", () => {
    expect(isRecommendationExposableToProviders("SHADOW_RECOMMENDATION")).toBe(
      true
    );
    expect(isRecommendationExposableToProviders("DRAFT")).toBe(false);
    expect(isRecommendationExposableToProviders("ENTERPRISE_ACTIVE")).toBe(
      false
    );
  });
});
