import type { EncounterAiSnapshot } from "@medora/shared";
import { rule1UnacknowledgedCriticalResult } from "./rule-1-unacknowledged-critical-result.rule.js";

const ctx = {
  generatedAt: "2026-09-13T13:10:00.000Z",
  snapshotVersion: "phase-2h",
};

function snapshot(
  criticalResults: NonNullable<EncounterAiSnapshot["diagnostics"]["criticalResults"]>
): EncounterAiSnapshot {
  return {
    snapshotVersion: "phase-2h",
    generatedAt: "2026-09-13T13:10:00.000Z",
    encounterContext: {
      encounterId: "11111111-1111-4111-8111-111111111111",
      facilityId: "22222222-2222-4222-8222-222222222222",
      patientId: "33333333-3333-4333-8333-333333333333",
      country: "US",
      encounterType: "EMERGENCY",
      status: "OPEN",
      careSetting: "EMERGENCY_DEPARTMENT",
    },
    patientContext: {},
    presentation: {},
    clinicalDocumentation: {},
    diagnostics: {
      orders: [],
      results: criticalResults,
      pendingTests: [],
      criticalResults,
    },
    treatments: {},
    diagnoses: {},
    disposition: {},
  };
}

describe("rule1UnacknowledgedCriticalResult", () => {
  it("flags an unacknowledged critical result with navigation-only action", () => {
    const findings = rule1UnacknowledgedCriticalResult(
      snapshot([
        {
          id: "result-1",
          orderItemId: "item-1",
          criticalValue: true,
          acknowledgedByProviderAt: null,
          resultedAt: "2026-09-13T13:00:00.000Z",
          verifiedAt: "2026-09-13T13:01:00.000Z",
        },
      ]),
      ctx
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("CLINICAL_SAFETY");
    expect(findings[0].priority).toBe("CRITICAL");
    expect(findings[0].recommendedActions).toEqual([
      {
        actionType: "NAVIGATE",
        targetSection: "results",
        label: "Review critical result",
      },
    ]);
    expect(findings[0].recommendedActions.some((action) => action.actionType === "ACKNOWLEDGE")).toBe(false);
    expect(findings[0].recommendedActions.some((action) => action.actionType === "DISMISS")).toBe(false);
  });

  it("does not flag a critical result already acknowledged by a provider", () => {
    const findings = rule1UnacknowledgedCriticalResult(
      snapshot([
        {
          id: "result-1",
          orderItemId: "item-1",
          criticalValue: true,
          acknowledgedByProviderAt: "2026-09-13T13:02:00.000Z",
          resultedAt: "2026-09-13T13:00:00.000Z",
          verifiedAt: "2026-09-13T13:01:00.000Z",
        },
      ]),
      ctx
    );

    expect(findings).toEqual([]);
  });
});
