import {
  PHASE14A_EVIDENCE_GOVERNANCE_DEFAULTS,
  assertKnowledgeRequiresProvenance,
  assertPhase14ANoWorkflowControl,
  isNonEvidenceContent,
} from "@medora/shared";

describe("medicationEvidenceGovernance", () => {
  it("medicationEvidenceAcquisition: forbids workflow control and missing provenance", () => {
    expect(
      PHASE14A_EVIDENCE_GOVERNANCE_DEFAULTS.knowledgeControlsPatientCare
    ).toBe(false);
    expect(PHASE14A_EVIDENCE_GOVERNANCE_DEFAULTS.orderingChanged).toBe(false);
    expect(() => assertPhase14ANoWorkflowControl(true)).toThrow();
    expect(() => assertKnowledgeRequiresProvenance(undefined)).toThrow();
  });

  it("medicationKnowledgeCompletion: rejects Phase 12 scaffolding as evidence", () => {
    expect(isNonEvidenceContent("PHASE12_CLINICAL_FRAMEWORK_V1")).toBe(true);
    expect(
      PHASE14A_EVIDENCE_GOVERNANCE_DEFAULTS.automaticKnowledgeApprovalEnabled
    ).toBe(false);
    expect(
      PHASE14A_EVIDENCE_GOVERNANCE_DEFAULTS.clinicalActivationEnabled
    ).toBe(false);
  });
});
