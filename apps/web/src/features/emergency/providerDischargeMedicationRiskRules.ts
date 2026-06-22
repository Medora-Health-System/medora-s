/**
 * MEDUI.ED.DISCHARGE.PATIENT_SPECIFIC_ADDITIONS.3
 * Medication-class-aware discharge guidance — append-only; no dosing or med-change advice.
 */

import type { SupportedLanguage } from "@/i18n/config";
import { resolveProviderDischargeLocaleTextOrNull } from "./providerDischargeLocaleText";
import type {
  ClinicalReviewStatus,
  PatientSpecificDischargeAddition,
  PatientSpecificDischargeAdditionSeverity,
  PatientSpecificDischargeContext,
} from "./providerDischargePatientSpecificAdditions";

export type MedicationRiskClass =
  | "ANTICOAGULANT"
  | "GLP1"
  | "INSULIN"
  | "DIURETIC"
  | "ACE_ARB"
  | "BETA_BLOCKER"
  | "OPIOID"
  | "BENZODIAZEPINE"
  | "IMMUNOSUPPRESSANT"
  | "CHEMOTHERAPY"
  | "ANTIPSYCHOTIC"
  | "SSRI_SNRI";

const DEHYDRATION_SENSITIVE_TEMPLATE_IDS = [
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

const DIABETES_FOLLOWUP_TEMPLATE_IDS = [
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

const INFECTION_FEVER_SENSITIVE_TEMPLATE_IDS = [
  "infectious_fever_unknown_source_v1",
  "pediatric_fever_v1",
  "pneumonia_v1",
  "infectious_pneumonia_followup_v1",
  "infectious_upper_respiratory_infection_v1",
  "infectious_viral_syndrome_v1",
  "cellulitis_v1",
  "sepsis_risk_return_precautions_v1",
  "asthma_exacerbation_v1",
  "copd_exacerbation_v1",
  "pediatric_asthma_exacerbation_v1",
  "pediatric_wheezing_v1",
  "shortness_of_breath_v1",
  "bronchitis_v1",
  "pediatric_rsv_bronchiolitis_v1",
  ...DEHYDRATION_SENSITIVE_TEMPLATE_IDS,
] as const;

export type MedicationRiskRule = {
  id: string;
  medicationClass: MedicationRiskClass;
  severity: PatientSpecificDischargeAdditionSeverity;
  reason: string;
  clinicalReviewStatus: ClinicalReviewStatus;
  text: Record<SupportedLanguage, string>;
  appliesToAllTemplates?: boolean;
  appliesToTemplateIds?: readonly string[];
  matches: (ctx: MedicationRiskMatchContext) => boolean;
};

export type MedicationRiskMatchContext = {
  context: PatientSpecificDischargeContext;
  templateIds: readonly string[];
  detectedClasses: ReadonlySet<MedicationRiskClass>;
  isOlderAdult: boolean;
  hasDehydrationSensitiveTemplate: boolean;
  hasDiabetesFollowupTemplate: boolean;
  hasInfectionFeverSensitiveTemplate: boolean;
  hasAnyTemplate: boolean;
};

const MEDICATION_CLASS_TOKENS: Record<MedicationRiskClass, readonly string[]> = {
  ANTICOAGULANT: [
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
  ],
  GLP1: ["ozempic", "semaglutide", "wegovy", "mounjaro", "tirzepatide"],
  INSULIN: [
    "insulin",
    "glargine",
    "lispro",
    "aspart",
    "humalog",
    "novolog",
    "lantus",
    "tresiba",
    "levemir",
    "novolin",
    "apidra",
  ],
  DIURETIC: ["lasix", "furosemide", "bumex", "bumetanide", "torsemide"],
  ACE_ARB: [
    "lisinopril",
    "enalapril",
    "ramipril",
    "benazepril",
    "losartan",
    "valsartan",
    "irbesartan",
    "olmesartan",
  ],
  BETA_BLOCKER: [
    "metoprolol",
    "carvedilol",
    "atenolol",
    "propranolol",
    "bisoprolol",
    "labetalol",
  ],
  OPIOID: [
    "oxycodone",
    "hydrocodone",
    "morphine",
    "fentanyl",
    "tramadol",
    "codeine",
    "percocet",
    "vicodin",
    "dilaudid",
    "hydromorphone",
    "norco",
  ],
  BENZODIAZEPINE: [
    "lorazepam",
    "alprazolam",
    "diazepam",
    "clonazepam",
    "ativan",
    "xanax",
    "valium",
    "klonopin",
    "midazolam",
  ],
  IMMUNOSUPPRESSANT: [
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
  ],
  CHEMOTHERAPY: [
    "chemotherapy",
    "chemo",
    "paclitaxel",
    "carboplatin",
    "cisplatin",
    "doxorubicin",
    "cyclophosphamide",
    "methotrexate",
    "pembrolizumab",
    "nivolumab",
    "chimiothérapie",
  ],
  ANTIPSYCHOTIC: [
    "haloperidol",
    "olanzapine",
    "quetiapine",
    "risperidone",
    "aripiprazole",
    "ziprasidone",
  ],
  SSRI_SNRI: [
    "sertraline",
    "fluoxetine",
    "escitalopram",
    "citalopram",
    "paroxetine",
    "venlafaxine",
    "duloxetine",
    "lexapro",
    "prozac",
    "zoloft",
    "cymbalta",
  ],
};

/** Phrases that must never appear in medication-risk discharge additions. */
export const MEDICATION_RISK_FORBIDDEN_PHRASES = [
  "stop taking",
  "adjust your insulin",
  "adjust your dose",
  "change your dose",
  "increase your dose",
  "decrease your dose",
  "take extra",
  "take less",
  "units of insulin",
  "arrêtez de prendre",
  "ajustez votre insuline",
  "modifier votre dose",
] as const;

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function medicationIncludesAnyToken(name: string, tokens: readonly string[]): boolean {
  const normalized = normalizeToken(name);
  if (!normalized) return false;
  return tokens.some((token) => normalized.includes(token));
}

function hasTemplateFromGroup(templateIds: readonly string[], group: readonly string[]): boolean {
  return templateIds.some((id) => group.includes(id));
}

export function detectMedicationRiskClasses(
  context: PatientSpecificDischargeContext
): Set<MedicationRiskClass> {
  const detected = new Set<MedicationRiskClass>();
  const meds = context.medicationNames ?? [];
  if (!meds.length) return detected;

  for (const [medClass, tokens] of Object.entries(MEDICATION_CLASS_TOKENS) as Array<
    [MedicationRiskClass, readonly string[]]
  >) {
    for (const name of meds) {
      if (medicationIncludesAnyToken(name, tokens)) {
        detected.add(medClass);
        break;
      }
    }
  }
  return detected;
}

export function detectInsulinMedicationFromContext(context: PatientSpecificDischargeContext): boolean {
  return detectMedicationRiskClasses(context).has("INSULIN");
}

export function detectDiureticMedicationFromContext(context: PatientSpecificDischargeContext): boolean {
  return detectMedicationRiskClasses(context).has("DIURETIC");
}

export function detectOpioidMedicationFromContext(context: PatientSpecificDischargeContext): boolean {
  return detectMedicationRiskClasses(context).has("OPIOID");
}

export function detectBenzodiazepineMedicationFromContext(context: PatientSpecificDischargeContext): boolean {
  return detectMedicationRiskClasses(context).has("BENZODIAZEPINE");
}

export function detectImmunosuppressantMedicationFromContext(
  context: PatientSpecificDischargeContext
): boolean {
  return detectMedicationRiskClasses(context).has("IMMUNOSUPPRESSANT");
}

export function detectChemotherapyMedicationFromContext(context: PatientSpecificDischargeContext): boolean {
  return detectMedicationRiskClasses(context).has("CHEMOTHERAPY");
}

export function detectFallRiskMedicationCombination(context: PatientSpecificDischargeContext): boolean {
  const age = context.patientAgeYears;
  const isOlderAdult = typeof age === "number" && Number.isFinite(age) && age >= 65;
  if (!isOlderAdult) return false;
  const classes = detectMedicationRiskClasses(context);
  return classes.has("OPIOID") || classes.has("BENZODIAZEPINE");
}

function buildMedicationRiskMatchContext(
  templateIds: readonly string[],
  context: PatientSpecificDischargeContext
): MedicationRiskMatchContext {
  const age = context.patientAgeYears;
  return {
    context,
    templateIds,
    detectedClasses: detectMedicationRiskClasses(context),
    isOlderAdult: typeof age === "number" && Number.isFinite(age) && age >= 65,
    hasDehydrationSensitiveTemplate: hasTemplateFromGroup(templateIds, DEHYDRATION_SENSITIVE_TEMPLATE_IDS),
    hasDiabetesFollowupTemplate: hasTemplateFromGroup(templateIds, DIABETES_FOLLOWUP_TEMPLATE_IDS),
    hasInfectionFeverSensitiveTemplate: hasTemplateFromGroup(
      templateIds,
      INFECTION_FEVER_SENSITIVE_TEMPLATE_IDS
    ),
    hasAnyTemplate: templateIds.length > 0,
  };
}

function isMedicationRuleTemplateEligible(
  rule: MedicationRiskRule,
  templateIds: readonly string[]
): boolean {
  if (rule.appliesToAllTemplates) return templateIds.length > 0;
  if (!rule.appliesToTemplateIds?.length) return templateIds.length > 0;
  return templateIds.some((id) => rule.appliesToTemplateIds!.includes(id));
}

export const MEDICATION_RISK_DISCHARGE_RULES: readonly MedicationRiskRule[] = [
  {
    id: "medication_fall_risk_opioid_benzo_older_adult",
    medicationClass: "OPIOID",
    severity: "high_risk",
    reason: "Older adult on sedating medication requires explicit fall and injury prevention guidance.",
    clinicalReviewStatus: "reviewed",
    appliesToAllTemplates: true,
    text: {
      en: "Use extra caution to prevent falls and injuries.",
      fr: "Faites très attention pour éviter les chutes et les blessures.",
    },
    matches: (ctx) =>
      ctx.isOlderAdult &&
      ctx.hasAnyTemplate &&
      (ctx.detectedClasses.has("OPIOID") || ctx.detectedClasses.has("BENZODIAZEPINE")),
  },
  {
    id: "medication_insulin_oral_intake_glucose_monitoring",
    medicationClass: "INSULIN",
    severity: "caution",
    reason: "Insulin therapy during reduced oral intake requires glucose monitoring without dosing advice.",
    clinicalReviewStatus: "reviewed",
    appliesToTemplateIds: [...DEHYDRATION_SENSITIVE_TEMPLATE_IDS, ...DIABETES_FOLLOWUP_TEMPLATE_IDS],
    text: {
      en: "Monitor blood glucose closely and contact your healthcare provider if you are unable to maintain adequate oral intake.",
      fr: "Surveillez attentivement votre glycémie et contactez votre professionnel de santé si vous ne pouvez pas maintenir une prise alimentaire adéquate.",
    },
    matches: (ctx) =>
      ctx.detectedClasses.has("INSULIN") &&
      (ctx.hasDehydrationSensitiveTemplate || ctx.hasDiabetesFollowupTemplate),
  },
  {
    id: "medication_diuretic_dehydration_monitoring",
    medicationClass: "DIURETIC",
    severity: "caution",
    reason: "Diuretic therapy during fluid-sensitive illness requires symptom monitoring without medication changes.",
    clinicalReviewStatus: "reviewed",
    appliesToTemplateIds: DEHYDRATION_SENSITIVE_TEMPLATE_IDS,
    text: {
      en: "Monitor for worsening dizziness, weakness, or signs of dehydration and contact your healthcare provider if symptoms worsen.",
      fr: "Surveillez toute aggravation des étourdissements, de la faiblesse ou des signes de déshydratation et contactez votre professionnel de santé si les symptômes s'aggravent.",
    },
    matches: (ctx) => ctx.detectedClasses.has("DIURETIC") && ctx.hasDehydrationSensitiveTemplate,
  },
  {
    id: "medication_immunosuppressant_infection_warning",
    medicationClass: "IMMUNOSUPPRESSANT",
    severity: "high_risk",
    reason: "Immunosuppressive medication requires infection vigilance without implying medication changes.",
    clinicalReviewStatus: "reviewed",
    appliesToTemplateIds: INFECTION_FEVER_SENSITIVE_TEMPLATE_IDS,
    text: {
      en: "Seek prompt medical evaluation for fever or signs of infection.",
      fr: "Consultez rapidement en cas de fièvre ou de signes d'infection.",
    },
    matches: (ctx) =>
      ctx.detectedClasses.has("IMMUNOSUPPRESSANT") && ctx.hasInfectionFeverSensitiveTemplate,
  },
  {
    id: "medication_chemotherapy_infection_warning",
    medicationClass: "CHEMOTHERAPY",
    severity: "high_risk",
    reason: "Chemotherapy context requires infection vigilance when clinically relevant templates apply.",
    clinicalReviewStatus: "reviewed",
    appliesToTemplateIds: INFECTION_FEVER_SENSITIVE_TEMPLATE_IDS,
    text: {
      en: "Seek prompt medical evaluation for fever or signs of infection.",
      fr: "Consultez rapidement en cas de fièvre ou de signes d'infection.",
    },
    matches: (ctx) => ctx.detectedClasses.has("CHEMOTHERAPY") && ctx.hasInfectionFeverSensitiveTemplate,
  },
  {
    id: "medication_opioid_benzo_alertness_caution",
    medicationClass: "OPIOID",
    severity: "caution",
    reason: "Sedating medications require activity alertness guidance without prescribing recommendations.",
    clinicalReviewStatus: "reviewed",
    appliesToAllTemplates: true,
    text: {
      en: "Use caution with activities requiring alertness if medications cause drowsiness.",
      fr: "Soyez prudent avec les activités nécessitant de la vigilance si vos médicaments provoquent de la somnolence.",
    },
    matches: (ctx) =>
      ctx.hasAnyTemplate &&
      (ctx.detectedClasses.has("OPIOID") || ctx.detectedClasses.has("BENZODIAZEPINE")),
  },
] as const;

export function medicationRiskAdditionContainsForbiddenLanguage(text: string): boolean {
  const normalized = normalizeToken(text);
  return MEDICATION_RISK_FORBIDDEN_PHRASES.some((phrase) => normalized.includes(phrase));
}

export function resolveMedicationRiskDischargeAdditions(input: {
  templateIds: readonly string[];
  context: PatientSpecificDischargeContext;
  locale: SupportedLanguage;
}): PatientSpecificDischargeAddition[] {
  const matchContext = buildMedicationRiskMatchContext(input.templateIds, input.context);
  if (!matchContext.hasAnyTemplate) return [];
  if (matchContext.detectedClasses.size === 0) return [];

  const additions: PatientSpecificDischargeAddition[] = [];
  const seen = new Set<string>();

  for (const rule of MEDICATION_RISK_DISCHARGE_RULES) {
    if (seen.has(rule.id)) continue;
    if (!isMedicationRuleTemplateEligible(rule, input.templateIds)) continue;
    if (!rule.matches(matchContext)) continue;

    const text = resolveProviderDischargeLocaleTextOrNull(rule.text, input.locale);
    if (!text) continue;
    if (medicationRiskAdditionContainsForbiddenLanguage(text)) continue;

    seen.add(rule.id);
    additions.push({
      id: rule.id,
      title: rule.id,
      text,
      reason: rule.reason,
      severity: rule.severity,
      source: "medication",
      clinicalReviewStatus: rule.clinicalReviewStatus,
    });
  }

  return additions;
}

export const MEDICATION_CONTEXT_AVAILABILITY_AUDIT = [
  {
    source: "PatientSpecificDischargeContext.medicationNames",
    location: "providerDischargePatientSpecificAdditions.ts",
    availability: "Optional string[] passed at render time",
    notes: "Primary hook for medication-aware additions",
  },
  {
    source: "EmergencyDispositionPanel patientSpecificDischargeContext",
    location: "EmergencyDispositionPanel.tsx",
    availability: "Optional prop merged with encounter context",
    notes: "ED discharge preview — caller supplies medicationNames when known",
  },
  {
    source: "DischargePrintLayout patientSpecificDischargeContext",
    location: "DischargePrintLayout.tsx",
    availability: "Optional prop for print HTML",
    notes: "Print path — medications not auto-fetched from API yet",
  },
  {
    source: "buildPatientSpecificDischargeContextFromDischargeJson",
    location: "providerDischargePatientSpecificAdditions.ts",
    availability: "Optional medicationNames parameter",
    notes: "ER packet uses DOB + diagnoses; meds when enriched upstream",
  },
  {
    source: "Home medications (triage carry-forward)",
    location: "EmergencyTriageV1Sections.tsx / homeMedicationEntry.ts",
    availability: "Chart/triage documentation — not wired to discharge context by default",
    notes: "Future integration point; Phase 3 uses explicit medicationNames only",
  },
  {
    source: "Active medication orders / MAR",
    location: "erPrintPacket.ts / encounter APIs",
    availability: "Available in ER packet assembly — not auto-mapped to additions",
    notes: "Conservative: no guessing when medication list absent",
  },
] as const;
