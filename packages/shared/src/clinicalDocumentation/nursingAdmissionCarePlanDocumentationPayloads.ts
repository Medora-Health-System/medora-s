import { z } from "zod";
import type { ClinicalDocumentationFieldOption } from "./clinicalDocumentationFieldOptions.js";
import {
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
  clinicalDocSummaryKey,
} from "./clinicalDocumentationSummaryLocale.js";

/** EDOC.19 — nursing admission, shift assessment & care plan card IDs. */
export const NURSING_ADMISSION_ASSESSMENT_CARD_ID = "nursing_admission_assessment" as const;
export const NURSING_SHIFT_ASSESSMENT_CARD_ID = "nursing_shift_assessment" as const;
export const HEAD_TO_TOE_ASSESSMENT_CARD_ID = "head_to_toe_assessment" as const;
export const SYSTEMS_ASSESSMENT_CARD_ID = "systems_assessment" as const;
export const NURSING_CARE_PLAN_INITIATION_CARD_ID = "nursing_care_plan_initiation" as const;
export const NURSING_CARE_PLAN_UPDATE_CARD_ID = "nursing_care_plan_update" as const;
export const NURSING_PATIENT_GOALS_OUTCOMES_CARD_ID = "nursing_patient_goals_outcomes" as const;
export const NURSING_PROBLEM_LIST_CARD_ID = "nursing_problem_list" as const;
export const NURSING_HANDOFF_SHIFT_REPORT_CARD_ID = "nursing_handoff_shift_report" as const;
export const NURSING_DISCHARGE_READINESS_REVIEW_CARD_ID = "nursing_discharge_readiness_review" as const;

export const EDOC19_NURSING_ADMISSION_CARE_PLAN_DOCUMENTATION_CARD_IDS = [
  NURSING_ADMISSION_ASSESSMENT_CARD_ID,
  NURSING_SHIFT_ASSESSMENT_CARD_ID,
  HEAD_TO_TOE_ASSESSMENT_CARD_ID,
  SYSTEMS_ASSESSMENT_CARD_ID,
  NURSING_CARE_PLAN_INITIATION_CARD_ID,
  NURSING_CARE_PLAN_UPDATE_CARD_ID,
  NURSING_PATIENT_GOALS_OUTCOMES_CARD_ID,
  NURSING_PROBLEM_LIST_CARD_ID,
  NURSING_HANDOFF_SHIFT_REPORT_CARD_ID,
  NURSING_DISCHARGE_READINESS_REVIEW_CARD_ID,
] as const;

export type Edoc19NursingAdmissionCarePlanDocumentationCardId =
  (typeof EDOC19_NURSING_ADMISSION_CARE_PLAN_DOCUMENTATION_CARD_IDS)[number];

/**
 * Future Phase — EDOC.19A Nursing Care Plan Automation & Interdisciplinary Tasks
 * Do not implement automation now.
 */
export const EDOC_19A_FUTURE_NURSING_CARE_PLAN_AUTOMATION = "EDOC.19A" as const;

export const NURSING_YES_NO_VALUES = ["YES", "NO"] as const;
export const NURSING_YES_NO_UNKNOWN_VALUES = ["YES", "NO", "UNKNOWN"] as const;
export const NURSING_YES_NO_NOT_APPLICABLE_VALUES = ["YES", "NO", "NOT_APPLICABLE"] as const;
export const NURSING_YES_NO_UNABLE_VALUES = ["YES", "NO", "UNABLE"] as const;

export const NURSING_ADMISSION_SOURCE_VALUES = [
  "ED",
  "DIRECT_ADMISSION",
  "TRANSFER",
  "OBSERVATION_CONVERSION",
  "SURGERY",
  "OTHER",
] as const;

export const NURSING_MENTAL_STATUS_VALUES = [
  "ALERT_ORIENTED",
  "CONFUSED",
  "LETHARGIC",
  "UNRESPONSIVE",
  "UNABLE_TO_ASSESS",
] as const;

export const NURSING_BASELINE_MOBILITY_VALUES = [
  "INDEPENDENT",
  "STANDBY_ASSIST",
  "ONE_PERSON_ASSIST",
  "TWO_PERSON_ASSIST",
  "TOTAL_ASSIST",
] as const;

export const NURSING_SHIFT_VALUES = ["DAY", "EVENING", "NIGHT"] as const;

export const NURSING_RESPIRATORY_STATUS_VALUES = [
  "STABLE",
  "OXYGEN_REQUIRED",
  "DISTRESS",
  "VENTILATED",
] as const;

export const NURSING_CARDIAC_STATUS_VALUES = [
  "STABLE",
  "TELEMETRY",
  "CHEST_PAIN",
  "ARRHYTHMIA",
] as const;

export const NURSING_GI_STATUS_VALUES = [
  "NORMAL",
  "NAUSEA_VOMITING",
  "NPO",
  "ABDOMINAL_PAIN",
  "OTHER",
] as const;

export const NURSING_GU_STATUS_VALUES = [
  "NORMAL",
  "FOLEY",
  "INCONTINENT",
  "URINARY_RETENTION",
  "OTHER",
] as const;

export const NURSING_SKIN_STATUS_VALUES = [
  "INTACT",
  "WOUND_PRESENT",
  "PRESSURE_INJURY_RISK",
  "BREAKDOWN_PRESENT",
] as const;

export const NURSING_MOBILITY_STATUS_VALUES = [
  "INDEPENDENT",
  "ASSIST_REQUIRED",
  "BEDBOUND",
  "FALL_RISK",
] as const;

export const NURSING_PAIN_STATUS_VALUES = ["NO_PAIN", "CONTROLLED", "UNCONTROLLED"] as const;

export const NURSING_SAFETY_STATUS_VALUES = [
  "STANDARD",
  "FALL_PRECAUTIONS",
  "SUICIDE_PRECAUTIONS",
  "ELOPEMENT_PRECAUTIONS",
] as const;

export const NURSING_WDL_ASSESSMENT_VALUES = ["WDL", "ABNORMAL", "NOT_ASSESSED"] as const;

export const NURSING_SYSTEM_VALUES = [
  "NEURO",
  "RESPIRATORY",
  "CARDIAC",
  "GI",
  "GU",
  "SKIN",
  "MUSCULOSKELETAL",
  "PSYCHOSOCIAL",
  "PAIN",
  "SAFETY",
  "DEVICE_LINE_TUBE_DRAIN",
  "OTHER",
] as const;

export const NURSING_SYSTEM_STATUS_VALUES = [
  "WDL",
  "ABNORMAL",
  "UNCHANGED",
  "IMPROVED",
  "WORSENED",
] as const;

export const NURSING_PRIMARY_PROBLEM_VALUES = [
  "FALL_RISK",
  "PAIN",
  "IMPAIRED_MOBILITY",
  "IMPAIRED_SKIN_INTEGRITY",
  "INFECTION_RISK",
  "RESPIRATORY_COMPROMISE",
  "CARDIAC_MONITORING",
  "ALTERED_MENTAL_STATUS",
  "BEHAVIORAL_SAFETY",
  "DISCHARGE_PLANNING",
  "OTHER",
] as const;

export const NURSING_CARE_PLAN_GOAL_VALUES = [
  "PAIN_CONTROLLED",
  "NO_FALLS",
  "SKIN_INTACT",
  "INFECTION_PREVENTED",
  "MOBILITY_IMPROVED",
  "RESPIRATORY_STABLE",
  "CARDIAC_STABLE",
  "SAFE_ENVIRONMENT",
  "DISCHARGE_READY",
  "OTHER",
] as const;

export const NURSING_INTERVENTION_VALUES = [
  "SAFETY_PRECAUTIONS",
  "PAIN_REASSESSMENT",
  "TURNING_REPOSITIONING",
  "SKIN_MONITORING",
  "DEVICE_MONITORING",
  "RESPIRATORY_MONITORING",
  "CARDIAC_MONITORING",
  "EDUCATION",
  "CARE_COORDINATION",
  "OTHER",
] as const;

export const NURSING_GOAL_STATUS_VALUES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "MET",
  "NOT_MET",
  "DISCONTINUED",
] as const;

export const NURSING_INTERVENTION_STATUS_VALUES = [
  "CONTINUED",
  "MODIFIED",
  "ADDED",
  "DISCONTINUED",
] as const;

export const NURSING_PATIENT_PROGRESS_VALUES = ["IMPROVED", "UNCHANGED", "WORSENED"] as const;

export const NURSING_GOAL_TYPE_VALUES = [
  "PAIN",
  "MOBILITY",
  "SAFETY",
  "SKIN",
  "RESPIRATORY",
  "CARDIAC",
  "INFECTION",
  "EDUCATION",
  "DISCHARGE",
  "OTHER",
] as const;

export const NURSING_OUTCOME_STATUS_VALUES = [
  "MET",
  "PARTIALLY_MET",
  "NOT_MET",
  "IN_PROGRESS",
] as const;

export const NURSING_PROBLEM_LIST_VALUES = [
  "FALL_RISK",
  "PAIN",
  "MOBILITY_LIMITATION",
  "SKIN_BREAKDOWN",
  "INFECTION_RISK",
  "RESPIRATORY_CONCERN",
  "CARDIAC_CONCERN",
  "BEHAVIORAL_SAFETY",
  "DISCHARGE_BARRIER",
  "OTHER",
] as const;

export const NURSING_PROBLEM_STATUS_VALUES = [
  "ACTIVE",
  "RESOLVED",
  "MONITORING",
  "ESCALATED",
] as const;

export const NURSING_HANDOFF_TYPE_VALUES = [
  "SHIFT_CHANGE",
  "TRANSFER",
  "BREAK_COVERAGE",
  "HIGH_RISK_HANDOFF",
  "DISCHARGE_HANDOFF",
] as const;

export const NURSING_RECEIVING_ROLE_VALUES = [
  "RN",
  "CHARGE_NURSE",
  "ICU_RN",
  "TELEMETRY_RN",
  "ED_RN",
  "OTHER",
] as const;

const optionalNotes = z.string().trim().max(2000).optional();
const requiredShortText = z.string().trim().min(1).max(500);
const optionalShortText = z.string().trim().max(500).optional();
const isoDateTimeString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });

const nursingYesNo = z.enum(NURSING_YES_NO_VALUES);
const nursingYesNoUnknown = z.enum(NURSING_YES_NO_UNKNOWN_VALUES);
const nursingYesNoNotApplicable = z.enum(NURSING_YES_NO_NOT_APPLICABLE_VALUES);
const nursingYesNoUnable = z.enum(NURSING_YES_NO_UNABLE_VALUES);

function enumOptions<T extends string>(
  values: readonly T[],
  labels: Record<T, { en: string; fr: string }>
): ClinicalDocumentationFieldOption<T>[] {
  return values.map((value) => ({
    value,
    labelEn: labels[value].en,
    labelFr: labels[value].fr,
  }));
}

function labelMap<T extends string>(options: ClinicalDocumentationFieldOption<T>[]) {
  return {
    en: Object.fromEntries(options.map((o) => [o.value, o.labelEn])),
    fr: Object.fromEntries(options.map((o) => [o.value, o.labelFr])),
  };
}

export function nursingDocYesNoLabel(
  value: (typeof NURSING_YES_NO_VALUES)[number],
  locale: ClinicalDocumentationSummaryLocale
): string {
  return value === "YES" ? (clinicalDocSummaryKey(locale, "Yes", "Oui")) : clinicalDocSummaryKey(locale, "No", "Non");
}

export const NURSING_YES_NO_OPTIONS = enumOptions(NURSING_YES_NO_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
});

export const NURSING_YES_NO_UNKNOWN_OPTIONS = enumOptions(NURSING_YES_NO_UNKNOWN_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
});

export const NURSING_YES_NO_NOT_APPLICABLE_OPTIONS = enumOptions(NURSING_YES_NO_NOT_APPLICABLE_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
  NOT_APPLICABLE: { en: "Not applicable", fr: "Non applicable" },
});

export const NURSING_YES_NO_UNABLE_OPTIONS = enumOptions(NURSING_YES_NO_UNABLE_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
  UNABLE: { en: "Unable", fr: "Incapable" },
});

export const NURSING_ADMISSION_SOURCE_OPTIONS = enumOptions(NURSING_ADMISSION_SOURCE_VALUES, {
  ED: { en: "ED", fr: "Urgences" },
  DIRECT_ADMISSION: { en: "Direct admission", fr: "Admission directe" },
  TRANSFER: { en: "Transfer", fr: "Transfert" },
  OBSERVATION_CONVERSION: { en: "Observation conversion", fr: "Conversion observation" },
  SURGERY: { en: "Surgery", fr: "Chirurgie" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const NURSING_MENTAL_STATUS_OPTIONS = enumOptions(NURSING_MENTAL_STATUS_VALUES, {
  ALERT_ORIENTED: { en: "Alert & oriented", fr: "Alerte et orienté(e)" },
  CONFUSED: { en: "Confused", fr: "Confus(e)" },
  LETHARGIC: { en: "Lethargic", fr: "Léthargique" },
  UNRESPONSIVE: { en: "Unresponsive", fr: "Non réactif(ve)" },
  UNABLE_TO_ASSESS: { en: "Unable to assess", fr: "Impossible à évaluer" },
});

export const NURSING_BASELINE_MOBILITY_OPTIONS = enumOptions(NURSING_BASELINE_MOBILITY_VALUES, {
  INDEPENDENT: { en: "Independent", fr: "Autonome" },
  STANDBY_ASSIST: { en: "Standby assist", fr: "Aide de proximité" },
  ONE_PERSON_ASSIST: { en: "One-person assist", fr: "Aide d'une personne" },
  TWO_PERSON_ASSIST: { en: "Two-person assist", fr: "Aide de deux personnes" },
  TOTAL_ASSIST: { en: "Total assist", fr: "Aide totale" },
});

export const NURSING_SHIFT_OPTIONS = enumOptions(NURSING_SHIFT_VALUES, {
  DAY: { en: "Day", fr: "Jour" },
  EVENING: { en: "Evening", fr: "Soir" },
  NIGHT: { en: "Night", fr: "Nuit" },
});

export const NURSING_RESPIRATORY_STATUS_OPTIONS = enumOptions(NURSING_RESPIRATORY_STATUS_VALUES, {
  STABLE: { en: "Stable", fr: "Stable" },
  OXYGEN_REQUIRED: { en: "Oxygen required", fr: "Oxygène requis" },
  DISTRESS: { en: "Distress", fr: "Détresse" },
  VENTILATED: { en: "Ventilated", fr: "Ventilé(e)" },
});

export const NURSING_CARDIAC_STATUS_OPTIONS = enumOptions(NURSING_CARDIAC_STATUS_VALUES, {
  STABLE: { en: "Stable", fr: "Stable" },
  TELEMETRY: { en: "Telemetry", fr: "Télémétrie" },
  CHEST_PAIN: { en: "Chest pain", fr: "Douleur thoracique" },
  ARRHYTHMIA: { en: "Arrhythmia", fr: "Arythmie" },
});

export const NURSING_GI_STATUS_OPTIONS = enumOptions(NURSING_GI_STATUS_VALUES, {
  NORMAL: { en: "Normal", fr: "Normal" },
  NAUSEA_VOMITING: { en: "Nausea/vomiting", fr: "Nausées/vomissements" },
  NPO: { en: "NPO", fr: "NPO" },
  ABDOMINAL_PAIN: { en: "Abdominal pain", fr: "Douleur abdominale" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const NURSING_GU_STATUS_OPTIONS = enumOptions(NURSING_GU_STATUS_VALUES, {
  NORMAL: { en: "Normal", fr: "Normal" },
  FOLEY: { en: "Foley", fr: "Sonde urinaire" },
  INCONTINENT: { en: "Incontinent", fr: "Incontinent(e)" },
  URINARY_RETENTION: { en: "Urinary retention", fr: "Rétention urinaire" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const NURSING_SKIN_STATUS_OPTIONS = enumOptions(NURSING_SKIN_STATUS_VALUES, {
  INTACT: { en: "Intact", fr: "Intègre" },
  WOUND_PRESENT: { en: "Wound present", fr: "Plaie présente" },
  PRESSURE_INJURY_RISK: { en: "Pressure injury risk", fr: "Risque lésion de pression" },
  BREAKDOWN_PRESENT: { en: "Breakdown present", fr: "Lésion présente" },
});

export const NURSING_MOBILITY_STATUS_OPTIONS = enumOptions(NURSING_MOBILITY_STATUS_VALUES, {
  INDEPENDENT: { en: "Independent", fr: "Autonome" },
  ASSIST_REQUIRED: { en: "Assist required", fr: "Aide requise" },
  BEDBOUND: { en: "Bedbound", fr: "Alité(e)" },
  FALL_RISK: { en: "Fall risk", fr: "Risque de chute" },
});

export const NURSING_PAIN_STATUS_OPTIONS = enumOptions(NURSING_PAIN_STATUS_VALUES, {
  NO_PAIN: { en: "No pain", fr: "Pas de douleur" },
  CONTROLLED: { en: "Controlled", fr: "Contrôlée" },
  UNCONTROLLED: { en: "Uncontrolled", fr: "Non contrôlée" },
});

export const NURSING_SAFETY_STATUS_OPTIONS = enumOptions(NURSING_SAFETY_STATUS_VALUES, {
  STANDARD: { en: "Standard", fr: "Standard" },
  FALL_PRECAUTIONS: { en: "Fall precautions", fr: "Précautions chute" },
  SUICIDE_PRECAUTIONS: { en: "Suicide precautions", fr: "Précautions suicide" },
  ELOPEMENT_PRECAUTIONS: { en: "Elopement precautions", fr: "Précautions fugue" },
});

export const NURSING_WDL_ASSESSMENT_OPTIONS = enumOptions(NURSING_WDL_ASSESSMENT_VALUES, {
  WDL: { en: "WDL", fr: "DNL" },
  ABNORMAL: { en: "Abnormal", fr: "Anormal" },
  NOT_ASSESSED: { en: "Not assessed", fr: "Non évalué" },
});

export const NURSING_SYSTEM_OPTIONS = enumOptions(NURSING_SYSTEM_VALUES, {
  NEURO: { en: "Neuro", fr: "Neuro" },
  RESPIRATORY: { en: "Respiratory", fr: "Respiratoire" },
  CARDIAC: { en: "Cardiac", fr: "Cardiaque" },
  GI: { en: "GI", fr: "Digestif" },
  GU: { en: "GU", fr: "Génito-urinaire" },
  SKIN: { en: "Skin", fr: "Peau" },
  MUSCULOSKELETAL: { en: "Musculoskeletal", fr: "Musculo-squelettique" },
  PSYCHOSOCIAL: { en: "Psychosocial", fr: "Psychosocial" },
  PAIN: { en: "Pain", fr: "Douleur" },
  SAFETY: { en: "Safety", fr: "Sécurité" },
  DEVICE_LINE_TUBE_DRAIN: { en: "Device/line/tube/drain", fr: "Dispositif/ligne/tube/drain" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const NURSING_SYSTEM_STATUS_OPTIONS = enumOptions(NURSING_SYSTEM_STATUS_VALUES, {
  WDL: { en: "WDL", fr: "DNL" },
  ABNORMAL: { en: "Abnormal", fr: "Anormal" },
  UNCHANGED: { en: "Unchanged", fr: "Inchangé" },
  IMPROVED: { en: "Improved", fr: "Amélioré" },
  WORSENED: { en: "Worsened", fr: "Détérioré" },
});

export const NURSING_PRIMARY_PROBLEM_OPTIONS = enumOptions(NURSING_PRIMARY_PROBLEM_VALUES, {
  FALL_RISK: { en: "Fall risk", fr: "Risque de chute" },
  PAIN: { en: "Pain", fr: "Douleur" },
  IMPAIRED_MOBILITY: { en: "Impaired mobility", fr: "Mobilité altérée" },
  IMPAIRED_SKIN_INTEGRITY: { en: "Impaired skin integrity", fr: "Intégrité cutanée altérée" },
  INFECTION_RISK: { en: "Infection risk", fr: "Risque d'infection" },
  RESPIRATORY_COMPROMISE: { en: "Respiratory compromise", fr: "Compromission respiratoire" },
  CARDIAC_MONITORING: { en: "Cardiac monitoring", fr: "Surveillance cardiaque" },
  ALTERED_MENTAL_STATUS: { en: "Altered mental status", fr: "Altération état mental" },
  BEHAVIORAL_SAFETY: { en: "Behavioral safety", fr: "Sécurité comportementale" },
  DISCHARGE_PLANNING: { en: "Discharge planning", fr: "Planification sortie" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const NURSING_CARE_PLAN_GOAL_OPTIONS = enumOptions(NURSING_CARE_PLAN_GOAL_VALUES, {
  PAIN_CONTROLLED: { en: "Pain controlled", fr: "Douleur contrôlée" },
  NO_FALLS: { en: "No falls", fr: "Aucune chute" },
  SKIN_INTACT: { en: "Skin intact", fr: "Peau intacte" },
  INFECTION_PREVENTED: { en: "Infection prevented", fr: "Infection prévenue" },
  MOBILITY_IMPROVED: { en: "Mobility improved", fr: "Mobilité améliorée" },
  RESPIRATORY_STABLE: { en: "Respiratory stable", fr: "Respiration stable" },
  CARDIAC_STABLE: { en: "Cardiac stable", fr: "Cardiaque stable" },
  SAFE_ENVIRONMENT: { en: "Safe environment", fr: "Environnement sécurisé" },
  DISCHARGE_READY: { en: "Discharge ready", fr: "Prêt(e) pour sortie" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const NURSING_INTERVENTION_OPTIONS = enumOptions(NURSING_INTERVENTION_VALUES, {
  SAFETY_PRECAUTIONS: { en: "Safety precautions", fr: "Précautions sécurité" },
  PAIN_REASSESSMENT: { en: "Pain reassessment", fr: "Réévaluation douleur" },
  TURNING_REPOSITIONING: { en: "Turning/repositioning", fr: "Rotation/repositionnement" },
  SKIN_MONITORING: { en: "Skin monitoring", fr: "Surveillance peau" },
  DEVICE_MONITORING: { en: "Device monitoring", fr: "Surveillance dispositif" },
  RESPIRATORY_MONITORING: { en: "Respiratory monitoring", fr: "Surveillance respiratoire" },
  CARDIAC_MONITORING: { en: "Cardiac monitoring", fr: "Surveillance cardiaque" },
  EDUCATION: { en: "Education", fr: "Éducation" },
  CARE_COORDINATION: { en: "Care coordination", fr: "Coordination des soins" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const NURSING_GOAL_STATUS_OPTIONS = enumOptions(NURSING_GOAL_STATUS_VALUES, {
  NOT_STARTED: { en: "Not started", fr: "Non commencé" },
  IN_PROGRESS: { en: "In progress", fr: "En cours" },
  MET: { en: "Met", fr: "Atteint" },
  NOT_MET: { en: "Not met", fr: "Non atteint" },
  DISCONTINUED: { en: "Discontinued", fr: "Interrompu" },
});

export const NURSING_INTERVENTION_STATUS_OPTIONS = enumOptions(NURSING_INTERVENTION_STATUS_VALUES, {
  CONTINUED: { en: "Continued", fr: "Poursuivi" },
  MODIFIED: { en: "Modified", fr: "Modifié" },
  ADDED: { en: "Added", fr: "Ajouté" },
  DISCONTINUED: { en: "Discontinued", fr: "Interrompu" },
});

export const NURSING_PATIENT_PROGRESS_OPTIONS = enumOptions(NURSING_PATIENT_PROGRESS_VALUES, {
  IMPROVED: { en: "Improved", fr: "Amélioré" },
  UNCHANGED: { en: "Unchanged", fr: "Inchangé" },
  WORSENED: { en: "Worsened", fr: "Détérioré" },
});

export const NURSING_GOAL_TYPE_OPTIONS = enumOptions(NURSING_GOAL_TYPE_VALUES, {
  PAIN: { en: "Pain", fr: "Douleur" },
  MOBILITY: { en: "Mobility", fr: "Mobilité" },
  SAFETY: { en: "Safety", fr: "Sécurité" },
  SKIN: { en: "Skin", fr: "Peau" },
  RESPIRATORY: { en: "Respiratory", fr: "Respiratoire" },
  CARDIAC: { en: "Cardiac", fr: "Cardiaque" },
  INFECTION: { en: "Infection", fr: "Infection" },
  EDUCATION: { en: "Education", fr: "Éducation" },
  DISCHARGE: { en: "Discharge", fr: "Sortie" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const NURSING_OUTCOME_STATUS_OPTIONS = enumOptions(NURSING_OUTCOME_STATUS_VALUES, {
  MET: { en: "Met", fr: "Atteint" },
  PARTIALLY_MET: { en: "Partially met", fr: "Partiellement atteint" },
  NOT_MET: { en: "Not met", fr: "Non atteint" },
  IN_PROGRESS: { en: "In progress", fr: "En cours" },
});

export const NURSING_PROBLEM_LIST_OPTIONS = enumOptions(NURSING_PROBLEM_LIST_VALUES, {
  FALL_RISK: { en: "Fall risk", fr: "Risque de chute" },
  PAIN: { en: "Pain", fr: "Douleur" },
  MOBILITY_LIMITATION: { en: "Mobility limitation", fr: "Limitation mobilité" },
  SKIN_BREAKDOWN: { en: "Skin breakdown", fr: "Lésion cutanée" },
  INFECTION_RISK: { en: "Infection risk", fr: "Risque d'infection" },
  RESPIRATORY_CONCERN: { en: "Respiratory concern", fr: "Préoccupation respiratoire" },
  CARDIAC_CONCERN: { en: "Cardiac concern", fr: "Préoccupation cardiaque" },
  BEHAVIORAL_SAFETY: { en: "Behavioral safety", fr: "Sécurité comportementale" },
  DISCHARGE_BARRIER: { en: "Discharge barrier", fr: "Obstacle à la sortie" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const NURSING_PROBLEM_STATUS_OPTIONS = enumOptions(NURSING_PROBLEM_STATUS_VALUES, {
  ACTIVE: { en: "Active", fr: "Actif" },
  RESOLVED: { en: "Resolved", fr: "Résolu" },
  MONITORING: { en: "Monitoring", fr: "Surveillance" },
  ESCALATED: { en: "Escalated", fr: "Escaladé" },
});

export const NURSING_HANDOFF_TYPE_OPTIONS = enumOptions(NURSING_HANDOFF_TYPE_VALUES, {
  SHIFT_CHANGE: { en: "Shift change", fr: "Changement de quart" },
  TRANSFER: { en: "Transfer", fr: "Transfert" },
  BREAK_COVERAGE: { en: "Break coverage", fr: "Couverture pause" },
  HIGH_RISK_HANDOFF: { en: "High-risk handoff", fr: "Passation à haut risque" },
  DISCHARGE_HANDOFF: { en: "Discharge handoff", fr: "Passation sortie" },
});

export const NURSING_RECEIVING_ROLE_OPTIONS = enumOptions(NURSING_RECEIVING_ROLE_VALUES, {
  RN: { en: "RN", fr: "Infirmier(ère)" },
  CHARGE_NURSE: { en: "Charge nurse", fr: "Infirmier(ère) responsable" },
  ICU_RN: { en: "ICU RN", fr: "Infirmier(ère) soins intensifs" },
  TELEMETRY_RN: { en: "Telemetry RN", fr: "Infirmier(ère) télémétrie" },
  ED_RN: { en: "ED RN", fr: "Infirmier(ère) urgences" },
  OTHER: { en: "Other", fr: "Autre" },
});

const NURSING_PAIN_STATUS_MAP = labelMap(NURSING_PAIN_STATUS_OPTIONS);
const NURSING_SAFETY_STATUS_MAP = labelMap(NURSING_SAFETY_STATUS_OPTIONS);
const NURSING_ADMISSION_SOURCE_MAP = labelMap(NURSING_ADMISSION_SOURCE_OPTIONS);
const NURSING_MENTAL_STATUS_MAP = labelMap(NURSING_MENTAL_STATUS_OPTIONS);
const NURSING_SHIFT_MAP = labelMap(NURSING_SHIFT_OPTIONS);
const NURSING_RESPIRATORY_STATUS_MAP = labelMap(NURSING_RESPIRATORY_STATUS_OPTIONS);
const NURSING_CARDIAC_STATUS_MAP = labelMap(NURSING_CARDIAC_STATUS_OPTIONS);
const NURSING_PRIMARY_PROBLEM_MAP = labelMap(NURSING_PRIMARY_PROBLEM_OPTIONS);
const NURSING_CARE_PLAN_GOAL_MAP = labelMap(NURSING_CARE_PLAN_GOAL_OPTIONS);
const NURSING_HANDOFF_TYPE_MAP = labelMap(NURSING_HANDOFF_TYPE_OPTIONS);
const NURSING_SYSTEM_MAP = labelMap(NURSING_SYSTEM_OPTIONS);
const NURSING_SYSTEM_STATUS_MAP = labelMap(NURSING_SYSTEM_STATUS_OPTIONS);
const NURSING_PROBLEM_LIST_MAP = labelMap(NURSING_PROBLEM_LIST_OPTIONS);
const NURSING_PROBLEM_STATUS_MAP = labelMap(NURSING_PROBLEM_STATUS_OPTIONS);
const NURSING_GOAL_TYPE_MAP = labelMap(NURSING_GOAL_TYPE_OPTIONS);
const NURSING_OUTCOME_STATUS_MAP = labelMap(NURSING_OUTCOME_STATUS_OPTIONS);
const NURSING_PATIENT_PROGRESS_MAP = labelMap(NURSING_PATIENT_PROGRESS_OPTIONS);

function requireProviderNotified(
  data: { providerNotified: (typeof NURSING_YES_NO_VALUES)[number] },
  ctx: z.RefinementCtx,
  message: string
) {
  if (data.providerNotified !== "YES") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ["providerNotified"] });
  }
}

function requireNotesWhen(
  condition: boolean,
  notes: string | undefined,
  ctx: z.RefinementCtx,
  message: string
) {
  if (condition && !notes?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ["notes"] });
  }
}

export const nursingAdmissionAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    admissionSource: z.enum(NURSING_ADMISSION_SOURCE_VALUES),
    admissionReason: requiredShortText,
    baselineMentalStatus: z.enum(NURSING_MENTAL_STATUS_VALUES),
    baselineMobility: z.enum(NURSING_BASELINE_MOBILITY_VALUES),
    fallRiskReviewed: nursingYesNo,
    skinAssessmentCompleted: nursingYesNo,
    painAssessmentCompleted: nursingYesNo,
    belongingsReviewed: nursingYesNo,
    homeMedicationsReviewed: nursingYesNo,
    allergiesReviewed: nursingYesNo,
    advanceDirectivesReviewed: nursingYesNoUnknown,
    infectionScreeningCompleted: nursingYesNo,
    educationNeedsIdentified: nursingYesNo,
    interpreterNeeded: nursingYesNo,
    providerNotified: nursingYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    requireNotesWhen(data.fallRiskReviewed === "NO", data.notes, ctx, "Notes required when fall risk not reviewed");
    requireNotesWhen(data.skinAssessmentCompleted === "NO", data.notes, ctx, "Notes required when skin assessment not completed");
    requireNotesWhen(data.allergiesReviewed === "NO", data.notes, ctx, "Notes required when allergies not reviewed");
  });

export const nursingShiftAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    shift: z.enum(NURSING_SHIFT_VALUES),
    mentalStatus: z.enum(NURSING_MENTAL_STATUS_VALUES),
    respiratoryStatus: z.enum(NURSING_RESPIRATORY_STATUS_VALUES),
    cardiacStatus: z.enum(NURSING_CARDIAC_STATUS_VALUES),
    giStatus: z.enum(NURSING_GI_STATUS_VALUES),
    guStatus: z.enum(NURSING_GU_STATUS_VALUES),
    skinStatus: z.enum(NURSING_SKIN_STATUS_VALUES),
    mobilityStatus: z.enum(NURSING_MOBILITY_STATUS_VALUES),
    painStatus: z.enum(NURSING_PAIN_STATUS_VALUES),
    safetyStatus: z.enum(NURSING_SAFETY_STATUS_VALUES),
    providerNotified: nursingYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.respiratoryStatus === "DISTRESS") {
      requireProviderNotified(data, ctx, "Provider notification required for respiratory distress");
    }
    if (data.cardiacStatus === "CHEST_PAIN" || data.cardiacStatus === "ARRHYTHMIA") {
      requireProviderNotified(data, ctx, "Provider notification required for cardiac concern");
    }
    if (data.painStatus === "UNCONTROLLED") {
      requireProviderNotified(data, ctx, "Provider notification required for uncontrolled pain");
    }
    if (data.skinStatus === "BREAKDOWN_PRESENT") {
      requireProviderNotified(data, ctx, "Provider notification required for skin breakdown");
    }
  });

export const headToToeAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    neuro: z.enum(NURSING_WDL_ASSESSMENT_VALUES),
    respiratory: z.enum(NURSING_WDL_ASSESSMENT_VALUES),
    cardiac: z.enum(NURSING_WDL_ASSESSMENT_VALUES),
    gastrointestinal: z.enum(NURSING_WDL_ASSESSMENT_VALUES),
    genitourinary: z.enum(NURSING_WDL_ASSESSMENT_VALUES),
    skin: z.enum(NURSING_WDL_ASSESSMENT_VALUES),
    musculoskeletal: z.enum(NURSING_WDL_ASSESSMENT_VALUES),
    psychosocial: z.enum(NURSING_WDL_ASSESSMENT_VALUES),
    abnormalFindingsPresent: nursingYesNo,
    providerNotified: nursingYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.abnormalFindingsPresent === "YES") {
      requireNotesWhen(
        data.abnormalFindingsPresent === "YES",
        data.notes,
        ctx,
        "Notes required when abnormal findings present"
      );
      requireProviderNotified(data, ctx, "Provider notification required for abnormal findings");
    }
  });

export const systemsAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    system: z.enum(NURSING_SYSTEM_VALUES),
    status: z.enum(NURSING_SYSTEM_STATUS_VALUES),
    providerNotified: nursingYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.status === "WORSENED") {
      requireProviderNotified(data, ctx, "Provider notification required when system worsened");
    }
    if (data.system === "OTHER") {
      requireNotesWhen(true, data.notes, ctx, "Notes required when system is OTHER");
    }
  });

export const nursingCarePlanInitiationPayloadSchema = z
  .object({
    initiatedAt: isoDateTimeString,
    primaryNursingProblem: z.enum(NURSING_PRIMARY_PROBLEM_VALUES),
    goal: z.enum(NURSING_CARE_PLAN_GOAL_VALUES),
    interventionsPlanned: z.array(z.enum(NURSING_INTERVENTION_VALUES)).min(1),
    patientParticipated: nursingYesNoUnable,
    providerNotified: nursingYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.primaryNursingProblem === "OTHER") {
      requireNotesWhen(true, data.notes, ctx, "Notes required when primary problem is OTHER");
    }
    if (data.goal === "OTHER") {
      requireNotesWhen(true, data.notes, ctx, "Notes required when goal is OTHER");
    }
  });

export const nursingCarePlanUpdatePayloadSchema = z
  .object({
    updatedAt: isoDateTimeString,
    problemAddressed: requiredShortText,
    goalStatus: z.enum(NURSING_GOAL_STATUS_VALUES),
    interventionStatus: z.enum(NURSING_INTERVENTION_STATUS_VALUES),
    patientProgress: z.enum(NURSING_PATIENT_PROGRESS_VALUES),
    providerNotified: nursingYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.patientProgress === "WORSENED") {
      requireProviderNotified(data, ctx, "Provider notification required when patient progress worsened");
    }
  });

export const nursingPatientGoalsOutcomesPayloadSchema = z
  .object({
    documentedAt: isoDateTimeString,
    goalType: z.enum(NURSING_GOAL_TYPE_VALUES),
    goalDescription: requiredShortText,
    outcomeStatus: z.enum(NURSING_OUTCOME_STATUS_VALUES),
    barrierPresent: nursingYesNo,
    barrierDescription: optionalShortText,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.barrierPresent === "YES" && !data.barrierDescription?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Barrier description required",
        path: ["barrierDescription"],
      });
    }
  });

export const nursingProblemListPayloadSchema = z
  .object({
    documentedAt: isoDateTimeString,
    problem: z.enum(NURSING_PROBLEM_LIST_VALUES),
    status: z.enum(NURSING_PROBLEM_STATUS_VALUES),
    providerNotified: nursingYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.status === "ESCALATED") {
      requireProviderNotified(data, ctx, "Provider notification required when problem escalated");
    }
    if (data.problem === "OTHER") {
      requireNotesWhen(true, data.notes, ctx, "Notes required when problem is OTHER");
    }
  });

export const nursingHandoffShiftReportPayloadSchema = z
  .object({
    handoffTime: isoDateTimeString,
    handoffType: z.enum(NURSING_HANDOFF_TYPE_VALUES),
    receivingRole: z.enum(NURSING_RECEIVING_ROLE_VALUES),
    highRiskConcernsPresent: nursingYesNo,
    openTasksReviewed: nursingYesNo,
    medicationConcernsReviewed: nursingYesNo,
    fallRiskReviewed: nursingYesNo,
    linesTubesDrainsReviewed: nursingYesNo,
    pendingLabsImagingReviewed: nursingYesNo,
    familyCommunicationNeeds: nursingYesNo,
    providerNotified: nursingYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.highRiskConcernsPresent === "YES") {
      requireNotesWhen(true, data.notes, ctx, "Notes required when high-risk concerns present");
    }
    if (data.openTasksReviewed === "NO") {
      requireNotesWhen(true, data.notes, ctx, "Notes required when open tasks not reviewed");
    }
  });

export const nursingDischargeReadinessReviewPayloadSchema = z
  .object({
    reviewTime: isoDateTimeString,
    vitalSignsStable: nursingYesNo,
    painControlled: nursingYesNo,
    mobilitySafe: nursingYesNo,
    educationCompleted: nursingYesNo,
    medicationsReviewed: nursingYesNo,
    followUpReviewed: nursingYesNo,
    transportationConfirmed: nursingYesNo,
    responsibleAdultPresent: nursingYesNoNotApplicable,
    barriersPresent: nursingYesNo,
    barrierDescription: optionalShortText,
    providerNotified: nursingYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.barriersPresent === "YES" && !data.barrierDescription?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Barrier description required",
        path: ["barrierDescription"],
      });
    }
    if (
      data.vitalSignsStable === "NO" ||
      data.painControlled === "NO" ||
      data.mobilitySafe === "NO"
    ) {
      requireProviderNotified(
        data,
        ctx,
        "Provider notification required when discharge readiness safety criteria not met"
      );
    }
  });

const PAYLOAD_SCHEMA_BY_CARD_ID: Record<
  Edoc19NursingAdmissionCarePlanDocumentationCardId,
  z.ZodTypeAny
> = {
  [NURSING_ADMISSION_ASSESSMENT_CARD_ID]: nursingAdmissionAssessmentPayloadSchema,
  [NURSING_SHIFT_ASSESSMENT_CARD_ID]: nursingShiftAssessmentPayloadSchema,
  [HEAD_TO_TOE_ASSESSMENT_CARD_ID]: headToToeAssessmentPayloadSchema,
  [SYSTEMS_ASSESSMENT_CARD_ID]: systemsAssessmentPayloadSchema,
  [NURSING_CARE_PLAN_INITIATION_CARD_ID]: nursingCarePlanInitiationPayloadSchema,
  [NURSING_CARE_PLAN_UPDATE_CARD_ID]: nursingCarePlanUpdatePayloadSchema,
  [NURSING_PATIENT_GOALS_OUTCOMES_CARD_ID]: nursingPatientGoalsOutcomesPayloadSchema,
  [NURSING_PROBLEM_LIST_CARD_ID]: nursingProblemListPayloadSchema,
  [NURSING_HANDOFF_SHIFT_REPORT_CARD_ID]: nursingHandoffShiftReportPayloadSchema,
  [NURSING_DISCHARGE_READINESS_REVIEW_CARD_ID]: nursingDischargeReadinessReviewPayloadSchema,
};

export function isEdoc19NursingAdmissionCarePlanDocumentationCardId(
  cardId: string
): cardId is Edoc19NursingAdmissionCarePlanDocumentationCardId {
  return (EDOC19_NURSING_ADMISSION_CARE_PLAN_DOCUMENTATION_CARD_IDS as readonly string[]).includes(
    cardId
  );
}

export function validateNursingAdmissionCarePlanDocumentationPayloadForCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  if (!isEdoc19NursingAdmissionCarePlanDocumentationCardId(cardId)) {
    return { ok: false, message: "Card is not available for structured save" };
  }
  const schema = PAYLOAD_SCHEMA_BY_CARD_ID[cardId];
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Invalid clinical documentation payload" };
  }
  return { ok: true, data: parsed.data as Record<string, unknown> };
}

export function summarizeNursingAdmissionCarePlanPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case NURSING_ADMISSION_ASSESSMENT_CARD_ID: {
      const p = nursingAdmissionAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Source", "Provenance"),
          value: pickLocalizedEnumLabel(
            NURSING_ADMISSION_SOURCE_MAP.en,
            NURSING_ADMISSION_SOURCE_MAP.fr,
            d.admissionSource,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Reason", "Motif"),
          value: d.admissionReason,
        },
        {
          key: clinicalDocSummaryKey(locale, "Baseline mental status", "État mental initial"),
          value: pickLocalizedEnumLabel(
            NURSING_MENTAL_STATUS_MAP.en,
            NURSING_MENTAL_STATUS_MAP.fr,
            d.baselineMentalStatus,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Fall risk reviewed", "Risque chute revu"),
          value: nursingDocYesNoLabel(d.fallRiskReviewed, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Skin assessment", "Évaluation peau"),
          value: nursingDocYesNoLabel(d.skinAssessmentCompleted, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Pain assessment", "Évaluation douleur"),
          value: nursingDocYesNoLabel(d.painAssessmentCompleted, locale),
        },
      ];
    }
    case NURSING_SHIFT_ASSESSMENT_CARD_ID: {
      const p = nursingShiftAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Shift", "Quart"),
          value: pickLocalizedEnumLabel(NURSING_SHIFT_MAP.en, NURSING_SHIFT_MAP.fr, d.shift, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Mental status", "État mental"),
          value: pickLocalizedEnumLabel(
            NURSING_MENTAL_STATUS_MAP.en,
            NURSING_MENTAL_STATUS_MAP.fr,
            d.mentalStatus,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Respiratory", "Respiratoire"),
          value: pickLocalizedEnumLabel(
            NURSING_RESPIRATORY_STATUS_MAP.en,
            NURSING_RESPIRATORY_STATUS_MAP.fr,
            d.respiratoryStatus,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Cardiac", "Cardiaque"),
          value: pickLocalizedEnumLabel(
            NURSING_CARDIAC_STATUS_MAP.en,
            NURSING_CARDIAC_STATUS_MAP.fr,
            d.cardiacStatus,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Pain", "Douleur"),
          value: pickLocalizedEnumLabel(
            NURSING_PAIN_STATUS_MAP.en,
            NURSING_PAIN_STATUS_MAP.fr,
            d.painStatus,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Safety", "Sécurité"),
          value: pickLocalizedEnumLabel(
            NURSING_SAFETY_STATUS_MAP.en,
            NURSING_SAFETY_STATUS_MAP.fr,
            d.safetyStatus,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: nursingDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case HEAD_TO_TOE_ASSESSMENT_CARD_ID: {
      const p = headToToeAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Abnormal findings", "Trouvailles anormales"),
          value: nursingDocYesNoLabel(d.abnormalFindingsPresent, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: nursingDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SYSTEMS_ASSESSMENT_CARD_ID: {
      const p = systemsAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "System", "Système"),
          value: pickLocalizedEnumLabel(
            NURSING_SYSTEM_MAP.en,
            NURSING_SYSTEM_MAP.fr,
            d.system,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Status", "Statut"),
          value: pickLocalizedEnumLabel(
            NURSING_SYSTEM_STATUS_MAP.en,
            NURSING_SYSTEM_STATUS_MAP.fr,
            d.status,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: nursingDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case NURSING_CARE_PLAN_INITIATION_CARD_ID: {
      const p = nursingCarePlanInitiationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Problem", "Problème"),
          value: pickLocalizedEnumLabel(
            NURSING_PRIMARY_PROBLEM_MAP.en,
            NURSING_PRIMARY_PROBLEM_MAP.fr,
            d.primaryNursingProblem,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Goal", "Objectif"),
          value: pickLocalizedEnumLabel(
            NURSING_CARE_PLAN_GOAL_MAP.en,
            NURSING_CARE_PLAN_GOAL_MAP.fr,
            d.goal,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Interventions", "Interventions"),
          value: String(d.interventionsPlanned.length),
        },
      ];
    }
    case NURSING_CARE_PLAN_UPDATE_CARD_ID: {
      const p = nursingCarePlanUpdatePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Problem addressed", "Problème traité"),
          value: d.problemAddressed,
        },
        {
          key: clinicalDocSummaryKey(locale, "Progress", "Progrès"),
          value: pickLocalizedEnumLabel(
            NURSING_PATIENT_PROGRESS_MAP.en,
            NURSING_PATIENT_PROGRESS_MAP.fr,
            d.patientProgress,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: nursingDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case NURSING_PATIENT_GOALS_OUTCOMES_CARD_ID: {
      const p = nursingPatientGoalsOutcomesPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Goal type", "Type d'objectif"),
          value: pickLocalizedEnumLabel(
            NURSING_GOAL_TYPE_MAP.en,
            NURSING_GOAL_TYPE_MAP.fr,
            d.goalType,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Outcome", "Résultat"),
          value: pickLocalizedEnumLabel(
            NURSING_OUTCOME_STATUS_MAP.en,
            NURSING_OUTCOME_STATUS_MAP.fr,
            d.outcomeStatus,
            locale
          ),
        },
      ];
    }
    case NURSING_PROBLEM_LIST_CARD_ID: {
      const p = nursingProblemListPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Problem", "Problème"),
          value: pickLocalizedEnumLabel(
            NURSING_PROBLEM_LIST_MAP.en,
            NURSING_PROBLEM_LIST_MAP.fr,
            d.problem,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Status", "Statut"),
          value: pickLocalizedEnumLabel(
            NURSING_PROBLEM_STATUS_MAP.en,
            NURSING_PROBLEM_STATUS_MAP.fr,
            d.status,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: nursingDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case NURSING_HANDOFF_SHIFT_REPORT_CARD_ID: {
      const p = nursingHandoffShiftReportPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Handoff type", "Type de passation"),
          value: pickLocalizedEnumLabel(
            NURSING_HANDOFF_TYPE_MAP.en,
            NURSING_HANDOFF_TYPE_MAP.fr,
            d.handoffType,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "High-risk concerns", "Préoccupations à haut risque"),
          value: nursingDocYesNoLabel(d.highRiskConcernsPresent, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Open tasks reviewed", "Tâches ouvertes revues"),
          value: nursingDocYesNoLabel(d.openTasksReviewed, locale),
        },
      ];
    }
    case NURSING_DISCHARGE_READINESS_REVIEW_CARD_ID: {
      const p = nursingDischargeReadinessReviewPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Stable vitals", "Signes vitaux stables"),
          value: nursingDocYesNoLabel(d.vitalSignsStable, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Pain controlled", "Douleur contrôlée"),
          value: nursingDocYesNoLabel(d.painControlled, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Mobility safe", "Mobilité sécuritaire"),
          value: nursingDocYesNoLabel(d.mobilitySafe, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Barriers", "Obstacles"),
          value: nursingDocYesNoLabel(d.barriersPresent, locale),
        },
      ];
    }
    default:
      return [];
  }
}
