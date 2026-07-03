import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildEncounterClinicalRecord } from "@medora/shared";
import {
  buildEncounterClinicalRecordInputFromEmergencySummary,
} from "./encounterClinicalRecordAdapter";
import { buildEnterpriseClinicalChartLayout } from "./enterpriseClinicalChartLayout";
import {
  formatClinicalRecordProcedureStatusLine,
  formatClinicalRecordProcedureTitle,
} from "./clinicalRecordProcedureDisplay";
import { getErClinicalRecordPrintPacketHtml } from "./erClinicalRecordPrintPacket";
import { formatClinicalRecordAttributionPart } from "./clinicalRecordAttributionDisplay";
import type { EmergencyVisitSummaryModel } from "./emergencyVisitSummaryModel";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

const ENCOUNTER_ID = "550e8400-e29b-41d4-a716-446655440000";
const PROC_ID = "550e8400-e29b-41d4-a716-446655440014";
const webSrcRoot = join(import.meta.dirname, "../..");

function tEn(key: string): string {
  const parts = key.split(".");
  let cur: unknown = en;
  for (const part of parts) {
    if (!cur || typeof cur !== "object") return key;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : key;
}

function tFr(key: string): string {
  const parts = key.split(".");
  let cur: unknown = fr;
  for (const part of parts) {
    if (!cur || typeof cur !== "object") return key;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : key;
}

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

function nursingEcgProcedureApiRow() {
  return {
    id: PROC_ID,
    documentedAt: "2026-07-03T04:26:00.000Z",
    performedAt: "2026-07-03T04:26:00.000Z",
    documentedByDisplayName: "Martine Duval",
    performedByDisplayName: "Martine Duval",
    performerTitle: "RN",
    documentationRole: "NURSING",
    status: "COMPLETED",
    clinicalSummaryFr:
      "ECG (documenté) (soins infirmiers) — Réalisée le 2026-07-03T04:26:00.000Z — Réalisée par RN Martine Duval — Documentée par Martine Duval — Volet : soins infirmiers — Statut : terminée",
    clinicalSummaryEn:
      "ECG (documented) (nursing care) — Performed at 2026-07-03T04:26:00.000Z — Performed by RN Martine Duval — Documented by Martine Duval — Section: nursing — Status: completed",
    procedureNameEn: "ECG (documented) (nursing care)",
    procedureNameFr: "ECG (documenté) (soins infirmiers)",
    payload: {
      procedureType: "EKG",
      documentationRole: "NURSING",
      performedAt: "2026-07-03T04:26:00.000Z",
      performedByDisplayName: "Martine Duval",
      performerTitle: "RN",
    },
  };
}

describe("summaryProcedureLocale", () => {
  it("English Summary does not leak French procedure UI chrome", () => {
    const input = buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: "en",
      encounter: { id: ENCOUNTER_ID },
      summaryModel: emptyModel(),
      procedures: [nursingEcgProcedureApiRow()],
    });
    const record = buildEncounterClinicalRecord(input);
    const layout = buildEnterpriseClinicalChartLayout(record);
    const proc = layout.completedProcedures[0]!;

    expect(formatClinicalRecordProcedureTitle(proc)).toMatch(/ECG/i);
    expect(formatClinicalRecordProcedureTitle(proc)).not.toMatch(/documenté|soins infirmiers/);

    const attribution = formatClinicalRecordAttributionPart("performedBy", proc.performedBy, tEn, "en");
    expect(attribution).toContain("Performed by");
    expect(attribution).toContain("Martine Duval");
    expect(attribution).not.toMatch(/Réalisée|Documentée|Volet|terminée/);

    const statusLine = formatClinicalRecordProcedureStatusLine(proc, tEn);
    expect(statusLine).toBe("Status: Completed");
    expect(statusLine).not.toContain("terminée");
  });

  it("French Summary still shows French procedure labels", () => {
    const input = buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: "fr",
      encounter: { id: ENCOUNTER_ID },
      summaryModel: emptyModel(),
      procedures: [nursingEcgProcedureApiRow()],
    });
    const record = buildEncounterClinicalRecord(input);
    const proc = record.procedures[0]!;

    expect(formatClinicalRecordProcedureTitle(proc)).toContain("ECG");
    expect(formatClinicalRecordProcedureTitle(proc)).toMatch(/documenté|soins infirmiers/i);

    const statusLine = formatClinicalRecordProcedureStatusLine(proc, tFr);
    expect(statusLine).toBe("Statut: Terminée");
  });

  it("English procedure projection uses structured fields when only French summary is stored", () => {
    const input = buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: "en",
      encounter: { id: ENCOUNTER_ID },
      summaryModel: emptyModel(),
      procedures: [
        {
          id: PROC_ID,
          documentedAt: "2026-07-03T04:26:00.000Z",
          performedAt: "2026-07-03T04:26:00.000Z",
          documentedByDisplayName: "Martine Duval",
          performedByDisplayName: "Martine Duval",
          performerTitle: "RN",
          documentationRole: "NURSING",
          clinicalSummaryFr:
            "ECG (documenté) (soins infirmiers) — Réalisée le 2026-07-03T04:26:00.000Z — Statut : terminée",
          payload: {
            procedureType: "EKG",
            documentationRole: "NURSING",
            performedAt: "2026-07-03T04:26:00.000Z",
            performedByDisplayName: "Martine Duval",
            performerTitle: "RN",
          },
        },
      ],
    });
    const record = buildEncounterClinicalRecord(input);
    const proc = record.procedures[0]!;

    expect(proc.label).toMatch(/EKG/i);
    expect(proc.label).not.toMatch(/documenté|soins infirmiers/);
    expect(proc.clinicalSummary).not.toMatch(/Réalisée|Volet|terminée/);
    expect(proc.performedBy?.name).toBe("Martine Duval");
  });

  it("English Print Packet V2 does not leak French procedure UI chrome", () => {
    const input = buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: "en",
      encounter: { id: ENCOUNTER_ID },
      summaryModel: emptyModel(),
      procedures: [nursingEcgProcedureApiRow()],
    });
    const record = buildEncounterClinicalRecord(input);
    const html = getErClinicalRecordPrintPacketHtml({
      patient: { firstName: "Jean", lastName: "Patient", dob: "1990-01-01", sex: "M" },
      encounter: { createdAt: "2026-06-23T08:00:00.000Z", dischargeSummaryJson: null },
      language: "en",
      record,
    });

    expect(html).toContain("Completed procedures");
    expect(html).toContain("Performed by");
    expect(html).toContain("Status: Completed");
    expect(html).not.toMatch(/documenté|soins infirmiers|Réalisée|Documentée|Volet|terminée/);
  });

  it("Summary view uses structured procedure formatter instead of raw clinicalSummaryFr", () => {
    const viewSource = readFileSync(
      join(webSrcRoot, "features/emergency/EncounterClinicalRecordSummaryView.tsx"),
      "utf8"
    );
    expect(viewSource).toContain("formatClinicalRecordProcedureTitle");
    expect(viewSource).not.toMatch(/proc\.clinicalSummary/);
  });
});
