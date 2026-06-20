"use client";

/**
 * Printable patient discharge document — data from encounter + dischargeSummaryJson.
 * No network: parent passes loaded objects.
 */

import type { SupportedLanguage } from "@/i18n/config";
import { calculateAge } from "@/lib/patientDisplay";
import { formatEncounterProviderAssigned } from "@/lib/encounterDisplay";
import {
  DISCHARGE_SUMMARY_CORE_STRING_KEYS,
  nirMrnDisplay,
  parseDischargeSummaryForChart,
  PATIENT_DISCHARGE_INSTRUCTION_STRING_KEYS,
  type DischargeSummaryFieldsFr,
} from "@/components/patient-chart/patientChartHelpers";
import { printDateLocale, printPatientSexLabel, printT } from "@/lib/printI18n";
import {
  buildProviderDischargeDocumentationSummaryBlock,
  type ProviderDischargeDocumentationRenderOptions,
} from "@/features/emergency/providerDischargeDocumentationSummary";
import {
  buildPatientSpecificDischargeContextFromDischargeJson,
  type PatientSpecificDischargeContext,
} from "@/features/emergency/providerDischargePatientSpecificAdditions";

export type DischargePrintPatient = {
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | null;
  mrn?: string | null;
  nationalId?: string | null;
  globalMrn?: string | null;
  sex?: string | null;
  sexAtBirth?: string | null;
};

export type DischargePrintEncounter = {
  createdAt: string;
  dischargeSummaryJson?: unknown;
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
};

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function line(label: string, value: string | null | undefined): string {
  const v = value?.trim();
  if (!v) return "";
  return `<p style="margin: 6px 0; line-height: 1.45;"><strong>${esc(label)}</strong> ${esc(v)}</p>`;
}

function summaryBlockLineToHtml(summaryLine: string): string {
  const trimmed = summaryLine.trim();
  if (!trimmed) return "";
  const colonIdx = trimmed.indexOf(": ");
  if (colonIdx > 0 && !trimmed.startsWith("•")) {
    return line(trimmed.slice(0, colonIdx), trimmed.slice(colonIdx + 2));
  }
  return `<p style="margin: 6px 0; line-height: 1.45;">${esc(trimmed)}</p>`;
}

function appendProviderDischargeDocumentationPrintSection(
  bodySections: string[],
  dischargeSummaryJson: unknown,
  language: SupportedLanguage,
  patientDob?: string | null,
  patientSpecificDischargeContext?: PatientSpecificDischargeContext
): void {
  const baseContext = buildPatientSpecificDischargeContextFromDischargeJson(dischargeSummaryJson, {
    patientDob,
    medicationNames: patientSpecificDischargeContext?.medicationNames,
    historyCodes: patientSpecificDischargeContext?.diagnosisCodes,
    historyLabels: patientSpecificDischargeContext?.diagnosisLabels,
    patientAgeYears: patientSpecificDischargeContext?.patientAgeYears,
  });
  const renderOptions: ProviderDischargeDocumentationRenderOptions = {
    patientContext: patientSpecificDischargeContext ?
      {
        ...baseContext,
        ...patientSpecificDischargeContext,
        diagnosisCodes: [
          ...(baseContext.diagnosisCodes ?? []),
          ...(patientSpecificDischargeContext.diagnosisCodes ?? []),
        ],
        diagnosisLabels: [
          ...(baseContext.diagnosisLabels ?? []),
          ...(patientSpecificDischargeContext.diagnosisLabels ?? []),
        ],
        medicationNames: [
          ...(baseContext.medicationNames ?? []),
          ...(patientSpecificDischargeContext.medicationNames ?? []),
        ],
      }
    : baseContext,
  };
  const block = buildProviderDischargeDocumentationSummaryBlock(
    dischargeSummaryJson,
    language,
    renderOptions
  );
  if (!block || block.lines.length === 0) return;

  bodySections.push(
    `<h2 style="font-size: 15px; margin: 18px 0 10px 0; font-weight: 700; border-bottom: 1px solid #000; padding-bottom: 4px;">${esc(
      block.title
    )}</h2>`
  );
  bodySections.push(`<div style="margin-bottom: 16px;">`);
  for (const summaryLine of block.lines) {
    const html = summaryBlockLineToHtml(summaryLine);
    if (html) bodySections.push(html);
  }
  bodySections.push(`</div>`);
}

const DISCHARGE_CORE_FIELD_LABEL_KEYS: Record<(typeof DISCHARGE_SUMMARY_CORE_STRING_KEYS)[number], string> = {
  disposition: "encounterChrome.modals.dischargeField.disposition",
  exitCondition: "encounterChrome.modals.dischargeField.exitCondition",
  dischargeInstructions: "encounterChrome.modals.dischargeField.dischargeInstructions",
  medicationsGiven: "encounterChrome.modals.dischargeField.medicationsGiven",
  followUp: "encounterChrome.modals.dischargeField.followUp",
  returnIfWorse: "encounterChrome.modals.dischargeField.returnIfWorse",
  patientDestination: "encounterChrome.modals.dischargeField.patientDestination",
  dischargeMode: "encounterChrome.modals.dischargeField.dischargeMode",
};

function dischargeSummaryHasPatientInstructions(d: DischargeSummaryFieldsFr | null): boolean {
  if (!d) return false;
  for (const k of PATIENT_DISCHARGE_INSTRUCTION_STRING_KEYS) {
    const v = d[k];
    if (typeof v === "string" && v.trim()) return true;
  }
  if (d.patientInstructionsGiven === true) return true;
  return false;
}

/**
 * Full HTML for a print window (patient-facing discharge document).
 */
export function getDischargePrintHtml(params: {
  patient: DischargePrintPatient;
  encounter: DischargePrintEncounter;
  facilityName?: string | null;
  /** Primary diagnosis for this encounter if known client-side */
  primaryDiagnosis?: string | null;
  language: SupportedLanguage;
  /** Optional enriched context (e.g. home medications, problem list) for append-only additions. */
  patientSpecificDischargeContext?: PatientSpecificDischargeContext;
}): string {
  const { patient, encounter, facilityName, primaryDiagnosis, language, patientSpecificDischargeContext } =
    params;
  const loc = printDateLocale(language);
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
  const consultDate = (() => {
    try {
      return new Date(encounter.createdAt).toLocaleString(loc);
    } catch {
      return "—";
    }
  })();
  const printDate = new Date().toLocaleString(loc);

  const d = parseDischargeSummaryForChart(encounter.dischargeSummaryJson);
  const physicianLine = formatEncounterProviderAssigned({
    physicianAssigned: encounter.physicianAssigned ?? null,
  });
  const signer =
    encounter.physicianAssigned?.firstName || encounter.physicianAssigned?.lastName
      ? [encounter.physicianAssigned.firstName, encounter.physicianAssigned.lastName].filter(Boolean).join(" ").trim()
      : "";

  const bodySections: string[] = [];

  bodySections.push(
    `<h1 style="font-size: 18px; margin: 0 0 16px 0; font-weight: 700;">${esc(
      printT(language, "printOutput.discharge.documentH1")
    )}</h1>`
  );

  bodySections.push(
    `<div style="margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #000;">`
  );
  bodySections.push(line(printT(language, "printOutput.discharge.patientName"), name));
  bodySections.push(line(printT(language, "encounterChrome.labelAge"), age));
  bodySections.push(line(printT(language, "encounterChrome.labelSex"), sex));
  bodySections.push(line(printT(language, "encounterChrome.labelNirMrn"), ids));
  bodySections.push(line(printT(language, "printOutput.discharge.encounterDate"), consultDate));
  if (facilityName?.trim()) {
    bodySections.push(line(printT(language, "printOutput.patientChart.establishment"), facilityName.trim()));
  }
  bodySections.push(
    line(
      printT(language, "encounterChrome.labelAssignedPhysician"),
      physicianLine !== "—" ? physicianLine : null
    )
  );
  if (primaryDiagnosis?.trim()) {
    bodySections.push(line(printT(language, "printOutput.discharge.primaryDiagnosis"), primaryDiagnosis.trim()));
  }
  bodySections.push(`</div>`);

  bodySections.push(`<div style="margin-bottom: 16px;">`);
  if (d) {
    for (const k of DISCHARGE_SUMMARY_CORE_STRING_KEYS) {
      const v = d[k];
      if (typeof v === "string" && v.trim()) {
        bodySections.push(line(printT(language, DISCHARGE_CORE_FIELD_LABEL_KEYS[k]), v));
      }
    }
  }
  bodySections.push(`</div>`);

  appendProviderDischargeDocumentationPrintSection(
    bodySections,
    encounter.dischargeSummaryJson,
    language,
    patient.dob,
    patientSpecificDischargeContext
  );

  if (d && dischargeSummaryHasPatientInstructions(d)) {
    const loc = printDateLocale(language);
    bodySections.push(
      `<h2 style="font-size: 15px; margin: 18px 0 10px 0; font-weight: 700; border-bottom: 1px solid #000; padding-bottom: 4px;">${esc(
        printT(language, "printOutput.patientDischargeInstructions.sectionTitle")
      )}</h2>`
    );
    bodySections.push(`<div style="margin-bottom: 16px;">`);
    for (const k of PATIENT_DISCHARGE_INSTRUCTION_STRING_KEYS) {
      const v = d[k];
      if (typeof v === "string" && v.trim()) {
        bodySections.push(line(printT(language, `patientDischargeInstructions.${k}`), v));
      }
    }
    if (d.patientInstructionsGiven === true) {
      bodySections.push(
        line(
          printT(language, "printOutput.patientDischargeInstructions.givenYes"),
          printT(language, "printOutput.erPacket.yes")
        )
      );
    }
    if (d.instructionsGivenBy?.trim()) {
      bodySections.push(
        line(printT(language, "printOutput.patientDischargeInstructions.metaBy"), d.instructionsGivenBy.trim())
      );
    }
    if (d.instructionsGivenAt?.trim()) {
      let when = d.instructionsGivenAt.trim();
      try {
        when = new Date(d.instructionsGivenAt).toLocaleString(loc);
      } catch {
        /* keep raw */
      }
      bodySections.push(line(printT(language, "printOutput.patientDischargeInstructions.metaAt"), when));
    }
    bodySections.push(`</div>`);
  }

  if (!d) {
    bodySections.push(
      `<p style="margin: 12px 0; font-size: 13px;">${esc(
        printT(language, "printOutput.discharge.noStructuredSummary")
      )}</p>`
    );
  }

  bodySections.push(
    `<div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #000;">`
  );
  bodySections.push(
    `<p style="margin: 8px 0 0 0;"><strong>${esc(printT(language, "printOutput.discharge.signatureHeading"))}</strong></p>`
  );
  bodySections.push(
    `<p style="margin: 24px 0 8px 0; min-height: 40px; border-bottom: 1px solid #000; width: 100%; max-width: 320px;">${signer ? esc(signer) : ""}</p>`
  );
  bodySections.push(`</div>`);

  const footer = esc(printT(language, "printOutput.common.documentFooter").replace("{date}", printDate));
  bodySections.push(`<p style="margin-top: 20px; font-size: 11px;">${footer}</p>`);

  const htmlLang = language === "en" ? "en" : "fr";

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="utf-8">
  <title>${esc(printT(language, "printOutput.discharge.htmlTitle"))}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #000; background: #fff; margin: 0; padding: 24px; font-size: 14px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
${bodySections.join("\n")}
</body>
</html>`;
}

export function printDischarge(params: {
  patient: DischargePrintPatient;
  encounter: DischargePrintEncounter;
  facilityName?: string | null;
  primaryDiagnosis?: string | null;
  language: SupportedLanguage;
}): void {
  const win = window.open("", "_blank");
  if (!win) {
    alert(printT(params.language, "printOutput.common.popupBlocked"));
    return;
  }
  win.document.write(getDischargePrintHtml(params));
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 300);
}
