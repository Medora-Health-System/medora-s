import {
  assertApprovedSafetyKnowledgeImmutable,
  assertOnlyAdminMayApproveSafetyKnowledge,
  buildDirectionalInteractionIdentityKey,
  buildSymmetricInteractionPairKey,
  PHASE9_SAFETY_KNOWLEDGE_DEFAULTS,
} from "@medora/shared";

describe("medication interaction safety knowledge", () => {
  it("normalizes symmetric pairs and preserves directional keys", () => {
    const a = buildSymmetricInteractionPairKey({
      leftMedicationId: "b",
      rightMedicationId: "a",
      interactionScope: "CONCEPT_TO_CONCEPT",
      sourceVersionId: "v1",
    });
    const b = buildSymmetricInteractionPairKey({
      leftMedicationId: "a",
      rightMedicationId: "b",
      interactionScope: "CONCEPT_TO_CONCEPT",
      sourceVersionId: "v1",
    });
    expect(a).toBe(b);
    expect(
      buildDirectionalInteractionIdentityKey({
        subjectMedicationId: "a",
        objectMedicationId: "b",
        interactionScope: "CONCEPT_TO_CONCEPT",
        sourceVersionId: "v1",
      })
    ).not.toBe(
      buildDirectionalInteractionIdentityKey({
        subjectMedicationId: "b",
        objectMedicationId: "a",
        interactionScope: "CONCEPT_TO_CONCEPT",
        sourceVersionId: "v1",
      })
    );
  });

  it("keeps activation and patient evaluation disabled", () => {
    expect(PHASE9_SAFETY_KNOWLEDGE_DEFAULTS.automaticClinicalActivationEnabled).toBe(
      false
    );
    expect(PHASE9_SAFETY_KNOWLEDGE_DEFAULTS.patientSpecificEvaluationEnabled).toBe(
      false
    );
    expect(PHASE9_SAFETY_KNOWLEDGE_DEFAULTS.orderBlockingEnabled).toBe(false);
    expect(PHASE9_SAFETY_KNOWLEDGE_DEFAULTS.interactionAlertsEnabled).toBe(false);
  });

  it("enforces admin approval and approved immutability", () => {
    expect(() =>
      assertOnlyAdminMayApproveSafetyKnowledge(["MEDICATION_REVIEWER"])
    ).toThrow(/MEDICATION_ADMIN/);
    assertOnlyAdminMayApproveSafetyKnowledge(["MEDICATION_ADMIN"]);
    expect(() => assertApprovedSafetyKnowledgeImmutable("APPROVED")).toThrow(
      /new version/
    );
  });
});
