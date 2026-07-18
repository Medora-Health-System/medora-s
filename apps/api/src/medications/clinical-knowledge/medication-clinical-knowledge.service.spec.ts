import {
  assertApprovedKnowledgeImmutable,
  assertClinicalKnowledgeActivationDisabled,
  assertLegalClinicalKnowledgeLifecycleTransition,
  assertOnlyAdminMayApprove,
  PHASE8_CLINICAL_KNOWLEDGE_DEFAULTS,
} from "@medora/shared";

describe("medication-clinical-knowledge.service — governance guards", () => {
  it("keeps automatic clinical activation disabled", () => {
    expect(PHASE8_CLINICAL_KNOWLEDGE_DEFAULTS.automaticClinicalActivationEnabled).toBe(false);
    expect(() => assertClinicalKnowledgeActivationDisabled(false)).not.toThrow();
    expect(() => assertClinicalKnowledgeActivationDisabled(true)).toThrow();
  });

  it("requires admin for approval and forbids in-place approved edits", () => {
    expect(() => assertOnlyAdminMayApprove(["MEDICATION_REVIEWER"])).toThrow();
    expect(() => assertOnlyAdminMayApprove(["MEDICATION_ADMIN"])).not.toThrow();
    expect(() => assertApprovedKnowledgeImmutable("APPROVED")).toThrow(/new version/);
  });

  it("enforces lifecycle transitions", () => {
    expect(() =>
      assertLegalClinicalKnowledgeLifecycleTransition("UNDER_REVIEW", "APPROVED")
    ).not.toThrow();
    expect(() =>
      assertLegalClinicalKnowledgeLifecycleTransition("DRAFT", "APPROVED")
    ).toThrow();
  });
});
