import type { EncounterAiSnapshot } from "@medora/shared";
import { rule7ReassessmentAfterTreatment } from "./rule-7-reassessment-after-treatment.rule.js";

const ctx = {
  generatedAt: "2026-09-13T04:00:00.000Z",
  snapshotVersion: "phase-2a-test-snapshot",
};

function buildSnapshot(overrides: Partial<EncounterAiSnapshot> = {}): EncounterAiSnapshot {
  return {
    snapshotVersion: "phase-2a-test-snapshot",
    generatedAt: "2026-09-13T04:00:00.000Z",
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
    clinicalDocumentation: {
      structuredEntries: [],
      reassessments: [],
    },
    diagnostics: {},
    treatments: {
      medicationOrders: [],
      medicationAdministrations: [],
      procedures: [],
    },
    diagnoses: {},
    disposition: {},
    ...overrides,
  };
}

describe("rule7ReassessmentAfterTreatment", () => {
  it("does not apply to routine office/outpatient clinic encounters", () => {
    const snapshot = buildSnapshot({
      encounterContext: {
        ...buildSnapshot().encounterContext,
        careSetting: "OFFICE_OUTPATIENT_CLINIC",
      },
      treatments: {
        medicationAdministrations: [
          {
            id: "mar-1",
            administeredAt: "2026-09-13T03:00:00.000Z",
          },
        ],
      },
    });

    expect(rule7ReassessmentAfterTreatment(snapshot, ctx)).toEqual([]);
  });

  it("does nothing when no treatment event has a proven clinical timestamp", () => {
    const snapshot = buildSnapshot({
      treatments: {
        medicationAdministrations: [{ id: "mar-1", administeredAt: null }],
        procedures: [{ id: "proc-1", performedAt: null }],
      },
    });

    expect(rule7ReassessmentAfterTreatment(snapshot, ctx)).toEqual([]);
  });

  it("flags missing structured reassessment documentation after treatment", () => {
    const snapshot = buildSnapshot({
      treatments: {
        medicationAdministrations: [
          {
            id: "mar-1",
            administeredAt: "2026-09-13T03:00:00.000Z",
          },
        ],
      },
    });

    const findings = rule7ReassessmentAfterTreatment(snapshot, ctx);

    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("REASSESSMENT_GAP");
    expect(findings[0].priority).toBe("MEDIUM");
    expect(findings[0].recommendedActions).toEqual([
      {
        actionType: "NAVIGATE",
        targetSection: "nursing",
        label: "Review reassessment documentation",
      },
    ]);
  });

  it("accepts a reliable ER reassessment documented after treatment", () => {
    const snapshot = buildSnapshot({
      clinicalDocumentation: {
        structuredEntries: [
          {
            id: "reassess-1",
            namespace: "erNursingReassessmentV1",
            documentedAt: "2026-09-13T04:00:00.000Z",
            payloadSummary: {
              reassessmentAt: "2026-09-13T03:20:00.000Z",
            },
          },
        ],
        reassessments: [],
      },
      treatments: {
        medicationAdministrations: [
          {
            id: "mar-1",
            administeredAt: "2026-09-13T03:00:00.000Z",
          },
        ],
      },
    });

    expect(rule7ReassessmentAfterTreatment(snapshot, ctx)).toEqual([]);
  });

  it("flags when the latest reliable reassessment predates the latest treatment", () => {
    const snapshot = buildSnapshot({
      clinicalDocumentation: {
        structuredEntries: [
          {
            id: "reassess-1",
            namespace: "erNursingReassessmentV1",
            documentedAt: "2026-09-13T04:00:00.000Z",
            payloadSummary: {
              reassessmentAt: "2026-09-13T02:30:00.000Z",
            },
          },
        ],
        reassessments: [],
      },
      treatments: {
        medicationAdministrations: [
          {
            id: "mar-1",
            administeredAt: "2026-09-13T03:00:00.000Z",
          },
        ],
      },
    });

    const findings = rule7ReassessmentAfterTreatment(snapshot, ctx);

    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("REASSESSMENT_GAP");
    expect(findings[0].title).toBe("Latest structured reassessment predates treatment");
  });

  it("does not treat the snapshot wrapper time as the ER clinical reassessment time", () => {
    const snapshot = buildSnapshot({
      clinicalDocumentation: {
        structuredEntries: [
          {
            id: "reassess-legacy",
            namespace: "erNursingReassessmentV1",
            documentedAt: "2026-09-13T04:00:00.000Z",
            payloadSummary: {
              pain0to10: "4",
            },
          },
        ],
        reassessments: [],
      },
      treatments: {
        procedures: [
          {
            id: "proc-1",
            performedAt: "2026-09-13T03:00:00.000Z",
          },
        ],
      },
    });

    const findings = rule7ReassessmentAfterTreatment(snapshot, ctx);

    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("DOCUMENTATION_GAP");
    expect(findings[0].title).toBe("Reassessment time is not available");
  });
});
