import {
  PHASE18_RECOMMENDATION_DEFAULTS,
  assertPhase18SafetyDefaults,
  assertReplayDoesNotMutateCare,
  buildRecommendationReplayFingerprint,
  canTransitionVersionGovernanceState,
} from "@medora/shared";

describe("Phase 18 ops governance wiring", () => {
  it("keeps autonomy ceiling fail-closed", () => {
    expect(PHASE18_RECOMMENDATION_DEFAULTS.enterpriseActiveAllowed).toBe(false);
    expect(PHASE18_RECOMMENDATION_DEFAULTS.productionCdsEnabled).toBe(false);
    expect(PHASE18_RECOMMENDATION_DEFAULTS.orderFromRecommendationEnabled).toBe(
      false
    );
    expect(() => assertPhase18SafetyDefaults()).not.toThrow();
    expect(() => assertReplayDoesNotMutateCare(true)).toThrow();
  });

  it("supports deterministic fingerprints and version transitions", () => {
    const fp = buildRecommendationReplayFingerprint({
      definitionId: "x",
      recommendationVersion: "1.0.0",
      knowledgeVersion: "k",
      title: "t",
      reasonSummary: "r",
      recommendationKind: "FIRST_LINE",
      familyKey: "ibuprofen",
      confidenceScore: 50,
      evidenceLevel: "B",
      lifecycleStatus: "SHADOW_RECOMMENDATION",
    });
    expect(fp).toContain("ibuprofen");
    expect(canTransitionVersionGovernanceState("CURRENT", "SUPERSEDED")).toBe(
      true
    );
  });
});
