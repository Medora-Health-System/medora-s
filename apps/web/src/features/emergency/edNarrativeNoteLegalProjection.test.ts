import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildEncounterClinicalRecord } from "@medora/shared";
import { buildEncounterClinicalRecordInputFromEmergencySummary } from "./encounterClinicalRecordAdapter";
import type { EmergencyVisitSummaryModel } from "./emergencyVisitSummaryModel";

const emptyModel: EmergencyVisitSummaryModel = {
  motifPresentation: null, triageResume: null, triageCarryForward: null,
  initialNursingAssessment: null, resumeInfirmier: null, providerDocumentation: null,
  evaluationMedicale: null, resultats: null, disposition: null, handoff: null, emtala: null,
  timeline: [], nursingReassessmentHistory: [], nursingReassessmentLatestId: null,
  nursingDischargeDocumentation: null, providerDischargeDocumentation: null,
  providerMseHistory: [], providerMseLatestId: null, handoffHistory: [], handoffLatestId: null,
  dischargeSummaryHistory: [], dischargeSummaryLatestId: null, admissionSummaryHistory: [],
  admissionSummaryLatestId: null, dispositionSupplementHistory: [], dispositionSupplementLatestId: null,
  triageAssessmentHistory: [], triageAssessmentLatestId: null,
};

describe("ED narrative notes legal record projection", () => {
  it("connects saved encounter notes to the centralized Summary record without translating text", () => {
    const clinicalText = "Le patient dit: pain better — conserver exactement.";
    const input = buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: "fr",
      encounter: {
        id: "enc-1", facilityId: "fac-1", patientId: "pat-1",
        encounterNotes: [{
          id: "note-1", encounterId: "enc-1", noteType: "PROVIDER", body: clinicalText,
          authorUserId: "user-1", authorDisplayName: "Dr Auteur", authorRoleTitle: "Provider",
          createdAt: "2026-08-11T08:10:00.000Z",
        }],
      },
      summaryModel: emptyModel,
    });
    const record = buildEncounterClinicalRecord(input);
    expect(record.narrativeNotes).toHaveLength(1);
    expect(record.narrativeNotes[0]).toMatchObject({ body: clinicalText, authorUserId: "user-1", createdAt: "2026-08-11T08:10:00.000Z" });
  });

  it("wires the same projection into Summary and print renderers", () => {
    const root = join(import.meta.dirname, "../..");
    const summary = readFileSync(join(root, "features/emergency/EncounterClinicalRecordSummaryView.tsx"), "utf8");
    const print = readFileSync(join(root, "features/emergency/erClinicalRecordPrintPacket.ts"), "utf8");
    expect(summary).toContain("record.narrativeNotes.map");
    expect(summary).toContain("data-source-note-id");
    expect(print).toContain("record.narrativeNotes");
    expect(print).toContain("note.body");
  });
});
