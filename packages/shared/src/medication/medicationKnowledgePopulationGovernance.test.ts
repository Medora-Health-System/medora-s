import { describe, expect, it } from "vitest";
import {
  PHASE12_EMERGENCY_MEDICATION_FAMILY_NAMES,
  PHASE12_KNOWLEDGE_POPULATION_DEFAULTS,
  assertNoDirectDraftToApproved,
  assertPhase12BatchTransition,
  assertPhase12NoAutomaticApproval,
  evaluateShadowEligibilityGates,
  familyKeyFromName,
  normalizeMedicationFamilyName,
} from "./medicationKnowledgePopulationGovernance.js";

describe("medicationKnowledgePopulationGovernance", () => {
  it("locks 35 EM families and forbids activation defaults", () => {
    expect(PHASE12_EMERGENCY_MEDICATION_FAMILY_NAMES).toHaveLength(35);
    expect(
      new Set(
        PHASE12_EMERGENCY_MEDICATION_FAMILY_NAMES.map(normalizeMedicationFamilyName)
      ).size
    ).toBe(35);
    expect(PHASE12_KNOWLEDGE_POPULATION_DEFAULTS.clinicalActivationEnabled).toBe(
      false
    );
    expect(
      PHASE12_KNOWLEDGE_POPULATION_DEFAULTS.automaticKnowledgeApprovalEnabled
    ).toBe(false);
    expect(familyKeyFromName("vitamin K")).toBe("EM_FAM_VITAMIN_K");
  });

  it("forbids DRAFT→APPROVED and automatic approval", () => {
    expect(() => assertNoDirectDraftToApproved("DRAFT", "APPROVED")).toThrow();
    expect(() => assertPhase12BatchTransition("DRAFT", "APPROVED")).toThrow();
    expect(() => assertPhase12BatchTransition("DRAFT", "IDENTITY_RESOLUTION")).not.toThrow();
    expect(() => assertPhase12NoAutomaticApproval(true)).toThrow();
  });

  it("shadow eligibility requires all critical gates", () => {
    const blocked = evaluateShadowEligibilityGates({
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
    expect(blocked.shadowEvaluable).toBe(false);
    expect(blocked.reasonCodes.length).toBeGreaterThan(0);
  });
});
