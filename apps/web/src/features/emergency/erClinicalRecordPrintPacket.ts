/**
 * Print-safe HTML for Enterprise Clinical Record (V2 ER packet).
 */

import type { EncounterClinicalRecord } from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";
import { calculateAge } from "@/lib/patientDisplay";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { formatTemperatureDualLine } from "@/lib/patientVitals";
import { printDateLocale, printPatientSexLabel, printT } from "@/lib/printI18n";
import { nirMrnDisplay } from "@/components/patient-chart/patientChartHelpers";
import type { DischargePrintEncounter, DischargePrintPatient } from "@/components/encounters/DischargePrintLayout";
import {
  buildEnterpriseClinicalChartLayout,
  extractProviderAssessmentSectionsExcludingHpi,
} from "./enterpriseClinicalChartLayout";
import {
  formatClinicalRecordAttributionPart,
  joinAttributionParts,
} from "./clinicalRecordAttributionDisplay";

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function p(text: string): string {
  if (!text.trim()) return "";
  return `<p style="margin:6px 0;line-height:1.45;font-size:13px;">${esc(text)}</p>`;
}

function attr(text: string | null): string {
  if (!text?.trim()) return "";
  return `<p style="margin:2px 0 6px 0;font-size:11px;color:#475569;line-height:1.4;">${esc(text)}</p>`;
}

function section(title: string, body: string): string {
  if (!body.trim()) return "";
  return `<h2 style="font-size:15px;margin:20px 0 10px 0;font-weight:700;border-bottom:1px solid #000;padding-bottom:4px;">${esc(
    title
  )}</h2>${body}`;
}

function providerStatusLabel(
  status: "SIGNED" | "SAVED" | "DRAFT",
  t: (key: string) => string
): string {
  if (status === "SIGNED") return t("encounterClinicalRecordSummary.providerStatusSigned");
  if (status === "SAVED") return t("encounterClinicalRecordSummary.providerStatusSaved");
  return t("encounterClinicalRecordSummary.providerStatusDraft");
}

export function getErClinicalRecordPrintPacketHtml(input: {
  patient: DischargePrintPatient;
  encounter: DischargePrintEncounter;
  facilityName?: string | null;
  language: SupportedLanguage;
  record: EncounterClinicalRecord;
}): string {
  const { patient, encounter, facilityName, language, record } = input;
  const loc = printDateLocale(language);
  const t = (key: string) => {
    const v = printT(language, key);
    return v === key ? key : v;
  };
  const layout = buildEnterpriseClinicalChartLayout(record);
  const providerSections = extractProviderAssessmentSectionsExcludingHpi(layout.providerAssessment);

  const name = [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim() || "—";
  const ageYears =
    patient.dob && !Number.isNaN(new Date(patient.dob).getTime()) ? calculateAge(patient.dob) : null;
  const age =
    ageYears != null ? `${ageYears} ${printT(language, "printOutput.common.yearsSuffix")}` : "—";
  const sex = printPatientSexLabel(language, patient.sex ?? null, patient.sexAtBirth ?? null);
  const ids = nirMrnDisplay({
    nationalId: patient.nationalId,
    mrn: patient.mrn,
    globalMrn: patient.globalMrn ?? null,
  });

  const sections: string[] = [];

  sections.push(
    section(
      t("encounterClinicalRecordSummary.overviewTitle"),
      [
        p(`${t("encounterClinicalRecordSummary.patientLabel")}: ${name}`),
        p(`${t("encounterClinicalRecordSummary.mrnLabel")}: ${ids || "—"}`),
        p(`${t("encounterClinicalRecordSummary.ageLabel")}: ${age} · ${t("encounterClinicalRecordSummary.sexLabel")}: ${sex}`),
        p(
          `${t("encounterClinicalRecordSummary.arrivalLabel")}: ${formatEncounterChromeDateTime(
            record.header.arrivedAt ?? encounter.createdAt ?? "",
            language
          )}`
        ),
        layout.overview.lengthOfStayLabel
          ? p(`${t("encounterClinicalRecordSummary.losLabel")}: ${layout.overview.lengthOfStayLabel}`)
          : "",
        layout.overview.attendingProviderDisplayName
          ? p(
              `${t("encounterClinicalRecordSummary.attendingLabel")}: ${layout.overview.attendingProviderDisplayName}`
            )
          : "",
      ].join("")
    )
  );

  if (layout.chiefComplaintLines.length > 0) {
    sections.push(
      section(
        t("encounterClinicalRecordSummary.chiefComplaintTitle"),
        layout.chiefComplaintLines.map((line) => p(line)).join("")
      )
    );
  }

  if (layout.hpiLines.length > 0) {
    sections.push(
      section(t("encounterClinicalRecordSummary.hpiTitle"), layout.hpiLines.map((line) => p(line)).join(""))
    );
  }

  if (layout.triageDocumentation || Object.keys(layout.triageSummary).length > 0) {
    const triageBody = [
      ...Object.entries(layout.triageSummary)
        .filter(([key]) => !(key === "chiefComplaint" && layout.chiefComplaintLines.length > 0))
        .map(([, value]) => p(value)),
      attr(
        formatClinicalRecordAttributionPart("documentedBy", layout.triageDocumentation, t, language)
      ),
    ].join("");
    sections.push(section(t("encounterClinicalRecordSummary.triageSummaryTitle"), triageBody));
  }

  if (layout.vitalsRows.length > 0) {
    const vitalsBody = layout.vitalsRows
      .map((row) => {
        const temp =
          row.temperatureCelsius && !Number.isNaN(parseFloat(row.temperatureCelsius))
            ? formatTemperatureDualLine(parseFloat(row.temperatureCelsius), language)
            : row.temperatureCelsius || "—";
        const line = [
          formatEncounterChromeDateTime(row.recordedAt, language),
          `BP ${row.bloodPressure || "—"}`,
          `HR ${row.heartRate || "—"}`,
          `RR ${row.respiratoryRate || "—"}`,
          `SpO2 ${row.spo2 || "—"}`,
          `Temp ${temp}`,
          `Pain ${row.pain || "—"}`,
        ].join(" · ");
        return (
          p(line) +
          attr(formatClinicalRecordAttributionPart("documentedBy", row.documentedBy, t, language))
        );
      })
      .join("");
    sections.push(section(t("encounterClinicalRecordSummary.vitalsTitle"), vitalsBody));
  }

  if (layout.providerAssessment) {
    const body = [
      p(providerStatusLabel(layout.providerAssessment.status, t)),
      attr(
        joinAttributionParts([
          formatClinicalRecordAttributionPart("savedBy", layout.providerAssessment.savedBy, t, language),
          formatClinicalRecordAttributionPart("signedBy", layout.providerAssessment.signedBy, t, language),
        ])
      ),
      ...providerSections.map((sec) => p(`${sec.label}: ${sec.text}`)),
    ].join("");
    sections.push(section(t("encounterClinicalRecordSummary.providerAssessmentTitle"), body));
  }

  if (layout.nursingAssessment) {
    const body = [
      ...layout.nursingAssessment.structuredLines.map((line) => p(line)),
      layout.nursingAssessment.narrativeSummary ? p(layout.nursingAssessment.narrativeSummary) : "",
      attr(
        formatClinicalRecordAttributionPart(
          "documentedBy",
          {
            name: layout.nursingAssessment.performerDisplayName,
            role: layout.nursingAssessment.performerRoleTitle,
            at: layout.nursingAssessment.documentedAt ?? layout.nursingAssessment.savedAt,
            initials: null,
          },
          t,
          language
        )
      ),
    ].join("");
    sections.push(section(t("encounterClinicalRecordSummary.nursingTitle"), body));
  }

  if (layout.nursingAssessmentHistory.length > 0) {
    const body = layout.nursingAssessmentHistory
      .map((entry) => {
        const lines = [
          p(formatEncounterChromeDateTime(entry.documentedAt ?? entry.savedAt, language)),
          ...entry.structuredLines.map((line) => p(line)),
          entry.narrativeSummary ? p(entry.narrativeSummary) : "",
          attr(
            formatClinicalRecordAttributionPart(
              "documentedBy",
              {
                name: entry.performerDisplayName,
                role: entry.performerRoleTitle,
                at: entry.documentedAt ?? entry.savedAt,
                initials: null,
              },
              t,
              language
            )
          ),
        ].join("");
        return lines;
      })
      .join("");
    sections.push(
      section(t("encounterClinicalRecordSummary.nursingReassessmentsShow").replace("{count}", String(layout.nursingAssessmentHistory.length)), body)
    );
  }

  if (layout.laboratoryResults.length > 0 || layout.imagingResults.length > 0) {
    const body = [
      ...layout.laboratoryResults.map(
        (lab) =>
          p(`${lab.label}: ${lab.resultText}`) +
          attr(
            joinAttributionParts([
              formatClinicalRecordAttributionPart("orderedBy", lab.orderedBy, t, language),
              formatClinicalRecordAttributionPart("resultedBy", lab.resultedBy, t, language),
              formatClinicalRecordAttributionPart("reviewedBy", lab.reviewedBy, t, language),
            ])
          )
      ),
      ...layout.imagingResults.map(
        (img) =>
          p(`${img.label}: ${img.resultText}`) +
          attr(
            joinAttributionParts([
              formatClinicalRecordAttributionPart("orderedBy", img.orderedBy, t, language),
              formatClinicalRecordAttributionPart("resultedBy", img.resultedBy, t, language),
              formatClinicalRecordAttributionPart("reviewedBy", img.reviewedBy, t, language),
            ])
          )
      ),
    ].join("");
    sections.push(section(t("encounterClinicalRecordSummary.resultsTitle"), body));
  }

  if (layout.medicationAdministration.length > 0) {
    const body = layout.medicationAdministration
      .map((mar) => {
        const medicationLine =
          mar.displayLine?.trim() ||
          [mar.medicationName, mar.dose, mar.route].filter(Boolean).join(" ").trim() ||
          t("encounterClinicalRecordSummary.marMedicationNameMissing");
        return (
          p(`${medicationLine} — ${mar.action}`) +
          attr(
            joinAttributionParts([
              formatClinicalRecordAttributionPart("administeredBy", mar.administeredBy, t, language),
              formatClinicalRecordAttributionPart("documentedBy", mar.documentedBy, t, language),
            ])
          )
        );
      })
      .join("");
    sections.push(section(t("encounterClinicalRecordSummary.marTitle"), body));
  }

  if (layout.completedProcedures.length > 0) {
    const body = layout.completedProcedures
      .map(
        (proc) =>
          p(proc.clinicalSummary) +
          attr(
            joinAttributionParts([
              formatClinicalRecordAttributionPart("performedBy", proc.performedBy, t, language),
              formatClinicalRecordAttributionPart("documentedBy", proc.documentedBy, t, language),
            ])
          )
      )
      .join("");
    sections.push(section(t("encounterClinicalRecordSummary.completedProceduresTitle"), body));
  }

  if (layout.disposition?.summaryLines.length) {
    const body = [
      ...layout.disposition.summaryLines.map((line) => p(line)),
      attr(
        joinAttributionParts([
          formatClinicalRecordAttributionPart("documentedBy", layout.disposition.documentedBy, t, language),
          formatClinicalRecordAttributionPart("signedBy", layout.disposition.signedBy, t, language),
        ])
      ),
    ].join("");
    sections.push(section(t("encounterClinicalRecordSummary.dispositionTitle"), body));
  }

  const printDate = new Date().toLocaleString(loc);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(
    printT(language, "printOutput.erPacket.h1ErPacket")
  )}</title></head><body style="font-family:system-ui,sans-serif;padding:24px;color:#0f172a;max-width:900px;margin:0 auto;">
<h1 style="font-size:20px;margin:0 0 8px 0;">${esc(printT(language, "printOutput.erPacket.h1ErPacket"))}</h1>
${facilityName ? p(facilityName) : ""}
<p style="margin:0 0 16px 0;font-size:12px;color:#64748b;">${esc(printT(language, "printOutput.common.printedAt"))} ${esc(printDate)}</p>
${sections.filter(Boolean).join("")}
</body></html>`;
}
