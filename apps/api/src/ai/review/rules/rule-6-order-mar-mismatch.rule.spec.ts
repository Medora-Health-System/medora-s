import type { EncounterAiSnapshot } from "@medora/shared";
import { rule6OrderMarMismatch } from "./rule-6-order-mar-mismatch.rule.js";

const ctx = { generatedAt: "2026-09-13T16:15:00.000Z", snapshotVersion: "phase-2l" };

function snapshot(
  medicationOrders: NonNullable<EncounterAiSnapshot["treatments"]["medicationOrders"]>,
  medicationAdministrations: NonNullable<EncounterAiSnapshot["treatments"]["medicationAdministrations"]>
): EncounterAiSnapshot {
  return {
    snapshotVersion: "phase-2l",
    generatedAt: ctx.generatedAt,
    encounterContext: {
      encounterId: "11111111-1111-4111-8111-111111111111",
      facilityId: "22222222-2222-4222-8222-222222222222",
      patientId: "33333333-3333-4333-8333-333333333333",
      country: "US",
      encounterType: "EMERGENCY",
      status: "OPEN",
      careSetting: "EMERGENCY_DEPARTMENT",
    },
    patientContext: {}, presentation: {}, clinicalDocumentation: {}, diagnostics: {},
    treatments: { medicationOrders, medicationAdministrations, procedures: [] },
    diagnoses: {}, disposition: {},
  };
}

describe("Phase 2L medication order/MAR integrity", () => {
  it("surfaces an unmatched MAR order reference in Treatment", () => {
    const findings = rule6OrderMarMismatch(snapshot(
      [{ id: "med-1", status: "ACTIVE" }],
      [{ id: "mar-1", orderItemId: "missing-med", action: "administered" }]
    ), ctx);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.category).toBe("MEDICATION_CONSIDERATION");
    expect(findings[0]?.title).toBe("Medication administration is not linked to a medication order");
  });

  it.each(["held", "refused", "omitted", "stopped"])(
    "does not call a legitimate %s MAR action a contradiction",
    (action) => {
      expect(rule6OrderMarMismatch(snapshot(
        [{ id: "med-1", status: "ACTIVE", lifecycleState: "ACTIVE" }],
        [{ id: "mar-1", orderItemId: "med-1", action }]
      ), ctx)).toEqual([]);
    }
  );

  it("does not flag a correctly linked administered MAR entry", () => {
    expect(rule6OrderMarMismatch(snapshot(
      [{ id: "med-1", status: "ACTIVE" }],
      [{ id: "mar-1", orderItemId: "med-1", action: "administered", administeredAt: "2026-09-13T16:00:00.000Z" }]
    ), ctx)).toEqual([]);
  });
});
