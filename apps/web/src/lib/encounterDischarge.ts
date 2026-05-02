/**
 * Dossier de sortie — champs alignés sur encounterDischargeFieldsSchema (@medora/shared)
 * et parseDischargeSummaryForChart (patientChartHelpers).
 */

import {
  parseDischargeSummaryForChart,
  PATIENT_DISCHARGE_INSTRUCTION_STRING_KEYS,
} from "@/components/patient-chart/patientChartHelpers";

export type DischargeFormState = {
  disposition: string;
  exitCondition: string;
  dischargeInstructions: string;
  medicationsGiven: string;
  followUp: string;
  returnIfWorse: string;
  patientDestination: string;
  dischargeMode: string;
  dischargeDiagnosisSummary: string;
  medicationInstructions: string;
  returnPrecautions: string;
  followUpInstructions: string;
  activityInstructions: string;
  woundCareInstructions: string;
  workSchoolNote: string;
  patientInstructionsGiven: boolean;
  instructionsGivenBy: string;
  instructionsGivenAt: string;
};

export const DISCHARGE_NURSING_KEYS = new Set([
  "exitCondition",
  "patientDestination",
  "dischargeMode",
  "returnIfWorse",
]);

export const DISCHARGE_MEDICAL_KEYS = new Set([
  "disposition",
  "dischargeInstructions",
  "medicationsGiven",
  "followUp",
]);

/** Libellés pour liste « mode de sortie » (valeur = libellé affiché et stocké). */
export const DISCHARGE_MODE_OPTIONS_FR: readonly string[] = [
  "Domicile",
  "Transfert vers un autre établissement",
  "Admission / hospitalisation",
  "Contre avis médical (LAMA)",
  "Décès",
  "Autre",
];

/**
 * Mappe le libellé « mode de sortie » (DISCHARGE_MODE_OPTIONS_FR) vers Prisma DischargeStatus.
 * Valeurs non mappées explicitement → undefined (ne pas envoyer dischargeStatus).
 */
export function dischargeModeFrToDischargeStatus(
  dischargeMode: string | undefined
): "DISCHARGED" | "AMA" | "TRANSFERRED" | "DECEASED" | undefined {
  const m = dischargeMode?.trim();
  if (!m) return undefined;
  if (m === "Domicile") return "DISCHARGED";
  if (m === "Transfert vers un autre établissement") return "TRANSFERRED";
  if (m === "Contre avis médical (LAMA)") return "AMA";
  if (m === "Décès") return "DECEASED";
  return undefined;
}

export function emptyDischargeForm(): DischargeFormState {
  return {
    disposition: "",
    exitCondition: "",
    dischargeInstructions: "",
    medicationsGiven: "",
    followUp: "",
    returnIfWorse: "",
    patientDestination: "",
    dischargeMode: "",
    dischargeDiagnosisSummary: "",
    medicationInstructions: "",
    returnPrecautions: "",
    followUpInstructions: "",
    activityInstructions: "",
    woundCareInstructions: "",
    workSchoolNote: "",
    patientInstructionsGiven: false,
    instructionsGivenBy: "",
    instructionsGivenAt: "",
  };
}

export function hydrateDischargeFormFromEncounterJson(raw: unknown): DischargeFormState {
  const p = parseDischargeSummaryForChart(raw);
  const e = emptyDischargeForm();
  if (!p) return e;
  return {
    disposition: p.disposition ?? "",
    exitCondition: p.exitCondition ?? "",
    dischargeInstructions: p.dischargeInstructions ?? "",
    medicationsGiven: p.medicationsGiven ?? "",
    followUp: p.followUp ?? "",
    returnIfWorse: p.returnIfWorse ?? "",
    patientDestination: p.patientDestination ?? "",
    dischargeMode: p.dischargeMode ?? "",
    dischargeDiagnosisSummary: p.dischargeDiagnosisSummary ?? "",
    medicationInstructions: p.medicationInstructions ?? "",
    returnPrecautions: p.returnPrecautions ?? "",
    followUpInstructions: p.followUpInstructions ?? "",
    activityInstructions: p.activityInstructions ?? "",
    woundCareInstructions: p.woundCareInstructions ?? "",
    workSchoolNote: p.workSchoolNote ?? "",
    patientInstructionsGiven: p.patientInstructionsGiven === true,
    instructionsGivenBy: p.instructionsGivenBy ?? "",
    instructionsGivenAt: p.instructionsGivenAt ?? "",
  };
}

/**
 * Fusionne le brouillon serveur avec le formulaire selon les droits (infirmier vs médical).
 * Retourne `null` si aucun champ structuré n’est conservé.
 */
export function mergeDischargeForSave(
  encounterJson: unknown,
  form: DischargeFormState,
  canEditNursing: boolean,
  canEditMedical: boolean
): Record<string, unknown> | null {
  const parsed = parseDischargeSummaryForChart(encounterJson);
  const out: Record<string, unknown> = parsed ? { ...(parsed as Record<string, unknown>) } : {};

  const apply = (keys: Set<string>, canEdit: boolean) => {
    if (!canEdit) return;
    const formRec = form as unknown as Record<string, unknown>;
    for (const k of keys) {
      const raw = formRec[k];
      const v = typeof raw === "string" ? raw.trim() : "";
      if (v) out[k] = v;
      else delete out[k];
    }
  };

  apply(DISCHARGE_NURSING_KEYS, canEditNursing);
  apply(DISCHARGE_MEDICAL_KEYS, canEditMedical);

  const canDocPatientInstructions = canEditNursing || canEditMedical;
  if (canDocPatientInstructions) {
    const formRec = form as unknown as Record<string, unknown>;
    for (const k of PATIENT_DISCHARGE_INSTRUCTION_STRING_KEYS) {
      const raw = formRec[k];
      const v = typeof raw === "string" ? raw.trim() : "";
      if (v) out[k] = v;
      else delete out[k];
    }
    for (const k of ["instructionsGivenBy", "instructionsGivenAt"] as const) {
      const raw = formRec[k];
      const v = typeof raw === "string" ? raw.trim() : "";
      if (v) out[k] = v;
      else delete out[k];
    }
    if (form.patientInstructionsGiven) {
      out.patientInstructionsGiven = true;
    } else {
      delete out.patientInstructionsGiven;
      delete out.instructionsGivenBy;
      delete out.instructionsGivenAt;
    }
  }

  return Object.keys(out).length ? out : null;
}

/** S16A — sous-ensemble éditable dans la carte « instructions patient » (résumé / clôture). */
export type PatientDischargeInstructionsSlice = Pick<
  DischargeFormState,
  | "dischargeDiagnosisSummary"
  | "medicationInstructions"
  | "returnPrecautions"
  | "followUpInstructions"
  | "activityInstructions"
  | "woundCareInstructions"
  | "workSchoolNote"
  | "patientInstructionsGiven"
  | "instructionsGivenBy"
  | "instructionsGivenAt"
>;

export function hydratePatientDischargeInstructionsSlice(raw: unknown): PatientDischargeInstructionsSlice {
  const f = hydrateDischargeFormFromEncounterJson(raw);
  return {
    dischargeDiagnosisSummary: f.dischargeDiagnosisSummary,
    medicationInstructions: f.medicationInstructions,
    returnPrecautions: f.returnPrecautions,
    followUpInstructions: f.followUpInstructions,
    activityInstructions: f.activityInstructions,
    woundCareInstructions: f.woundCareInstructions,
    workSchoolNote: f.workSchoolNote,
    patientInstructionsGiven: f.patientInstructionsGiven,
    instructionsGivenBy: f.instructionsGivenBy,
    instructionsGivenAt: f.instructionsGivenAt,
  };
}
