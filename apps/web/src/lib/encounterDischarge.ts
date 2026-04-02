/**
 * Dossier de sortie — champs alignés sur encounterDischargeFieldsSchema (@medora/shared)
 * et parseDischargeSummaryForChart (patientChartHelpers).
 */

import { parseDischargeSummaryForChart } from "@/components/patient-chart/patientChartHelpers";

export type DischargeFormState = {
  disposition: string;
  exitCondition: string;
  dischargeInstructions: string;
  medicationsGiven: string;
  followUp: string;
  returnIfWorse: string;
  patientDestination: string;
  dischargeMode: string;
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
): Record<string, string> | null {
  const base = parseDischargeSummaryForChart(encounterJson) ?? {};
  const out: Record<string, string> = { ...(base as Record<string, string>) };

  const apply = (keys: Set<string>, canEdit: boolean) => {
    if (!canEdit) return;
    for (const k of keys) {
      const v = (form as Record<string, string>)[k]?.trim() ?? "";
      if (v) out[k] = v;
      else delete out[k];
    }
  };

  apply(DISCHARGE_NURSING_KEYS, canEditNursing);
  apply(DISCHARGE_MEDICAL_KEYS, canEditMedical);

  return Object.keys(out).length ? out : null;
}
