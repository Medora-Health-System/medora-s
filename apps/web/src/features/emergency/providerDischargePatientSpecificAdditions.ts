/**
 * MEDUI.ED.DISCHARGE.PATIENT_SPECIFIC_ADDITIONS.1
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
  | "glp1";

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
] as const;

const GLP1_MEDICATION_TOKENS = [
  "ozempic",
  "semaglutide",
  "wegovy",
  "mounjaro",
  "tirzepatide",
] as const;

const DIABETES_ICD_PREFIXES = ["E10", "E11", "E13"] as const;
const CKD_ICD_PREFIXES = ["N18"] as const;

const DIABETES_LABEL_TOKENS = ["diabetes", "diabetic", "diabète", "diabétique"] as const;
const CKD_LABEL_TOKENS = [
  "chronic kidney disease",
  "ckd",
  "renal disease",
  "kidney disease",
  "maladie rénale chronique",
  "insuffisance rénale",
] as const;

/** Conservative phrases that must never appear in patient-specific additions. */
export const PATIENT_SPECIFIC_ADDITION_FORBIDDEN_PHRASES = [
  "stop taking",
  "stop your medication",
  "adjust your insulin",
  "adjust your dose",
  "change your dose",
  "caused by ozempic",
  "caused by semaglutide",
  "caused your symptoms",
  "arrêtez de prendre",
  "ajustez votre insuline",
  "modifier votre dose",
] as const;

type ResolvedPatientSignals = {
  hasDiabetes: boolean;
  hasCkd: boolean;
  hasGlp1Medication: boolean;
  isOlderAdult: boolean;
  hasDehydrationSensitiveTemplate: boolean;
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

function medicationIncludesGlp1(name: string): boolean {
  const normalized = normalizeToken(name);
  if (!normalized) return false;
  return GLP1_MEDICATION_TOKENS.some((token) => normalized.includes(token));
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

export function detectCkdFromContext(context: PatientSpecificDischargeContext): boolean {
  for (const code of context.diagnosisCodes ?? []) {
    if (icdStartsWithAny(code, CKD_ICD_PREFIXES)) return true;
  }
  for (const label of context.diagnosisLabels ?? []) {
    if (labelIncludesAny(label, CKD_LABEL_TOKENS)) return true;
  }
  return false;
}

export function detectGlp1MedicationFromContext(context: PatientSpecificDischargeContext): boolean {
  for (const name of context.medicationNames ?? []) {
    if (medicationIncludesGlp1(name)) return true;
  }
  return false;
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
    hasCkd: detectCkdFromContext(context),
    hasGlp1Medication: detectGlp1MedicationFromContext(context),
    isOlderAdult: detectOlderAdultFromContext(context),
    hasDehydrationSensitiveTemplate: templateIds.some(isDehydrationSensitiveTemplateId),
  };
}

export const PATIENT_SPECIFIC_DISCHARGE_RULES: readonly PatientSpecificDischargeRule[] = [
  {
    id: "diabetes_glucose_monitoring_reduced_intake",
    title: "Diabetes glucose monitoring during reduced oral intake",
    reason: "Diabetes with nausea/vomiting or reduced oral intake increases hypoglycemia/hyperglycemia risk.",
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
] as const;

export function patientSpecificAdditionContainsForbiddenLanguage(text: string): boolean {
  const normalized = normalizeToken(text);
  return PATIENT_SPECIFIC_ADDITION_FORBIDDEN_PHRASES.some((phrase) => normalized.includes(phrase));
}

export function resolvePatientSpecificDischargeAdditions(input: {
  templateIds: readonly string[];
  context: PatientSpecificDischargeContext;
  locale: SupportedLanguage;
}): PatientSpecificDischargeAddition[] {
  const signals = resolvePatientSignals(input.templateIds, input.context);
  if (!signals.hasDehydrationSensitiveTemplate) return [];

  const additions: PatientSpecificDischargeAddition[] = [];
  const seen = new Set<string>();

  for (const rule of PATIENT_SPECIFIC_DISCHARGE_RULES) {
    if (seen.has(rule.id)) continue;
    const templateEligible = input.templateIds.some((id) => rule.appliesToTemplateIds.includes(id));
    if (!templateEligible) continue;
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

  return additions;
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
