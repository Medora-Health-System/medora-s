import { describe, expect, it } from "vitest";
import {
  assertApprovedSafetyKnowledgeImmutable,
  assertLegalSafetyKnowledgeLifecycleTransition,
  assertOnlyAdminMayApproveSafetyKnowledge,
  assertSafetyKnowledgeActivationDisabled,
  buildDirectionalInteractionIdentityKey,
  buildSymmetricInteractionPairKey,
  classifyReversedSymmetricPair,
  classifySymmetricPairDuplicate,
  isSafetyKnowledgeEligibleForFutureCds,
  PHASE9_SAFETY_KNOWLEDGE_DEFAULTS,
} from "./medicationSafetyKnowledgeGovernance.js";

describe("medicationSafetyKnowledgeGovernance", () => {
  it("normalizes symmetric pairs regardless of input order", () => {
    const a = buildSymmetricInteractionPairKey({
      leftMedicationId: "Concept-B",
      rightMedicationId: "concept-a",
      interactionScope: "concept_to_concept",
      sourceVersionId: "Ver-1",
    });
    const b = buildSymmetricInteractionPairKey({
      leftMedicationId: "concept-a",
      rightMedicationId: "Concept-B",
      interactionScope: "CONCEPT_TO_CONCEPT",
      sourceVersionId: "ver-1",
    });
    expect(a).toBe(b);
    expect(a.startsWith("concept-a|concept-b|")).toBe(true);
  });

  it("preserves directional identity order", () => {
    const forward = buildDirectionalInteractionIdentityKey({
      subjectMedicationId: "a",
      objectMedicationId: "b",
      interactionScope: "CONCEPT_TO_CONCEPT",
      sourceVersionId: "v1",
    });
    const reverse = buildDirectionalInteractionIdentityKey({
      subjectMedicationId: "b",
      objectMedicationId: "a",
      interactionScope: "CONCEPT_TO_CONCEPT",
      sourceVersionId: "v1",
    });
    expect(forward).not.toBe(reverse);
    expect(forward.startsWith("DIR|a|b|")).toBe(true);
  });

  it("detects reversed symmetric duplicates and enforces lifecycle/activation guards", () => {
    const key = buildSymmetricInteractionPairKey({
      leftMedicationId: "x",
      rightMedicationId: "y",
      interactionScope: "CONCEPT_TO_CONCEPT",
      sourceVersionId: "s1",
    });
    expect(
      classifyReversedSymmetricPair({
        leftId: "y",
        rightId: "x",
        existingPairKey: key,
        interactionScope: "CONCEPT_TO_CONCEPT",
        sourceVersionId: "s1",
      })
    ).toBe("REVERSED_PAIR_DUPLICATE");

    expect(
      classifySymmetricPairDuplicate({
        existingNormalizedPairKey: key,
        candidateNormalizedPairKey: key,
        existingDirectional: false,
        candidateDirectional: false,
      })
    ).toBe("EXACT_DUPLICATE");

    expect(() => assertSafetyKnowledgeActivationDisabled(true)).toThrow(/forbids/);
    expect(() => assertApprovedSafetyKnowledgeImmutable("APPROVED")).toThrow(/new version/);
    expect(() => assertOnlyAdminMayApproveSafetyKnowledge(["MEDICATION_REVIEWER"])).toThrow(
      /MEDICATION_ADMIN/
    );
    assertOnlyAdminMayApproveSafetyKnowledge(["MEDICATION_ADMIN"]);
    assertLegalSafetyKnowledgeLifecycleTransition("DRAFT", "UNDER_REVIEW");
    expect(() =>
      assertLegalSafetyKnowledgeLifecycleTransition("APPROVED", "DRAFT")
    ).toThrow(/Illegal/);
    expect(isSafetyKnowledgeEligibleForFutureCds("APPROVED", true)).toBe(true);
    expect(isSafetyKnowledgeEligibleForFutureCds("DRAFT", true)).toBe(false);
    expect(PHASE9_SAFETY_KNOWLEDGE_DEFAULTS.orderBlockingEnabled).toBe(false);
    expect(PHASE9_SAFETY_KNOWLEDGE_DEFAULTS.patientSpecificEvaluationEnabled).toBe(false);
  });
});
