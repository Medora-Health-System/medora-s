import { describe, expect, it } from "vitest";
import {
  assertNoOrderBlocking,
  assertNoProviderFacingAlerts,
  assertShadowOnlyFinding,
  buildSafetyFindingDeduplicationKey,
  PHASE10_SAFETY_EVALUATION_DEFAULTS,
  resolveMedicationSafetyEvaluationMode,
} from "./medicationSafetyEvaluationGovernance.js";

describe("medicationSafetyEvaluationGovernance", () => {
  it("fails closed to DISABLED for missing, invalid, and forbidden modes", () => {
    expect(resolveMedicationSafetyEvaluationMode(undefined)).toBe("DISABLED");
    expect(resolveMedicationSafetyEvaluationMode("")).toBe("DISABLED");
    expect(resolveMedicationSafetyEvaluationMode("live")).toBe("DISABLED");
    expect(resolveMedicationSafetyEvaluationMode("ACTIVE_ALERT")).toBe("DISABLED");
    expect(resolveMedicationSafetyEvaluationMode("HARD_STOP")).toBe("DISABLED");
    expect(resolveMedicationSafetyEvaluationMode("shadow")).toBe("SHADOW");
    expect(resolveMedicationSafetyEvaluationMode("DISABLED")).toBe("DISABLED");
  });

  it("builds deterministic finding keys and enforces shadow-only guards", () => {
    const a = buildSafetyFindingDeduplicationKey({
      patientId: "P1",
      encounterId: "E1",
      candidateMedicationIdentity: "Concept-A",
      relatedMedicationIdentity: "Concept-B",
      findingType: "drug_drug_interaction",
      normalizedRuleIdentity: "rule-1",
      knowledgeVersion: "v1",
    });
    const b = buildSafetyFindingDeduplicationKey({
      patientId: "p1",
      encounterId: "e1",
      candidateMedicationIdentity: "concept-a",
      relatedMedicationIdentity: "concept-b",
      findingType: "DRUG_DRUG_INTERACTION",
      normalizedRuleIdentity: "RULE-1",
      knowledgeVersion: "V1",
    });
    expect(a).toBe(b);
    expect(() => assertShadowOnlyFinding(false)).toThrow(/shadowOnly/);
    expect(() => assertNoProviderFacingAlerts(true)).toThrow(/alerts/);
    expect(() => assertNoOrderBlocking(true)).toThrow(/blocking/);
    expect(PHASE10_SAFETY_EVALUATION_DEFAULTS.activeCdsModeAvailable).toBe(false);
  });
});
