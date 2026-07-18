import {
  PHASE12_EMERGENCY_MEDICATION_FAMILY_NAMES,
  PHASE12_KNOWLEDGE_POPULATION_DEFAULTS,
  assertNoDirectDraftToApproved,
  assertPhase12NoAutomaticApproval,
  evaluateShadowEligibilityGates,
} from "@medora/shared";
import { validatePhase12Manifest } from "./medication-knowledge-population.service";

describe("medicationKnowledgePopulation", () => {
  it("medicationKnowledgeManifest: validates 35 unique families and activation off", () => {
    expect(PHASE12_EMERGENCY_MEDICATION_FAMILY_NAMES).toHaveLength(35);
    const v = validatePhase12Manifest();
    expect(v.valid).toBe(true);
    expect(v.familyCount).toBe(35);
    expect(v.clinicalActivationAllowed).toBe(false);
    expect(v.automaticApprovalAllowed).toBe(false);
  });

  it("medicationKnowledgeImport: forbids auto-approve and DRAFT→APPROVED", () => {
    expect(() => assertPhase12NoAutomaticApproval(true)).toThrow();
    expect(() => assertNoDirectDraftToApproved("DRAFT", "APPROVED")).toThrow();
    expect(PHASE12_KNOWLEDGE_POPULATION_DEFAULTS.recordsWithoutSourcesAllowed).toBe(
      false
    );
  });

  it("medicationKnowledgeShadowEligibility: drafts do not satisfy approved gates", () => {
    const result = evaluateShadowEligibilityGates({
      identityResolved: true,
      hasGovernedSourceVersion: true,
      clinicalProfileApproved: false,
      administrationReviewed: false,
      monitoringReviewed: false,
      therapeuticClassReviewed: false,
      allergyMappingReviewed: false,
      duplicateTherapyReviewed: false,
      majorSafetyKnowledgeReviewed: false,
      emergencyContextReviewed: false,
      criticalConflictCount: 0,
      identityBlockerCount: 0,
    });
    expect(result.shadowEvaluable).toBe(false);
  });

  it("medicationKnowledgeCoverage: defaults keep activation/alerts off", () => {
    expect(PHASE12_KNOWLEDGE_POPULATION_DEFAULTS.providerFacingAlertsEnabled).toBe(
      false
    );
    expect(PHASE12_KNOWLEDGE_POPULATION_DEFAULTS.orderBlockingEnabled).toBe(false);
    expect(PHASE12_KNOWLEDGE_POPULATION_DEFAULTS.clinicalActivationEnabled).toBe(
      false
    );
    expect(
      PHASE12_KNOWLEDGE_POPULATION_DEFAULTS.automaticMedicationIdentityCreationEnabled
    ).toBe(false);
  });
});
