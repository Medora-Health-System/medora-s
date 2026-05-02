/**
 * ER final print packet — composes patient/facility header, disposition-aware clinical sections,
 * read-only EMTALA timeline, handoff lines, and signature metadata. Pure string HTML for browser print.
 * Does not invent clinical facts; only displays stored JSON / derived ambient EMTALA state.
 */

import type { SupportedLanguage } from "@/i18n/config";
import { calculateAge } from "@/lib/patientDisplay";
import { formatEncounterProviderAssigned } from "@/lib/encounterDisplay";
import {
  DISCHARGE_SUMMARY_CORE_STRING_KEYS,
  nirMrnDisplay,
  parseAdmissionSummaryForChart,
  parseDischargeSummaryForChart,
  PATIENT_DISCHARGE_INSTRUCTION_STRING_KEYS,
  type DischargeSummaryFieldsFr,
} from "@/components/patient-chart/patientChartHelpers";
import { printDateLocale, printPatientSexLabel, printT } from "@/lib/printI18n";
import type { DischargePrintEncounter, DischargePrintPatient } from "@/components/encounters/DischargePrintLayout";
import { hydrateDischargeFormFromEncounterJson } from "@/lib/encounterDischarge";
import {
  erDispositionSupplementFromEncounter,
  inferOutcomeUiFromForms,
  localizedErDischargeModeLabel,
  readDispositionSignatureFromEncounter,
  readDischargeSortieExecutionFromEncounter,
  type ErDispositionOutcomeUi,
} from "@/features/emergency/emergencyDispositionV1";
import { deriveEmtalaStateFromEncounter, type ErEmtalaV1Stored } from "@/features/emergency/erEmtalaV1";
import { readErHandoffV1FromNursingAssessment } from "@medora/shared";

export type ErPrintTriageSnapshot = {
  vitalsJson?: unknown;
  triageCompleteAt?: string | null;
} | null;

export type ErPrintEncounter = DischargePrintEncounter & {
  admissionSummaryJson?: unknown;
  nursingAssessment?: unknown;
  providerDocumentationStatus?: string | null;
  providerDocumentationSignedAt?: string | null;
  providerDocumentationSignedByDisplayFr?: string | null;
  providerAddenda?: Array<{
    id: string;
    text: string;
    createdAt: string;
    /** Populated by API when addenda are loaded with author join. */
    createdByDisplayFr?: string | null;
  }>;
};

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

function appendCoreDischargeFieldsToBody(
  body: string[],
  language: SupportedLanguage,
  d: DischargeSummaryFieldsFr | null
): void {
  if (!d) return;
  for (const k of DISCHARGE_SUMMARY_CORE_STRING_KEYS) {
    const v = d[k];
    if (typeof v === "string" && v.trim()) {
      body.push(line(printT(language, DISCHARGE_CORE_FIELD_LABEL_KEYS[k]), v));
    }
  }
}

function dischargeSummaryHasPatientInstructions(d: DischargeSummaryFieldsFr | null): boolean {
  if (!d) return false;
  for (const k of PATIENT_DISCHARGE_INSTRUCTION_STRING_KEYS) {
    const v = d[k];
    if (typeof v === "string" && v.trim()) return true;
  }
  if (d.patientInstructionsGiven === true) return true;
  return false;
}

function appendPatientDischargeInstructionsPrint(
  body: string[],
  language: SupportedLanguage,
  loc: string,
  d: DischargeSummaryFieldsFr | null
): void {
  if (!dischargeSummaryHasPatientInstructions(d) || !d) return;
  body.push(h2(language, "printOutput.patientDischargeInstructions.sectionTitle"));
  for (const k of PATIENT_DISCHARGE_INSTRUCTION_STRING_KEYS) {
    const v = d[k];
    if (typeof v === "string" && v.trim()) {
      body.push(line(printT(language, `patientDischargeInstructions.${k}`), v.trim()));
    }
  }
  if (d.patientInstructionsGiven === true) {
    body.push(
      line(
        printT(language, "printOutput.patientDischargeInstructions.givenYes"),
        printT(language, "printOutput.erPacket.yes")
      )
    );
  }
  if (d.instructionsGivenBy?.trim()) {
    body.push(
      line(printT(language, "printOutput.patientDischargeInstructions.metaBy"), d.instructionsGivenBy.trim())
    );
  }
  if (d.instructionsGivenAt?.trim()) {
    body.push(
      line(printT(language, "printOutput.patientDischargeInstructions.metaAt"), fmtIso(d.instructionsGivenAt, loc))
    );
  }
}

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

function fmtIso(iso: string | null | undefined, loc: string): string {
  if (!iso?.trim()) return "";
  try {
    return new Date(iso).toLocaleString(loc);
  } catch {
    return "";
  }
}

function h2(lang: SupportedLanguage, key: string): string {
  return `<h2 style="font-size: 15px; margin: 20px 0 10px 0; font-weight: 700; border-bottom: 1px solid #000; padding-bottom: 4px;">${esc(
    printT(lang, key)
  )}</h2>`;
}

function erPacketH1(lang: SupportedLanguage, outcome: ErDispositionOutcomeUi): string {
  if (outcome === "ADMISSION") return printT(lang, "printOutput.erPacket.h1AdmissionSummary");
  if (outcome === "TRANSFER") return printT(lang, "printOutput.erPacket.h1TransferPacket");
  return printT(lang, "printOutput.erPacket.h1DischargePacket");
}

/** Central assembly for ER print HTML — used by `printErPacket` / browser print. */
export function getErPrintPacketHtml(params: {
  patient: DischargePrintPatient;
  encounter: ErPrintEncounter;
  facilityName?: string | null;
  primaryDiagnosis?: string | null;
  triageSnapshot: ErPrintTriageSnapshot;
  language: SupportedLanguage;
}): string {
  const { patient, encounter, facilityName, primaryDiagnosis, triageSnapshot, language } = params;
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
  const consultDate = fmtIso(encounter.createdAt, loc) || "—";
  const printDate = new Date().toLocaleString(loc);

  const dischargeForm = hydrateDischargeFormFromEncounterJson(encounter.dischargeSummaryJson);
  const supplement = erDispositionSupplementFromEncounter(encounter.nursingAssessment);
  const outcome = inferOutcomeUiFromForms(dischargeForm.dischargeMode, supplement);
  const dispositionOutcomeLabel = localizedErDischargeModeLabel(
    dischargeForm.dischargeMode,
    supplement,
    language
  );

  const d = parseDischargeSummaryForChart(encounter.dischargeSummaryJson);
  const adm = parseAdmissionSummaryForChart(encounter.admissionSummaryJson);

  const physicianLine = formatEncounterProviderAssigned({
    physicianAssigned: encounter.physicianAssigned ?? null,
  });
  const signer =
    encounter.physicianAssigned?.firstName || encounter.physicianAssigned?.lastName
      ? [encounter.physicianAssigned.firstName, encounter.physicianAssigned.lastName].filter(Boolean).join(" ").trim()
      : "";

  const emtalaDerived = deriveEmtalaStateFromEncounter({
    createdAt: encounter.createdAt,
    nursingAssessment: encounter.nursingAssessment,
    dischargeSummaryJson: encounter.dischargeSummaryJson,
    admissionSummaryJson: encounter.admissionSummaryJson,
    physicianAssigned: encounter.physicianAssigned ?? null,
    triage: triageSnapshot
      ? { vitalsJson: triageSnapshot.vitalsJson, triageCompleteAt: triageSnapshot.triageCompleteAt ?? null }
      : null,
  });

  const handoff = readErHandoffV1FromNursingAssessment(encounter.nursingAssessment);
  const disSig = readDispositionSignatureFromEncounter(encounter.nursingAssessment);
  const sortieExec = readDischargeSortieExecutionFromEncounter(encounter.nursingAssessment);

  const body: string[] = [];

  body.push(`<h1 style="font-size: 18px; margin: 0 0 16px 0; font-weight: 700;">${esc(erPacketH1(language, outcome))}</h1>`);

  body.push(`<div style="margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #000;">`);
  body.push(line(printT(language, "printOutput.discharge.patientName"), name));
  body.push(line(printT(language, "encounterChrome.labelAge"), age));
  body.push(line(printT(language, "encounterChrome.labelSex"), sex));
  body.push(line(printT(language, "encounterChrome.labelNirMrn"), ids));
  body.push(line(printT(language, "printOutput.discharge.encounterDate"), consultDate));
  if (facilityName?.trim()) {
    body.push(line(printT(language, "printOutput.patientChart.establishment"), facilityName.trim()));
  }
  body.push(
    line(
      printT(language, "encounterChrome.labelAssignedPhysician"),
      physicianLine !== "—" ? physicianLine : null
    )
  );
  if (dispositionOutcomeLabel.trim()) {
    body.push(line(printT(language, "printOutput.erPacket.dispositionOutcome"), dispositionOutcomeLabel.trim()));
  }
  if (primaryDiagnosis?.trim()) {
    body.push(line(printT(language, "printOutput.erPacket.finalDiagnosis"), primaryDiagnosis.trim()));
  }
  body.push(`</div>`);

  if (outcome === "ADMISSION") {
    body.push(h2(language, "printOutput.erPacket.sectionAdmissionClinical"));
    if (adm) {
      body.push(line(printT(language, "printOutput.erPacket.admissionReason"), adm.admissionReason ?? null));
      body.push(line(printT(language, "printOutput.erPacket.admittingService"), adm.serviceUnit ?? null));
      body.push(line(printT(language, "printOutput.erPacket.admissionDiagnosis"), adm.admissionDiagnosis ?? null));
      body.push(line(printT(language, "printOutput.erPacket.careLevel"), adm.careLevel ?? null));
      body.push(line(printT(language, "printOutput.erPacket.conditionAtAdmission"), adm.conditionAtAdmission ?? null));
      body.push(line(printT(language, "printOutput.erPacket.initialPlan"), adm.initialPlan ?? null));
      body.push(line(printT(language, "printOutput.erPacket.admittingPhysician"), adm.responsiblePhysicianName ?? null));
    } else {
      body.push(
        `<p style="margin: 8px 0; font-size: 13px; color: #444;">${esc(
          printT(language, "printOutput.erPacket.admissionNoStructured")
        )}</p>`
      );
    }
  } else if (outcome === "TRANSFER") {
    body.push(h2(language, "printOutput.erPacket.sectionTransferClinical"));
    appendCoreDischargeFieldsToBody(body, language, d);
    if (supplement.transferHandoffNote.trim()) {
      body.push(line(printT(language, "printOutput.erPacket.handoffSummary"), supplement.transferHandoffNote.trim()));
    }
    if (emtalaDerived) {
      body.push(line(printT(language, "printOutput.erPacket.transferReason"), emtalaDerived.transferReason ?? null));
      body.push(
        line(printT(language, "printOutput.erPacket.acceptingFacility"), emtalaDerived.acceptingFacilityName ?? null)
      );
      body.push(
        line(printT(language, "printOutput.erPacket.acceptingClinician"), emtalaDerived.acceptingClinicianName ?? null)
      );
      body.push(line(printT(language, "printOutput.erPacket.transferMode"), emtalaDerived.transferMode ?? null));
    }
  } else {
    body.push(h2(language, "printOutput.erPacket.sectionDischargeClinical"));
    appendCoreDischargeFieldsToBody(body, language, d);
    if (!d) {
      body.push(
        `<p style="margin: 12px 0; font-size: 13px;">${esc(
          printT(language, "printOutput.discharge.noStructuredSummary")
        )}</p>`
      );
    }
    if (outcome === "AMA" && supplement.amaRisksDiscussed.trim()) {
      body.push(line(printT(language, "printOutput.erPacket.amaRisks"), supplement.amaRisksDiscussed.trim()));
    }
    if (outcome === "LWBS" && supplement.lwbsNarrative.trim()) {
      body.push(line(printT(language, "printOutput.erPacket.lwbsDetail"), supplement.lwbsNarrative.trim()));
    }
    if (outcome === "DECEASED" && supplement.deceasedPlaceholderNote.trim()) {
      body.push(line(printT(language, "printOutput.erPacket.deceasedNote"), supplement.deceasedPlaceholderNote.trim()));
    }
  }

  appendPatientDischargeInstructionsPrint(body, language, loc, d);

  body.push(h2(language, "printOutput.erPacket.sectionEmtalaSummary"));
  appendEmtalaBlock(body, language, loc, emtalaDerived);

  body.push(h2(language, "printOutput.erPacket.sectionHandoff"));
  appendHandoffBlock(body, language, loc, handoff);

  body.push(h2(language, "printOutput.erPacket.sectionSignatures"));
  appendSignatureBlock(body, language, loc, encounter, emtalaDerived, disSig, sortieExec);

  const footer = esc(printT(language, "printOutput.common.documentFooter").replace("{date}", printDate));
  body.push(`<p style="margin-top: 20px; font-size: 11px;">${footer}</p>`);

  const htmlLang = language === "en" ? "en" : "fr";
  const titleKey =
    outcome === "ADMISSION"
      ? "printOutput.erPacket.htmlTitleAdmission"
      : outcome === "TRANSFER"
        ? "printOutput.erPacket.htmlTitleTransfer"
        : "printOutput.erPacket.htmlTitleDischarge";

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="utf-8">
  <title>${esc(printT(language, titleKey))}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #000; background: #fff; margin: 0; padding: 24px; font-size: 14px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
${body.join("\n")}
<div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #000;">
  <p style="margin: 8px 0 0 0;"><strong>${esc(printT(language, "printOutput.discharge.signatureHeading"))}</strong></p>
  <p style="margin: 24px 0 8px 0; min-height: 40px; border-bottom: 1px solid #000; width: 100%; max-width: 320px;">${signer ? esc(signer) : ""}</p>
</div>
</body>
</html>`;
}

function appendEmtalaBlock(
  body: string[],
  language: SupportedLanguage,
  loc: string,
  emtala: ErEmtalaV1Stored | null
): void {
  if (!emtala) {
    body.push(`<p style="margin: 8px 0; font-size: 13px; color: #444;">${esc(printT(language, "printOutput.erPacket.emtalaNoData"))}</p>`);
    return;
  }
  const rows: Array<[string, string]> = [];
  const push = (labelKey: string, iso: string | null | undefined) => {
    const t = fmtIso(iso ?? null, loc);
    if (t) rows.push([printT(language, labelKey), t]);
  };
  push("printOutput.erPacket.emtalaArrival", emtala.arrivalAt);
  push("printOutput.erPacket.emtalaTriageCompleted", emtala.triageCompletedAt);
  push("printOutput.erPacket.emtalaMseCompleted", emtala.medicalScreeningExamCompletedAt);
  push("printOutput.erPacket.emtalaDispositionDecision", emtala.dispositionDecisionAt);
  push("printOutput.erPacket.emtalaDeparture", emtala.departureAt);
  if (emtala.transferAcceptedAt?.trim()) {
    push("printOutput.erPacket.emtalaTransferAccepted", emtala.transferAcceptedAt);
  }
  if (rows.length === 0) {
    body.push(`<p style="margin: 8px 0; font-size: 13px; color: #444;">${esc(printT(language, "printOutput.erPacket.emtalaNoTimestamps"))}</p>`);
    return;
  }
  for (const [label, val] of rows) {
    body.push(line(label, val));
  }
}

function appendHandoffBlock(
  body: string[],
  language: SupportedLanguage,
  loc: string,
  handoff: ReturnType<typeof readErHandoffV1FromNursingAssessment>
): void {
  const has =
    handoff.handoffNote?.trim() ||
    handoff.receivingNurseName?.trim() ||
    handoff.reportGiven === true ||
    handoff.reportGivenAt?.trim() ||
    handoff.handoffLastSavedByDisplayName?.trim() ||
    handoff.handoffLastSavedAt?.trim();
  if (!has) {
    body.push(`<p style="margin: 8px 0; font-size: 13px; color: #444;">${esc(printT(language, "printOutput.erPacket.handoffEmpty"))}</p>`);
    return;
  }
  if (handoff.reportGiven === true) {
    body.push(line(printT(language, "printOutput.erPacket.handoffReportGiven"), printT(language, "printOutput.erPacket.yes")));
  }
  if (handoff.reportGivenAt?.trim()) {
    body.push(
      line(
        printT(language, "printOutput.erPacket.handoffReportGivenAt"),
        fmtIso(handoff.reportGivenAt, loc)
      )
    );
  }
  if (handoff.receivingNurseName?.trim()) {
    body.push(line(printT(language, "printOutput.erPacket.receivingNurse"), handoff.receivingNurseName.trim()));
  }
  if (handoff.handoffNote?.trim()) {
    body.push(line(printT(language, "printOutput.erPacket.handoffNote"), handoff.handoffNote.trim()));
  }
  if (handoff.handoffLastSavedByDisplayName?.trim() && handoff.handoffLastSavedAt?.trim()) {
    body.push(
      line(
        printT(language, "printOutput.erPacket.handoffRecordSaved"),
        `${handoff.handoffLastSavedByDisplayName.trim()} — ${fmtIso(handoff.handoffLastSavedAt, loc)}`
      )
    );
  } else if (handoff.handoffLastSavedByDisplayName?.trim()) {
    body.push(
      line(printT(language, "printOutput.erPacket.handoffLastSavedBy"), handoff.handoffLastSavedByDisplayName.trim())
    );
  } else if (handoff.handoffLastSavedAt?.trim()) {
    body.push(
      line(printT(language, "printOutput.erPacket.handoffLastSavedAt"), fmtIso(handoff.handoffLastSavedAt, loc))
    );
  }
}

function appendSignatureBlock(
  body: string[],
  language: SupportedLanguage,
  loc: string,
  encounter: ErPrintEncounter,
  emtala: ErEmtalaV1Stored | null,
  disSig: ReturnType<typeof readDispositionSignatureFromEncounter>,
  sortieExec: ReturnType<typeof readDischargeSortieExecutionFromEncounter>
): void {
  if (encounter.providerDocumentationStatus === "SIGNED" && encounter.providerDocumentationSignedAt) {
    const who = encounter.providerDocumentationSignedByDisplayFr?.trim() || "—";
    const when = fmtIso(encounter.providerDocumentationSignedAt, loc);
    body.push(
      line(
        printT(language, "printOutput.erPacket.signedProviderDocumentation"),
        `${who} — ${when}`
      )
    );
  }
  const addenda = encounter.providerAddenda ?? [];
  if (addenda.length > 0) {
    body.push(
      line(
        printT(language, "printOutput.erPacket.addendaPresent"),
        printT(language, "printOutput.erPacket.addendaCount").replace("{n}", String(addenda.length))
      )
    );
    addenda.forEach((a, idx) => {
      const who = a.createdByDisplayFr?.trim() ?? "";
      const when = fmtIso(a.createdAt, loc);
      if (!who && !when) return;
      body.push(
        line(
          printT(language, "printOutput.erPacket.addendumNumbered").replace("{n}", String(idx + 1)),
          who ? `${who} — ${when || "—"}` : when || "—"
        )
      );
    });
  }
  if (disSig) {
    body.push(
      line(
        printT(language, "printOutput.erPacket.signedDisposition"),
        `${disSig.savedByDisplayName.trim()} — ${fmtIso(disSig.savedAt, loc)}`
      )
    );
  }
  if (sortieExec) {
    body.push(
      line(
        printT(language, "printOutput.erPacket.nursingDischargeExecution"),
        `${sortieExec.dischargeSortieCompletedByDisplayName.trim()} — ${fmtIso(sortieExec.dischargeSortieCompletedAt, loc)}`
      )
    );
    if (sortieExec.dischargeSortieExecutionNote?.trim()) {
      body.push(line(printT(language, "printOutput.erPacket.executionNote"), sortieExec.dischargeSortieExecutionNote.trim()));
    }
  }
  if (emtala?.signature?.savedAt && emtala.signature.savedByDisplayName) {
    body.push(
      line(
        printT(language, "printOutput.erPacket.signedEmtalaLog"),
        `${emtala.signature.savedByDisplayName.trim()} — ${fmtIso(emtala.signature.savedAt, loc)}`
      )
    );
  }
}

/** Spec alias — same as `getErPrintPacketHtml` (single composed printable document). */
export function buildErPrintPacketModel(input: Parameters<typeof getErPrintPacketHtml>[0]): string {
  return getErPrintPacketHtml(input);
}

export function printErPacket(params: {
  patient: DischargePrintPatient;
  encounter: ErPrintEncounter;
  facilityName?: string | null;
  primaryDiagnosis?: string | null;
  triageSnapshot: ErPrintTriageSnapshot;
  language: SupportedLanguage;
}): void {
  const win = window.open("", "_blank");
  if (!win) {
    alert(printT(params.language, "printOutput.common.popupBlocked"));
    return;
  }
  win.document.write(getErPrintPacketHtml(params));
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 300);
}
