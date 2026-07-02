/**
 * ER final print packet — composes patient/facility header, disposition-aware clinical sections,
 * read-only EMTALA timeline, handoff lines, and signature metadata. Pure string HTML for browser print.
 * Does not invent clinical facts; only displays stored JSON / derived ambient EMTALA state.
 */

import type { SupportedLanguage } from "@/i18n/config";
import type { EncounterClinicalRecord } from "@medora/shared";
import { getErClinicalRecordPrintPacketHtml } from "@/features/emergency/erClinicalRecordPrintPacket";
import { isSummaryClinicalRecordV2Enabled } from "@/features/emergency/summaryClinicalRecordFeatureFlag";
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
import type {
  ErEdSummaryMarEventRow,
  ErEdSummaryMedicationOrderRow,
} from "@/features/emergency/erEdSummaryMedicationMar";
import type { DischargePrintEncounter, DischargePrintPatient } from "@/components/encounters/DischargePrintLayout";
import { hydrateDischargeFormFromEncounterJson } from "@/lib/encounterDischarge";
import {
  erDispositionSupplementFromEncounter,
  inferOutcomeUiFromForms,
  localizedErDischargeModeLabel,
  readDispositionSignatureFromEncounter,
  type ErDispositionOutcomeUi,
} from "@/features/emergency/emergencyDispositionV1";
import { deriveEmtalaStateFromEncounter, type ErEmtalaV1Stored } from "@/features/emergency/erEmtalaV1";
import {
  buildInitialNursingAssessmentPrintSection,
  buildNursingDischargePrintSection,
  type ErPrintInitialNursingSection,
  type ErPrintNursingDischargeSection,
} from "@/features/emergency/erInitialNursingAssessmentSummary";
import {
  buildProviderDocumentationPrintSection,
  buildVisitSummaryProviderDocumentationBlock,
  type ErPrintProviderDocumentationSection,
} from "@/features/emergency/erProviderDocumentationSummary";
import type { EdClinicalTimelineEntry } from "@medora/shared";
import { readErHandoffV1FromNursingAssessment } from "@medora/shared";
import { buildProviderDischargeDocumentationSummaryBlock } from "@/features/emergency/providerDischargeDocumentationSummary";
import { buildPatientSpecificDischargeContextFromDischargeJson } from "@/features/emergency/providerDischargePatientSpecificAdditions";
import {
  mergeMedicationNamesForDischargeContext,
  type DischargeMedicationSourceInput,
} from "@/features/emergency/providerDischargeMedicationContext";
import { readNursingDischargeExecutionStored } from "@/features/emergency/nursingDischargeExecutionModel";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import {
  appendClinicalDocumentationEntriesBlock,
  type ErPrintClinicalDocumentationEntry,
} from "@/features/emergency/erClinicalDocumentationPrintSection";

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

/**
 * Append-only nursing reassessment history input for the print packet. Built from
 * `GET /encounters/:id/nursing-reassessment-events` entries by the caller, NOT fetched here, so
 * the print packet stays a synchronous HTML composer with no network coupling.
 *
 * Optional in every consumer: when `null`/`undefined`/empty, the print output behavior is
 * unchanged (no nursing reassessment history section). When non-empty, a compact, read-only
 * section is rendered before signatures so the printed medical record reflects the same
 * append-only documentation history that the bedside grid and Summary tab now show.
 */
export type ErPrintReassessmentEntry = {
  /** ISO clinical reassessment time (preferred), or `null` to fall back to `savedAt`. */
  documentedAt: string | null;
  /** ISO server save time. Always required so the entry can be displayed/sorted. */
  savedAt: string;
  performerDisplayName: string;
  performerInitials: string;
  performerRoleTitle: string;
  /** Compact already-truncated structured-preview lines. */
  structuredLines: string[];
  /** Compact already-truncated narrative excerpt; empty string when none. */
  narrativeExcerpt: string;
};

export type ErPrintDocumentationHistoryEntry = ErPrintReassessmentEntry;

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

function appendProviderDischargeDocumentationPrint(
  body: string[],
  language: SupportedLanguage,
  dischargeSummaryJson: unknown,
  patientDob?: string | null,
  medicationSources?: DischargeMedicationSourceInput
): void {
  const wiredMedicationNames = mergeMedicationNamesForDischargeContext({
    dischargeSummaryJson,
    ...medicationSources,
  });
  const block = buildProviderDischargeDocumentationSummaryBlock(dischargeSummaryJson, language, {
    patientContext: buildPatientSpecificDischargeContextFromDischargeJson(dischargeSummaryJson, {
      patientDob,
      medicationNames: wiredMedicationNames.length ? wiredMedicationNames : undefined,
    }),
  });
  if (!block) return;
  body.push(`<h2 style="margin: 16px 0 8px 0; font-size: 15px;">${esc(block.title)}</h2>`);
  for (const ln of block.lines) {
    body.push(`<p style="margin: 0 0 6px 0; font-size: 13px; line-height: 1.45; white-space: pre-wrap;">${esc(ln)}</p>`);
  }
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
  return printT(lang, "printOutput.erPacket.h1ErPacket");
}

/** Central assembly for ER print HTML — used by `printErPacket` / browser print. */
export function getErPrintPacketHtml(params: {
  patient: DischargePrintPatient;
  encounter: ErPrintEncounter;
  facilityName?: string | null;
  primaryDiagnosis?: string | null;
  triageSnapshot: ErPrintTriageSnapshot;
  language: SupportedLanguage;
  /**
   * Optional append-only nursing reassessment history. When supplied non-empty, a compact
   * "Réévaluations infirmières — historique" section is rendered before the signatures block,
   * one entry block per persisted column. When omitted/empty, no section is added — the
   * pre-existing print output is byte-identical to before this feature.
   */
  nursingReassessmentEntries?: ErPrintReassessmentEntry[] | null;
  initialNursingAssessment?: ErPrintInitialNursingSection | null;
  nursingDischargeDocumentation?: ErPrintNursingDischargeSection | null;
  providerMseEntries?: ErPrintDocumentationHistoryEntry[] | null;
  handoffEntries?: ErPrintDocumentationHistoryEntry[] | null;
  dischargeSummaryEntries?: ErPrintDocumentationHistoryEntry[] | null;
  admissionSummaryEntries?: ErPrintDocumentationHistoryEntry[] | null;
  dispositionSupplementEntries?: ErPrintDocumentationHistoryEntry[] | null;
  triageAssessmentEntries?: ErPrintDocumentationHistoryEntry[] | null;
  medicationOrderRows?: ErEdSummaryMedicationOrderRow[] | null;
  marEventRows?: ErEdSummaryMarEventRow[] | null;
  continuousInfusionSectionHtml?: string | null;
  procedureSummaries?: string[] | null;
  providerDocumentationSection?: ErPrintProviderDocumentationSection | null;
  clinicalTimelineEntries?: EdClinicalTimelineEntry[] | null;
  /** Persisted EDOC legal chart rows — same source as Summary dashboard `clinicalDocumentationEntries`. */
  clinicalDocumentationEntries?: ErPrintClinicalDocumentationEntry[] | null;
  clinicalRecord?: EncounterClinicalRecord | null;
  useClinicalRecordV2?: boolean;
}): string {
  const {
    patient,
    encounter,
    facilityName,
    primaryDiagnosis,
    triageSnapshot,
    language,
    nursingReassessmentEntries,
    initialNursingAssessment: initialNursingAssessmentParam,
    nursingDischargeDocumentation: nursingDischargeDocumentationParam,
    providerMseEntries,
    handoffEntries,
    dischargeSummaryEntries,
    admissionSummaryEntries,
    dispositionSupplementEntries,
    triageAssessmentEntries,
    medicationOrderRows,
    marEventRows,
    continuousInfusionSectionHtml,
    procedureSummaries,
    providerDocumentationSection: providerDocumentationSectionParam,
    clinicalTimelineEntries,
    clinicalDocumentationEntries,
    clinicalRecord,
    useClinicalRecordV2,
  } = params;

  const v2Enabled = useClinicalRecordV2 ?? isSummaryClinicalRecordV2Enabled();
  if (v2Enabled && clinicalRecord) {
    return getErClinicalRecordPrintPacketHtml({
      patient,
      encounter,
      facilityName,
      language,
      record: clinicalRecord,
    });
  }

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
  const initialNursingAssessment =
    initialNursingAssessmentParam ??
    buildInitialNursingAssessmentPrintSection(encounter.nursingAssessment, language);
  const nursingDischargeDocumentation =
    nursingDischargeDocumentationParam ??
    buildNursingDischargePrintSection(encounter.nursingAssessment, language);
  const providerDocumentationSection =
    providerDocumentationSectionParam ??
    (() => {
      const block = buildVisitSummaryProviderDocumentationBlock({
        nursingAssessment: encounter.nursingAssessment,
        locale: language,
        providerDocumentationStatus: encounter.providerDocumentationStatus,
        providerDocumentationSignedAt: encounter.providerDocumentationSignedAt,
        providerDocumentationSignedByDisplayFr: encounter.providerDocumentationSignedByDisplayFr,
        providerAddenda: encounter.providerAddenda,
      });
      return block && block.sections.length > 0
        ? buildProviderDocumentationPrintSection(block, language)
        : null;
    })();

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

  if (Array.isArray(triageAssessmentEntries) && triageAssessmentEntries.length > 0) {
    body.push(h2(language, "printOutput.erPacket.sectionTriageAssessmentHistory"));
    appendDocumentationHistoryBlock(body, language, loc, triageAssessmentEntries, {
      entryHeaderKey: "printOutput.erPacket.triageAssessmentEntryHeader",
      entryLatestHeaderKey: "printOutput.erPacket.triageAssessmentEntryLatestHeader",
      emptyKey: "printOutput.erPacket.triageAssessmentEntryEmpty",
    });
  }

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

  appendProviderDischargeDocumentationPrint(body, language, encounter.dischargeSummaryJson, patient.dob, {
    nursingAssessment: encounter.nursingAssessment,
    dischargeSummaryJson: encounter.dischargeSummaryJson,
    medicationOrderRows: medicationOrderRows ?? undefined,
    marEventRows: marEventRows ?? undefined,
  });

  body.push(h2(language, "printOutput.erPacket.sectionEmtalaSummary"));
  appendEmtalaBlock(body, language, loc, emtalaDerived);

  body.push(h2(language, "printOutput.erPacket.sectionHandoff"));
  appendHandoffBlock(body, language, loc, handoff);

  if (Array.isArray(dischargeSummaryEntries) && dischargeSummaryEntries.length > 0) {
    body.push(h2(language, "printOutput.erPacket.sectionDischargeSummaryHistory"));
    appendDocumentationHistoryBlock(body, language, loc, dischargeSummaryEntries, {
      entryHeaderKey: "printOutput.erPacket.dischargeSummaryEntryHeader",
      entryLatestHeaderKey: "printOutput.erPacket.dischargeSummaryEntryLatestHeader",
      emptyKey: "printOutput.erPacket.dischargeSummaryEntryEmpty",
    });
  }

  if (Array.isArray(admissionSummaryEntries) && admissionSummaryEntries.length > 0) {
    body.push(h2(language, "printOutput.erPacket.sectionAdmissionSummaryHistory"));
    appendDocumentationHistoryBlock(body, language, loc, admissionSummaryEntries, {
      entryHeaderKey: "printOutput.erPacket.admissionSummaryEntryHeader",
      entryLatestHeaderKey: "printOutput.erPacket.admissionSummaryEntryLatestHeader",
      emptyKey: "printOutput.erPacket.admissionSummaryEntryEmpty",
    });
  }

  if (Array.isArray(dispositionSupplementEntries) && dispositionSupplementEntries.length > 0) {
    body.push(h2(language, "printOutput.erPacket.sectionDispositionSupplementHistory"));
    appendDocumentationHistoryBlock(body, language, loc, dispositionSupplementEntries, {
      entryHeaderKey: "printOutput.erPacket.dispositionSupplementEntryHeader",
      entryLatestHeaderKey: "printOutput.erPacket.dispositionSupplementEntryLatestHeader",
      emptyKey: "printOutput.erPacket.dispositionSupplementEntryEmpty",
    });
  }

  if (Array.isArray(providerMseEntries) && providerMseEntries.length > 0) {
    body.push(h2(language, "printOutput.erPacket.sectionProviderMseHistory"));
    appendDocumentationHistoryBlock(body, language, loc, providerMseEntries, {
      entryHeaderKey: "printOutput.erPacket.providerMseEntryHeader",
      entryLatestHeaderKey: "printOutput.erPacket.providerMseEntryLatestHeader",
      emptyKey: "printOutput.erPacket.providerMseEntryEmpty",
    });
  }

  if (Array.isArray(handoffEntries) && handoffEntries.length > 0) {
    body.push(h2(language, "printOutput.erPacket.sectionHandoffHistory"));
    appendDocumentationHistoryBlock(body, language, loc, handoffEntries, {
      entryHeaderKey: "printOutput.erPacket.handoffHistoryEntryHeader",
      entryLatestHeaderKey: "printOutput.erPacket.handoffHistoryEntryLatestHeader",
      emptyKey: "printOutput.erPacket.handoffHistoryEntryEmpty",
    });
  }

  /**
   * Initial nursing assessment (`nursingEvalV1`) — shown once, before reassessment history.
   */
  if (initialNursingAssessment && initialNursingAssessment.sections.length > 0) {
    body.push(h2(language, "printOutput.erPacket.sectionInitialNursingAssessment"));
    appendInitialNursingAssessmentBlock(body, language, initialNursingAssessment);
  }

  /**
   * Reassessment history — only when caller pre-fetched and passed entries. Compact one block
   * per persisted column with time, author, structured one-liners, and a narrative excerpt.
   */
  if (Array.isArray(nursingReassessmentEntries) && nursingReassessmentEntries.length > 0) {
    body.push(h2(language, "printOutput.erPacket.sectionNursingReassessmentHistory"));
    appendNursingReassessmentHistoryBlock(body, language, loc, nursingReassessmentEntries);
  }

  if (nursingDischargeDocumentation) {
    body.push(h2(language, "printOutput.erPacket.sectionNursingDischargeDocumentation"));
    appendNursingDischargeDocumentationBlock(body, language, nursingDischargeDocumentation, encounter.nursingAssessment);
  }

  if (Array.isArray(medicationOrderRows) && medicationOrderRows.length > 0) {
    body.push(h2(language, "printOutput.erPacket.sectionMedicationOrders"));
    medicationOrderRows.forEach((row) => {
      const lifecycleLine =
        row.lifecycleSummaryLine != null && row.lifecycleSummaryLine.trim()
          ? `<br/>${esc(row.lifecycleSummaryLine)}`
          : "";
      body.push(
        `<p style="margin: 8px 0; font-size: 13px; line-height: 1.45;"><strong>${esc(row.medicationName)}</strong><br/>${esc(
          printT(language, "printOutput.erPacket.medOrderLine")
            .replace("{dose}", row.dose)
            .replace("{route}", row.route)
            .replace("{instructions}", row.instructions)
            .replace("{orderedBy}", row.orderedBy)
            .replace("{orderedAt}", row.orderedAt)
            .replace("{status}", row.status)
        )}${lifecycleLine}</p>`
      );
    });
  }

  if (Array.isArray(marEventRows) && marEventRows.length > 0) {
    body.push(h2(language, "printOutput.erPacket.sectionMarEvents"));
    marEventRows.forEach((row) => {
      const baseLine = printT(language, "printOutput.erPacket.marEventLine")
        .replace("{action}", row.action)
        .replace("{dose}", row.dose)
        .replace("{route}", row.route)
        .replace("{administeredBy}", row.administeredBy)
        .replace("{administeredAt}", row.administeredAt);
      const injection =
        row.injectionSite !== "—"
          ? ` · ${printT(language, "printOutput.erPacket.marInjectionSite")}: ${row.injectionSite}`
          : "";
      const notes =
        row.notes !== "—"
          ? `<br/>${esc(printT(language, "printOutput.erPacket.marNotes"))}: ${esc(row.notes)}`
          : "";
      body.push(
        `<p style="margin: 8px 0; font-size: 13px; line-height: 1.45;"><strong>${esc(row.medicationName)}</strong><br/>${esc(
          baseLine
        )}${esc(injection)}${notes}</p>`
      );
    });
  }

  if (continuousInfusionSectionHtml?.trim()) {
    body.push(h2(language, "printOutput.erPacket.sectionContinuousInfusions"));
    body.push(continuousInfusionSectionHtml);
  }

  if (Array.isArray(procedureSummaries) && procedureSummaries.length > 0) {
    body.push(h2(language, "printOutput.erPacket.sectionProcedures"));
    procedureSummaries.forEach((summary) => {
      body.push(`<p style="margin: 8px 0; font-size: 13px; line-height: 1.45;">${esc(summary)}</p>`);
    });
  }

  if (providerDocumentationSection && providerDocumentationSection.sections.length > 0) {
    body.push(h2(language, "printOutput.erPacket.sectionProviderDocumentation"));
    appendProviderDocumentationBlock(body, language, providerDocumentationSection);
  }

  appendClinicalDocumentationEntriesBlock(body, language, loc, clinicalDocumentationEntries);

  if (Array.isArray(clinicalTimelineEntries) && clinicalTimelineEntries.length > 0) {
    body.push(h2(language, "printOutput.erPacket.sectionClinicalTimeline"));
    appendClinicalTimelineBlock(body, language, clinicalTimelineEntries);
  }

  body.push(h2(language, "printOutput.erPacket.sectionSignatures"));
  appendSignatureBlock(body, language, loc, encounter, emtalaDerived, disSig);

  const footer = esc(printT(language, "printOutput.common.documentFooter").replace("{date}", printDate));
  body.push(`<p style="margin-top: 20px; font-size: 11px;">${footer}</p>`);

  const htmlLang = language === "en" ? "en" : "fr";
  const titleKey =
    outcome === "ADMISSION"
      ? "printOutput.erPacket.htmlTitleAdmission"
      : outcome === "TRANSFER"
        ? "printOutput.erPacket.htmlTitleTransfer"
        : "printOutput.erPacket.htmlTitleErPacket";

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

/**
 * Compact print rendering of the append-only nursing reassessment history. One block per
 * entry. The latest entry (first in the input array — the API returns newest-first) is tagged
 * "Actuel" so the printed record visually distinguishes the most recent column from prior
 * preserved columns. Each block displays:
 *   - Time/date (clinical `documentedAt` if present, falling back to server `savedAt`).
 *   - Performer footer: initials, full display name, role/title.
 *   - Up to a small bounded set of structured one-liners (already truncated by the caller).
 *   - Narrative excerpt when present.
 *
 * We deliberately do NOT re-truncate or re-format here — the upstream caller (Summary model)
 * has already capped each line to the print-friendly budget, and re-trimming would risk
 * cutting words mid-stride twice. Formatting stays plain HTML/CSS-friendly so the existing
 * single-document print stylesheet applies without changes.
 */
function appendNursingReassessmentHistoryBlock(
  body: string[],
  language: SupportedLanguage,
  loc: string,
  entries: ErPrintReassessmentEntry[]
): void {
  entries.forEach((entry, idx) => {
    const isLatest = idx === 0;
    const whenIso = entry.documentedAt?.trim() || entry.savedAt;
    const when = fmtIso(whenIso, loc) || "—";
    const author = entry.performerDisplayName?.trim() || "—";
    const initials = entry.performerInitials?.trim();
    const role = entry.performerRoleTitle?.trim();
    const initialsBadge = initials ? `[${esc(initials)}] ` : "";
    const roleSuffix = role ? ` — ${esc(role)}` : "";
    const headerKey = isLatest
      ? "printOutput.erPacket.nursingReassessmentEntryLatestHeader"
      : "printOutput.erPacket.nursingReassessmentEntryHeader";
    const heading = printT(language, headerKey)
      .replace("{datetime}", when)
      .replace("{author}", `${initialsBadge}${esc(author)}${roleSuffix}`);
    body.push(
      `<p style="margin: 12px 0 4px 0; font-size: 13px; font-weight: 700;">${heading}</p>`
    );
    if (entry.structuredLines.length > 0) {
      const items = entry.structuredLines
        .map((ln) => `<li style="margin: 2px 0;">${esc(ln)}</li>`)
        .join("");
      body.push(
        `<ul style="margin: 4px 0 4px 18px; padding: 0; font-size: 13px; line-height: 1.45;">${items}</ul>`
      );
    }
    const narrative = entry.narrativeExcerpt?.trim();
    if (narrative) {
      body.push(
        `<p style="margin: 4px 0; font-size: 13px; line-height: 1.45; font-style: italic;">${esc(
          narrative
        )}</p>`
      );
    }
    if (entry.structuredLines.length === 0 && !narrative) {
      body.push(
        `<p style="margin: 4px 0; font-size: 13px; color: #444;">${esc(
          printT(language, "printOutput.erPacket.nursingReassessmentEntryEmpty")
        )}</p>`
      );
    }
  });
}

function appendDocumentationHistoryBlock(
  body: string[],
  language: SupportedLanguage,
  loc: string,
  entries: ErPrintDocumentationHistoryEntry[],
  keys: { entryHeaderKey: string; entryLatestHeaderKey: string; emptyKey: string }
): void {
  entries.forEach((entry, idx) => {
    const isLatest = idx === 0;
    const whenIso = entry.documentedAt?.trim() || entry.savedAt;
    const when = fmtIso(whenIso, loc) || "—";
    const author = entry.performerDisplayName?.trim() || "—";
    const initials = entry.performerInitials?.trim();
    const role = entry.performerRoleTitle?.trim();
    const initialsBadge = initials ? `[${esc(initials)}] ` : "";
    const roleSuffix = role ? ` — ${esc(role)}` : "";
    const heading = printT(language, isLatest ? keys.entryLatestHeaderKey : keys.entryHeaderKey)
      .replace("{datetime}", when)
      .replace("{author}", `${initialsBadge}${esc(author)}${roleSuffix}`);
    body.push(`<p style="margin: 12px 0 4px 0; font-size: 13px; font-weight: 700;">${heading}</p>`);
    if (entry.structuredLines.length > 0) {
      const items = entry.structuredLines
        .map((ln) => `<li style="margin: 2px 0;">${esc(ln)}</li>`)
        .join("");
      body.push(
        `<ul style="margin: 4px 0 4px 18px; padding: 0; font-size: 13px; line-height: 1.45;">${items}</ul>`
      );
    }
    const narrative = entry.narrativeExcerpt?.trim();
    if (narrative) {
      body.push(
        `<p style="margin: 4px 0; font-size: 13px; line-height: 1.45; font-style: italic;">${esc(
          narrative
        )}</p>`
      );
    }
    if (entry.structuredLines.length === 0 && !narrative) {
      body.push(`<p style="margin: 4px 0; font-size: 13px; color: #444;">${esc(printT(language, keys.emptyKey))}</p>`);
    }
  });
}

function appendProviderDocumentationBlock(
  body: string[],
  language: SupportedLanguage,
  section: ErPrintProviderDocumentationSection
): void {
  body.push(
    `<p style="margin: 6px 0; font-size: 13px; line-height: 1.45;"><strong>${esc(
      printT(language, "printOutput.erPacket.providerDocumentationStatus")
    )}</strong> ${esc(section.statusLine)}</p>`
  );
  if (section.signedLine) {
    body.push(`<p style="margin: 6px 0; font-size: 13px; line-height: 1.45;">${esc(section.signedLine)}</p>`);
  } else if (section.savedLine) {
    body.push(`<p style="margin: 6px 0; font-size: 13px; line-height: 1.45;">${esc(section.savedLine)}</p>`);
  }
  section.sections.forEach((sec) => {
    body.push(`<p style="margin: 10px 0 4px 0; font-size: 13px; font-weight: 700;">${esc(sec.label)}</p>`);
    body.push(`<p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.45; white-space: pre-wrap;">${esc(sec.text)}</p>`);
  });
  section.addenda.forEach((add) => {
    body.push(
      `<p style="margin: 8px 0; font-size: 13px; line-height: 1.45; font-style: italic;">${esc(
        `${add.by} — ${add.at}: ${add.text}`
      )}</p>`
    );
  });
}

function appendClinicalTimelineBlock(
  body: string[],
  language: SupportedLanguage,
  entries: EdClinicalTimelineEntry[]
): void {
  let lastUndated = false;
  for (const entry of entries) {
    if (entry.isUndated && !lastUndated) {
      body.push(
        `<p style="margin: 12px 0 6px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #444;">${esc(
          printT(language, "printOutput.erPacket.clinicalTimelineUndatedHeader")
        )}</p>`
      );
      lastUndated = true;
    }
    const actor = entry.actorDisplay ? ` — ${entry.actorDisplay}` : "";
    const time = entry.displayTime ?? "—";
    body.push(
      `<p style="margin: 6px 0 2px 0; font-size: 13px; line-height: 1.45;"><strong>${esc(
        time
      )} — ${esc(entry.categoryLabel)}</strong>${esc(actor)}</p>`
    );
    body.push(`<p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.45; color: #333;">${esc(entry.summary)}</p>`);
  }
}

function appendInitialNursingAssessmentBlock(
  body: string[],
  language: SupportedLanguage,
  section: ErPrintInitialNursingSection
): void {
  const author = section.roleTitle
    ? `${section.documentedBy} (${section.roleTitle})`
    : section.documentedBy;
  body.push(
    line(
      printT(language, "printOutput.erPacket.initialNursingDocumentedBy"),
      `${author} — ${section.documentedAt}`
    )
  );
  section.sections.forEach((sec) => {
    body.push(`<p style="margin: 10px 0 4px 0; font-size: 13px; font-weight: 700;">${esc(sec.label)}</p>`);
    body.push(`<p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.45; white-space: pre-wrap;">${esc(sec.text)}</p>`);
  });
}

function appendNursingDischargeDocumentationBlock(
  body: string[],
  language: SupportedLanguage,
  section: ErPrintNursingDischargeSection,
  nursingAssessment?: unknown
): void {
  body.push(
    line(
      printT(language, "printOutput.erPacket.nursingDischargeDocumentedBy"),
      `${section.documentedBy} — ${section.documentedAt}`
    )
  );
  const exec = nursingAssessment ? readNursingDischargeExecutionStored(nursingAssessment) : null;
  if (exec?.nursingDestination) {
    body.push(
      line(
        i18nMessage(language, "providerDischargeDocumentation19Y.nursingDestinationLabel"),
        i18nMessage(language, `providerDischargeDocumentation19Y.nursingDestination.${exec.nursingDestination}`)
      )
    );
  }
  if (exec?.nursingConditionAtDischarge) {
    body.push(
      line(
        i18nMessage(language, "providerDischargeDocumentation19Y.nursingConditionLabel"),
        i18nMessage(language, `providerDischargeDocumentation19Y.nursingCondition.${exec.nursingConditionAtDischarge}`)
      )
    );
  }
  if (exec?.nursingTeachingReviewed?.length) {
    for (const item of exec.nursingTeachingReviewed) {
      body.push(`<p style="margin: 0 0 4px 0; font-size: 13px;">• ${esc(i18nMessage(language, `providerDischargeDocumentation19Y.nursingTeaching.${item}`))}</p>`);
    }
  }
  if (section.executionNote) {
    body.push(
      line(printT(language, "printOutput.erPacket.executionNote"), section.executionNote)
    );
  }
}

function appendSignatureBlock(
  body: string[],
  language: SupportedLanguage,
  loc: string,
  encounter: ErPrintEncounter,
  emtala: ErEmtalaV1Stored | null,
  disSig: ReturnType<typeof readDispositionSignatureFromEncounter>
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

export function printErPacket(params: Parameters<typeof getErPrintPacketHtml>[0]): void {
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
