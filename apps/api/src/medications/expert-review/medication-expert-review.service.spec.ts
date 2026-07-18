import {
  PHASE14B_EXPERT_REVIEW_DEFAULTS,
  assertPhase14BNoWorkflowControl,
  assertRuleBasedShadowApproval,
} from "@medora/shared";

describe("medicationExpertReview", () => {
  it("keeps care-workflow and activation flags off", () => {
    expect(PHASE14B_EXPERT_REVIEW_DEFAULTS.knowledgeControlsPatientCare).toBe(
      false
    );
    expect(PHASE14B_EXPERT_REVIEW_DEFAULTS.orderingChanged).toBe(false);
    expect(PHASE14B_EXPERT_REVIEW_DEFAULTS.clinicalActivationEnabled).toBe(
      false
    );
    expect(() => assertPhase14BNoWorkflowControl(true)).toThrow();
  });

  it("requires rule-based gates before shadow approval", () => {
    expect(() =>
      assertRuleBasedShadowApproval({
        evidenceComplete: true,
        clinicalReviewComplete: true,
        safetyReviewComplete: true,
        consistencyPassed: true,
        requiredDomainsPresent: true,
        noCriticalConflicts: true,
        identityCertified: true,
        waveAssigned: true,
        reviewCompleted: true,
        clinicalActivationAllowed: false,
      })
    ).not.toThrow();
  });
});
