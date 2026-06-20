/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.1
 * Clinical condition family definitions — additive scaffold; does not replace registry resolution yet.
 *
 * Architecture target:
 *   ICD-10 → Clinical condition family → Evidence-based discharge template → Patient-specific customization
 */

export type ClinicalConditionFamilyReviewStatus = "draft" | "reviewed" | "approved";

export type ClinicalConditionFamilyId =
  | "nausea_vomiting"
  | "cellulitis_skin_infection"
  | "uri_cough"
  | "chest_pain"
  | "abdominal_pain"
  | "headache"
  | "uti_urinary_symptoms"
  | "gastroenteritis_diarrhea"
  | "back_pain"
  | "asthma_wheezing"
  | "pneumonia_lower_respiratory"
  | "hypertension_elevated_bp"
  | "diabetes_hyperglycemia"
  | "type_2_diabetes_non_acute"
  | "trauma_wound_laceration"
  | "dizziness_vertigo"
  | "syncope"
  | "seizure"
  | "behavioral_health_crisis"
  | "obgyn_bleeding_pelvic_pain"
  | "pediatric_uri";

export type ClinicalConditionFamilyAgeGuardrail = {
  /** Family eligible only when patient age is strictly below this value (pediatric). */
  maxAgeYears?: number;
  /** Family eligible only when patient age is at or above this value. */
  minAgeYears?: number;
};

export type ClinicalConditionFamilySexGuardrail = {
  /** Restrict to documented sex when available (future chart context). */
  sex?: "female" | "male";
};

export type ClinicalConditionFamilyGuardrails = {
  age?: ClinicalConditionFamilyAgeGuardrail;
  sex?: ClinicalConditionFamilySexGuardrail;
  /** When true, family requires explicit pregnancy context (future chart context). */
  pregnancyContextRequired?: boolean;
};

/** Maps specific ICD exact codes to alternate templates within the same clinical family. */
export type ClinicalConditionFamilyIcdExactTemplateOverrides = Readonly<Record<string, string>>;

export type ClinicalConditionFamilyDefinition = {
  id: ClinicalConditionFamilyId;
  label: string;
  templateId: string;
  icdExact?: readonly string[];
  icdPrefixes?: readonly string[];
  excludeIcdExact?: readonly string[];
  excludeIcdPrefixes?: readonly string[];
  keywords?: readonly string[];
  icdExactTemplateOverrides?: ClinicalConditionFamilyIcdExactTemplateOverrides;
  guardrails?: ClinicalConditionFamilyGuardrails;
  specialtyCategory: string;
  riskCategory: string;
  clinicalRationale: string;
  reviewStatus: ClinicalConditionFamilyReviewStatus;
  sourceReferenceLabels?: readonly string[];
};

export const CLINICAL_CONDITION_FAMILY_DEFINITIONS: readonly ClinicalConditionFamilyDefinition[] = [
  {
    id: "nausea_vomiting",
    label: "Nausea / Vomiting",
    templateId: "nausea_vomiting_v1",
    icdExact: ["R11.0", "R11.1", "R11.2", "R11.10"],
    icdPrefixes: ["R11"],
    keywords: ["nausea", "vomiting", "emesis"],
    specialtyCategory: "emergency_medicine",
    riskCategory: "low_to_moderate",
    clinicalRationale: "Shared ED discharge guidance for nausea with or without vomiting.",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — Nausea and vomiting"],
  },
  {
    id: "cellulitis_skin_infection",
    label: "Cellulitis / Skin Infection",
    templateId: "cellulitis_v1",
    icdExact: ["L08.9", "L03.90", "L03.115", "L03.116"],
    icdPrefixes: ["L03", "L08"],
    excludeIcdPrefixes: ["L08.0"],
    keywords: ["cellulitis", "skin infection", "abscess"],
    specialtyCategory: "primary_care",
    riskCategory: "low_to_moderate",
    clinicalRationale: "Soft-tissue infection discharge instructions; distinct from wound/laceration trauma care.",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — Cellulitis"],
  },
  {
    id: "uri_cough",
    label: "URI / Cough",
    templateId: "uri_cough_v1",
    icdExact: ["J00", "J06.9"],
    icdPrefixes: ["J06", "R05"],
    keywords: ["upper respiratory infection", "uri", "cough", "common cold", "rhinopharyngitis"],
    specialtyCategory: "primary_care",
    riskCategory: "low_to_moderate",
    clinicalRationale: "Age-neutral URI/cough template; pediatric URI uses separate guarded family.",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — Common cold"],
  },
  {
    id: "pediatric_uri",
    label: "Pediatric URI",
    templateId: "pediatric_uri_v1",
    keywords: ["pediatric uri", "pediatric upper respiratory", "child cold", "rhume enfant"],
    guardrails: { age: { maxAgeYears: 18 } },
    specialtyCategory: "pediatrics",
    riskCategory: "low_to_moderate",
    clinicalRationale: "Pediatric-only URI wording; requires pediatric age context or explicit pediatric keyword.",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — Common cold"],
  },
  {
    id: "chest_pain",
    label: "Chest Pain",
    templateId: "chest_pain_v1",
    icdExact: ["R07.9"],
    icdPrefixes: ["R07"],
    keywords: ["chest pain", "chest discomfort", "douleur thoracique"],
    specialtyCategory: "cardiology",
    riskCategory: "moderate",
    clinicalRationale: "Cardiac-safe return precautions for undifferentiated chest pain discharge.",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — Chest pain"],
  },
  {
    id: "abdominal_pain",
    label: "Abdominal Pain",
    templateId: "abdominal_pain_v1",
    icdPrefixes: ["R10"],
    excludeIcdExact: ["R10.2"],
    keywords: ["abdominal pain", "belly pain", "douleur abdominale"],
    specialtyCategory: "emergency_medicine",
    riskCategory: "moderate",
    clinicalRationale: "General abdominal pain; pelvic pain routed to OB/GYN family.",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — Abdominal pain"],
  },
  {
    id: "headache",
    label: "Headache",
    templateId: "headache_v1",
    icdPrefixes: ["R51", "G44"],
    keywords: ["headache", "migraine", "cephalalgia", "céphalée"],
    specialtyCategory: "neurology",
    riskCategory: "moderate",
    clinicalRationale: "Primary headache discharge; excludes stroke/TIA red-flag templates.",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — Headache"],
  },
  {
    id: "uti_urinary_symptoms",
    label: "UTI / Urinary Symptoms",
    templateId: "uti_v1",
    icdExact: ["N39.0"],
    icdPrefixes: ["R30", "N39"],
    keywords: ["urinary tract infection", "uti", "dysuria", "burning urination"],
    specialtyCategory: "primary_care",
    riskCategory: "low_to_moderate",
    clinicalRationale: "Uncomplicated urinary symptoms and UTI outpatient follow-up.",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — Urinary tract infections"],
  },
  {
    id: "gastroenteritis_diarrhea",
    label: "Gastroenteritis / Diarrhea",
    templateId: "gastroenteritis_v1",
    icdExact: ["R19.7", "A09", "K59.1"],
    icdPrefixes: ["R19", "A08"],
    keywords: ["diarrhea", "gastroenteritis", "loose stool"],
    specialtyCategory: "primary_care",
    riskCategory: "low_to_moderate",
    clinicalRationale: "Acute diarrheal illness; distinct from constipation family (K59.0*).",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — Gastroenteritis"],
  },
  {
    id: "back_pain",
    label: "Back Pain",
    templateId: "back_pain_v1",
    icdPrefixes: ["M54"],
    keywords: ["back pain", "low back pain", "sciatica"],
    specialtyCategory: "primary_care",
    riskCategory: "moderate",
    clinicalRationale: "Musculoskeletal back pain without acute neuro deficit documentation.",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — Back pain"],
  },
  {
    id: "asthma_wheezing",
    label: "Asthma / Wheezing",
    templateId: "asthma_exacerbation_v1",
    icdPrefixes: ["J45"],
    keywords: ["asthma", "wheezing", "asthma exacerbation"],
    specialtyCategory: "pulmonology",
    riskCategory: "moderate",
    clinicalRationale: "Reactive airway disease discharge with inhaler safety language.",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — Asthma"],
  },
  {
    id: "pneumonia_lower_respiratory",
    label: "Pneumonia / Lower Respiratory Infection",
    templateId: "pneumonia_v1",
    icdPrefixes: ["J18", "J15", "J16", "J17"],
    keywords: ["pneumonia"],
    specialtyCategory: "primary_care",
    riskCategory: "moderate",
    clinicalRationale: "Lower respiratory infection requiring outpatient reassessment.",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — Pneumonia"],
  },
  {
    id: "hypertension_elevated_bp",
    label: "Hypertension / Elevated BP",
    templateId: "hypertension_v1",
    icdExact: ["I10", "R03.0"],
    icdPrefixes: ["I10"],
    keywords: ["hypertension", "elevated blood pressure", "high blood pressure"],
    specialtyCategory: "primary_care",
    riskCategory: "moderate",
    clinicalRationale: "Blood pressure chief complaint or known HTN management at discharge.",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — High blood pressure"],
  },
  {
    id: "diabetes_hyperglycemia",
    label: "Diabetes / Hyperglycemia (acute)",
    templateId: "hyperglycemia_v1",
    icdExact: ["E11.65"],
    icdPrefixes: ["R73"],
    keywords: ["hyperglycemia", "high blood sugar"],
    specialtyCategory: "endocrinology",
    riskCategory: "moderate_to_high",
    clinicalRationale: "Acute hyperglycemia symptoms — not stable type 2 outpatient management.",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — High blood sugar"],
  },
  {
    id: "type_2_diabetes_non_acute",
    label: "Type 2 Diabetes (non-acute)",
    templateId: "type_2_diabetes_v1",
    icdExact: ["E11.9"],
    icdPrefixes: ["E11"],
    excludeIcdExact: ["E11.65"],
    keywords: ["type 2 diabetes", "diabetes type 2", "diabète de type 2"],
    specialtyCategory: "primary_care",
    riskCategory: "low_to_moderate",
    clinicalRationale: "Stable type 2 diabetes outpatient instructions without implying acute hyperglycemia crisis.",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — Diabetes type 2"],
  },
  {
    id: "trauma_wound_laceration",
    label: "Trauma / Wound / Laceration",
    templateId: "wound_laceration_v1",
    icdExact: ["S01.01", "T14.1"],
    icdPrefixes: ["S01", "S41", "S51", "S61", "S71", "S81", "S91", "T14"],
    excludeIcdPrefixes: ["L03", "L08"],
    keywords: ["laceration", "wound", "cut", "abrasion", "plaie", "suture"],
    specialtyCategory: "wound_care",
    riskCategory: "low_to_moderate",
    clinicalRationale: "Traumatic wound care; excludes soft-tissue infection family prefixes.",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — Wounds and injuries"],
  },
  {
    id: "dizziness_vertigo",
    label: "Dizziness / Vertigo",
    templateId: "vertigo_dizziness_v1",
    icdExact: ["R42"],
    icdPrefixes: ["H81"],
    keywords: ["dizziness", "vertigo", "lightheaded"],
    specialtyCategory: "primary_care",
    riskCategory: "moderate",
    clinicalRationale: "Peripheral or undifferentiated dizziness discharge instructions.",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — Dizziness and vertigo"],
  },
  {
    id: "syncope",
    label: "Syncope",
    templateId: "syncope_v1",
    icdExact: ["R55"],
    keywords: ["syncope", "fainting", "passed out"],
    specialtyCategory: "cardiology",
    riskCategory: "moderate",
    clinicalRationale: "Transient loss of consciousness outpatient follow-up.",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — Fainting"],
  },
  {
    id: "seizure",
    label: "Seizure",
    templateId: "seizure_v1",
    icdPrefixes: ["G40", "R56"],
    keywords: ["seizure", "convulsion", "epilepsy"],
    specialtyCategory: "neurology",
    riskCategory: "moderate_to_high",
    clinicalRationale: "Post-seizure return precautions and neurology follow-up.",
    reviewStatus: "reviewed",
    sourceReferenceLabels: ["MedlinePlus — Seizures"],
  },
  {
    id: "behavioral_health_crisis",
    label: "Behavioral Health Crisis",
    templateId: "behavioral_health_suicidal_ideation_precautions_v1",
    icdExact: ["R45.851", "F41.0", "F32.9"],
    icdPrefixes: ["F32"],
    keywords: [
      "bh suicidal ideation",
      "suicidal ideation",
      "bh depression crisis",
      "behavioral health crisis",
    ],
    icdExactTemplateOverrides: {
      "F41.0": "behavioral_health_anxiety_panic_symptoms_v1",
      "F32.9": "behavioral_health_depression_crisis_precautions_v1",
    },
    specialtyCategory: "behavioral_health",
    riskCategory: "high",
    clinicalRationale: "Crisis safety planning and behavioral health follow-up; exact-code template overrides for anxiety/depression.",
    reviewStatus: "draft",
    sourceReferenceLabels: ["MedlinePlus — Suicide", "MedlinePlus — Depression"],
  },
  {
    id: "obgyn_bleeding_pelvic_pain",
    label: "OB/GYN Bleeding / Pelvic Pain",
    templateId: "obgyn_vaginal_bleeding_v1",
    icdExact: ["N93.9", "R10.2", "N94.6"],
    icdPrefixes: ["N93"],
    icdExactTemplateOverrides: {
      "R10.2": "obgyn_pelvic_pain_v1",
      "N94.6": "obgyn_dysmenorrhea_v1",
    },
    keywords: ["obgyn vaginal bleeding", "obgyn pelvic pain", "gynecologic bleeding"],
    guardrails: { sex: { sex: "female" }, pregnancyContextRequired: false },
    specialtyCategory: "obgyn",
    riskCategory: "moderate_to_high",
    clinicalRationale: "Gynecologic bleeding and pelvic pain with OB/GYN follow-up; pregnancy-sensitive wording in templates.",
    reviewStatus: "draft",
    sourceReferenceLabels: ["MedlinePlus — Vaginal bleeding", "MedlinePlus — Pelvic pain"],
  },
] as const;

export function getClinicalConditionFamilyById(
  id: ClinicalConditionFamilyId
): ClinicalConditionFamilyDefinition | undefined {
  return CLINICAL_CONDITION_FAMILY_DEFINITIONS.find((f) => f.id === id);
}
