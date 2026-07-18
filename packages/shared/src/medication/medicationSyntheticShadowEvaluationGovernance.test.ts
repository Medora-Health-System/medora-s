import { describe, expect, it } from "vitest";
import {
  PHASE14B_SYNTHETIC_SHADOW_DEFAULTS,
  assertNoMutableDraftKnowledgeConsumption,
  assertPhase14BSyntheticNoWorkflowControl,
  classifySyntheticFindingOutcome,
  evaluateBatchReadiness,
  evaluateFamilyExecutionStatus,
  isPermittedNegativeCaseFinding,
} from "./medicationSyntheticShadowEvaluationGovernance.js";

describe("medicationSyntheticShadowEvaluationGovernance", () => {
  it("keeps care-workflow and draft-consumption flags off", () => {
    expect(PHASE14B_SYNTHETIC_SHADOW_DEFAULTS.knowledgeControlsPatientCare).toBe(
      false
    );
    expect(PHASE14B_SYNTHETIC_SHADOW_DEFAULTS.consumeMutableDraftKnowledge).toBe(
      false
    );
    expect(() => assertPhase14BSyntheticNoWorkflowControl(true)).toThrow();
    expect(() => assertNoMutableDraftKnowledgeConsumption(true)).toThrow();
  });

  it("classifies deferred domains as skipped, not missed", () => {
    expect(
      classifySyntheticFindingOutcome({
        caseCategory: "DEFERRED_DOMAIN_GUARD",
        expectedFindingCount: 0,
        actualSafetyFindingCount: 0,
        deferredDomain: true,
        provenanceOk: true,
        identityResolved: true,
        engineError: false,
      })
    ).toBe("DEFERRED_DOMAIN_SKIPPED");
  });

  it("matches negative cases when no safety findings remain", () => {
    expect(
      classifySyntheticFindingOutcome({
        caseCategory: "NEGATIVE_EXPECTED_NO_FINDING",
        expectedFindingCount: 0,
        actualSafetyFindingCount: 0,
        deferredDomain: false,
        provenanceOk: true,
        identityResolved: true,
        engineError: false,
      })
    ).toBe("MATCHED");
    expect(isPermittedNegativeCaseFinding("INSUFFICIENT_PATIENT_CONTEXT")).toBe(
      true
    );
  });

  it("fails family on critical miss and qualifies batch only after execution", () => {
    expect(
      evaluateFamilyExecutionStatus({
        casesExecuted: 4,
        requiredCases: 4,
        criticalMisses: 1,
        highSeverityMisses: 0,
        unresolvedCriticalUnexpected: 0,
        provenanceErrors: 0,
        identityErrors: 0,
        engineErrors: 0,
        noncriticalGaps: 0,
      })
    ).toBe("SHADOW_EXECUTED_FAIL");

    expect(
      evaluateBatchReadiness({
        validated: true,
        executed: true,
        analyzed: true,
        familiesPassed: 8,
        familiesFailed: 0,
        familiesWithGaps: 0,
        criticalMisses: 0,
        targetFamilies: 8,
      })
    ).toBe("QUALIFIED");

    expect(
      evaluateBatchReadiness({
        validated: true,
        executed: false,
        analyzed: false,
        familiesPassed: 0,
        familiesFailed: 0,
        familiesWithGaps: 0,
        criticalMisses: 0,
        targetFamilies: 8,
      })
    ).toBe("READY_TO_EXECUTE");
  });
});
