import type { EncounterAiSnapshot } from "@medora/shared";
import { rule10PrimaryDiagnosisConsistency } from "./rule-10-primary-diagnosis-consistency.rule.js";

const ctx = { generatedAt: "2026-09-13T05:30:00.000Z", snapshotVersion: "phase-2d" };

function snapshot(documentedDiagnoses: NonNullable<EncounterAiSnapshot["diagnoses"]["documentedDiagnoses"]>): EncounterAiSnapshot {
  return {
    snapshotVersion: "phase-2d",
    generatedAt: "2026-09-13T05:30:00.000Z",
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
    treatments: {},
    diagnoses: { documentedDiagnoses },
    disposition: {},
  };
}

describe("rule10PrimaryDiagnosisConsistency", () => {
  it("flags more than one active primary designation", () => {
    const findings = rule10PrimaryDiagnosisConsistency(snapshot([
      { id: "d1", display: "Diagnosis A", isPrimary: true, status: "ACTIVE" },
      { id: "d2", display: "Diagnosis B", isPrimary: true, status: "ACTIVE" },
    ]), ctx);

    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("CONTRADICTION");
    expect(findings[0].recommendedActions).toEqual([
      { actionType: "NAVIGATE", targetSection: "diagnoses", label: "Review diagnosis list" },
    ]);
  });

  it("does not flag one active primary designation", () => {
    expect(rule10PrimaryDiagnosisConsistency(snapshot([
      { id: "d1", display: "Diagnosis A", isPrimary: true, status: "ACTIVE" },
      { id: "d2", display: "Diagnosis B", isPrimary: false, status: "ACTIVE" },
    ]), ctx)).toEqual([]);
  });

  it("ignores removed primary entries", () => {
    expect(rule10PrimaryDiagnosisConsistency(snapshot([
      { id: "d1", display: "Diagnosis A", isPrimary: true, status: "ACTIVE" },
      { id: "d2", display: "Diagnosis B", isPrimary: true, status: "REMOVED" },
    ]), ctx)).toEqual([]);
  });
});
