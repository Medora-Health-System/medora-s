/**
 * Dossier d'admission depuis la consultation — aligné sur `admissionSummaryFieldsSchema` (@medora/shared).
 */

import { parseAdmissionSummaryForChart } from "@/components/patient-chart/patientChartHelpers";

export type AdmissionFormState = {
  admissionReason: string;
  serviceUnit: string;
  admissionDiagnosis: string;
  careLevel: string;
  conditionAtAdmission: string;
  initialPlan: string;
  responsiblePhysicianName: string;
};

/** Suggestions FR pour le sélecteur « niveau de soins » (valeur = texte stocké). */
export const CARE_LEVEL_OPTIONS_FR: readonly string[] = [
  "Soins généraux (salle)",
  "Soins intensifs",
  "Soins intermédiaires",
  "Observation",
  "Autre",
];

export function emptyAdmissionForm(): AdmissionFormState {
  return {
    admissionReason: "",
    serviceUnit: "",
    admissionDiagnosis: "",
    careLevel: "",
    conditionAtAdmission: "",
    initialPlan: "",
    responsiblePhysicianName: "",
  };
}

export function formatPhysicianName(
  u: { firstName?: string | null; lastName?: string | null } | null | undefined
): string {
  if (!u) return "";
  const s = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return s;
}

export function hydrateAdmissionFormFromEncounterJson(
  raw: unknown,
  defaultPhysicianName?: string
): AdmissionFormState {
  const p = parseAdmissionSummaryForChart(raw);
  const e = emptyAdmissionForm();
  const def = defaultPhysicianName?.trim() ?? "";
  if (!p) {
    return { ...e, responsiblePhysicianName: def };
  }
  return {
    admissionReason: p.admissionReason ?? "",
    serviceUnit: p.serviceUnit ?? "",
    admissionDiagnosis: p.admissionDiagnosis ?? "",
    careLevel: p.careLevel ?? "",
    conditionAtAdmission: p.conditionAtAdmission ?? "",
    initialPlan: p.initialPlan ?? "",
    responsiblePhysicianName: (p.responsiblePhysicianName ?? "").trim() || def,
  };
}

/** Payload pour PATCH — uniquement les champs non vides (validation API : au moins un champ). */
export function admissionFormToPayload(f: AdmissionFormState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(f)) {
    if (typeof v === "string" && v.trim()) {
      out[k] = v.trim();
    }
  }
  return out;
}
