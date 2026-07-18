import { describe, expect, it } from "vitest";
import {
  allCriticalGatesPass,
  assessReadinessResult,
  assertForbiddenActivationStatus,
  assertPhase11NoOrderBlocking,
  assertPhase11NoProviderFacingAlerts,
  computeWeightedCoverageScore,
  evaluateCriticalCoverageGates,
  PHASE11_SAFETY_VALIDATION_DEFAULTS,
} from "./medicationSafetyValidationGovernance.js";

describe("medicationSafetyValidationGovernance", () => {
  it("computes weighted coverage and critical gates", () => {
    const score = computeWeightedCoverageScore([
      { domain: "IDENTITY", percentage: 100 },
      { domain: "DRUG_INTERACTION", percentage: 0 },
      { domain: "ALLERGY_MAPPING", percentage: 0 },
    ]);
    expect(score.weightedScore).toBeLessThan(1);
    const gates = evaluateCriticalCoverageGates({
      hasCanonicalIdentity: true,
      hasActiveProducts: true,
      hasTherapeuticClass: false,
      hasApprovedClinicalProfile: false,
      hasApprovedSafetyKnowledge: false,
      hasDuplicateTherapyMembership: false,
      hasAllergyMapping: false,
      shadowEvaluationSuccessful: false,
      pharmacistValidationCompleted: false,
      hasCriticalKnowledgeConflict: false,
      hasUnresolvedIdentityBlocker: false,
    });
    expect(gates.CanonicalIdentityResolved).toBe(true);
    expect(gates.TherapeuticClassAssigned).toBe(false);
    expect(allCriticalGatesPass(gates)).toBe(false);
  });

  it("assesses readiness without READY_FOR_ACTIVATION and forbids live modes", () => {
    const low = assessReadinessResult({
      reviewedCases: 10,
      dualReviewedCriticalCases: 0,
      truePositiveRate: 0.5,
      falsePositiveRate: 0.5,
      estimatedRecall: 0.5,
      criticalMisses: 1,
      unresolvedIdentityRate: 0.2,
      evaluationFailureRate: 0.1,
      knowledgeCoverage: 0.1,
    });
    expect(low.result).toBe("REMEDIATION_REQUIRED");
    expect(low.blockingCriteriaFailed.length).toBeGreaterThan(0);
    expect(() => assertForbiddenActivationStatus("ACTIVE")).toThrow(/Forbidden/);
    expect(() => assertPhase11NoProviderFacingAlerts(true)).toThrow();
    expect(() => assertPhase11NoOrderBlocking(true)).toThrow();
    expect(PHASE11_SAFETY_VALIDATION_DEFAULTS.clinicalActivationEnabled).toBe(false);
    expect(PHASE11_SAFETY_VALIDATION_DEFAULTS.activeCdsModeAvailable).toBe(false);
  });
});
