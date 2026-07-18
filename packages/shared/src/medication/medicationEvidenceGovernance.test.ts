import { describe, expect, it } from "vitest";
import {
  PHASE14A_EVIDENCE_GOVERNANCE_DEFAULTS,
  aggregateCompletenessScore,
  assertPhase14ANoWorkflowControl,
  assertKnowledgeRequiresProvenance,
  isNonEvidenceContent,
  defaultWave1DomainStatuses,
} from "./medicationEvidenceGovernance.js";

describe("medicationEvidenceGovernance", () => {
  it("keeps MI advisory and workflows unchanged", () => {
    expect(PHASE14A_EVIDENCE_GOVERNANCE_DEFAULTS.knowledgeControlsPatientCare).toBe(
      false
    );
    expect(PHASE14A_EVIDENCE_GOVERNANCE_DEFAULTS.orderingChanged).toBe(false);
    expect(PHASE14A_EVIDENCE_GOVERNANCE_DEFAULTS.clinicalActivationEnabled).toBe(
      false
    );
    expect(() => assertPhase14ANoWorkflowControl(true)).toThrow();
    expect(() => assertKnowledgeRequiresProvenance(null)).toThrow();
  });

  it("rejects non-evidence markers", () => {
    expect(isNonEvidenceContent("PHASE12_CLINICAL_FRAMEWORK_V1")).toBe(true);
    expect(isNonEvidenceContent("LLM_GENERATED dosing")).toBe(true);
    expect(isNonEvidenceContent("DailyMed labeling citation")).toBe(false);
  });

  it("scores completeness with provenance and deferred domains", () => {
    const domains = defaultWave1DomainStatuses({
      hasEvidenceLink: true,
      isPlaceholder: false,
      hasClinicalProfile: true,
      hasTherapeuticClass: true,
      hasAllergenMapping: true,
      hasDuplicateTherapy: true,
    });
    const score = aggregateCompletenessScore(domains);
    expect(score.provenanceScore).toBe(40);
    expect(score.domainsTotal).toBeGreaterThan(0);
    expect(score.overallScore).toBeGreaterThan(0);
  });
});
