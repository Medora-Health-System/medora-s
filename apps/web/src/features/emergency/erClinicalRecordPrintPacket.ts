/**
 * Print-safe HTML for Enterprise Clinical Record (V2 ER packet).
 */

import type { EncounterClinicalRecord } from "@medora/shared";
import { resolveProductUiLanguageOrDefault, type SupportedLanguage } from "@/i18n/config";
import { calculateAge } from "@/lib/patientDisplay";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { formatTemperatureDualLine } from "@/lib/patientVitals";
import { printDateLocale, printPatientSexLabel, printT } from "@/lib/printI18n";
import {
  buildPrintDocumentFooterHtml,
  buildPrintFacilityHeaderHtml,
  resolvePrintFacilityInfo,
  type PrintFacilityInfo,
} from "@/lib/printFacilityHeader";
import { nirMrnDisplay } from "@/components/patient-chart/patientChartHelpers";
import type { DischargePrintEncounter, DischargePrintPatient } from "@/components/encounters/DischargePrintLayout";
import {
  buildEnterpriseClinicalChartLayout,
  diagnosisAttributionFallback,
  extractProviderAssessmentSectionsExcludingHpi,
  formatEncounterClinicalRecordDiagnosisLine,
  type EnterpriseOrderGroupKey,
} from "./enterpriseClinicalChartLayout";
import {
  formatClinicalRecordAttributionPart,
  joinAttributionParts,
} from "./clinicalRecordAttributionDisplay";
import {
  formatClinicalRecordProcedureSectionLabel,
  formatClinicalRecordProcedureStatusLine,
  formatClinicalRecordProcedureTitle,
} from "./clinicalRecordProcedureDisplay";

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

const ORDER_GROUP_I18N: Record<EnterpriseOrderGroupKey, string> = {
  laboratory: "encounterClinicalRecordSummary.orderGroupLaboratory",
  imaging: "encounterClinicalRecordSummary.orderGroupImaging",
  medications: "encounterClinicalRecordSummary.orderGroupMedications",
  treatments: "encounterClinicalRecordSummary.orderGroupTreatments",
  procedures: "encounterClinicalRecordSummary.orderGroupProcedures",
};

const TRIAGE_FIELD_I18N: Record<string, string> = {
  esi: "encounterClinicalRecordSummary.triageEsi",
  arrivalMode: "encounterClinicalRecordSummary.triageArrivalMode",
  symptomOnset: "encounterClinicalRecordSummary.triageSymptomOnset",
  chiefComplaint: "encounterClinicalRecordSummary.triageChiefComplaint",
  narrative: "encounterClinicalRecordSummary.triageNarrative",
  vitalSigns: "encounterClinicalRecordSummary.triageVitalSigns",
  pain: "encounterClinicalRecordSummary.triagePain",
  allergies: "encounterClinicalRecordSummary.triageAllergies",
  isolation: "encounterClinicalRecordSummary.triageIsolation",
  fallRisk: "encounterClinicalRecordSummary.triageFallRisk",
  acuityAlerts: "encounterClinicalRecordSummary.triageAcuityAlerts",
  airway: "encounterClinicalRecordSummary.triageAirway",
  breathing: "encounterClinicalRecordSummary.triageBreathing",
  circulation: "encounterClinicalRecordSummary.triageCirculation",
  gcs: "encounterClinicalRecordSummary.triageGcs",
};

const SIGNATURE_DOMAIN_I18N: Record<string, string> = {
  provider_documentation: "encounterClinicalRecordSummary.signatureDomainProvider",
  nursing_assessment: "encounterClinicalRecordSummary.signatureDomainNursing",
  disposition: "encounterClinicalRecordSummary.signatureDomainDisposition",
};

function clinicalMilestoneLabel(milestone: string, t: (key: string) => string): string {
  const key = `encounterClinicalRecordSummary.milestone.${milestone}`;
  const v = t(key);
  return v === key ? milestone : v;
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
  facility?: PrintFacilityInfo | null;
  facilityName?: string | null;
  language: SupportedLanguage;
  record: EncounterClinicalRecord;
}): string {
  const { patient, encounter, facility, facilityName, language, record } = input;
  const facilityInfo = resolvePrintFacilityInfo(facility, facilityName);
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
        .map(([key, value]) => {
          const labelKey = TRIAGE_FIELD_I18N[key];
          const label = labelKey ? t(labelKey) : key;
          return p(`${label}: ${value}`);
        }),
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
          `${t("encounterClinicalRecordSummary.vitalsColBp")} ${row.bloodPressure || "—"}`,
          `${t("encounterClinicalRecordSummary.vitalsColHr")} ${row.heartRate || "—"}`,
          `${t("encounterClinicalRecordSummary.vitalsColRr")} ${row.respiratoryRate || "—"}`,
          `${t("encounterClinicalRecordSummary.vitalsColSpo2")} ${row.spo2 || "—"}`,
          `${t("encounterClinicalRecordSummary.vitalsColTemp")} ${temp}`,
          `${t("encounterClinicalRecordSummary.vitalsColWeight")} ${row.weight || "—"}`,
          `${t("encounterClinicalRecordSummary.vitalsColHeight")} ${row.height || "—"}`,
          `${t("encounterClinicalRecordSummary.vitalsColPain")} ${row.pain || "—"}`,
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

  if (record.narrativeNotes.length > 0) {
    const body = record.narrativeNotes
      .map((note) => {
        const badges = [
          note.status === "AMENDMENT" ? t("encounterNotes.badgeAmendment") : "",
          note.status === "VOIDED"
            ? note.voidReasonCode === "ENTERED_IN_ERROR"
              ? t("edHosp1fNursingDocumentation.enteredInError")
              : t("encounterNotes.badgeVoided")
            : "",
          note.status === "COSIGNED" ? t("encounterNotes.badgeCosigned") : "",
        ].filter(Boolean).join(" · ");
        return p(`${t(`encounterNotes.noteType.${note.noteType}`)} — ${note.authorDisplayName}${badges ? ` · ${badges}` : ""}`) +
          attr(`${note.authorRoleTitle} · ${formatEncounterChromeDateTime(note.createdAt, language)}`) +
          p(note.body) +
          (note.amendmentReason ? p(`${t("encounterNotes.amendmentReasonLabel")}: ${note.amendmentReason}`) : "") +
          (note.voidReasonCode ? p(`${t("encounterNotes.voidReasonLabel")}: ${t(`encounterNotes.voidReason.${note.voidReasonCode}`)}`) : "");
      })
      .join("");
    sections.push(section(t("encounterNotes.summarySectionTitle"), body));
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
          p(formatClinicalRecordProcedureTitle(proc)) +
          attr(
            joinAttributionParts([
              formatClinicalRecordAttributionPart("performedBy", proc.performedBy, t, language),
              formatClinicalRecordAttributionPart("documentedBy", proc.documentedBy, t, language),
            ])
          ) +
          attr(
            joinAttributionParts([
              formatClinicalRecordProcedureSectionLabel(proc.documentationRole, t),
              formatClinicalRecordProcedureStatusLine(proc, t),
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

  const ordersCount = Object.values(layout.groupedOrders).reduce((n, g) => n + g.length, 0);
  if (ordersCount > 0) {
    const body = (Object.keys(layout.groupedOrders) as EnterpriseOrderGroupKey[])
      .filter((key) => layout.groupedOrders[key].length > 0)
      .map((key) => {
        const groupTitle = t(ORDER_GROUP_I18N[key]);
        const rows = layout.groupedOrders[key]
          .map(
            (order) =>
              p(`${order.label} — ${order.status}`) +
              attr(formatClinicalRecordAttributionPart("orderedBy", {
                name: order.orderedByDisplayName,
                role: order.orderedByRoleTitle,
                at: order.orderedAt,
                initials: null,
              }, t, language))
          )
          .join("");
        return p(groupTitle) + rows;
      })
      .join("");
    sections.push(section(t("encounterClinicalRecordSummary.activeOrdersTitle"), body));
  }

  const hasDiagnoses =
    layout.groupedDiagnoses.primary.length > 0 ||
    layout.groupedDiagnoses.secondary.length > 0 ||
    layout.groupedDiagnoses.chronic.length > 0 ||
    layout.groupedDiagnoses.resolved.length > 0;
  if (hasDiagnoses) {
    const dxSections: string[] = [];
    const pushDxGroup = (titleKey: string, items: typeof layout.groupedDiagnoses.primary) => {
      if (items.length === 0) return;
      dxSections.push(p(t(titleKey)));
      for (const dx of items) {
        dxSections.push(
          p(formatEncounterClinicalRecordDiagnosisLine(dx)) +
            attr(
              formatClinicalRecordAttributionPart("documentedBy", dx.documentedBy, t, language) ??
                diagnosisAttributionFallback(dx.documentedBy, t)
            )
        );
      }
    };
    pushDxGroup("encounterClinicalRecordSummary.diagnosesPrimaryTitle", layout.groupedDiagnoses.primary);
    pushDxGroup("encounterClinicalRecordSummary.diagnosesSecondaryTitle", layout.groupedDiagnoses.secondary);
    pushDxGroup("encounterClinicalRecordSummary.diagnosesChronicTitle", layout.groupedDiagnoses.chronic);
    pushDxGroup("encounterClinicalRecordSummary.diagnosesResolvedTitle", layout.groupedDiagnoses.resolved);
    sections.push(section(t("encounterClinicalRecordSummary.diagnosesTitle"), dxSections.join("")));
  }

  if (layout.clinicalTimeline.length > 0) {
    const body = layout.clinicalTimeline
      .map(
        (entry) =>
          p(
            `${formatEncounterChromeDateTime(entry.timestampIso ?? "", language)} — ${clinicalMilestoneLabel(entry.milestone, t)}`
          ) + (entry.summary ? p(entry.summary) : "")
      )
      .join("");
    sections.push(section(t("encounterClinicalRecordSummary.clinicalTimelineTitle"), body));
  }

  if (layout.signatures.length > 0) {
    const body = layout.signatures
      .map((sig) => {
        const domain = SIGNATURE_DOMAIN_I18N[sig.domain] ? t(SIGNATURE_DOMAIN_I18N[sig.domain]) : sig.domain;
        return (
          p(`${domain}: ${sig.signerDisplayName}`) +
          attr(formatClinicalRecordAttributionPart("signedBy", sig.signedBy, t, language))
        );
      })
      .join("");
    sections.push(section(t("encounterClinicalRecordSummary.electronicSignaturesTitle"), body));
  }

  const printDate = new Date().toLocaleString(loc);
  const facilityHeader = buildPrintFacilityHeaderHtml(facilityInfo, esc);
  const subtitle = t("printOutput.erPacket.subtitleErPacket");
  const subtitleHtml =
    subtitle && subtitle !== "printOutput.erPacket.subtitleErPacket"
      ? `<p style="margin:0 0 20px 0;text-align:center;font-size:13px;font-weight:600;color:#475569;">${esc(subtitle)}</p>`
      : "";
  const footer = buildPrintDocumentFooterHtml(language, printDate, esc, printT);
  const htmlTitle = printT(language, "printOutput.erPacket.htmlTitleErPacket");

  return `<!DOCTYPE html><html lang="${resolveProductUiLanguageOrDefault(language)}"><head><meta charset="utf-8"/><title>${esc(
    htmlTitle
  )}</title><style>
    body { font-family: system-ui, sans-serif; padding: 24px; color: #0f172a; max-width: 900px; margin: 0 auto; font-size: 14px; }
    @media print { body { padding: 16px; } @page { margin: 16mm 12mm; } }
  </style></head><body>
${facilityHeader}${subtitleHtml}
${sections.filter(Boolean).join("")}
${footer}
</body></html>`;
}
