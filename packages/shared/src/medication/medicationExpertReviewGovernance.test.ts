import { describe, expect, it } from "vitest";
import {
  PHASE14B_EXPERT_REVIEW_DEFAULTS,
  assertPhase14BNoWorkflowControl,
  assertRuleBasedShadowApproval,
  calculateQualityScores,
  evaluateShadowEligibility,
  isDomainSatisfiedForShadow,
} from "./medicationExpertReviewGovernance.js";

describe("medicationExpertReviewGovernance", () => {
  it("keeps knowledge advisory and care-workflow flags off", () => {
    expect(PHASE14B_EXPERT_REVIEW_DEFAULTS.knowledgeControlsPatientCare).toBe(
      false
    );
    expect(PHASE14B_EXPERT_REVIEW_DEFAULTS.clinicalActivationEnabled).toBe(
      false
    );
    expect(() => assertPhase14BNoWorkflowControl(true)).toThrow();
  });

  it("treats REVIEWED and DEFERRED as shadow-satisfying domain states", () => {
    expect(isDomainSatisfiedForShadow("REVIEWED")).toBe(true);
    expect(isDomainSatisfiedForShadow("DEFERRED")).toBe(true);
    expect(isDomainSatisfiedForShadow("NOT_STARTED")).toBe(false);
  });

  it("scores quality deterministically without AI confidence", () => {
    const scores = calculateQualityScores({
      clinicalDomainStatuses: {
        CLINICAL_PROFILE: "REVIEWED",
        ADMINISTRATION: "REVIEWED",
        ADULT_DOSING: "DEFERRED",
      },
      safetyDomainStatuses: {
        THERAPEUTIC_CLASS: "REVIEWED",
        ALLERGEN_MAPPING: "REVIEWED",
      },
      evidenceCompletenessScore: 60,
      consistencyPassed: true,
      criticalConflicts: 0,
      clinicalReviewComplete: true,
      safetyReviewComplete: true,
      consistencyReviewComplete: true,
    });
    expect(scores.evidenceScore).toBe(60);
    expect(scores.consistencyScore).toBe(100);
    expect(scores.reviewScore).toBe(100);
    expect(scores.overallScore).toBeGreaterThan(0);
  });

  it("evaluates eligibility and enforces rule-based approval gates", () => {
    const elig = evaluateShadowEligibility({
      identityResolved: true,
      evidenceLinks: 7,
      knowledgeWithoutProvenance: 0,
      requiredDomainsSatisfied: true,
      clinicalReviewComplete: true,
      safetyReviewComplete: true,
      consistencyPassed: true,
      criticalConflicts: 0,
      isPlaceholder: false,
      approvedForShadow: false,
    });
    expect(elig.status).toBe("READY_FOR_REVIEW");

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
        clinicalActivationAllowed: true,
      })
    ).toThrow(/clinicalActivationAllowed/);
  });
});
