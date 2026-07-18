import {
  PHASE17_RECOMMENDATION_DEFAULTS,
  assertEnterpriseActivationBlocked,
  assertNoOrderMutation,
  assertPhase17SafetyDefaults,
  calculatePilotQualification,
  canTransitionPilotAuthorization,
  isPhase17LifecycleTransitionAllowed,
} from "@medora/shared";

describe("Phase 17 pilot service governance wiring", () => {
  it("keeps fail-closed defaults", () => {
    expect(PHASE17_RECOMMENDATION_DEFAULTS.controlledPilotAllowed).toBe(false);
    expect(PHASE17_RECOMMENDATION_DEFAULTS.enterpriseActiveAllowed).toBe(false);
    expect(PHASE17_RECOMMENDATION_DEFAULTS.orderFromRecommendationEnabled).toBe(
      false
    );
    expect(PHASE17_RECOMMENDATION_DEFAULTS.productionCdsEnabled).toBe(false);
    expect(() => assertPhase17SafetyDefaults()).not.toThrow();
  });

  it("blocks enterprise activation and allows authorized pilot lifecycle", () => {
    expect(() => assertEnterpriseActivationBlocked(true)).toThrow(/ENTERPRISE/i);
    expect(
      isPhase17LifecycleTransitionAllowed(
        "SHADOW_RECOMMENDATION",
        "CONTROLLED_PILOT",
        { explicitPilotAuthorization: false }
      )
    ).toBe(false);
    expect(
      isPhase17LifecycleTransitionAllowed(
        "SHADOW_RECOMMENDATION",
        "CONTROLLED_PILOT",
        { explicitPilotAuthorization: true }
      )
    ).toBe(true);
    expect(
      isPhase17LifecycleTransitionAllowed(
        "CONTROLLED_PILOT",
        "ENTERPRISE_ACTIVE",
        { explicitPilotAuthorization: true }
      )
    ).toBe(false);
  });

  it("allows immediate suspension transitions and blocks auto-resume", () => {
    expect(canTransitionPilotAuthorization("ACTIVE", "SUSPENDED")).toBe(true);
    expect(canTransitionPilotAuthorization("SUSPENDED", "ACTIVE")).toBe(false);
    expect(canTransitionPilotAuthorization("SUSPENDED", "PAUSED")).toBe(true);
  });

  it("qualifies shadow Wave 1 only with zero mutations", () => {
    const ok = calculatePilotQualification({
      lifecycleStatus: "SHADOW_RECOMMENDATION",
      familyKey: "ibuprofen",
      hasProvenance: true,
      expertApproved: true,
      unresolvedConflictCount: 0,
      shadowEvaluationCount: 2,
      confidenceScore: 52,
      evidenceCompleteness: 40,
      constitutionalViolationCount: 0,
      orderMutationCount: 0,
      marMutationCount: 0,
      chartMutationCount: 0,
      evidenceStale: false,
    });
    expect(ok.decision).toMatch(/^PILOT_ELIGIBLE/);

    const blocked = calculatePilotQualification({
      lifecycleStatus: "SHADOW_RECOMMENDATION",
      familyKey: "acetaminophen",
      hasProvenance: true,
      expertApproved: true,
      unresolvedConflictCount: 0,
      shadowEvaluationCount: 10,
      confidenceScore: 90,
      evidenceCompleteness: 90,
      constitutionalViolationCount: 0,
      orderMutationCount: 0,
      marMutationCount: 0,
      chartMutationCount: 0,
      evidenceStale: false,
    });
    expect(blocked.decision).toBe("NOT_ELIGIBLE");

    expect(() => assertNoOrderMutation(1)).toThrow(/order/i);
  });
});
