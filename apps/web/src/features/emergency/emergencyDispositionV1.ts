/**
 * ER Disposition V1 — supplemental notes under `Encounter.nursingAssessment.erDispositionV1` (Json).
 * Core disposition fields use existing `dischargeSummaryJson` + `admissionSummaryJson` PATCH (same as dossier).
 * Persists via existing PATCH /encounters/:id. No backend migration.
 */

import type { SupportedLanguage } from "@/i18n/config";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import { mergeDischargeForSave } from "@/lib/encounterDischarge";
import type { DischargeFormState } from "@/lib/encounterDischarge";
import type { AdmissionFormState } from "@/lib/encounterAdmission";

export const ER_DISPOSITION_V1_KEY = "erDispositionV1" as const;

/** Sortie à domicile — exécution infirmière (V1), sibling de `erDispositionV1` sous `nursingAssessment` (Json). */
export const ER_DISPOSITION_EXECUTION_V1_KEY = "erDispositionExecutionV1" as const;

const MAX_EXEC_NOTE = 2000;

export type ErDischargeSortieExecutionStored = {
  dischargeSortieCompletedAt: string;
  dischargeSortieCompletedByDisplayName: string;
  dischargeSortieExecutionNote?: string;
};

export function readDischargeSortieExecutionFromEncounter(
  nursingAssessment: unknown
): ErDischargeSortieExecutionStored | null {
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) return null;
  const raw = (nursingAssessment as Record<string, unknown>)[ER_DISPOSITION_EXECUTION_V1_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const at = (raw as Record<string, unknown>).dischargeSortieCompletedAt;
  const by = (raw as Record<string, unknown>).dischargeSortieCompletedByDisplayName;
  if (typeof at !== "string" || typeof by !== "string") return null;
  const note = (raw as Record<string, unknown>).dischargeSortieExecutionNote;
  const out: ErDischargeSortieExecutionStored = {
    dischargeSortieCompletedAt: at,
    dischargeSortieCompletedByDisplayName: by,
  };
  if (typeof note === "string" && note.trim()) {
    out.dischargeSortieExecutionNote = note.trim().slice(0, MAX_EXEC_NOTE);
  }
  return out;
}

/**
 * Merge exécution sortie infirmière — préserve les autres clés de `nursingAssessment` (erDispositionV1, etc.).
 */
export function mergeDischargeSortieExecutionIntoNursingAssessment(
  previousNursingAssessment: unknown,
  execution: ErDischargeSortieExecutionStored
): Record<string, unknown> {
  const base =
    previousNursingAssessment && typeof previousNursingAssessment === "object" && !Array.isArray(previousNursingAssessment)
      ? { ...(previousNursingAssessment as Record<string, unknown>) }
      : {};
  const note = execution.dischargeSortieExecutionNote?.trim().slice(0, MAX_EXEC_NOTE);
  base[ER_DISPOSITION_EXECUTION_V1_KEY] = {
    dischargeSortieCompletedAt: execution.dischargeSortieCompletedAt,
    dischargeSortieCompletedByDisplayName: execution.dischargeSortieCompletedByDisplayName,
    ...(note ? { dischargeSortieExecutionNote: note } : {}),
  };
  return base;
}

/** UI outcome — maps to `dischargeForm.dischargeMode` (exact strings from DISCHARGE_MODE_OPTIONS_FR). */
export type ErDispositionOutcomeUi =
  | "HOME"
  | "ADMISSION"
  | "TRANSFER"
  | "AMA"
  | "LWBS"
  | "DECEASED"
  | "OTHER";

export type ErDispositionSignature = {
  savedAt: string;
  savedByDisplayName: string;
};

/** ER-only fields not covered by shared discharge/admission DTOs. */
export type ErDispositionSupplementForm = {
  lwbsNarrative: string;
  transferHandoffNote: string;
  amaRisksDiscussed: string;
  deceasedPlaceholderNote: string;
};

export function emptyErDispositionSupplementForm(): ErDispositionSupplementForm {
  return {
    lwbsNarrative: "",
    transferHandoffNote: "",
    amaRisksDiscussed: "",
    deceasedPlaceholderNote: "",
  };
}

export type ErDispositionSupplementStored = {
  lwbsNarrative: string;
  transferHandoffNote: string;
  amaRisksDiscussed: string;
  deceasedPlaceholderNote: string;
  signature?: ErDispositionSignature;
};

const MAX_MED = 4000;
const MAX_LONG = 8000;

function str(v: unknown, max: number): string {
  const s = typeof v === "string" ? v : "";
  return s.trim().slice(0, max);
}

/** Exact labels — must match `DISCHARGE_MODE_OPTIONS_FR` in encounterDischarge.ts */
export const ER_DISCHARGE_MODE_HOME = "Domicile";
export const ER_DISCHARGE_MODE_TRANSFER = "Transfert vers un autre établissement";
export const ER_DISCHARGE_MODE_ADMISSION = "Admission / hospitalisation";
export const ER_DISCHARGE_MODE_AMA = "Contre avis médical (LAMA)";
export const ER_DISCHARGE_MODE_DECEASED = "Décès";
export const ER_DISCHARGE_MODE_OTHER = "Autre";

export function outcomeUiToDischargeMode(outcome: ErDispositionOutcomeUi): string {
  switch (outcome) {
    case "HOME":
      return ER_DISCHARGE_MODE_HOME;
    case "ADMISSION":
      return ER_DISCHARGE_MODE_ADMISSION;
    case "TRANSFER":
      return ER_DISCHARGE_MODE_TRANSFER;
    case "AMA":
      return ER_DISCHARGE_MODE_AMA;
    case "DECEASED":
      return ER_DISCHARGE_MODE_DECEASED;
    case "LWBS":
    case "OTHER":
      return ER_DISCHARGE_MODE_OTHER;
    default:
      return "";
  }
}

export function inferOutcomeUiFromForms(
  dischargeMode: string,
  supplement: ErDispositionSupplementForm
): ErDispositionOutcomeUi {
  const m = dischargeMode.trim();
  if (m === ER_DISCHARGE_MODE_HOME) return "HOME";
  if (m === ER_DISCHARGE_MODE_ADMISSION) return "ADMISSION";
  if (m === ER_DISCHARGE_MODE_TRANSFER) return "TRANSFER";
  if (m === ER_DISCHARGE_MODE_AMA) return "AMA";
  if (m === ER_DISCHARGE_MODE_DECEASED) return "DECEASED";
  if (m === ER_DISCHARGE_MODE_OTHER) {
    if (supplement.lwbsNarrative.trim()) return "LWBS";
    return "OTHER";
  }
  return "HOME";
}

export function erDispositionSupplementFromEncounter(nursingAssessment: unknown): ErDispositionSupplementForm {
  const e = emptyErDispositionSupplementForm();
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) return e;
  const raw = (nursingAssessment as Record<string, unknown>)[ER_DISPOSITION_V1_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return e;
  const o = raw as Record<string, unknown>;
  e.lwbsNarrative = str(o.lwbsNarrative, MAX_LONG);
  e.transferHandoffNote = str(o.transferHandoffNote, MAX_LONG);
  e.amaRisksDiscussed = str(o.amaRisksDiscussed, MAX_MED);
  e.deceasedPlaceholderNote = str(o.deceasedPlaceholderNote, MAX_LONG);
  return e;
}

function supplementToStored(
  form: ErDispositionSupplementForm,
  signature: ErDispositionSignature
): ErDispositionSupplementStored {
  return {
    lwbsNarrative: form.lwbsNarrative.trim().slice(0, MAX_LONG),
    transferHandoffNote: form.transferHandoffNote.trim().slice(0, MAX_LONG),
    amaRisksDiscussed: form.amaRisksDiscussed.trim().slice(0, MAX_MED),
    deceasedPlaceholderNote: form.deceasedPlaceholderNote.trim().slice(0, MAX_LONG),
    signature,
  };
}

export function supplementFormHasContent(form: ErDispositionSupplementForm): boolean {
  return (
    form.lwbsNarrative.trim().length > 0 ||
    form.transferHandoffNote.trim().length > 0 ||
    form.amaRisksDiscussed.trim().length > 0 ||
    form.deceasedPlaceholderNote.trim().length > 0
  );
}

/**
 * Merge ER disposition supplement + signature into nursingAssessment.
 * Preserves erProviderMseV1, erNursingReassessmentV1, etc.
 * Always persists `erDispositionV1` (including `signature`) on each disposition save so horodatage / auteur
 * restent traçables même sans champs « précisions urgence » (LWBS, transfert, etc.).
 */
export function mergeErDispositionV1IntoNursingAssessment(
  previousNursingAssessment: unknown,
  form: ErDispositionSupplementForm,
  signature: ErDispositionSignature
): Record<string, unknown> {
  const base =
    previousNursingAssessment && typeof previousNursingAssessment === "object" && !Array.isArray(previousNursingAssessment)
      ? { ...(previousNursingAssessment as Record<string, unknown>) }
      : {};
  base[ER_DISPOSITION_V1_KEY] = supplementToStored(form, signature);
  return base;
}

export type ErDispositionPreviewSection = { id: string; title: string; lines: string[] };

export type ErDispositionPreviewModel = {
  sections: ErDispositionPreviewSection[];
  headline: string;
};

/** Localized labels for the rule-based disposition preview (defaults = French product copy). */
export type ErDispositionPreviewLabels = {
  dischargeModeLinePrefix: string;
  sectionDecisionShared: string;
  sectionDischargeFields: string;
  lineDispositionSummary: string;
  lineExitCondition: string;
  lineInstructions: string;
  lineMedicationsGiven: string;
  lineFollowUp: string;
  lineReturnIfWorse: string;
  linePatientDestination: string;
  sectionAdmission: string;
  lineAdmissionReason: string;
  lineServiceUnit: string;
  lineAdmissionDiagnosis: string;
  lineCareLevel: string;
  lineConditionAdmission: string;
  lineInitialPlan: string;
  lineResponsiblePhysician: string;
  sectionErExtra: string;
  lineTransferNote: string;
  lineAmaRisks: string;
  lineLwbsDetail: string;
  lineDeceasedNote: string;
  sectionEmptyTitle: string;
  sectionEmptyLine: string;
  headlinePrefix: string;
};

export function dispositionPreviewLabelsFromLocale(locale: SupportedLanguage): ErDispositionPreviewLabels {
  const p = (key: keyof ErDispositionPreviewLabels) =>
    i18nMessage(locale, `emergencyDisposition.preview.${String(key)}`);
  return {
    dischargeModeLinePrefix: p("dischargeModeLinePrefix"),
    sectionDecisionShared: p("sectionDecisionShared"),
    sectionDischargeFields: p("sectionDischargeFields"),
    lineDispositionSummary: p("lineDispositionSummary"),
    lineExitCondition: p("lineExitCondition"),
    lineInstructions: p("lineInstructions"),
    lineMedicationsGiven: p("lineMedicationsGiven"),
    lineFollowUp: p("lineFollowUp"),
    lineReturnIfWorse: p("lineReturnIfWorse"),
    linePatientDestination: p("linePatientDestination"),
    sectionAdmission: p("sectionAdmission"),
    lineAdmissionReason: p("lineAdmissionReason"),
    lineServiceUnit: p("lineServiceUnit"),
    lineAdmissionDiagnosis: p("lineAdmissionDiagnosis"),
    lineCareLevel: p("lineCareLevel"),
    lineConditionAdmission: p("lineConditionAdmission"),
    lineInitialPlan: p("lineInitialPlan"),
    lineResponsiblePhysician: p("lineResponsiblePhysician"),
    sectionErExtra: p("sectionErExtra"),
    lineTransferNote: p("lineTransferNote"),
    lineAmaRisks: p("lineAmaRisks"),
    lineLwbsDetail: p("lineLwbsDetail"),
    lineDeceasedNote: p("lineDeceasedNote"),
    sectionEmptyTitle: p("sectionEmptyTitle"),
    sectionEmptyLine: p("sectionEmptyLine"),
    headlinePrefix: p("headlinePrefix"),
  };
}

function pushLine(lines: string[], label: string, value: string) {
  const v = value.trim();
  if (v) lines.push(`${label} : ${v.length > 500 ? `${v.slice(0, 500)}…` : v}`);
}

/** Rule-based preview — fields only, no inference. */
export function buildErDispositionPreviewModel(
  discharge: DischargeFormState,
  admission: AdmissionFormState,
  supplement: ErDispositionSupplementForm,
  outcome: ErDispositionOutcomeUi,
  labels: ErDispositionPreviewLabels
): ErDispositionPreviewModel {
  const sections: ErDispositionPreviewSection[] = [];

  const modeLine: string[] = [];
  if (discharge.dischargeMode.trim()) {
    modeLine.push(`${labels.dischargeModeLinePrefix} ${discharge.dischargeMode.trim()}`);
  }
  if (modeLine.length) sections.push({ id: "mode", title: labels.sectionDecisionShared, lines: modeLine });

  const disc: string[] = [];
  pushLine(disc, labels.lineDispositionSummary, discharge.disposition);
  pushLine(disc, labels.lineExitCondition, discharge.exitCondition);
  pushLine(disc, labels.lineInstructions, discharge.dischargeInstructions);
  pushLine(disc, labels.lineMedicationsGiven, discharge.medicationsGiven);
  pushLine(disc, labels.lineFollowUp, discharge.followUp);
  pushLine(disc, labels.lineReturnIfWorse, discharge.returnIfWorse);
  pushLine(disc, labels.linePatientDestination, discharge.patientDestination);
  if (disc.length) sections.push({ id: "discharge", title: labels.sectionDischargeFields, lines: disc });

  if (outcome === "ADMISSION" || admission.admissionReason.trim()) {
    const adm: string[] = [];
    pushLine(adm, labels.lineAdmissionReason, admission.admissionReason);
    pushLine(adm, labels.lineServiceUnit, admission.serviceUnit);
    pushLine(adm, labels.lineAdmissionDiagnosis, admission.admissionDiagnosis);
    pushLine(adm, labels.lineCareLevel, admission.careLevel);
    pushLine(adm, labels.lineConditionAdmission, admission.conditionAtAdmission);
    pushLine(adm, labels.lineInitialPlan, admission.initialPlan);
    pushLine(adm, labels.lineResponsiblePhysician, admission.responsiblePhysicianName);
    if (adm.length) sections.push({ id: "admission", title: labels.sectionAdmission, lines: adm });
  }

  const sup: string[] = [];
  pushLine(sup, labels.lineTransferNote, supplement.transferHandoffNote);
  pushLine(sup, labels.lineAmaRisks, supplement.amaRisksDiscussed);
  pushLine(sup, labels.lineLwbsDetail, supplement.lwbsNarrative);
  pushLine(sup, labels.lineDeceasedNote, supplement.deceasedPlaceholderNote);
  if (sup.length) sections.push({ id: "erExtra", title: labels.sectionErExtra, lines: sup });

  const headlineParts: string[] = [];
  const om = discharge.dischargeMode.trim();
  if (om) headlineParts.push(om);
  const cc = discharge.disposition.trim();
  if (cc) headlineParts.push(cc.length > 80 ? `${cc.slice(0, 80)}…` : cc);

  const headline =
    headlineParts.length > 0 ? `${labels.headlinePrefix} ${headlineParts.join(" · ")}` : "";

  if (sections.length === 0 && !headline) {
    return {
      sections: [{ id: "empty", title: labels.sectionEmptyTitle, lines: [labels.sectionEmptyLine] }],
      headline: "",
    };
  }

  return { sections, headline };
}

export function readDispositionSignatureFromEncounter(nursingAssessment: unknown): ErDispositionSignature | null {
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) return null;
  const raw = (nursingAssessment as Record<string, unknown>)[ER_DISPOSITION_V1_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const s = (raw as Record<string, unknown>).signature;
  if (!s || typeof s !== "object") return null;
  const at = (s as { savedAt?: unknown }).savedAt;
  const by = (s as { savedByDisplayName?: unknown }).savedByDisplayName;
  if (typeof at !== "string" || typeof by !== "string") return null;
  return { savedAt: at, savedByDisplayName: by };
}

/**
 * Merge discharge JSON for PATCH: starts from `mergeDischargeForSave` (role-based field apply),
 * then ensures `dischargeMode` is persisted when a médecin sets the ER outcome radio but does not
 * have nursing keys in the merge (dischargeMode is normally a nursing key in mergeDischargeForSave).
 */
export function mergeErDischargeForEncounterPatch(
  encounterDischargeJson: unknown,
  form: DischargeFormState,
  canEditNursing: boolean,
  canEditMedical: boolean
): Record<string, string> | null {
  const fromRoles = mergeDischargeForSave(encounterDischargeJson, form, canEditNursing, canEditMedical);
  const out: Record<string, string> = fromRoles != null ? { ...fromRoles } : {};
  if (canEditMedical && form.dischargeMode.trim()) {
    out.dischargeMode = form.dischargeMode.trim();
  }
  return Object.keys(out).length ? out : null;
}
