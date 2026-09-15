import type { EncounterAiSnapshot } from "@medora/shared";
import { rule11AdministrationTimestampIntegrity } from "./rule-11-administration-timestamp-integrity.rule.js";

const ctx = {
  generatedAt: "2026-09-13T12:30:00.000Z",
  snapshotVersion: "phase-2e",
};

function snapshot(
  medicationAdministrations: NonNullable<
    EncounterAiSnapshot["treatments"]["medicationAdministrations"]
  >
): EncounterAiSnapshot {
  return {
    snapshotVersion: "phase-2e",
    generatedAt: "2026-09-13T12:30:00.000Z",
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
    treatments: {
      medicationOrders: [],
      medicationAdministrations,
      procedures: [],
    },
    diagnoses: {},
    disposition: {},
  };
}

describe("rule11AdministrationTimestampIntegrity", () => {
  it("flags an administered MAR entry without a timestamp in Treatment", () => {
    const findings = rule11AdministrationTimestampIntegrity(
      snapshot([
        {
          id: "mar-1",
          orderItemId: "med-1",
          action: "administered",
          administeredAt: null,
        },
      ]),
      ctx
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("MEDICATION_CONSIDERATION");
    expect(findings[0].priority).toBe("MEDIUM");
    expect(findings[0].recommendedActions).toEqual([
      { actionType: "REVIEW", label: "Review medication administration record" },
    ]);
  });

  it("does not flag an administered MAR entry with a timestamp", () => {
    expect(
      rule11AdministrationTimestampIntegrity(
        snapshot([
          {
            id: "mar-1",
            action: "administered",
            administeredAt: "2026-09-13T12:00:00.000Z",
          },
        ]),
        ctx
      )
    ).toEqual([]);
  });

  it("does not treat a non-administered action as missing administration time", () => {
    expect(
      rule11AdministrationTimestampIntegrity(
        snapshot([
          {
            id: "mar-1",
            action: "held",
            administeredAt: null,
          },
        ]),
        ctx
      )
    ).toEqual([]);
  });

  it("matches the administered action case-insensitively", () => {
    const findings = rule11AdministrationTimestampIntegrity(
      snapshot([
        {
          id: "mar-1",
          action: " ADMINISTERED ",
          administeredAt: null,
        },
      ]),
      ctx
    );

    expect(findings).toHaveLength(1);
  });
});
