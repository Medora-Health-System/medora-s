"use client";

/**
 * Printable patient discharge document — data from encounter + dischargeSummaryJson.
 * No network: parent passes loaded objects.
 */

import type { SupportedLanguage } from "@/i18n/config";
import { calculateAge } from "@/lib/patientDisplay";
import { formatEncounterProviderAssigned } from "@/lib/encounterDisplay";
import { nirMrnDisplay, parseDischargeSummaryForChart } from "@/components/patient-chart/patientChartHelpers";
import { printDateLocale, printPatientSexLabel, printT } from "@/lib/printI18n";
import type { DischargeSummaryFieldsFr } from "@/components/patient-chart/patientChartHelpers";

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

const DISCHARGE_FIELD_KEYS: Record<keyof DischargeSummaryFieldsFr, string> = {
  disposition: "encounterChrome.modals.dischargeField.disposition",
  exitCondition: "encounterChrome.modals.dischargeField.exitCondition",
  dischargeInstructions: "encounterChrome.modals.dischargeField.dischargeInstructions",
  medicationsGiven: "encounterChrome.modals.dischargeField.medicationsGiven",
  followUp: "encounterChrome.modals.dischargeField.followUp",
  returnIfWorse: "encounterChrome.modals.dischargeField.returnIfWorse",
  patientDestination: "encounterChrome.modals.dischargeField.patientDestination",
  dischargeMode: "encounterChrome.modals.dischargeField.dischargeMode",
};

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
}): string {
  const { patient, encounter, facilityName, primaryDiagnosis, language } = params;
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
    (Object.keys(DISCHARGE_FIELD_KEYS) as (keyof DischargeSummaryFieldsFr)[]).forEach((k) => {
      const v = d[k];
      if (typeof v === "string" && v.trim()) {
        bodySections.push(line(printT(language, DISCHARGE_FIELD_KEYS[k]), v));
      }
    });
  }
  bodySections.push(`</div>`);

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
