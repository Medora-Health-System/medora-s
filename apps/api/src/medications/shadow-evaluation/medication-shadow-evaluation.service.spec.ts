import {
  PHASE14B_SYNTHETIC_SHADOW_DEFAULTS,
  assertNoMutableDraftKnowledgeConsumption,
  classifySyntheticFindingOutcome,
  evaluateFamilyExecutionStatus,
} from "@medora/shared";

describe("medicationShadowEvaluation", () => {
  it("forbids care-workflow control and draft knowledge consumption", () => {
    expect(PHASE14B_SYNTHETIC_SHADOW_DEFAULTS.knowledgeControlsPatientCare).toBe(
      false
    );
    expect(() => assertNoMutableDraftKnowledgeConsumption(true)).toThrow();
  });

  it("treats deferred domain guards as skipped not missed", () => {
    expect(
      classifySyntheticFindingOutcome({
        caseCategory: "DEFERRED_DOMAIN_GUARD",
        expectedFindingCount: 0,
        actualSafetyFindingCount: 0,
        deferredDomain: true,
        provenanceOk: true,
        identityResolved: true,
        engineError: false,
      })
    ).toBe("DEFERRED_DOMAIN_SKIPPED");
  });

  it("requires critical-miss-free execution for family pass", () => {
    expect(
      evaluateFamilyExecutionStatus({
        casesExecuted: 5,
        requiredCases: 5,
        criticalMisses: 0,
        highSeverityMisses: 0,
        unresolvedCriticalUnexpected: 0,
        provenanceErrors: 0,
        identityErrors: 0,
        engineErrors: 0,
        noncriticalGaps: 0,
      })
    ).toBe("SHADOW_EXECUTED_PASS");
  });
});
