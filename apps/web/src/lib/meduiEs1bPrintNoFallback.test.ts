import { describe, expect, it } from "vitest";
import { getDischargePrintHtml } from "@/components/encounters/DischargePrintLayout";
import { getPatientChartPrintHtml } from "@/components/patient-chart/PatientChartPrintLayout";
import { getRxPrintHtml } from "@/components/pharmacy/RxPrintLayout";
import { getErPrintPacketHtml } from "@/features/emergency/erPrintPacket";
import { getLabResultsPrintHtml } from "@/features/emergency/resultPrintPacket";
import type { ChartSummary } from "@/lib/chartApi";
import { printT } from "@/lib/printI18n";
import { ER_DISCHARGE_MODE_HOME } from "@/features/emergency/emergencyDispositionV1";

const SIGNED_FR_NARRATIVE = "SIGNED_NARRATIVE_KEEP: continuer lasix 40 mg le matin.";
const SIGNED_EN_NARRATIVE = "SIGNED_NARRATIVE_KEEP: Continue furosemide 40 mg each morning.";

const dischargePatient = { firstName: "Ada", lastName: "Lovelace", dob: "1980-01-01", sex: "F" as const };
const dischargeEncounter = {
  createdAt: "2026-06-03T17:00:00.000Z",
  dischargeSummaryJson: { followUpInstructions: SIGNED_FR_NARRATIVE },
};

function emptyChartSummary(noteBody: string): ChartSummary {
  return {
    patient: {
      id: "p1",
      mrn: "MRN-1",
      globalMrn: null,
      firstName: "Ada",
      lastName: "Lovelace",
      dob: "1980-01-01",
      phone: null,
      email: null,
      sexAtBirth: "F",
      address: null,
      city: null,
      country: null,
      language: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    recentEncounters: [
      {
        id: "e1",
        type: "ED",
        status: "CLOSED",
        visitReason: null,
        chiefComplaint: null,
        treatmentPlanPreview: null,
        clinicianImpressionPreview: null,
        createdAt: "2026-06-03T17:00:00.000Z",
        followUpDate: null,
        dischargedAt: null,
        dischargeStatus: null,
        triage: null,
        encounterNotes: [
          {
            id: "n1",
            noteType: "PROGRESS",
            body: noteBody,
            authorDisplayName: "Dr Signed",
            authorRoleTitle: "PROVIDER",
            createdAt: "2026-06-03T17:30:00.000Z",
          },
        ],
      },
    ],
    activeDiagnoses: [],
    recentMedicationDispenses: [],
    recentVaccinations: [],
  } satisfies ChartSummary;
}

describe("MEDUI.ES.1B-H print no-fallback (real print lookup path)", () => {
  it("ED discharge EN print uses EN chrome only and keeps authored narrative", () => {
    const html = getDischargePrintHtml({
      patient: dischargePatient,
      encounter: dischargeEncounter,
      language: "en",
    });
    expect(html).toContain(printT("en", "printOutput.discharge.documentH1"));
    expect(html).not.toContain(printT("fr", "printOutput.discharge.documentH1"));
    expect(html).toContain(SIGNED_FR_NARRATIVE);
  });

  it("ED discharge FR print uses FR chrome only and keeps authored narrative", () => {
    const html = getDischargePrintHtml({
      patient: dischargePatient,
      encounter: {
        ...dischargeEncounter,
        dischargeSummaryJson: { followUpInstructions: SIGNED_EN_NARRATIVE },
      },
      language: "fr",
    });
    expect(html).toContain(printT("fr", "printOutput.discharge.documentH1"));
    expect(html).not.toContain(printT("en", "printOutput.discharge.documentH1"));
    expect(html).toContain(SIGNED_EN_NARRATIVE);
  });

  it("inpatient-capable discharge print path is locale-isolated", () => {
    const en = getDischargePrintHtml({
      patient: dischargePatient,
      encounter: dischargeEncounter,
      language: "en",
    });
    const fr = getDischargePrintHtml({
      patient: dischargePatient,
      encounter: dischargeEncounter,
      language: "fr",
    });
    expect(en).toContain("Discharge summary");
    expect(en).not.toContain("Document de sortie");
    expect(fr).toContain("Document de sortie");
    expect(fr).not.toContain("Discharge summary");
  });

  it("Rx print EN has no FR chrome; FR has no EN chrome", () => {
    const order = {
      createdAt: "2026-06-03T17:00:00.000Z",
      items: [{ manualLabel: "Amoxicillin", strength: "500 mg" }],
    };
    const patient = { firstName: "Ada", lastName: "Lovelace", mrn: "MRN-1" };
    const en = getRxPrintHtml({ order, patient, language: "en" });
    const fr = getRxPrintHtml({ order, patient, language: "fr" });
    expect(en).toContain(printT("en", "printOutput.rx.documentH2"));
    expect(en).not.toContain(printT("fr", "printOutput.rx.documentH2"));
    expect(fr).toContain(printT("fr", "printOutput.rx.documentH2"));
    expect(fr).not.toContain(printT("en", "printOutput.rx.documentH2"));
    expect(en).toContain("Amoxicillin");
    expect(fr).toContain("Amoxicillin");
  });

  it("patient chart print EN/FR chrome is active-locale-only and keeps authored notes", () => {
    const en = getPatientChartPrintHtml({
      chartSummary: emptyChartSummary(SIGNED_FR_NARRATIVE),
      language: "en",
    });
    const fr = getPatientChartPrintHtml({
      chartSummary: emptyChartSummary(SIGNED_EN_NARRATIVE),
      language: "fr",
    });
    expect(en).toContain(printT("en", "printOutput.patientChart.title"));
    expect(en).not.toContain(printT("fr", "printOutput.patientChart.title"));
    expect(en).toContain(SIGNED_FR_NARRATIVE);
    expect(fr).toContain(printT("fr", "printOutput.patientChart.title"));
    expect(fr).not.toContain(printT("en", "printOutput.patientChart.title"));
    expect(fr).toContain(SIGNED_EN_NARRATIVE);
  });

  it("ER packet print EN/FR chrome is active-locale-only", () => {
    const base = {
      patient: dischargePatient,
      encounter: {
        createdAt: "2026-06-03T17:00:00.000Z",
        dischargeSummaryJson: { dischargeMode: ER_DISCHARGE_MODE_HOME, followUpInstructions: SIGNED_FR_NARRATIVE },
        nursingAssessment: {},
      },
      triageSnapshot: null,
    };
    const en = getErPrintPacketHtml({ ...base, language: "en" });
    const fr = getErPrintPacketHtml({
      ...base,
      encounter: {
        ...base.encounter,
        dischargeSummaryJson: { dischargeMode: ER_DISCHARGE_MODE_HOME, followUpInstructions: SIGNED_EN_NARRATIVE },
      },
      language: "fr",
    });
    expect(en).toContain(printT("en", "printOutput.erPacket.htmlTitleErPacket"));
    expect(en).not.toContain(printT("fr", "printOutput.erPacket.htmlTitleErPacket"));
    expect(fr).toContain(printT("fr", "printOutput.erPacket.htmlTitleErPacket"));
    expect(fr).not.toContain(printT("en", "printOutput.erPacket.htmlTitleErPacket"));
  });

  it("lab result print EN/FR chrome is active-locale-only", () => {
    const ctxEn = {
      encounter: { id: "e1", createdAt: "2026-06-03T17:00:00.000Z" },
      language: "en" as const,
      patient: dischargePatient,
    };
    const ctxFr = { ...ctxEn, language: "fr" as const };
    const en = getLabResultsPrintHtml(ctxEn, []);
    const fr = getLabResultsPrintHtml(ctxFr, []);
    expect(en).toContain(printT("en", "printOutput.results.laboratoryResultsReport"));
    expect(en).not.toContain(printT("fr", "printOutput.results.laboratoryResultsReport"));
    expect(fr).toContain(printT("fr", "printOutput.results.laboratoryResultsReport"));
    expect(fr).not.toContain(printT("en", "printOutput.results.laboratoryResultsReport"));
  });
});
