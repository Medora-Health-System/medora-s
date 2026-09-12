import { Test } from "@nestjs/testing";
import { randomUUID } from "node:crypto";
import {
  type EncounterAiSnapshot,
  encounterAiSnapshotSchema,
  AiClinicalReviewOutput,
} from "@medora/shared";
import { DeterministicReviewEngine } from "./deterministic-review-engine.service";
import { DeterministicReviewModule } from "./review.module";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

function makeSnapshot(overrides: DeepPartial<EncounterAiSnapshot> = {}): EncounterAiSnapshot {
  const base: EncounterAiSnapshot = {
    snapshotVersion: "v1/phase-1c-b-test",
    generatedAt: "2026-01-01T00:00:00.000Z",
    encounterContext: {
      encounterId: randomUUID(),
      facilityId: randomUUID(),
      patientId: randomUUID(),
      country: "US",
      encounterType: "EMERGENCY",
      status: "OPEN",
      careSetting: "EMERGENCY_DEPARTMENT",
    },
    patientContext: {},
    presentation: {},
    clinicalDocumentation: { providerDocumentationStatus: "SIGNED" },
    diagnostics: {},
    treatments: {},
    diagnoses: {},
    disposition: {},
  };

  const snapshot: EncounterAiSnapshot = {
    ...base,
    ...overrides,
    encounterContext: { ...base.encounterContext, ...overrides.encounterContext },
    patientContext: { ...base.patientContext, ...overrides.patientContext },
    presentation: { ...base.presentation, ...overrides.presentation },
    clinicalDocumentation: { ...base.clinicalDocumentation, ...overrides.clinicalDocumentation },
    diagnostics: { ...base.diagnostics, ...overrides.diagnostics },
    treatments: { ...base.treatments, ...overrides.treatments },
    diagnoses: { ...base.diagnoses, ...overrides.diagnoses },
    disposition: { ...base.disposition, ...overrides.disposition },
  };

  return encounterAiSnapshotSchema.parse(snapshot);
}

describe("DeterministicReviewEngine", () => {
  it("returns an empty, schema-valid review for a clean snapshot", () => {
    const engine = new DeterministicReviewEngine();
    const output = engine.run(makeSnapshot());

    expect(output.suggestions).toEqual([]);
    expect(() => AiClinicalReviewOutput.parse(output)).not.toThrow();
  });

  it("exposes the deterministic review engine from its module", async () => {
    const module = await Test.createTestingModule({
      imports: [DeterministicReviewModule],
    }).compile();

    const engine = module.get(DeterministicReviewEngine);
    expect(engine).toBeInstanceOf(DeterministicReviewEngine);
    expect(engine.run(makeSnapshot()).suggestions).toEqual([]);
  });

  describe("Rule 1 — unacknowledged critical result", () => {
    it("flags an unacknowledged critical result", () => {
      const engine = new DeterministicReviewEngine();
      const output = engine.run(
        makeSnapshot({
          diagnostics: {
            criticalResults: [
              {
                id: "result-1",
                criticalValue: true,
                acknowledgedByProviderAt: null,
                verifiedAt: "2026-01-01T08:00:00.000Z",
              },
            ],
          },
        })
      );

      expect(output.suggestions).toHaveLength(1);
      expect(output.suggestions[0].category).toBe("CLINICAL_SAFETY");
      expect(output.suggestions[0].priority).toBe("CRITICAL");
      expect(output.suggestions[0].title).toBe("Unacknowledged critical result");
      expect(output.suggestions[0].recommendedActions?.[0].actionType).toBe("ACKNOWLEDGE");
    });

    it("does not flag an acknowledged critical result", () => {
      const engine = new DeterministicReviewEngine();
      const output = engine.run(
        makeSnapshot({
          diagnostics: {
            criticalResults: [
              {
                id: "result-1",
                criticalValue: true,
                acknowledgedByProviderAt: "2026-01-01T09:00:00.000Z",
              },
            ],
          },
        })
      );

      expect(output.suggestions).toEqual([]);
    });
  });

  describe("Rule 2 — pending diagnostic at discharge", () => {
    it("flags a pending test when the encounter is discharged", () => {
      const engine = new DeterministicReviewEngine();
      const output = engine.run(
        makeSnapshot({
          encounterContext: { status: "CLOSED" },
          diagnostics: {
            pendingTests: ["item-1"],
            orders: [
              {
                id: "order-1",
                items: [
                  {
                    id: "item-1",
                    displayLabel: "CBC",
                    status: "PENDING",
                    lifecycleState: "ORDERED",
                  },
                ],
              },
            ],
          },
        })
      );

      const pending = output.suggestions.find((s) => s.title === "Pending diagnostic test at discharge");
      expect(pending).toBeDefined();
      expect(pending!.category).toBe("DISCHARGE_SAFETY");
      expect(pending!.priority).toBe("HIGH");
    });

    it("does not flag pending tests for an open encounter", () => {
      const engine = new DeterministicReviewEngine();
      const output = engine.run(
        makeSnapshot({
          encounterContext: { status: "OPEN" },
          diagnostics: {
            pendingTests: ["item-1"],
            orders: [
              {
                id: "order-1",
                items: [{ id: "item-1" }],
              },
            ],
          },
        })
      );

      expect(output.suggestions).toEqual([]);
    });

    it("flags an unacknowledged critical result at discharge", () => {
      const engine = new DeterministicReviewEngine();
      const output = engine.run(
        makeSnapshot({
          encounterContext: { status: "CLOSED" },
          diagnostics: {
            criticalResults: [
              {
                id: "result-1",
                criticalValue: true,
                acknowledgedByProviderAt: null,
              },
            ],
          },
        })
      );

      const critical = output.suggestions.find(
        (s) => s.title === "Unacknowledged critical result at discharge"
      );
      expect(critical).toBeDefined();
      expect(critical!.priority).toBe("CRITICAL");
    });
  });

  describe("Rule 3 — missing disposition", () => {
    it("flags a closed encounter with no disposition", () => {
      const engine = new DeterministicReviewEngine();
      const output = engine.run(
        makeSnapshot({
          encounterContext: { status: "CLOSED" },
          disposition: { disposition: null },
        })
      );

      expect(output.suggestions).toHaveLength(1);
      expect(output.suggestions[0].category).toBe("DISPOSITION_GAP");
      expect(output.suggestions[0].priority).toBe("HIGH");
    });

    it("does not flag a closed encounter with a disposition", () => {
      const engine = new DeterministicReviewEngine();
      const output = engine.run(
        makeSnapshot({
          encounterContext: { status: "CLOSED" },
          disposition: { disposition: "DISCHARGED_HOME" },
        })
      );

      expect(output.suggestions).toEqual([]);
    });

    it("does not flag an open encounter missing disposition", () => {
      const engine = new DeterministicReviewEngine();
      const output = engine.run(
        makeSnapshot({
          encounterContext: { status: "OPEN" },
          disposition: { disposition: null },
        })
      );

      expect(output.suggestions).toEqual([]);
    });
  });

  describe("Rule 4 — unsigned provider documentation", () => {
    it("flags documentation that is not signed", () => {
      const engine = new DeterministicReviewEngine();
      const output = engine.run(
        makeSnapshot({
          clinicalDocumentation: { providerDocumentationStatus: "DRAFT" },
        })
      );

      expect(output.suggestions).toHaveLength(1);
      expect(output.suggestions[0].category).toBe("DOCUMENTATION_GAP");
      expect(output.suggestions[0].priority).toBe("MEDIUM");
    });

    it("does not flag signed documentation", () => {
      const engine = new DeterministicReviewEngine();
      const output = engine.run(
        makeSnapshot({
          clinicalDocumentation: { providerDocumentationStatus: "SIGNED" },
        })
      );

      expect(output.suggestions).toEqual([]);
    });
  });

  describe("Rule 5 — open follow-up", () => {
    it("flags an incomplete follow-up", () => {
      const engine = new DeterministicReviewEngine();
      const output = engine.run(
        makeSnapshot({
          disposition: {
            followUps: [
              {
                id: "fu-1",
                status: "OPEN",
                dueDate: "2026-01-08T00:00:00.000Z",
              },
            ],
          },
        })
      );

      expect(output.suggestions).toHaveLength(1);
      expect(output.suggestions[0].category).toBe("FOLLOW_UP_GAP");
      expect(output.suggestions[0].priority).toBe("MEDIUM");
    });

    it.each(["COMPLETED", "CANCELLED"] as const)("does not flag a %s follow-up", (status) => {
      const engine = new DeterministicReviewEngine();
      const output = engine.run(
        makeSnapshot({
          disposition: {
            followUps: [{ id: "fu-1", status }],
          },
        })
      );

      expect(output.suggestions).toEqual([]);
    });
  });

  describe("Rule 6 — order/MAR mismatch", () => {
    it("flags an administration that references an unknown order", () => {
      const engine = new DeterministicReviewEngine();
      const output = engine.run(
        makeSnapshot({
          treatments: {
            medicationOrders: [{ id: "med-1" }],
            medicationAdministrations: [
              { id: "mar-1", orderItemId: "med-unknown", action: "administered" },
            ],
          },
        })
      );

      expect(output.suggestions).toHaveLength(1);
      expect(output.suggestions[0].category).toBe("CONTRADICTION");
      expect(output.suggestions[0].title).toBe("Medication administration references unknown order");
    });

    it("flags an active order with a non-administered MAR action", () => {
      const engine = new DeterministicReviewEngine();
      const output = engine.run(
        makeSnapshot({
          treatments: {
            medicationOrders: [{ id: "med-1", status: "ACTIVE", lifecycleState: "ACTIVE" }],
            medicationAdministrations: [
              { id: "mar-1", orderItemId: "med-1", action: "held" },
            ],
          },
        })
      );

      expect(output.suggestions).toHaveLength(1);
      expect(output.suggestions[0].title).toBe("Medication administration action does not match active order");
    });

    it("does not flag an active order with an administered action", () => {
      const engine = new DeterministicReviewEngine();
      const output = engine.run(
        makeSnapshot({
          treatments: {
            medicationOrders: [{ id: "med-1", status: "ACTIVE" }],
            medicationAdministrations: [
              { id: "mar-1", orderItemId: "med-1", action: "administered" },
            ],
          },
        })
      );

      expect(output.suggestions).toEqual([]);
    });

    it("does not flag a cancelled order with a non-administered action", () => {
      const engine = new DeterministicReviewEngine();
      const output = engine.run(
        makeSnapshot({
          treatments: {
            medicationOrders: [{ id: "med-1", status: "CANCELLED" }],
            medicationAdministrations: [
              { id: "mar-1", orderItemId: "med-1", action: "held" },
            ],
          },
        })
      );

      expect(output.suggestions).toEqual([]);
    });
  });

  describe("Engine resilience", () => {
    it("logs a failing rule and continues processing the remaining rules", () => {
      const engine = new DeterministicReviewEngine();
      const loggerError = jest.spyOn(engine["logger"], "error").mockImplementation(() => {});

      (engine as any)["rules"] = [
        () => {
          throw new Error("rule failure");
        },
        () => [],
      ];

      const output = engine.run(makeSnapshot());

      expect(loggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Deterministic review rule failed",
          error: "rule failure",
        })
      );
      expect(output.suggestions).toEqual([]);

      loggerError.mockRestore();
    });
  });
});
