import { describe, expect, it, vi, afterEach } from "vitest";
import { composeEncounterClinicalRecordFromEmergencySummary } from "./useEncounterClinicalRecord";
import type { EmergencyVisitSummaryModel } from "./emergencyVisitSummaryModel";

const ENCOUNTER_ID = "550e8400-e29b-41d4-a716-446655440000";

function emptyModel(): EmergencyVisitSummaryModel {
  return {
    motifPresentation: null,
    triageResume: null,
    triageCarryForward: null,
    initialNursingAssessment: null,
    resumeInfirmier: null,
    providerDocumentation: null,
    evaluationMedicale: null,
    resultats: null,
    disposition: null,
    handoff: null,
    emtala: null,
    timeline: [],
    nursingReassessmentHistory: [],
    nursingReassessmentLatestId: null,
    nursingDischargeDocumentation: null,
    providerDischargeDocumentation: null,
    providerMseHistory: [],
    providerMseLatestId: null,
    handoffHistory: [],
    handoffLatestId: null,
    dischargeSummaryHistory: [],
    dischargeSummaryLatestId: null,
    admissionSummaryHistory: [],
    admissionSummaryLatestId: null,
    dispositionSupplementHistory: [],
    dispositionSupplementLatestId: null,
    triageAssessmentHistory: [],
    triageAssessmentLatestId: null,
  };
}

describe("useEncounterClinicalRecord", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when disabled", () => {
    const result = composeEncounterClinicalRecordFromEmergencySummary({
      enabled: false,
      locale: "en",
      encounter: { id: ENCOUNTER_ID },
      summaryModel: emptyModel(),
    });
    expect(result.record).toBeNull();
    expect(result.parity).toBeNull();
    expect(result.projectionFailed).toBe(false);
  });

  it("builds clinical record and parity metadata when enabled", () => {
    vi.stubEnv("NODE_ENV", "development");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const result = composeEncounterClinicalRecordFromEmergencySummary({
      locale: "en",
      encounter: {
        id: ENCOUNTER_ID,
        createdAt: "2026-06-23T08:00:00.000Z",
      },
      triageSnapshot: { triageCompleteAt: "2026-06-23T08:15:00.000Z", vitalsJson: { hr: 90 } },
      summaryModel: {
        ...emptyModel(),
        motifPresentation: { title: "Chief complaint", lines: ["Abdominal pain"] },
      },
      orders: [],
      clinicalTimelineLegacyCount: 2,
    });

    expect(result.record?.header.encounterId).toBe(ENCOUNTER_ID);
    expect(result.parity?.encounterId).toBe(ENCOUNTER_ID);
    expect(result.parity?.legacy.clinicalTimelineCount).toBe(2);
    expect(result.parity?.clinicalRecord.hasProviderAssessment).toBe(false);
    expect(result.projectionFailed).toBe(false);
    expect(info).toHaveBeenCalled();
    info.mockRestore();
  });
});
