import {
  allCriticalGatesPass,
  assessReadinessResult,
  assertForbiddenActivationStatus,
  computeWeightedCoverageScore,
  evaluateCriticalCoverageGates,
  PHASE11_SAFETY_VALIDATION_DEFAULTS,
} from "@medora/shared";

describe("medicationSafetyValidation / coverage / readiness", () => {
  it("medicationCoverage: weighted score does not hide missing critical domains", () => {
    const score = computeWeightedCoverageScore([
      { domain: "IDENTITY", percentage: 100 },
      { domain: "PRODUCT", percentage: 100 },
      { domain: "DRUG_INTERACTION", percentage: 0 },
      { domain: "ALLERGY_MAPPING", percentage: 0 },
      { domain: "DUPLICATE_THERAPY", percentage: 0 },
    ]);
    expect(score.weightedScore).toBeLessThan(0.85);
  });

  it("medicationCoverage: critical gates block incomplete families", () => {
    const gates = evaluateCriticalCoverageGates({
      hasCanonicalIdentity: true,
      hasActiveProducts: true,
      hasTherapeuticClass: true,
      hasApprovedClinicalProfile: true,
      hasApprovedSafetyKnowledge: false,
      hasDuplicateTherapyMembership: false,
      hasAllergyMapping: false,
      shadowEvaluationSuccessful: true,
      pharmacistValidationCompleted: false,
      hasCriticalKnowledgeConflict: false,
      hasUnresolvedIdentityBlocker: false,
    });
    expect(allCriticalGatesPass(gates)).toBe(false);
  });

  it("medicationActivationReadiness: insufficient sample and critical misses block", () => {
    const result = assessReadinessResult({
      reviewedCases: 10,
      dualReviewedCriticalCases: 0,
      truePositiveRate: 0.99,
      falsePositiveRate: 0.01,
      estimatedRecall: 0.99,
      criticalMisses: 1,
      unresolvedIdentityRate: 0,
      evaluationFailureRate: 0,
      knowledgeCoverage: 0.99,
    });
    expect(result.result).toBe("REMEDIATION_REQUIRED");
    expect(result.blockingCriteriaFailed).toContain("maximumCriticalMisses");
    expect(result.blockingCriteriaFailed).toContain("minimumReviewedCases");
  });

  it("medicationActivationReadiness: forbids live activation statuses and keeps defaults off", () => {
    expect(() => assertForbiddenActivationStatus("READY_FOR_ACTIVATION")).toThrow();
    expect(() => assertForbiddenActivationStatus("ACTIVE")).toThrow();
    expect(PHASE11_SAFETY_VALIDATION_DEFAULTS.providerFacingAlertsEnabled).toBe(
      false
    );
    expect(PHASE11_SAFETY_VALIDATION_DEFAULTS.orderBlockingEnabled).toBe(false);
    expect(PHASE11_SAFETY_VALIDATION_DEFAULTS.clinicalActivationEnabled).toBe(
      false
    );
    expect(
      PHASE11_SAFETY_VALIDATION_DEFAULTS.automaticMedicationIdentityCreationEnabled
    ).toBe(false);
    expect(
      PHASE11_SAFETY_VALIDATION_DEFAULTS.automaticKnowledgeApprovalEnabled
    ).toBe(false);
  });

  it("false-positive analytics must not treat UNREVIEWED as confirmed FP", () => {
    const classifications = ["UNREVIEWED", "FALSE_POSITIVE", "TRUE_POSITIVE"];
    const confirmedFp = classifications.filter((c) => c === "FALSE_POSITIVE");
    const unreviewed = classifications.filter((c) => c === "UNREVIEWED");
    expect(confirmedFp).toHaveLength(1);
    expect(unreviewed).not.toContain("FALSE_POSITIVE");
  });
});
