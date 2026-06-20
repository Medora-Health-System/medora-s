/**
 * MEDUI.ED.DISCHARGE.PATIENT_SPECIFIC_ADDITIONS.1–2
 * Append-only patient-specific discharge instructions — core templates unchanged.
 */

import type { SupportedLanguage } from "@/i18n/config";
import { calculateAge } from "@/lib/patientDisplay";
import { hydrateProviderDischargeDocumentationForm } from "./providerDischargeDocumentationModel";
import type { ProviderDischargeDiagnosisCard } from "./providerDischargeDocumentationModel";

export type PatientSpecificDischargeAdditionSeverity = "info" | "caution" | "high_risk";

export type PatientSpecificDischargeAdditionSource =
  | "age"
  | "diagnosis"
  | "medication"
  | "renal"
  | "diabetes"
  | "pregnancy"
  | "anticoagulant"
  | "immunocompromised"
  | "glp1"
  | "heart_failure"
  | "respiratory"
  | "behavioral_health"
  | "fall_risk"
  | "polypharmacy";

export type ClinicalReviewStatus = "draft" | "reviewed" | "approved";

export type PatientSpecificDischargeContext = {
  /** Known age in years — do not infer when absent. */
  patientAgeYears?: number | null;
  /** ICD-10 codes from encounter diagnoses and problem/history sources. */
  diagnosisCodes?: readonly string[];
  /** Diagnosis labels for conservative keyword detection. */
  diagnosisLabels?: readonly string[];
  /** Home / active medication display names when available. */
  medicationNames?: readonly string[];
};

export type PatientSpecificDischargeAddition = {
  id: string;
  title: string;
  text: string;
  reason: string;
  severity: PatientSpecificDischargeAdditionSeverity;
  source: PatientSpecificDischargeAdditionSource;
  clinicalReviewStatus: ClinicalReviewStatus;
};

export type PatientSpecificDischargeRule = {
  id: string;
  title: string;
  reason: string;
  severity: PatientSpecificDischargeAdditionSeverity;
  source: PatientSpecificDischargeAdditionSource;
  appliesToTemplateIds: readonly string[];
  /** When true, rule applies whenever any resolved discharge template is present. */
  appliesToAllTemplates?: boolean;
  appliesToFamilyIds?: readonly string[];
  clinicalReviewStatus: ClinicalReviewStatus;
  text: Record<SupportedLanguage, string>;
  matches: (resolved: ResolvedPatientSignals) => boolean;
};

export const DEHYDRATION_SENSITIVE_TEMPLATE_IDS = [
  "nausea_vomiting_v1",
  "dehydration_v1",
  "gastroenteritis_v1",
  "pediatric_vomiting_v1",
  "pediatric_gastroenteritis_v1",
  "renal_dehydration_followup_v1",
  "metabolic_dehydration_followup_v1",
  "pediatric_mild_dehydration_v1",
  "pediatric_dehydration_escalation_v1",
  "metabolic_nausea_weakness_followup_v1",
] as const;

export const RESPIRATORY_SENSITIVE_TEMPLATE_IDS = [
  "asthma_exacerbation_v1",
  "copd_exacerbation_v1",
  "pediatric_asthma_exacerbation_v1",
  "pediatric_wheezing_v1",
  "shortness_of_breath_v1",
  "pneumonia_v1",
  "bronchitis_v1",
  "pediatric_rsv_bronchiolitis_v1",
  "infectious_pneumonia_followup_v1",
] as const;

export const HEART_FAILURE_MONITORING_TEMPLATE_IDS = [
  "cardio_heart_failure_symptoms_v1",
  "shortness_of_breath_v1",
  "high_risk_medical_leg_swelling_v1",
  "high_risk_medical_general_weakness_v1",
  "high_risk_medical_fatigue_v1",
  "syncope_v1",
  "cardio_syncope_v1",
  ...DEHYDRATION_SENSITIVE_TEMPLATE_IDS,
] as const;

export const BEHAVIORAL_HEALTH_TEMPLATE_IDS = [
  "behavioral_health_anxiety_panic_symptoms_v1",
  "behavioral_health_depression_crisis_precautions_v1",
  "behavioral_health_suicidal_ideation_precautions_v1",
  "behavioral_health_alcohol_intoxication_follow_up_v1",
  "behavioral_health_alcohol_withdrawal_precautions_v1",
  "behavioral_health_substance_use_resources_v1",
  "behavioral_health_opioid_overdose_aftercare_v1",
  "behavioral_health_crisis_follow_up_v1",
  "behavioral_health_insomnia_stress_reaction_v1",
  "behavioral_health_grief_adjustment_v1",
  "anxiety_panic_v1",
] as const;

export const PREGNANCY_TEMPLATE_IDS = [
  "obgyn_vaginal_bleeding_v1",
  "obgyn_pelvic_pain_v1",
  "obgyn_dysmenorrhea_v1",
  "obgyn_hyperemesis_v1",
  "obgyn_early_pregnancy_symptoms_v1",
  "obgyn_threatened_miscarriage_precautions_v1",
  "obgyn_vaginitis_v1",
  "obgyn_uti_pregnancy_precautions_v1",
  "obgyn_round_ligament_pain_v1",
  "obgyn_postpartum_warning_v1",
] as const;

export const FALL_RISK_RELEVANT_TEMPLATE_IDS = [
  "syncope_v1",
  "cardio_syncope_v1",
  "vertigo_dizziness_v1",
  "high_risk_medical_dizziness_v1",
  "high_risk_medical_general_weakness_v1",
  "high_risk_medical_fatigue_v1",
  "metabolic_nausea_weakness_followup_v1",
  ...DEHYDRATION_SENSITIVE_TEMPLATE_IDS,
] as const;

export const RENAL_SENSITIVE_TEMPLATE_IDS = [
  "renal_dehydration_followup_v1",
  "renal_aki_followup_v1",
  "renal_electrolyte_abnormality_followup_v1",
  ...DEHYDRATION_SENSITIVE_TEMPLATE_IDS,
] as const;

export const DIABETES_FOLLOWUP_TEMPLATE_IDS = [
  "hypoglycemia_v1",
  "hyperglycemia_v1",
  "diabetes_hyperglycemia_followup_v1",
  "diabetes_hypoglycemia_followup_v1",
  "diabetes_dka_return_precautions_v1",
  "diabetes_insulin_management_precautions_v1",
  "diabetes_sick_day_precautions_v1",
  "metabolic_dehydration_followup_v1",
  ...DEHYDRATION_SENSITIVE_TEMPLATE_IDS,
] as const;

export const INFECTION_FEVER_SENSITIVE_TEMPLATE_IDS = [
  "infectious_fever_unknown_source_v1",
  "pediatric_fever_v1",
  "pneumonia_v1",
  "infectious_pneumonia_followup_v1",
  "infectious_upper_respiratory_infection_v1",
  "infectious_viral_syndrome_v1",
  "cellulitis_v1",
  "sepsis_risk_return_precautions_v1",
  ...DEHYDRATION_SENSITIVE_TEMPLATE_IDS,
  ...RESPIRATORY_SENSITIVE_TEMPLATE_IDS,
] as const;

export const SEVERITY_SORT_ORDER: Record<PatientSpecificDischargeAdditionSeverity, number> = {
  high_risk: 0,
  caution: 1,
  info: 2,
};

/** Cap total additions to avoid overwhelming discharge output. */
export const MAX_PATIENT_SPECIFIC_ADDITIONS = 12;

const GLP1_MEDICATION_TOKENS = [
  "ozempic",
  "semaglutide",
  "wegovy",
  "mounjaro",
  "tirzepatide",
] as const;

const ANTICOAGULANT_MEDICATION_TOKENS = [
  "eliquis",
  "apixaban",
  "xarelto",
  "rivaroxaban",
  "pradaxa",
  "dabigatran",
  "warfarin",
  "coumadin",
  "lovenox",
  "enoxaparin",
] as const;

const IMMUNOSUPPRESSIVE_MEDICATION_TOKENS = [
  "tacrolimus",
  "prograf",
  "cyclosporine",
  "ciclosporin",
  "mycophenolate",
  "cellcept",
  "azathioprine",
  "imuran",
  "rituximab",
  "infliximab",
  "adalimumab",
  "humira",
  "methotrexate",
  "prednisone",
  "prednisolone",
  "methylprednisolone",
  "dexamethasone",
] as const;

const DIABETES_ICD_PREFIXES = ["E10", "E11", "E13"] as const;
const CKD_ICD_PREFIXES = ["N18"] as const;
const CKD_PROGRESSION_ICD_PREFIXES = ["N18.4", "N18.5", "N18.6", "N18.9"] as const;
const HEART_FAILURE_ICD_PREFIXES = ["I50"] as const;
const COPD_ICD_PREFIXES = ["J44"] as const;
const ASTHMA_ICD_PREFIXES = ["J45"] as const;
const PREGNANCY_ICD_PREFIXES = ["O"] as const;
const NEUTROPENIA_ICD_PREFIXES = ["D70"] as const;
const TRANSPLANT_ICD_PREFIXES = ["Z94"] as const;

const DIABETES_LABEL_TOKENS = ["diabetes", "diabetic", "diabète", "diabétique"] as const;
const CKD_LABEL_TOKENS = [
  "chronic kidney disease",
  "ckd",
  "renal disease",
  "kidney disease",
  "maladie rénale chronique",
  "insuffisance rénale",
] as const;
const CKD_PROGRESSION_LABEL_TOKENS = [
  "stage 4",
  "stage 5",
  "stage iv",
  "stage v",
  "esrd",
  "end stage renal",
  "dialysis",
  "stade 4",
  "stade 5",
  "insuffisance rénale terminale",
] as const;
const HEART_FAILURE_LABEL_TOKENS = [
  "heart failure",
  "chf",
  "congestive heart failure",
  "insuffisance cardiaque",
  "icc",
] as const;
const COPD_LABEL_TOKENS = ["copd", "chronic obstructive", "bronchopneumopathie chronique", "bpco"] as const;
const ASTHMA_LABEL_TOKENS = ["asthma", "asthme", "wheezing", "sibilances"] as const;
const PREGNANCY_LABEL_TOKENS = [
  "pregnant",
  "pregnancy",
  "obstetric",
  "ob gyn",
  "obgyn",
  "grossesse",
  "enceinte",
  "obstétrique",
] as const;
const IMMUNOCOMPROMISED_LABEL_TOKENS = [
  "chemotherapy",
  "chemo",
  "transplant",
  "immunosuppressed",
  "immunocompromised",
  "neutropenia",
  "neutropénie",
  "chimiothérapie",
  "greffe",
  "immunosuppresseur",
] as const;
const DIABETES_COMPLICATION_LABEL_TOKENS = [
  "diabetic nephropathy",
  "diabetic neuropathy",
  "diabetic retinopathy",
  "diabetic foot",
  "nephropathy",
  "néphropathie diabétique",
  "neuropathie diabétique",
] as const;

const POLYPHARMACY_THRESHOLD = 8;

/** Conservative phrases that must never appear in patient-specific additions. */
export const PATIENT_SPECIFIC_ADDITION_FORBIDDEN_PHRASES = [
  "stop taking",
  "stop your medication",
  "adjust your insulin",
  "adjust your dose",
  "change your dose",
  "increase your dose",
  "decrease your dose",
  "caused by ozempic",
  "caused by semaglutide",
  "caused your symptoms",
  "arrêtez de prendre",
  "ajustez votre insuline",
  "modifier votre dose",
  "stop your blood thinner",
  "stop warfarin",
  "stop eliquis",
  "arrêtez l'anticoagulant",
] as const;

type ResolvedPatientSignals = {
  hasDiabetes: boolean;
  hasDiabetesComplication: boolean;
  hasCkd: boolean;
  hasCkdProgression: boolean;
  hasGlp1Medication: boolean;
  hasAnticoagulantMedication: boolean;
  hasHeartFailure: boolean;
  hasCopd: boolean;
  hasAsthma: boolean;
  hasPregnancy: boolean;
  hasImmunocompromisedStatus: boolean;
  isOlderAdult: boolean;
  hasPolypharmacy: boolean;
  hasDehydrationSensitiveTemplate: boolean;
  hasRespiratorySensitiveTemplate: boolean;
  hasHeartFailureMonitoringTemplate: boolean;
  hasBehavioralHealthTemplate: boolean;
  hasPregnancyTemplate: boolean;
  hasFallRiskRelevantTemplate: boolean;
  hasRenalSensitiveTemplate: boolean;
  hasDiabetesFollowupTemplate: boolean;
  hasInfectionFeverSensitiveTemplate: boolean;
  hasAnyTemplate: boolean;
};

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeIcd(code: string): string {
  return code.trim().toUpperCase().replace(/\s/g, "");
}

function icdStartsWithAny(code: string, prefixes: readonly string[]): boolean {
  const normalized = normalizeIcd(code);
  if (!normalized) return false;
  return prefixes.some((prefix) => normalized.startsWith(prefix));
}

function labelIncludesAny(label: string, tokens: readonly string[]): boolean {
  const normalized = normalizeToken(label);
  if (!normalized) return false;
  return tokens.some((token) => normalized.includes(token));
}

function medicationIncludesAnyToken(name: string, tokens: readonly string[]): boolean {
  const normalized = normalizeToken(name);
  if (!normalized) return false;
  return tokens.some((token) => normalized.includes(token));
}

function hasTemplateFromGroup(templateIds: readonly string[], group: readonly string[]): boolean {
  return templateIds.some((id) => group.includes(id));
}

function hasDiabetesComplicationIcd(code: string): boolean {
  const normalized = normalizeIcd(code);
  if (!normalized.startsWith("E10") && !normalized.startsWith("E11") && !normalized.startsWith("E13")) {
    return false;
  }
  return /^E1[013]\.\d/.test(normalized) && !normalized.endsWith(".9");
}

export function isDehydrationSensitiveTemplateId(templateId: string): boolean {
  return (DEHYDRATION_SENSITIVE_TEMPLATE_IDS as readonly string[]).includes(templateId);
}

export function detectDiabetesFromContext(context: PatientSpecificDischargeContext): boolean {
  for (const code of context.diagnosisCodes ?? []) {
    if (icdStartsWithAny(code, DIABETES_ICD_PREFIXES)) return true;
  }
  for (const label of context.diagnosisLabels ?? []) {
    if (labelIncludesAny(label, DIABETES_LABEL_TOKENS)) return true;
  }
  return false;
}

export function detectDiabetesComplicationFromContext(context: PatientSpecificDischargeContext): boolean {
  for (const code of context.diagnosisCodes ?? []) {
    if (hasDiabetesComplicationIcd(code)) return true;
  }
  for (const label of context.diagnosisLabels ?? []) {
    if (labelIncludesAny(label, DIABETES_COMPLICATION_LABEL_TOKENS)) return true;
  }
  return false;
}

export function detectCkdFromContext(context: PatientSpecificDischargeContext): boolean {
  for (const code of context.diagnosisCodes ?? []) {
    if (icdStartsWithAny(code, CKD_ICD_PREFIXES)) return true;
  }
  for (const label of context.diagnosisLabels ?? []) {
    if (labelIncludesAny(label, CKD_LABEL_TOKENS)) return true;
  }
  return false;
}

export function detectCkdProgressionFromContext(context: PatientSpecificDischargeContext): boolean {
  for (const code of context.diagnosisCodes ?? []) {
    const normalized = normalizeIcd(code);
    if (CKD_PROGRESSION_ICD_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;
    if (normalized.startsWith("N18.4") || normalized.startsWith("N18.5") || normalized.startsWith("N18.6")) {
      return true;
    }
  }
  for (const label of context.diagnosisLabels ?? []) {
    if (labelIncludesAny(label, CKD_PROGRESSION_LABEL_TOKENS)) return true;
  }
  return false;
}

export function detectGlp1MedicationFromContext(context: PatientSpecificDischargeContext): boolean {
  for (const name of context.medicationNames ?? []) {
    if (medicationIncludesAnyToken(name, GLP1_MEDICATION_TOKENS)) return true;
  }
  return false;
}

export function detectAnticoagulantMedicationFromContext(context: PatientSpecificDischargeContext): boolean {
  for (const name of context.medicationNames ?? []) {
    if (medicationIncludesAnyToken(name, ANTICOAGULANT_MEDICATION_TOKENS)) return true;
  }
  return false;
}

export function detectHeartFailureFromContext(context: PatientSpecificDischargeContext): boolean {
  for (const code of context.diagnosisCodes ?? []) {
    if (icdStartsWithAny(code, HEART_FAILURE_ICD_PREFIXES)) return true;
  }
  for (const label of context.diagnosisLabels ?? []) {
    if (labelIncludesAny(label, HEART_FAILURE_LABEL_TOKENS)) return true;
  }
  return false;
}

export function detectCopdFromContext(context: PatientSpecificDischargeContext): boolean {
  for (const code of context.diagnosisCodes ?? []) {
    if (icdStartsWithAny(code, COPD_ICD_PREFIXES)) return true;
  }
  for (const label of context.diagnosisLabels ?? []) {
    if (labelIncludesAny(label, COPD_LABEL_TOKENS)) return true;
  }
  return false;
}

export function detectAsthmaFromContext(context: PatientSpecificDischargeContext): boolean {
  for (const code of context.diagnosisCodes ?? []) {
    if (icdStartsWithAny(code, ASTHMA_ICD_PREFIXES)) return true;
  }
  for (const label of context.diagnosisLabels ?? []) {
    if (labelIncludesAny(label, ASTHMA_LABEL_TOKENS)) return true;
  }
  return false;
}

export function detectPregnancyFromContext(context: PatientSpecificDischargeContext): boolean {
  for (const code of context.diagnosisCodes ?? []) {
    if (icdStartsWithAny(code, PREGNANCY_ICD_PREFIXES)) return true;
  }
  for (const label of context.diagnosisLabels ?? []) {
    if (labelIncludesAny(label, PREGNANCY_LABEL_TOKENS)) return true;
  }
  return false;
}

export function detectImmunocompromisedFromContext(context: PatientSpecificDischargeContext): boolean {
  for (const code of context.diagnosisCodes ?? []) {
    if (icdStartsWithAny(code, NEUTROPENIA_ICD_PREFIXES)) return true;
    if (icdStartsWithAny(code, TRANSPLANT_ICD_PREFIXES)) return true;
  }
  for (const label of context.diagnosisLabels ?? []) {
    if (labelIncludesAny(label, IMMUNOCOMPROMISED_LABEL_TOKENS)) return true;
  }
  for (const name of context.medicationNames ?? []) {
    if (medicationIncludesAnyToken(name, IMMUNOSUPPRESSIVE_MEDICATION_TOKENS)) return true;
  }
  return false;
}

export function detectPolypharmacyFromContext(context: PatientSpecificDischargeContext): boolean {
  const meds = context.medicationNames?.filter((name) => name.trim()).length ?? 0;
  return meds >= POLYPHARMACY_THRESHOLD;
}

export function detectOlderAdultFromContext(context: PatientSpecificDischargeContext): boolean {
  const age = context.patientAgeYears;
  return typeof age === "number" && Number.isFinite(age) && age >= 65;
}

export function buildPatientSpecificDischargeContext(input: {
  patientAgeYears?: number | null;
  patientDob?: string | null;
  diagnosisCodes?: readonly string[];
  diagnosisLabels?: readonly string[];
  medicationNames?: readonly string[];
}): PatientSpecificDischargeContext {
  let patientAgeYears = input.patientAgeYears ?? null;
  if (patientAgeYears == null && input.patientDob?.trim()) {
    try {
      const computed = calculateAge(input.patientDob);
      if (Number.isFinite(computed) && computed >= 0) patientAgeYears = computed;
    } catch {
      patientAgeYears = null;
    }
  }
  return {
    patientAgeYears,
    diagnosisCodes: input.diagnosisCodes?.filter(Boolean),
    diagnosisLabels: input.diagnosisLabels?.filter(Boolean),
    medicationNames: input.medicationNames?.filter(Boolean),
  };
}

export function extractTemplateIdsFromDiagnosisCards(
  cards: readonly ProviderDischargeDiagnosisCard[]
): string[] {
  const ids: string[] = [];
  for (const card of cards) {
    const id =
      card.templateMeta?.templateId ??
      card.sourceTemplateId ??
      card.resolvedTemplateIdAtCreation ??
      "";
    if (id.trim()) ids.push(id.trim());
  }
  return ids;
}

function resolvePatientSignals(
  templateIds: readonly string[],
  context: PatientSpecificDischargeContext
): ResolvedPatientSignals {
  return {
    hasDiabetes: detectDiabetesFromContext(context),
    hasDiabetesComplication: detectDiabetesComplicationFromContext(context),
    hasCkd: detectCkdFromContext(context),
    hasCkdProgression: detectCkdProgressionFromContext(context),
    hasGlp1Medication: detectGlp1MedicationFromContext(context),
    hasAnticoagulantMedication: detectAnticoagulantMedicationFromContext(context),
    hasHeartFailure: detectHeartFailureFromContext(context),
    hasCopd: detectCopdFromContext(context),
    hasAsthma: detectAsthmaFromContext(context),
    hasPregnancy: detectPregnancyFromContext(context),
    hasImmunocompromisedStatus: detectImmunocompromisedFromContext(context),
    isOlderAdult: detectOlderAdultFromContext(context),
    hasPolypharmacy: detectPolypharmacyFromContext(context),
    hasDehydrationSensitiveTemplate: hasTemplateFromGroup(templateIds, DEHYDRATION_SENSITIVE_TEMPLATE_IDS),
    hasRespiratorySensitiveTemplate: hasTemplateFromGroup(templateIds, RESPIRATORY_SENSITIVE_TEMPLATE_IDS),
    hasHeartFailureMonitoringTemplate: hasTemplateFromGroup(
      templateIds,
      HEART_FAILURE_MONITORING_TEMPLATE_IDS
    ),
    hasBehavioralHealthTemplate: hasTemplateFromGroup(templateIds, BEHAVIORAL_HEALTH_TEMPLATE_IDS),
    hasPregnancyTemplate: hasTemplateFromGroup(templateIds, PREGNANCY_TEMPLATE_IDS),
    hasFallRiskRelevantTemplate: hasTemplateFromGroup(templateIds, FALL_RISK_RELEVANT_TEMPLATE_IDS),
    hasRenalSensitiveTemplate: hasTemplateFromGroup(templateIds, RENAL_SENSITIVE_TEMPLATE_IDS),
    hasDiabetesFollowupTemplate: hasTemplateFromGroup(templateIds, DIABETES_FOLLOWUP_TEMPLATE_IDS),
    hasInfectionFeverSensitiveTemplate: hasTemplateFromGroup(
      templateIds,
      INFECTION_FEVER_SENSITIVE_TEMPLATE_IDS
    ),
    hasAnyTemplate: templateIds.length > 0,
  };
}

function isTemplateEligible(rule: PatientSpecificDischargeRule, templateIds: readonly string[]): boolean {
  if (rule.appliesToAllTemplates) return templateIds.length > 0;
  return templateIds.some((id) => rule.appliesToTemplateIds.includes(id));
}

export const PATIENT_SPECIFIC_DISCHARGE_RULES: readonly PatientSpecificDischargeRule[] = [
  {
    id: "anticoagulant_bleeding_neurologic_warning",
    title: "Anticoagulant bleeding and neurologic warning",
    reason: "Blood thinner therapy requires explicit bleeding and head injury precautions without dosing advice.",
    severity: "high_risk",
    source: "anticoagulant",
    appliesToTemplateIds: [],
    appliesToAllTemplates: true,
    clinicalReviewStatus: "reviewed",
    text: {
      en: "Because you take a blood thinner, seek immediate medical attention for uncontrolled bleeding, significant head injury, or new neurological symptoms.",
      fr: "Comme vous prenez un anticoagulant, consultez immédiatement en cas de saignement incontrôlé, de traumatisme crânien important ou de nouveaux symptômes neurologiques.",
    },
    matches: (s) => s.hasAnticoagulantMedication && s.hasAnyTemplate,
  },
  {
    id: "immunocompromised_fever_infection_warning",
    title: "Immunocompromised fever and infection warning",
    reason: "Weakened immune status requires prompt evaluation for fever or infection signs.",
    severity: "high_risk",
    source: "immunocompromised",
    appliesToTemplateIds: INFECTION_FEVER_SENSITIVE_TEMPLATE_IDS,
    clinicalReviewStatus: "reviewed",
    text: {
      en: "Because your immune system may be weakened, seek medical evaluation promptly for fever or signs of infection.",
      fr: "Comme votre système immunitaire peut être affaibli, consultez rapidement en cas de fièvre ou de signes d'infection.",
    },
    matches: (s) => s.hasImmunocompromisedStatus && s.hasInfectionFeverSensitiveTemplate,
  },
  {
    id: "pregnancy_ob_warning",
    title: "Pregnancy obstetric warning",
    reason: "Pregnancy context requires OB escalation guidance without replacing crisis precautions.",
    severity: "high_risk",
    source: "pregnancy",
    appliesToTemplateIds: PREGNANCY_TEMPLATE_IDS,
    clinicalReviewStatus: "reviewed",
    text: {
      en: "Contact your obstetric provider promptly for worsening symptoms, bleeding, decreased fetal movement, or new concerning symptoms.",
      fr: "Contactez rapidement votre obstétricien en cas d'aggravation des symptômes, de saignement, de diminution des mouvements fœtaux ou de nouveaux symptômes inquiétants.",
    },
    matches: (s) => s.hasPregnancy && s.hasPregnancyTemplate,
  },
  {
    id: "older_adult_dehydration_risk",
    title: "Older adult dehydration risk",
    reason: "Age ≥65 with dehydration-sensitive discharge diagnosis.",
    severity: "high_risk",
    source: "age",
    appliesToTemplateIds: DEHYDRATION_SENSITIVE_TEMPLATE_IDS,
    clinicalReviewStatus: "reviewed",
    text: {
      en: "Older adults can become dehydrated more quickly. Seek medical care if weakness, dizziness, confusion, or decreased urination develops.",
      fr: "Les personnes âgées peuvent se déshydrater plus rapidement. Consultez en urgence en cas de faiblesse, étourdissements, confusion ou diminution de la miction.",
    },
    matches: (s) => s.isOlderAdult && s.hasDehydrationSensitiveTemplate,
  },
  {
    id: "older_adult_fall_risk_reminder",
    title: "Older adult fall risk reminder",
    reason: "Age ≥65 with fall-prone discharge presentation.",
    severity: "caution",
    source: "fall_risk",
    appliesToTemplateIds: FALL_RISK_RELEVANT_TEMPLATE_IDS,
    clinicalReviewStatus: "reviewed",
    text: {
      en: "Because you are an older adult, take extra care to prevent falls. Use assistance when standing and avoid sudden movements if you feel weak or dizzy.",
      fr: "Comme vous êtes une personne âgée, prenez des précautions supplémentaires pour éviter les chutes. Demandez de l'aide pour vous lever et évitez les mouvements brusques en cas de faiblesse ou d'étourdissements.",
    },
    matches: (s) => s.isOlderAdult && s.hasFallRiskRelevantTemplate,
  },
  {
    id: "older_adult_confusion_monitoring",
    title: "Older adult confusion monitoring",
    reason: "Age ≥65 with presentations where mental status change may signal deterioration.",
    severity: "caution",
    source: "age",
    appliesToTemplateIds: FALL_RISK_RELEVANT_TEMPLATE_IDS,
    clinicalReviewStatus: "reviewed",
    text: {
      en: "Family or caregivers should monitor for new confusion, difficulty waking, or sudden behavior changes and seek care if these develop.",
      fr: "La famille ou les aidants doivent surveiller toute confusion nouvelle, difficulté à se réveiller ou changement soudain de comportement et consulter si cela apparaît.",
    },
    matches: (s) => s.isOlderAdult && s.hasFallRiskRelevantTemplate,
  },
  {
    id: "heart_failure_symptom_monitoring",
    title: "Heart failure symptom monitoring",
    reason: "Heart failure patients need weight, edema, and dyspnea monitoring during relevant encounters.",
    severity: "caution",
    source: "heart_failure",
    appliesToTemplateIds: HEART_FAILURE_MONITORING_TEMPLATE_IDS,
    clinicalReviewStatus: "reviewed",
    text: {
      en: "Monitor for worsening shortness of breath, rapid weight gain, increasing swelling, or worsening exercise tolerance.",
      fr: "Surveillez toute aggravation de l'essoufflement, prise de poids rapide, gonflement accru ou diminution de la tolérance à l'effort.",
    },
    matches: (s) => s.hasHeartFailure && s.hasHeartFailureMonitoringTemplate,
  },
  {
    id: "copd_asthma_rescue_warning",
    title: "COPD / asthma rescue warning",
    reason: "Respiratory conditions require escalation when rescue therapy fails.",
    severity: "caution",
    source: "respiratory",
    appliesToTemplateIds: RESPIRATORY_SENSITIVE_TEMPLATE_IDS,
    clinicalReviewStatus: "reviewed",
    text: {
      en: "Seek medical attention if breathing becomes more difficult, rescue medications become less effective, or symptoms worsen.",
      fr: "Consultez en cas d'essoufflement accru, si les médicaments de secours deviennent moins efficaces ou si les symptômes s'aggravent.",
    },
    matches: (s) => (s.hasCopd || s.hasAsthma) && s.hasRespiratorySensitiveTemplate,
  },
  {
    id: "diabetes_glucose_monitoring_reduced_intake",
    title: "Diabetes glucose monitoring during reduced oral intake",
    reason: "Diabetes with nausea/vomiting or reduced oral intake increases glycemic risk.",
    severity: "caution",
    source: "diabetes",
    appliesToTemplateIds: DEHYDRATION_SENSITIVE_TEMPLATE_IDS,
    clinicalReviewStatus: "reviewed",
    text: {
      en: "Because you have diabetes, monitor blood glucose closely while your oral intake is reduced.",
      fr: "Comme vous avez du diabète, surveillez attentivement votre glycémie lorsque votre apport oral est réduit.",
    },
    matches: (s) => s.hasDiabetes && s.hasDehydrationSensitiveTemplate,
  },
  {
    id: "diabetes_complication_followup",
    title: "Diabetes complication follow-up",
    reason: "Documented diabetes complications warrant closer outpatient follow-up during illness.",
    severity: "caution",
    source: "diabetes",
    appliesToTemplateIds: DIABETES_FOLLOWUP_TEMPLATE_IDS,
    clinicalReviewStatus: "reviewed",
    text: {
      en: "Because you have diabetes-related complications, follow up promptly with your usual diabetes care team if symptoms persist or worsen.",
      fr: "Comme vous avez des complications liées au diabète, consultez rapidement votre équipe habituelle de soins du diabète si les symptômes persistent ou s'aggravent.",
    },
    matches: (s) => s.hasDiabetesComplication && s.hasDiabetesFollowupTemplate,
  },
  {
    id: "ckd_hydration_importance",
    title: "CKD hydration importance",
    reason: "CKD patients need explicit hydration guidance during vomiting/dehydration-prone encounters.",
    severity: "caution",
    source: "renal",
    appliesToTemplateIds: DEHYDRATION_SENSITIVE_TEMPLATE_IDS,
    clinicalReviewStatus: "reviewed",
    text: {
      en: "Because you have chronic kidney disease, maintaining hydration is especially important.",
      fr: "Comme vous avez une maladie rénale chronique, le maintien d'une bonne hydratation est particulièrement important.",
    },
    matches: (s) => s.hasCkd && s.hasDehydrationSensitiveTemplate,
  },
  {
    id: "ckd_progression_nephrology_followup",
    title: "Advanced CKD nephrology follow-up",
    reason: "Advanced CKD or ESRD context requires nephrology-aware follow-up during fluid-sensitive illness.",
    severity: "caution",
    source: "renal",
    appliesToTemplateIds: RENAL_SENSITIVE_TEMPLATE_IDS,
    clinicalReviewStatus: "reviewed",
    text: {
      en: "Because you have advanced chronic kidney disease, contact your kidney specialist or usual nephrology team if you cannot maintain hydration or symptoms worsen.",
      fr: "Comme vous avez une maladie rénale chronique avancée, contactez votre spécialiste des reins ou votre équipe de néphrologie habituelle si vous ne pouvez pas maintenir une bonne hydratation ou si les symptômes s'aggravent.",
    },
    matches: (s) => s.hasCkdProgression && s.hasRenalSensitiveTemplate,
  },
  {
    id: "diabetes_contact_if_poor_intake",
    title: "Diabetes contact if poor intake persists",
    reason: "Conservative escalation when diabetes and reduced oral intake coexist.",
    severity: "caution",
    source: "diabetes",
    appliesToTemplateIds: DEHYDRATION_SENSITIVE_TEMPLATE_IDS,
    clinicalReviewStatus: "reviewed",
    text: {
      en: "Contact your healthcare provider if blood glucose remains elevated or if you cannot maintain adequate fluid intake.",
      fr: "Contactez votre professionnel de santé si votre glycémie reste élevée ou si vous ne pouvez pas maintenir une prise de liquide adéquate.",
    },
    matches: (s) => s.hasDiabetes && s.hasDehydrationSensitiveTemplate,
  },
  {
    id: "glp1_clinician_contact_persisting_symptoms",
    title: "GLP-1 clinician contact for persistent GI symptoms",
    reason: "GLP-1 therapy context requires prescriber contact without implying causation or dose changes.",
    severity: "caution",
    source: "glp1",
    appliesToTemplateIds: DEHYDRATION_SENSITIVE_TEMPLATE_IDS,
    clinicalReviewStatus: "reviewed",
    text: {
      en: "If you take a GLP-1 medication such as semaglutide or tirzepatide, contact your prescribing clinician if nausea, vomiting, or poor oral intake continues.",
      fr: "Si vous prenez un médicament de type GLP-1 comme la semaglutide ou la tirzepatide, contactez le clinicien prescripteur si les nausées, vomissements ou la faible prise par voie orale persistent.",
    },
    matches: (s) => s.hasGlp1Medication && s.hasDehydrationSensitiveTemplate,
  },
  {
    id: "behavioral_health_followup_support",
    title: "Behavioral health follow-up support",
    reason: "Supplemental follow-up support for behavioral health discharges without replacing crisis precautions.",
    severity: "caution",
    source: "behavioral_health",
    appliesToTemplateIds: BEHAVIORAL_HEALTH_TEMPLATE_IDS,
    clinicalReviewStatus: "reviewed",
    text: {
      en: "Maintain follow-up with your mental health provider and seek immediate assistance if safety concerns arise.",
      fr: "Maintenez le suivi avec votre professionnel de santé mentale et demandez une aide immédiate en cas de préoccupations pour votre sécurité.",
    },
    matches: (s) => s.hasBehavioralHealthTemplate,
  },
  {
    id: "polypharmacy_medication_list_review",
    title: "Polypharmacy medication list review",
    reason: "High medication burden warrants list review without specific medication changes.",
    severity: "info",
    source: "polypharmacy",
    appliesToTemplateIds: [],
    appliesToAllTemplates: true,
    clinicalReviewStatus: "reviewed",
    text: {
      en: "Keep an updated medication list and review any medication concerns with your healthcare provider.",
      fr: "Conservez une liste à jour de vos médicaments et discutez de toute préoccupation médicamenteuse avec votre professionnel de santé.",
    },
    matches: (s) => s.hasPolypharmacy && s.hasAnyTemplate,
  },
] as const;

export function patientSpecificAdditionContainsForbiddenLanguage(text: string): boolean {
  const normalized = normalizeToken(text);
  return PATIENT_SPECIFIC_ADDITION_FORBIDDEN_PHRASES.some((phrase) => normalized.includes(phrase));
}

export function sortPatientSpecificDischargeAdditions(
  additions: PatientSpecificDischargeAddition[]
): PatientSpecificDischargeAddition[] {
  return [...additions].sort((a, b) => {
    const severityDiff = SEVERITY_SORT_ORDER[a.severity] - SEVERITY_SORT_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.id.localeCompare(b.id);
  });
}

export function resolvePatientSpecificDischargeAdditions(input: {
  templateIds: readonly string[];
  context: PatientSpecificDischargeContext;
  locale: SupportedLanguage;
  maxAdditions?: number;
}): PatientSpecificDischargeAddition[] {
  const signals = resolvePatientSignals(input.templateIds, input.context);
  if (!signals.hasAnyTemplate) return [];

  const additions: PatientSpecificDischargeAddition[] = [];
  const seen = new Set<string>();

  for (const rule of PATIENT_SPECIFIC_DISCHARGE_RULES) {
    if (seen.has(rule.id)) continue;
    if (!isTemplateEligible(rule, input.templateIds)) continue;
    if (!rule.matches(signals)) continue;

    const text = rule.text[input.locale] ?? rule.text.en;
    if (patientSpecificAdditionContainsForbiddenLanguage(text)) continue;

    seen.add(rule.id);
    additions.push({
      id: rule.id,
      title: rule.title,
      text,
      reason: rule.reason,
      severity: rule.severity,
      source: rule.source,
      clinicalReviewStatus: rule.clinicalReviewStatus,
    });
  }

  const sorted = sortPatientSpecificDischargeAdditions(additions);
  const limit = input.maxAdditions ?? MAX_PATIENT_SPECIFIC_ADDITIONS;
  return sorted.slice(0, limit);
}

export function buildPatientSpecificDischargeContextFromDocumentation(input: {
  diagnosisCodes?: readonly string[];
  diagnosisLabels?: readonly string[];
  medicationNames?: readonly string[];
  patientDob?: string | null;
  patientAgeYears?: number | null;
}): PatientSpecificDischargeContext {
  return buildPatientSpecificDischargeContext(input);
}

export function buildPatientSpecificDischargeContextFromDischargeJson(
  dischargeSummaryJson: unknown,
  input: {
    patientDob?: string | null;
    patientAgeYears?: number | null;
    medicationNames?: readonly string[];
    historyCodes?: readonly string[];
    historyLabels?: readonly string[];
  } = {}
): PatientSpecificDischargeContext {
  const form = hydrateProviderDischargeDocumentationForm(dischargeSummaryJson);
  const diagnosisCodes = [
    ...(input.historyCodes ?? []),
    ...form.diagnosisRefs.map((r) => r.code),
  ];
  const diagnosisLabels = [
    ...(input.historyLabels ?? []),
    ...form.diagnosisRefs.map((r) => r.label),
  ];
  return buildPatientSpecificDischargeContext({
    patientDob: input.patientDob,
    patientAgeYears: input.patientAgeYears,
    diagnosisCodes,
    diagnosisLabels,
    medicationNames: input.medicationNames,
  });
}
