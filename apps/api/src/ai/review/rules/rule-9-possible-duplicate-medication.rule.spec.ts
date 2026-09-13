import type { EncounterAiSnapshot } from "@medora/shared";
import { rule9PossibleDuplicateMedication } from "./rule-9-possible-duplicate-medication.rule.js";

const ctx = { generatedAt: "2026-09-13T05:00:00.000Z", snapshotVersion: "phase-2c" };

function snapshot(medicationOrders: NonNullable<EncounterAiSnapshot["treatments"]["medicationOrders"]>): EncounterAiSnapshot {
  return {
    snapshotVersion: "phase-2c",
    generatedAt: "2026-09-13T05:00:00.000Z",
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
    diagnostics: {},
    treatments: { medicationOrders, medicationAdministrations: [], procedures: [] },
    diagnoses: {},
    disposition: {},
  };
}

describe("rule9PossibleDuplicateMedication", () => {
  it("flags two active orders with the same normalized label", () => {
    const findings = rule9PossibleDuplicateMedication(snapshot([
      { id: "med-1", displayLabel: "Medication A", status: "ACTIVE" },
      { id: "med-2", displayLabel: " medication   a ", status: "ACTIVE" },
    ]), ctx);

    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("DUPLICATION");
    expect(findings[0].priority).toBe("MEDIUM");
    expect(findings[0].recommendedActions).toEqual([{ actionType: "REVIEW", label: "Review chart" }]);
  });

  it("does not flag when the matching copy is terminal", () => {
    const findings = rule9PossibleDuplicateMedication(snapshot([
      { id: "med-1", displayLabel: "Medication A", status: "ACTIVE" },
      { id: "med-2", displayLabel: "Medication A", status: "DISCONTINUED" },
    ]), ctx);

    expect(findings).toEqual([]);
  });

  it("does not flag distinct labels or blank labels", () => {
    expect(rule9PossibleDuplicateMedication(snapshot([
      { id: "med-1", displayLabel: "Medication A", status: "ACTIVE" },
      { id: "med-2", displayLabel: "Medication B", status: "ACTIVE" },
    ]), ctx)).toEqual([]);

    expect(rule9PossibleDuplicateMedication(snapshot([
      { id: "med-1", displayLabel: " ", status: "ACTIVE" },
      { id: "med-2", displayLabel: null, status: "ACTIVE" },
    ]), ctx)).toEqual([]);
  });
});
