import {
  assertNoOrderBlocking,
  assertNoProviderFacingAlerts,
  assertShadowOnlyFinding,
  buildSafetyFindingDeduplicationKey,
  PHASE10_SAFETY_EVALUATION_DEFAULTS,
  resolveMedicationSafetyEvaluationMode,
} from "@medora/shared";
import { getMedicationSafetyEvaluationMode } from "./medication-safety-evaluation-config";
import { enqueueOrderSignShadowEvaluation } from "./medication-safety-evaluation-orchestrator.service";

describe("medication safety evaluation shadow mode", () => {
  const original = process.env.MEDICATION_SAFETY_EVALUATION_MODE;

  afterEach(() => {
    if (original === undefined) delete process.env.MEDICATION_SAFETY_EVALUATION_MODE;
    else process.env.MEDICATION_SAFETY_EVALUATION_MODE = original;
  });

  it("fails closed and rejects active CDS modes", () => {
    process.env.MEDICATION_SAFETY_EVALUATION_MODE = "ACTIVE_ALERT";
    expect(getMedicationSafetyEvaluationMode()).toBe("DISABLED");
    expect(resolveMedicationSafetyEvaluationMode("HARD_STOP")).toBe("DISABLED");
    process.env.MEDICATION_SAFETY_EVALUATION_MODE = "shadow";
    expect(getMedicationSafetyEvaluationMode()).toBe("SHADOW");
  });

  it("enforces shadow-only and no provider/order side effects", () => {
    expect(() => assertShadowOnlyFinding(false)).toThrow();
    expect(() => assertNoProviderFacingAlerts(true)).toThrow();
    expect(() => assertNoOrderBlocking(true)).toThrow();
    expect(PHASE10_SAFETY_EVALUATION_DEFAULTS.overrideWorkflowEnabled).toBe(false);
    expect(PHASE10_SAFETY_EVALUATION_DEFAULTS.activeCdsModeAvailable).toBe(false);
  });

  it("builds deterministic finding keys for idempotent replay", () => {
    const a = buildSafetyFindingDeduplicationKey({
      patientId: "p",
      candidateMedicationIdentity: "c1",
      relatedMedicationIdentity: "c2",
      findingType: "DRUG_DRUG_INTERACTION",
      normalizedRuleIdentity: "rule",
      knowledgeVersion: "v1",
    });
    const b = buildSafetyFindingDeduplicationKey({
      patientId: "P",
      candidateMedicationIdentity: "C1",
      relatedMedicationIdentity: "C2",
      findingType: "drug_drug_interaction",
      normalizedRuleIdentity: "RULE",
      knowledgeVersion: "V1",
    });
    expect(a).toBe(b);
  });

  it("order-sign enqueue is fire-and-forget and does not throw", () => {
    process.env.MEDICATION_SAFETY_EVALUATION_MODE = "disabled";
    expect(() =>
      enqueueOrderSignShadowEvaluation({} as never, {
        patientId: "p",
        orderItemId: "o",
      })
    ).not.toThrow();
  });
});
