import { describe, expect, it } from "vitest";
import {
  assertApprovedKnowledgeImmutable,
  assertClinicalKnowledgeActivationDisabled,
  assertLegalClinicalKnowledgeLifecycleTransition,
  assertOnlyAdminMayApprove,
  isClinicalKnowledgeEligibleForFutureUse,
  PHASE8_CLINICAL_KNOWLEDGE_DEFAULTS,
} from "./medicationClinicalKnowledgeGovernance.js";

describe("medicationClinicalKnowledgeGovernance", () => {
  it("keeps clinical activation and CDS disabled by default", () => {
    expect(PHASE8_CLINICAL_KNOWLEDGE_DEFAULTS.automaticClinicalActivationEnabled).toBe(false);
    expect(PHASE8_CLINICAL_KNOWLEDGE_DEFAULTS.clinicalDecisionSupportEnabled).toBe(false);
    expect(() => assertClinicalKnowledgeActivationDisabled(false)).not.toThrow();
    expect(() => assertClinicalKnowledgeActivationDisabled(true)).toThrow(/automaticClinical/);
  });

  it("enforces lifecycle transitions and approval immutability", () => {
    expect(() =>
      assertLegalClinicalKnowledgeLifecycleTransition("DRAFT", "UNDER_REVIEW")
    ).not.toThrow();
    expect(() =>
      assertLegalClinicalKnowledgeLifecycleTransition("DRAFT", "APPROVED")
    ).toThrow(/Illegal/);
    expect(() => assertApprovedKnowledgeImmutable("APPROVED")).toThrow(/new version/);
    expect(() => assertApprovedKnowledgeImmutable("DRAFT")).not.toThrow();
  });

  it("restricts approval to medication admin", () => {
    expect(() => assertOnlyAdminMayApprove(["MEDICATION_REVIEWER"])).toThrow(/MEDICATION_ADMIN/);
    expect(() => assertOnlyAdminMayApprove(["MEDICATION_ADMIN"])).not.toThrow();
    expect(isClinicalKnowledgeEligibleForFutureUse("APPROVED")).toBe(true);
    expect(isClinicalKnowledgeEligibleForFutureUse("DRAFT")).toBe(false);
  });
});
