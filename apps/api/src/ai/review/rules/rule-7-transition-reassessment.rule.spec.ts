import type { EncounterAiSnapshot } from "@medora/shared";
import { rule7TransitionReassessment } from "./rule-7-transition-reassessment.rule.js";

const ctx = { generatedAt: "2026-09-13T04:00:00.000Z", snapshotVersion: "phase-2a" };

function snapshot(overrides: Partial<EncounterAiSnapshot> = {}): EncounterAiSnapshot {
  return {
    snapshotVersion: "phase-2a",
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
    clinicalDocumentation: { structuredEntries: [], reassessments: [] },
    diagnostics: {},
    treatments: { medicationOrders: [], medicationAdministrations: [], procedures: [] },
    diagnoses: {},
    disposition: {},
    ...overrides,
  };
}

describe("rule7TransitionReassessment", () => {
  it("does not create reassessment noise during active treatment", () => {
    const s = snapshot({
      treatments: {
        medicationAdministrations: [{ id: "mar-1", administeredAt: "2026-09-13T03:00:00.000Z" }],
      },
    });
    expect(rule7TransitionReassessment(s, ctx)).toEqual([]);
  });

  it("does not apply to routine office/outpatient clinic encounters", () => {
    const s = snapshot({
      encounterContext: { ...snapshot().encounterContext, careSetting: "OFFICE_OUTPATIENT_CLINIC" },
      treatments: {
        medicationAdministrations: [{ id: "mar-1", administeredAt: "2026-09-13T03:00:00.000Z" }],
      },
      disposition: { disposition: "DISCHARGE" },
    });
    expect(rule7TransitionReassessment(s, ctx)).toEqual([]);
  });

  it("flags missing structured reassessment when disposition follows a recorded treatment event", () => {
    const s = snapshot({
      treatments: {
        medicationAdministrations: [{ id: "mar-1", administeredAt: "2026-09-13T03:00:00.000Z" }],
      },
      disposition: { disposition: "DISCHARGE" },
    });
    const findings = rule7TransitionReassessment(s, ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("REASSESSMENT_GAP");
    expect(findings[0].title).toBe("No structured reassessment after treatment before transition");
    expect(findings[0].recommendedActions[0].actionType).toBe("NAVIGATE");
  });

  it("accepts a reliable ER reassessment documented after the latest treatment", () => {
    const s = snapshot({
      clinicalDocumentation: {
        structuredEntries: [{
          id: "r1",
          namespace: "erNursingReassessmentV1",
          documentedAt: "2026-09-13T04:00:00.000Z",
          payloadSummary: { reassessmentAt: "2026-09-13T03:20:00.000Z" },
        }],
        reassessments: [],
      },
      treatments: {
        medicationAdministrations: [{ id: "mar-1", administeredAt: "2026-09-13T03:00:00.000Z" }],
      },
      disposition: { disposition: "DISCHARGE" },
    });
    expect(rule7TransitionReassessment(s, ctx)).toEqual([]);
  });

  it("flags when the latest reliable reassessment predates treatment before disposition", () => {
    const s = snapshot({
      clinicalDocumentation: {
        structuredEntries: [{
          id: "r1",
          namespace: "erNursingReassessmentV1",
          documentedAt: "2026-09-13T04:00:00.000Z",
          payloadSummary: { reassessmentAt: "2026-09-13T02:30:00.000Z" },
        }],
        reassessments: [],
      },
      treatments: {
        procedures: [{ id: "p1", performedAt: "2026-09-13T03:00:00.000Z" }],
      },
      disposition: { disposition: "DISCHARGE" },
    });
    const findings = rule7TransitionReassessment(s, ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0].title).toBe("Latest reassessment predates the last treatment event");
  });

  it("never substitutes the legacy snapshot wrapper time for the clinical reassessment time", () => {
    const s = snapshot({
      clinicalDocumentation: {
        structuredEntries: [{
          id: "r1",
          namespace: "erNursingReassessmentV1",
          documentedAt: "2026-09-13T04:00:00.000Z",
          payloadSummary: { pain0to10: "4" },
        }],
        reassessments: [],
      },
      treatments: {
        procedures: [{ id: "p1", performedAt: "2026-09-13T03:00:00.000Z" }],
      },
      disposition: { disposition: "DISCHARGE" },
    });
    const findings = rule7TransitionReassessment(s, ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("DOCUMENTATION_GAP");
  });
});
