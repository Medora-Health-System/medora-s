/**
 * Phase 19Y.2 / 19Y.3 — centralized provider discharge template registry.
 * All clinical suggestion text lives here — not in React UI components.
 */

import {
  computeProviderDischargeTemplateAppliedHash,
} from "./providerDischargeTemplateAppliedHash";
import type { ProviderDischargePediatricDangerSignCategory } from "./providerDischargeTemplatePediatricGovernance";
import type { ProviderDischargeTemplateObGynSafety } from "./providerDischargeTemplateObGynGovernance";
import type { ProviderDischargeTemplateBehavioralHealthSafety } from "./providerDischargeTemplateBehavioralHealthGovernance";
import type { ProviderDischargeTemplateTraumaMskSafety } from "./providerDischargeTemplateTraumaMskGovernance";
import {
  getProviderDischargeSuggestedTextBody,
  type ProviderDischargeTemplateLocale,
  type ProviderDischargeTemplateSuggestedText,
} from "./providerDischargeTemplateLocale";
import {
  BEHAVIORAL_HEALTH_ALCOHOL_INTOXICATION_FOLLOW_UP_SUGGESTED_TEXT,
  BEHAVIORAL_HEALTH_ALCOHOL_WITHDRAWAL_PRECAUTIONS_SUGGESTED_TEXT,
  BEHAVIORAL_HEALTH_ANXIETY_PANIC_SYMPTOMS_SUGGESTED_TEXT,
  BEHAVIORAL_HEALTH_CRISIS_FOLLOW_UP_SUGGESTED_TEXT,
  BEHAVIORAL_HEALTH_DEPRESSION_CRISIS_PRECAUTIONS_SUGGESTED_TEXT,
  BEHAVIORAL_HEALTH_GRIEF_ADJUSTMENT_SUGGESTED_TEXT,
  BEHAVIORAL_HEALTH_INSOMNIA_STRESS_REACTION_SUGGESTED_TEXT,
  BEHAVIORAL_HEALTH_OPIOID_OVERDOSE_AFTERCARE_SUGGESTED_TEXT,
  BEHAVIORAL_HEALTH_SUBSTANCE_USE_RESOURCES_SUGGESTED_TEXT,
  BEHAVIORAL_HEALTH_SUICIDAL_IDEATION_PRECAUTIONS_SUGGESTED_TEXT,
  TRAUMA_MSK_SHOULDER_PAIN_SUGGESTED_TEXT,
  TRAUMA_MSK_WRIST_SPRAIN_SUGGESTED_TEXT,
  TRAUMA_MSK_ANKLE_SPRAIN_SUGGESTED_TEXT,
  TRAUMA_MSK_BACK_STRAIN_SUGGESTED_TEXT,
  TRAUMA_MSK_CONTUSION_SUGGESTED_TEXT,
  TRAUMA_MSK_KNEE_INJURY_SUGGESTED_TEXT,
  TRAUMA_MSK_MINOR_FRACTURE_PRECAUTIONS_SUGGESTED_TEXT,
  TRAUMA_MSK_MVC_SORENESS_SUGGESTED_TEXT,
  TRAUMA_MSK_NECK_STRAIN_SUGGESTED_TEXT,
  TRAUMA_MSK_RIB_INJURY_SUGGESTED_TEXT,
  ABDOMINAL_PAIN_SUGGESTED_TEXT,
  ALCOHOL_INTOXICATION_SUGGESTED_TEXT,
  ALLERGIC_REACTION_SUGGESTED_TEXT,
  ANXIETY_PANIC_SUGGESTED_TEXT,
  ASTHMA_EXACERBATION_SUGGESTED_TEXT,
  BACK_PAIN_SUGGESTED_TEXT,
  BRONCHITIS_SUGGESTED_TEXT,
  CELLULITIS_SUGGESTED_TEXT,
  CHEST_PAIN_SUGGESTED_TEXT,
  CHEST_WALL_PAIN_SUGGESTED_TEXT,
  CONSTIPATION_SUGGESTED_TEXT,
  COPD_EXACERBATION_SUGGESTED_TEXT,
  DEHYDRATION_SUGGESTED_TEXT,
  DENTAL_PAIN_SUGGESTED_TEXT,
  EPISTAXIS_SUGGESTED_TEXT,
  GASTROENTERITIS_SUGGESTED_TEXT,
  GENERIC_ED_DISCHARGE_SUGGESTED_TEXT,
  HEADACHE_SUGGESTED_TEXT,
  HYPERGLYCEMIA_SUGGESTED_TEXT,
  HYPOGLYCEMIA_SUGGESTED_TEXT,
  HYPERTENSION_SUGGESTED_TEXT,
  KIDNEY_STONE_SUGGESTED_TEXT,
  MINOR_HEAD_INJURY_SUGGESTED_TEXT,
  NAUSEA_VOMITING_SUGGESTED_TEXT,
  OBGYN_DYSMENORRHEA_SUGGESTED_TEXT,
  OBGYN_EARLY_PREGNANCY_SYMPTOMS_SUGGESTED_TEXT,
  OBGYN_HYPEREMESIS_SUGGESTED_TEXT,
  OBGYN_PELVIC_PAIN_SUGGESTED_TEXT,
  OBGYN_POSTPARTUM_WARNING_SUGGESTED_TEXT,
  OBGYN_ROUND_LIGAMENT_PAIN_SUGGESTED_TEXT,
  OBGYN_THREATENED_MISCARRIAGE_PRECAUTIONS_SUGGESTED_TEXT,
  OBGYN_UTI_PREGNANCY_PRECAUTIONS_SUGGESTED_TEXT,
  OBGYN_VAGINAL_BLEEDING_SUGGESTED_TEXT,
  OBGYN_VAGINITIS_SUGGESTED_TEXT,
  OTITIS_PHARYNGITIS_SUGGESTED_TEXT,
  PALPITATIONS_SUGGESTED_TEXT,
  PEDIATRIC_ASTHMA_EXACERBATION_SUGGESTED_TEXT,
  PEDIATRIC_CONCUSSION_SUGGESTED_TEXT,
  PEDIATRIC_CONSTIPATION_SUGGESTED_TEXT,
  PEDIATRIC_CROUP_SUGGESTED_TEXT,
  PEDIATRIC_DEHYDRATION_ESCALATION_SUGGESTED_TEXT,
  PEDIATRIC_FEBRILE_SEIZURE_SUGGESTED_TEXT,
  PEDIATRIC_FEVER_SUGGESTED_TEXT,
  PEDIATRIC_GASTROENTERITIS_SUGGESTED_TEXT,
  PEDIATRIC_INFLUENZA_LIKE_ILLNESS_SUGGESTED_TEXT,
  PEDIATRIC_MILD_DEHYDRATION_SUGGESTED_TEXT,
  PEDIATRIC_MINOR_HEAD_INJURY_SUGGESTED_TEXT,
  PEDIATRIC_OTITIS_MEDIA_SUGGESTED_TEXT,
  PEDIATRIC_ABDOMINAL_PAIN_SUGGESTED_TEXT,
  PEDIATRIC_ALLERGIC_REACTION_SUGGESTED_TEXT,
  PEDIATRIC_RASH_SUGGESTED_TEXT,
  PEDIATRIC_RSV_BRONCHIOLITIS_SUGGESTED_TEXT,
  PEDIATRIC_URI_SUGGESTED_TEXT,
  PEDIATRIC_VIRAL_SYNDROME_SUGGESTED_TEXT,
  PEDIATRIC_VOMITING_SUGGESTED_TEXT,
  PEDIATRIC_WHEEZING_SUGGESTED_TEXT,
  PNEUMONIA_SUGGESTED_TEXT,
  SEIZURE_SUGGESTED_TEXT,
  SHORTNESS_OF_BREATH_SUGGESTED_TEXT,
  SYNCOPE_SUGGESTED_TEXT,
  TIA_STROKE_LIKE_SUGGESTED_TEXT,
  URI_COUGH_SUGGESTED_TEXT,
  UTI_SUGGESTED_TEXT,
  VERTIGO_DIZZINESS_SUGGESTED_TEXT,
  WOUND_LACERATION_SUGGESTED_TEXT,
} from "./providerDischargeTemplateSuggestedTextCatalog";
import {
  newDefaultFollowUpRow,
  newDiagnosisDocId,
  type ProviderDischargeDiagnosisCard,
  type ProviderDischargeFollowUpRow,
} from "./providerDischargeDocumentationModel";
import { buildAppliedDiagnosisInstructionsFromTemplateBody } from "./providerDischargeTemplatePediatricGovernance";

export type ProviderDischargeTemplateMatchLevel = "icdExact" | "icdFamily" | "keyword" | "generic";

export type ProviderDischargeClinicalReviewStatus = "draft" | "reviewed" | "approved";

export type ProviderDischargeTemplateSourceReference = {
  label: string;
  url?: string;
  publisher?: string;
  accessedAt?: string;
};

export type ProviderDischargeTemplateAgeRangeLabel = "pediatric" | "adolescent" | "adult" | "all_ages";

export type ProviderDischargeTemplateAgeRange = {
  minAgeDays?: number;
  maxAgeDays?: number;
  label: ProviderDischargeTemplateAgeRangeLabel;
};

export type ProviderDischargeEscalationSeverity = "routine" | "urgent" | "emergency";

export type ProviderDischargeTemplate = {
  id: string;
  version: string;
  title: string;
  /** Governance metadata — not shown in patient UI; not used for billing. */
  specialtyCategory?: string;
  riskCategory?: string;
  /** Phase 19Y.6A — optional age governance; required for pediatric templates. */
  ageRange?: ProviderDischargeTemplateAgeRange;
  /** Phase 19Y.6A / 19Y.7 — pediatric-only governance metadata. */
  requiresCaregiverAcknowledgement?: boolean;
  escalationSeverity?: ProviderDischargeEscalationSeverity;
  /** Phase 19Y.7A — minimum escalation language/content floor for pediatric safety. */
  minimumEscalationLevel?: ProviderDischargeEscalationSeverity;
  requiresReevaluationWarning?: boolean;
  requiresCaregiverObservationWindow?: boolean;
  caregiverObservationWindowHours?: number;
  requiredDangerSignCategories?: readonly ProviderDischargePediatricDangerSignCategory[];
  /** Phase 19Y.9 — OB/GYN safety governance metadata (not shown in UI). */
  obGynSafety?: ProviderDischargeTemplateObGynSafety;
  /** Phase 19Y.11 — behavioral health / substance-use safety governance metadata (not shown in UI). */
  behavioralHealthSafety?: ProviderDischargeTemplateBehavioralHealthSafety;
  /** Phase 19Y.13 — trauma / MSK safety governance metadata (not shown in UI). */
  traumaMskSafety?: ProviderDischargeTemplateTraumaMskSafety;
  clinicalReviewStatus: ProviderDischargeClinicalReviewStatus;
  effectiveFrom: string;
  effectiveTo?: string;
  /** Metadata-only counter; not incremented at runtime in this phase. */
  timesApplied?: number;
  diagnosisMappings: {
    icdExact?: string[];
    icdFamily?: string[];
    keyword?: string[];
  };
  sourceReferences: ProviderDischargeTemplateSourceReference[];
  defaultFollowUps?: ProviderDischargeFollowUpRow[];
  suggestedText: ProviderDischargeTemplateSuggestedText;
};

export type { ProviderDischargeTemplateLocale, ProviderDischargeTemplateSuggestedText } from "./providerDischargeTemplateLocale";
export type { ProviderDischargeTemplateObGynSafety } from "./providerDischargeTemplateObGynGovernance";
export type { ProviderDischargeTemplateBehavioralHealthSafety } from "./providerDischargeTemplateBehavioralHealthGovernance";
export type { ProviderDischargeTemplateTraumaMskSafety } from "./providerDischargeTemplateTraumaMskGovernance";

export type ProviderDischargeTemplateResolveResult = {
  template: ProviderDischargeTemplate;
  matchLevel: ProviderDischargeTemplateMatchLevel;
};

export const GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID = "generic_ed_discharge_v1";

/** Phase 19Y.3 — first billing-supportive ED diagnosis template batch. */
export const BATCH_1_ED_DISCHARGE_TEMPLATE_IDS = [
  "chest_pain_v1",
  "abdominal_pain_v1",
  "headache_v1",
  "uri_cough_v1",
  "uti_v1",
  "wound_laceration_v1",
] as const;

/** Phase 19Y.4 — high-volume ED diagnosis template batch 2. */
export const BATCH_2_ED_DISCHARGE_TEMPLATE_IDS = [
  "nausea_vomiting_v1",
  "gastroenteritis_v1",
  "back_pain_v1",
  "dental_pain_v1",
  "otitis_pharyngitis_v1",
  "hypertension_v1",
  "cellulitis_v1",
  "dehydration_v1",
] as const;

/** Phase 19Y.5 — moderate-risk ED diagnosis template batch 3. */
export const BATCH_3_ED_DISCHARGE_TEMPLATE_IDS = [
  "asthma_exacerbation_v1",
  "copd_exacerbation_v1",
  "bronchitis_v1",
  "pneumonia_v1",
  "syncope_v1",
  "vertigo_dizziness_v1",
  "kidney_stone_v1",
  "constipation_v1",
  "allergic_reaction_v1",
  "minor_head_injury_v1",
] as const;

/** Phase 19Y.6 — higher-risk ED diagnosis template batch 4. */
export const BATCH_4_ED_DISCHARGE_TEMPLATE_IDS = [
  "tia_stroke_like_v1",
  "seizure_v1",
  "palpitations_v1",
  "shortness_of_breath_v1",
  "chest_wall_pain_v1",
  "epistaxis_v1",
  "hypoglycemia_v1",
  "hyperglycemia_v1",
  "alcohol_intoxication_v1",
  "anxiety_panic_v1",
] as const;

/** Phase 19Y.7 — pediatric-safe ED discharge template batch 5. */
export const BATCH_5_PEDIATRIC_ED_DISCHARGE_TEMPLATE_IDS = [
  "pediatric_fever_v1",
  "pediatric_viral_syndrome_v1",
  "pediatric_uri_v1",
  "pediatric_otitis_media_v1",
  "pediatric_gastroenteritis_v1",
  "pediatric_mild_dehydration_v1",
  "pediatric_constipation_v1",
  "pediatric_asthma_exacerbation_v1",
  "pediatric_rash_v1",
  "pediatric_minor_head_injury_v1",
] as const;

/** Phase 19Y.8 — higher-risk pediatric ED discharge template batch 6. */
export const BATCH_6_PEDIATRIC_HIGHER_RISK_ED_DISCHARGE_TEMPLATE_IDS = [
  "pediatric_febrile_seizure_v1",
  "pediatric_abdominal_pain_v1",
  "pediatric_vomiting_v1",
  "pediatric_dehydration_escalation_v1",
  "pediatric_rsv_bronchiolitis_v1",
  "pediatric_croup_v1",
  "pediatric_allergic_reaction_v1",
  "pediatric_concussion_v1",
  "pediatric_wheezing_v1",
  "pediatric_influenza_like_illness_v1",
] as const;

/** Phase 19Y.10 — OB/GYN higher-risk ED discharge template batch 7. */
export const BATCH_7_OBGYN_ED_DISCHARGE_TEMPLATE_IDS = [
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

/** Phase 19Y.12 — behavioral health & substance-use ED discharge template batch 8. */
export const BATCH_8_BEHAVIORAL_HEALTH_ED_DISCHARGE_TEMPLATE_IDS = [
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
] as const;

/** Phase 19Y.14 — trauma & MSK ED discharge template batch 9. */
export const BATCH_9_TRAUMA_MSK_ED_DISCHARGE_TEMPLATE_IDS = [
  "trauma_msk_ankle_sprain_v1",
  "trauma_msk_wrist_sprain_v1",
  "trauma_msk_knee_injury_v1",
  "trauma_msk_shoulder_pain_v1",
  "trauma_msk_back_strain_v1",
  "trauma_msk_neck_strain_v1",
  "trauma_msk_contusion_v1",
  "trauma_msk_rib_injury_v1",
  "trauma_msk_minor_fracture_precautions_v1",
  "trauma_msk_mvc_soreness_v1",
] as const;

const ACCESSED_AT = "2026-05-18";
const GOVERNANCE_EFFECTIVE_FROM = "2026-05-18";

const BATCH_GOVERNANCE_DRAFT = {
  clinicalReviewStatus: "draft" as const,
  effectiveFrom: GOVERNANCE_EFFECTIVE_FROM,
};

const PEDIATRIC_TEMPLATE_GOVERNANCE = {
  ...BATCH_GOVERNANCE_DRAFT,
  ageRange: { label: "pediatric" as const, minAgeDays: 0, maxAgeDays: 17 * 365 },
  requiresCaregiverAcknowledgement: true as const,
  specialtyCategory: "pediatrics",
  riskCategory: "moderate",
};

const PEDIATRIC_HIGHER_RISK_TEMPLATE_GOVERNANCE = {
  ...PEDIATRIC_TEMPLATE_GOVERNANCE,
  riskCategory: "high",
};

const OBGYN_TEMPLATE_GOVERNANCE = {
  ...BATCH_GOVERNANCE_DRAFT,
  specialtyCategory: "obgyn",
  riskCategory: "high",
};

const BEHAVIORAL_HEALTH_TEMPLATE_GOVERNANCE = {
  ...BATCH_GOVERNANCE_DRAFT,
  specialtyCategory: "behavioral_health",
  riskCategory: "high",
};

const TRAUMA_MSK_TEMPLATE_GOVERNANCE = {
  ...BATCH_GOVERNANCE_DRAFT,
  specialtyCategory: "orthopedics",
  riskCategory: "moderate",
};

/** @deprecated Use BATCH_GOVERNANCE_DRAFT */
const BATCH_1_GOVERNANCE = BATCH_GOVERNANCE_DRAFT;

function registryFollowUp(
  id: string,
  specialty: string,
  timing: string,
  comments = ""
): ProviderDischargeFollowUpRow {
  return {
    ...newDefaultFollowUpRow(),
    id,
    specialty,
    timing,
    comments,
  };
}

export const PROVIDER_DISCHARGE_TEMPLATE_REGISTRY: readonly ProviderDischargeTemplate[] = [
  {
    id: "chest_pain_v1",
    version: "1.1.0",
    title: "Chest pain discharge documentation",
    specialtyCategory: "cardiology",
    riskCategory: "moderate",
    ...BATCH_1_GOVERNANCE,
    diagnosisMappings: {
      icdExact: ["R07.9"],
      icdFamily: ["R07"],
      keyword: ["chest pain", "chest discomfort", "chest pressure", "douleur thoracique"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Chest pain",
        url: "https://medlineplus.gov/chestpain.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "MedlinePlus — Angina",
        url: "https://medlineplus.gov/angina.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("chest-pcp", "PRIMARY_CARE", "within 1–2 weeks"),
      registryFollowUp("chest-cardiology", "CARDIOLOGY", "as clinically appropriate"),
    ],
    suggestedText: CHEST_PAIN_SUGGESTED_TEXT,
  },
  {
    id: "abdominal_pain_v1",
    version: "1.0.0",
    title: "Abdominal pain discharge documentation",
    specialtyCategory: "emergency_medicine",
    riskCategory: "moderate",
    ...BATCH_1_GOVERNANCE,
    diagnosisMappings: {
      icdFamily: ["R10"],
      keyword: [
        "abdominal pain",
        "belly pain",
        "epigastric pain",
        "rlq pain",
        "llq pain",
        "douleur abdominale",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Abdominal pain",
        url: "https://medlineplus.gov/abdominalpain.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "MedlinePlus — Digestive diseases",
        url: "https://medlineplus.gov/digestivediseases.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("abd-pcp", "PRIMARY_CARE", "within 1–2 weeks"),
      registryFollowUp("abd-gi", "GASTROENTEROLOGY", "as clinically appropriate"),
      registryFollowUp("abd-surgery", "GENERAL_SURGERY", "as clinically appropriate"),
    ],
    suggestedText: ABDOMINAL_PAIN_SUGGESTED_TEXT,
  },
  {
    id: "headache_v1",
    version: "1.0.0",
    title: "Headache discharge documentation",
    specialtyCategory: "neurology",
    riskCategory: "moderate",
    ...BATCH_1_GOVERNANCE,
    diagnosisMappings: {
      icdFamily: ["R51"],
      keyword: ["headache", "migraine", "head pain", "cephalalgia", "céphalée"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Headache",
        url: "https://medlineplus.gov/headache.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "MedlinePlus — Migraine",
        url: "https://medlineplus.gov/migraine.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("headache-pcp", "PRIMARY_CARE", "within 1–2 weeks"),
      registryFollowUp("headache-neuro", "NEUROLOGY", "for recurrent or severe symptoms"),
    ],
    suggestedText: HEADACHE_SUGGESTED_TEXT,
  },
  {
    id: "uri_cough_v1",
    version: "1.0.0",
    title: "URI / cough discharge documentation",
    specialtyCategory: "primary_care",
    riskCategory: "low_to_moderate",
    ...BATCH_1_GOVERNANCE,
    diagnosisMappings: {
      icdFamily: ["J06", "R05"],
      keyword: [
        "upper respiratory infection",
        "uri",
        "cough",
        "congestion",
        "common cold",
        "rhinopharyngitis",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Common cold",
        url: "https://medlineplus.gov/commoncold.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "CDC — Common illnesses and antibiotics",
        url: "https://www.cdc.gov/antibiotic-use/common-illnesses.html",
        publisher: "U.S. Centers for Disease Control and Prevention (CDC)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("uri-pcp", "PRIMARY_CARE", "if symptoms persist or worsen")],
    suggestedText: URI_COUGH_SUGGESTED_TEXT,
  },
  {
    id: "uti_v1",
    version: "1.0.0",
    title: "UTI / urinary symptoms discharge documentation",
    specialtyCategory: "primary_care",
    riskCategory: "low_to_moderate",
    ...BATCH_1_GOVERNANCE,
    diagnosisMappings: {
      icdExact: ["N39.0"],
      icdFamily: ["R30", "N39"],
      keyword: [
        "urinary tract infection",
        "uti",
        "dysuria",
        "urinary symptoms",
        "burning urination",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Urinary tract infections",
        url: "https://medlineplus.gov/urinarytractinfections.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("uti-pcp", "PRIMARY_CARE", "within 1–2 weeks or as directed"),
      registryFollowUp("uti-urology", "UROLOGY", "for recurrent or complicated symptoms"),
    ],
    suggestedText: UTI_SUGGESTED_TEXT,
  },
  {
    id: "wound_laceration_v1",
    version: "1.1.0",
    title: "Laceration / wound discharge documentation",
    specialtyCategory: "wound_care",
    riskCategory: "low_to_moderate",
    ...BATCH_1_GOVERNANCE,
    diagnosisMappings: {
      icdExact: ["S01.01", "T14.1"],
      icdFamily: ["S01", "S41", "S51", "S61", "S71", "S81", "S91", "T14"],
      keyword: ["laceration", "wound", "cut", "abrasion", "plaie", "suture"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Wounds and injuries",
        url: "https://medlineplus.gov/woundsandinjuries.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "AAST — Patient resources",
        url: "https://www.aast.org/resources/patient-resources",
        publisher: "American Association for the Surgery of Trauma (AAST)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("wound-pcp", "PRIMARY_CARE", "as directed"),
      registryFollowUp("wound-care", "WOUND_CARE", "3–5 days if advised"),
      registryFollowUp("wound-ed-recheck", "ED_RECHECK", "for wound check or suture removal if advised"),
    ],
    suggestedText: WOUND_LACERATION_SUGGESTED_TEXT,
  },
  {
    id: "nausea_vomiting_v1",
    version: "1.0.0",
    title: "Nausea / vomiting discharge documentation",
    specialtyCategory: "emergency_medicine",
    riskCategory: "low_to_moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["R11"],
      keyword: ["nausea", "vomiting", "emesis"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Nausea and vomiting",
        url: "https://medlineplus.gov/nauseaandvomiting.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("nausea-pcp", "PRIMARY_CARE", "if symptoms persist or worsen")],
    suggestedText: NAUSEA_VOMITING_SUGGESTED_TEXT,
  },
  {
    id: "gastroenteritis_v1",
    version: "1.0.0",
    title: "Gastroenteritis / diarrhea discharge documentation",
    specialtyCategory: "primary_care",
    riskCategory: "low_to_moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdExact: ["R19.7"],
      icdFamily: ["R19", "A08"],
      keyword: ["diarrhea", "gastroenteritis", "loose stool"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Gastroenteritis",
        url: "https://medlineplus.gov/gastroenteritis.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "MedlinePlus — Diarrhea",
        url: "https://medlineplus.gov/diarrhea.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "CDC — Antibiotic use and common illnesses",
        url: "https://www.cdc.gov/antibiotic-use/common-illnesses.html",
        publisher: "U.S. Centers for Disease Control and Prevention (CDC)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("gastro-pcp", "PRIMARY_CARE", "if symptoms persist or worsen")],
    suggestedText: GASTROENTERITIS_SUGGESTED_TEXT,
  },
  {
    id: "back_pain_v1",
    version: "1.0.0",
    title: "Back pain / sciatica discharge documentation",
    specialtyCategory: "primary_care",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["M54"],
      keyword: ["back pain", "low back pain", "sciatica"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Back pain",
        url: "https://medlineplus.gov/backpain.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "MedlinePlus — Sciatica",
        url: "https://medlineplus.gov/sciatica.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("back-pcp", "PRIMARY_CARE", "within 1–2 weeks"),
      registryFollowUp("back-ortho", "ORTHOPEDICS", "for persistent or recurrent symptoms"),
    ],
    suggestedText: BACK_PAIN_SUGGESTED_TEXT,
  },
  {
    id: "dental_pain_v1",
    version: "1.0.0",
    title: "Dental pain discharge documentation",
    specialtyCategory: "dental",
    riskCategory: "low_to_moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["K08", "K04"],
      keyword: ["dental pain", "tooth pain", "dental infection", "toothache"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Tooth disorders",
        url: "https://medlineplus.gov/toothdisorders.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("dental-fu", "PRIMARY_CARE", "within several days", "Dentist or oral surgery as directed"),
    ],
    suggestedText: DENTAL_PAIN_SUGGESTED_TEXT,
  },
  {
    id: "otitis_pharyngitis_v1",
    version: "1.0.0",
    title: "Otitis / pharyngitis discharge documentation",
    specialtyCategory: "primary_care",
    riskCategory: "low_to_moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["H66", "J02"],
      keyword: ["ear pain", "otitis", "sore throat", "pharyngitis"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Ear infections",
        url: "https://medlineplus.gov/earinfections.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "MedlinePlus — Pharyngitis",
        url: "https://medlineplus.gov/pharyngitis.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("otitis-pcp", "PRIMARY_CARE", "if symptoms persist or worsen"),
      registryFollowUp("otitis-ent", "ENT", "for recurrent or worsening symptoms"),
    ],
    suggestedText: OTITIS_PHARYNGITIS_SUGGESTED_TEXT,
  },
  {
    id: "hypertension_v1",
    version: "1.0.0",
    title: "Hypertension / elevated blood pressure discharge documentation",
    specialtyCategory: "primary_care",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdExact: ["I10", "R03.0"],
      icdFamily: ["I10"],
      keyword: ["hypertension", "elevated blood pressure", "high blood pressure"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — High blood pressure",
        url: "https://medlineplus.gov/highbloodpressure.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("htn-pcp", "PRIMARY_CARE", "within 1–2 weeks"),
      registryFollowUp("htn-cardiology", "CARDIOLOGY", "as clinically appropriate"),
    ],
    suggestedText: HYPERTENSION_SUGGESTED_TEXT,
  },
  {
    id: "cellulitis_v1",
    version: "1.0.0",
    title: "Cellulitis / skin infection discharge documentation",
    specialtyCategory: "primary_care",
    riskCategory: "low_to_moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["L03"],
      keyword: ["cellulitis", "skin infection", "abscess"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Cellulitis",
        url: "https://medlineplus.gov/cellulitis.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("cellulitis-pcp", "PRIMARY_CARE", "within several days or as directed"),
      registryFollowUp("cellulitis-wound", "WOUND_CARE", "if worsening or recurrent"),
    ],
    suggestedText: CELLULITIS_SUGGESTED_TEXT,
  },
  {
    id: "dehydration_v1",
    version: "1.0.0",
    title: "Dehydration discharge documentation",
    specialtyCategory: "primary_care",
    riskCategory: "low_to_moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdExact: ["E86.0"],
      keyword: ["dehydration", "volume depletion"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Dehydration",
        url: "https://medlineplus.gov/dehydration.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("dehydration-pcp", "PRIMARY_CARE", "if symptoms persist or worsen")],
    suggestedText: DEHYDRATION_SUGGESTED_TEXT,
  },
  {
    id: "asthma_exacerbation_v1",
    version: "1.0.0",
    title: "Asthma exacerbation discharge documentation",
    specialtyCategory: "pulmonology",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["J45"],
      keyword: ["asthma", "wheezing", "asthma exacerbation"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Asthma",
        url: "https://medlineplus.gov/asthma.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "NHLBI — Asthma",
        url: "https://www.nhlbi.nih.gov/health/asthma",
        publisher: "U.S. National Heart, Lung, and Blood Institute (NHLBI)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("asthma-pcp", "PRIMARY_CARE", "within 1–2 weeks"),
      registryFollowUp("asthma-pulm", "PULMONOLOGY", "for recurrent or severe symptoms"),
    ],
    suggestedText: ASTHMA_EXACERBATION_SUGGESTED_TEXT,
  },
  {
    id: "copd_exacerbation_v1",
    version: "1.0.0",
    title: "COPD exacerbation discharge documentation",
    specialtyCategory: "pulmonology",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["J44"],
      keyword: ["copd", "chronic obstructive pulmonary disease", "copd exacerbation"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — COPD",
        url: "https://medlineplus.gov/copd.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "NHLBI — COPD",
        url: "https://www.nhlbi.nih.gov/health/copd",
        publisher: "U.S. National Heart, Lung, and Blood Institute (NHLBI)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("copd-pcp", "PRIMARY_CARE", "within 1–2 weeks"),
      registryFollowUp("copd-pulm", "PULMONOLOGY", "as clinically appropriate"),
    ],
    suggestedText: COPD_EXACERBATION_SUGGESTED_TEXT,
  },
  {
    id: "bronchitis_v1",
    version: "1.0.0",
    title: "Bronchitis discharge documentation",
    specialtyCategory: "primary_care",
    riskCategory: "low_to_moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["J20", "J40"],
      keyword: ["bronchitis"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Bronchitis",
        url: "https://medlineplus.gov/bronchitis.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "CDC — Antibiotic use and common illnesses",
        url: "https://www.cdc.gov/antibiotic-use/common-illnesses.html",
        publisher: "U.S. Centers for Disease Control and Prevention (CDC)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("bronchitis-pcp", "PRIMARY_CARE", "if symptoms persist or worsen")],
    suggestedText: BRONCHITIS_SUGGESTED_TEXT,
  },
  {
    id: "pneumonia_v1",
    version: "1.0.0",
    title: "Pneumonia discharge documentation",
    specialtyCategory: "primary_care",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["J18", "J15", "J16", "J17"],
      keyword: ["pneumonia"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Pneumonia",
        url: "https://medlineplus.gov/pneumonia.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "CDC — Pneumonia",
        url: "https://www.cdc.gov/pneumonia/index.html",
        publisher: "U.S. Centers for Disease Control and Prevention (CDC)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("pneumonia-pcp", "PRIMARY_CARE", "within several days or as directed"),
      registryFollowUp("pneumonia-pulm", "PULMONOLOGY", "for recurrent or complicated illness"),
    ],
    suggestedText: PNEUMONIA_SUGGESTED_TEXT,
  },
  {
    id: "syncope_v1",
    version: "1.0.0",
    title: "Syncope discharge documentation",
    specialtyCategory: "cardiology",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdExact: ["R55"],
      keyword: ["syncope", "fainting", "passed out"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Fainting",
        url: "https://medlineplus.gov/fainting.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("syncope-pcp", "PRIMARY_CARE", "within 1–2 weeks"),
      registryFollowUp("syncope-cardiology", "CARDIOLOGY", "as clinically appropriate"),
    ],
    suggestedText: SYNCOPE_SUGGESTED_TEXT,
  },
  {
    id: "vertigo_dizziness_v1",
    version: "1.0.0",
    title: "Vertigo / dizziness discharge documentation",
    specialtyCategory: "primary_care",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdExact: ["R42"],
      icdFamily: ["H81"],
      keyword: ["dizziness", "vertigo", "lightheaded"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Dizziness and vertigo",
        url: "https://medlineplus.gov/dizzinessandvertigo.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("vertigo-pcp", "PRIMARY_CARE", "within 1–2 weeks"),
      registryFollowUp("vertigo-ent", "ENT", "for persistent vestibular symptoms"),
      registryFollowUp("vertigo-neuro", "NEUROLOGY", "for persistent or recurrent symptoms"),
    ],
    suggestedText: VERTIGO_DIZZINESS_SUGGESTED_TEXT,
  },
  {
    id: "kidney_stone_v1",
    version: "1.0.0",
    title: "Kidney stone / flank pain discharge documentation",
    specialtyCategory: "urology",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["N20", "R31"],
      keyword: ["kidney stone", "renal colic", "flank pain"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Kidney stones",
        url: "https://medlineplus.gov/kidneystones.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("stone-urology", "UROLOGY", "within several days or as directed"),
      registryFollowUp("stone-pcp", "PRIMARY_CARE", "as clinically appropriate"),
    ],
    suggestedText: KIDNEY_STONE_SUGGESTED_TEXT,
  },
  {
    id: "constipation_v1",
    version: "1.0.0",
    title: "Constipation discharge documentation",
    specialtyCategory: "primary_care",
    riskCategory: "low_to_moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdExact: ["K59.00"],
      icdFamily: ["K59"],
      keyword: ["constipation"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Constipation",
        url: "https://medlineplus.gov/constipation.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("constipation-pcp", "PRIMARY_CARE", "if symptoms persist or worsen"),
      registryFollowUp("constipation-gi", "GASTROENTEROLOGY", "for persistent or recurrent symptoms"),
    ],
    suggestedText: CONSTIPATION_SUGGESTED_TEXT,
  },
  {
    id: "allergic_reaction_v1",
    version: "1.0.0",
    title: "Allergic reaction (non-anaphylaxis) discharge documentation",
    specialtyCategory: "allergy_immunology",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["T78.40", "L50"],
      keyword: ["allergic reaction", "hives", "urticaria", "rash allergy"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Allergy",
        url: "https://medlineplus.gov/allergy.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "MedlinePlus — Hives",
        url: "https://medlineplus.gov/hives.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("allergy-pcp", "PRIMARY_CARE", "within several days or as directed"),
      registryFollowUp("allergy-imm", "PRIMARY_CARE", "Allergy / Immunology if recurrent or trigger unclear"),
    ],
    suggestedText: ALLERGIC_REACTION_SUGGESTED_TEXT,
  },
  {
    id: "minor_head_injury_v1",
    version: "1.0.0",
    title: "Minor head injury / concussion discharge documentation",
    specialtyCategory: "primary_care",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["S06.0", "S09"],
      keyword: ["concussion", "minor head injury", "head injury"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Concussion",
        url: "https://medlineplus.gov/concussion.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "CDC — HEADS UP concussion information",
        url: "https://www.cdc.gov/heads-up/index.html",
        publisher: "U.S. Centers for Disease Control and Prevention (CDC)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("head-pcp", "PRIMARY_CARE", "within several days or as directed"),
      registryFollowUp("head-neuro", "NEUROLOGY", "for persistent concussion symptoms"),
    ],
    suggestedText: MINOR_HEAD_INJURY_SUGGESTED_TEXT,
  },
  {
    id: "tia_stroke_like_v1",
    version: "1.0.0",
    title: "TIA / stroke-like symptoms discharge documentation",
    specialtyCategory: "neurology",
    riskCategory: "high",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdExact: ["R29.818"],
      icdFamily: ["G45", "R47"],
      keyword: [
        "tia",
        "transient ischemic attack",
        "stroke-like symptoms",
        "weakness",
        "numbness",
        "speech difficulty",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Stroke",
        url: "https://medlineplus.gov/stroke.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "NINDS — Transient Ischemic Attack",
        url: "https://www.ninds.nih.gov/health-information/disorders/transient-ischemic-attack",
        publisher: "U.S. National Institute of Neurological Disorders and Stroke (NINDS)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("tia-neuro", "NEUROLOGY", "within several days or as directed"),
      registryFollowUp("tia-pcp", "PRIMARY_CARE", "as clinically appropriate"),
    ],
    suggestedText: TIA_STROKE_LIKE_SUGGESTED_TEXT,
  },
  {
    id: "seizure_v1",
    version: "1.0.0",
    title: "Seizure discharge documentation",
    specialtyCategory: "neurology",
    riskCategory: "high",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["R56", "G40"],
      keyword: ["seizure", "convulsion"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Seizures",
        url: "https://medlineplus.gov/seizures.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "NINDS — Epilepsy and Seizures",
        url: "https://www.ninds.nih.gov/health-information/disorders/epilepsy-and-seizures",
        publisher: "U.S. National Institute of Neurological Disorders and Stroke (NINDS)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("seizure-neuro", "NEUROLOGY", "within several days or as directed"),
      registryFollowUp("seizure-pcp", "PRIMARY_CARE", "as clinically appropriate"),
    ],
    suggestedText: SEIZURE_SUGGESTED_TEXT,
  },
  {
    id: "palpitations_v1",
    version: "1.0.0",
    title: "Palpitations discharge documentation",
    specialtyCategory: "cardiology",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdExact: ["R00.2"],
      keyword: ["palpitations", "heart racing", "irregular heartbeat"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Heart palpitations",
        url: "https://medlineplus.gov/heartpalpitations.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("palp-pcp", "PRIMARY_CARE", "within 1–2 weeks"),
      registryFollowUp("palp-cardiology", "CARDIOLOGY", "as clinically appropriate"),
    ],
    suggestedText: PALPITATIONS_SUGGESTED_TEXT,
  },
  {
    id: "shortness_of_breath_v1",
    version: "1.0.0",
    title: "Shortness of breath discharge documentation",
    specialtyCategory: "pulmonology",
    riskCategory: "moderate_to_high",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdExact: ["R06.02"],
      icdFamily: ["R06"],
      keyword: ["shortness of breath", "dyspnea", "difficulty breathing"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Breathing problems",
        url: "https://medlineplus.gov/breathingproblems.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "NHLBI — Shortness of breath",
        url: "https://www.nhlbi.nih.gov/health/shortness-breath",
        publisher: "U.S. National Heart, Lung, and Blood Institute (NHLBI)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("sob-pcp", "PRIMARY_CARE", "within several days or as directed"),
      registryFollowUp("sob-pulm", "PULMONOLOGY", "as clinically appropriate"),
      registryFollowUp("sob-cardiology", "CARDIOLOGY", "as clinically appropriate"),
    ],
    suggestedText: SHORTNESS_OF_BREATH_SUGGESTED_TEXT,
  },
  {
    id: "chest_wall_pain_v1",
    version: "1.0.0",
    title: "Chest wall pain discharge documentation",
    specialtyCategory: "primary_care",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdExact: ["R07.89", "M94.0"],
      keyword: ["chest wall pain", "costochondritis", "musculoskeletal chest pain"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Chest pain",
        url: "https://medlineplus.gov/chestpain.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("chestwall-pcp", "PRIMARY_CARE", "within 1–2 weeks or as directed")],
    suggestedText: CHEST_WALL_PAIN_SUGGESTED_TEXT,
  },
  {
    id: "epistaxis_v1",
    version: "1.0.0",
    title: "Epistaxis discharge documentation",
    specialtyCategory: "ent",
    riskCategory: "low_to_moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdExact: ["R04.0"],
      keyword: ["epistaxis", "nosebleed"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Nosebleed",
        url: "https://medlineplus.gov/nosebleed.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("epistaxis-pcp", "PRIMARY_CARE", "if bleeding recurs"),
      registryFollowUp("epistaxis-ent", "ENT", "for recurrent or persistent bleeding"),
    ],
    suggestedText: EPISTAXIS_SUGGESTED_TEXT,
  },
  {
    id: "hypoglycemia_v1",
    version: "1.0.0",
    title: "Hypoglycemia discharge documentation",
    specialtyCategory: "endocrinology",
    riskCategory: "moderate_to_high",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdExact: ["E16.2", "E11.649"],
      keyword: ["hypoglycemia", "low blood sugar"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Low blood sugar",
        url: "https://medlineplus.gov/lowbloodsugar.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("hypo-pcp", "PRIMARY_CARE", "within several days or as directed"),
      registryFollowUp("hypo-endo", "PRIMARY_CARE", "Endocrinology follow-up as directed"),
    ],
    suggestedText: HYPOGLYCEMIA_SUGGESTED_TEXT,
  },
  {
    id: "hyperglycemia_v1",
    version: "1.0.0",
    title: "Hyperglycemia discharge documentation",
    specialtyCategory: "endocrinology",
    riskCategory: "moderate_to_high",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdExact: ["E11.65"],
      icdFamily: ["R73"],
      keyword: ["hyperglycemia", "high blood sugar"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — High blood sugar",
        url: "https://medlineplus.gov/highbloodsugar.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("hyper-pcp", "PRIMARY_CARE", "within several days or as directed"),
      registryFollowUp("hyper-endo", "PRIMARY_CARE", "Endocrinology follow-up as directed"),
    ],
    suggestedText: HYPERGLYCEMIA_SUGGESTED_TEXT,
  },
  {
    id: "alcohol_intoxication_v1",
    version: "1.0.0",
    title: "Alcohol intoxication discharge documentation",
    specialtyCategory: "behavioral_health",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["F10.92", "F10"],
      keyword: ["alcohol intoxication", "intoxication", "alcohol use"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Alcohol use disorder",
        url: "https://medlineplus.gov/alcoholusedisorderaud.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "NIAAA — Alcohol and your health",
        url: "https://www.niaaa.nih.gov/alcohols-effects-health",
        publisher: "U.S. National Institute on Alcohol Abuse and Alcoholism (NIAAA)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("alc-pcp", "PRIMARY_CARE", "within several days or as directed"),
      registryFollowUp("alc-bh", "PSYCHIATRY", "Behavioral health / substance-use resources as appropriate"),
    ],
    suggestedText: ALCOHOL_INTOXICATION_SUGGESTED_TEXT,
  },
  {
    id: "anxiety_panic_v1",
    version: "1.0.0",
    title: "Anxiety / panic symptoms discharge documentation",
    specialtyCategory: "behavioral_health",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["F41"],
      keyword: ["anxiety", "panic", "panic attack"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Anxiety",
        url: "https://medlineplus.gov/anxiety.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("anx-pcp", "PRIMARY_CARE", "within 1–2 weeks"),
      registryFollowUp("anx-bh", "PSYCHIATRY", "Behavioral health follow-up as appropriate"),
    ],
    suggestedText: ANXIETY_PANIC_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_fever_v1",
    version: "1.0.0",
    title: "Pediatric fever discharge documentation",
    ...PEDIATRIC_TEMPLATE_GOVERNANCE,
    escalationSeverity: "urgent",
    minimumEscalationLevel: "urgent",
    requiredDangerSignCategories: [
      "dehydration",
      "breathing_difficulty",
      "lethargy",
      "seizure",
      "trouble_waking",
      "worsening_symptoms",
    ],
    diagnosisMappings: {
      icdExact: ["R50.9"],
      icdFamily: ["R50"],
      keyword: ["pediatric fever", "child fever", "infant fever", "fièvre enfant"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Fever",
        url: "https://medlineplus.gov/fever.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("pf-pcp", "PRIMARY_CARE", "within 1–3 days if fever persists"),
      registryFollowUp("pf-peds", "PEDIATRICS", "as clinically appropriate"),
    ],
    suggestedText: PEDIATRIC_FEVER_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_viral_syndrome_v1",
    version: "1.0.0",
    title: "Pediatric viral syndrome discharge documentation",
    ...PEDIATRIC_TEMPLATE_GOVERNANCE,
    escalationSeverity: "routine",
    minimumEscalationLevel: "routine",
    requiredDangerSignCategories: [
      "dehydration",
      "breathing_difficulty",
      "lethargy",
      "worsening_symptoms",
    ],
    diagnosisMappings: {
      icdExact: ["B34.9", "R68.89"],
      keyword: ["pediatric viral", "viral syndrome child", "child viral illness"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Viral infections",
        url: "https://medlineplus.gov/viralinfections.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("pvs-pcp", "PRIMARY_CARE", "if symptoms persist beyond expected recovery")],
    suggestedText: PEDIATRIC_VIRAL_SYNDROME_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_uri_v1",
    version: "1.0.0",
    title: "Pediatric URI discharge documentation",
    ...PEDIATRIC_TEMPLATE_GOVERNANCE,
    escalationSeverity: "routine",
    minimumEscalationLevel: "routine",
    requiredDangerSignCategories: [
      "breathing_difficulty",
      "dehydration",
      "blue_lips",
      "poor_intake",
      "worsening_symptoms",
    ],
    diagnosisMappings: {
      icdExact: ["J00"],
      icdFamily: ["J00"],
      keyword: ["pediatric uri", "pediatric upper respiratory", "child cold", "rhume enfant"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Common cold",
        url: "https://medlineplus.gov/commoncold.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("puri-pcp", "PRIMARY_CARE", "if symptoms persist or worsen")],
    suggestedText: PEDIATRIC_URI_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_otitis_media_v1",
    version: "1.0.0",
    title: "Pediatric otitis media discharge documentation",
    ...PEDIATRIC_TEMPLATE_GOVERNANCE,
    escalationSeverity: "urgent",
    minimumEscalationLevel: "urgent",
    requiredDangerSignCategories: ["lethargy", "worsening_symptoms"],
    diagnosisMappings: {
      icdExact: ["H66.90"],
      keyword: ["pediatric otitis", "child ear infection", "otitis media child", "otalgie enfant"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Ear infections",
        url: "https://medlineplus.gov/earinfections.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("pot-peds", "PEDIATRICS", "within 1–2 weeks"),
      registryFollowUp("pot-pcp", "PRIMARY_CARE", "as clinically appropriate"),
    ],
    suggestedText: PEDIATRIC_OTITIS_MEDIA_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_gastroenteritis_v1",
    version: "1.0.0",
    title: "Pediatric gastroenteritis discharge documentation",
    ...PEDIATRIC_TEMPLATE_GOVERNANCE,
    escalationSeverity: "urgent",
    minimumEscalationLevel: "urgent",
    requiredDangerSignCategories: [
      "dehydration",
      "persistent_vomiting",
      "lethargy",
      "worsening_symptoms",
    ],
    diagnosisMappings: {
      icdExact: ["A08.39"],
      keyword: ["pediatric gastroenteritis", "child vomiting diarrhea", "gastro-entérite enfant"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Viral gastroenteritis",
        url: "https://medlineplus.gov/viralgastroenteritis.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("pg-pcp", "PRIMARY_CARE", "if symptoms persist beyond expected recovery")],
    suggestedText: PEDIATRIC_GASTROENTERITIS_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_mild_dehydration_v1",
    version: "1.0.0",
    title: "Pediatric mild dehydration discharge documentation",
    ...PEDIATRIC_TEMPLATE_GOVERNANCE,
    escalationSeverity: "urgent",
    minimumEscalationLevel: "urgent",
    requiredDangerSignCategories: [
      "dehydration",
      "lethargy",
      "trouble_waking",
      "persistent_vomiting",
    ],
    diagnosisMappings: {
      icdExact: ["P74.1"],
      keyword: ["pediatric dehydration", "child dehydration", "déshydratation enfant"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Dehydration",
        url: "https://medlineplus.gov/dehydration.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("pmd-pcp", "PRIMARY_CARE", "if hydration concerns persist")],
    suggestedText: PEDIATRIC_MILD_DEHYDRATION_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_constipation_v1",
    version: "1.0.0",
    title: "Pediatric constipation discharge documentation",
    ...PEDIATRIC_TEMPLATE_GOVERNANCE,
    escalationSeverity: "routine",
    minimumEscalationLevel: "routine",
    requiredDangerSignCategories: ["persistent_vomiting", "worsening_symptoms"],
    diagnosisMappings: {
      icdExact: ["K59.03"],
      keyword: ["pediatric constipation", "child constipation", "constipation enfant"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Constipation in children",
        url: "https://medlineplus.gov/constipationinchildren.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("pc-pcp", "PRIMARY_CARE", "if symptoms persist")],
    suggestedText: PEDIATRIC_CONSTIPATION_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_asthma_exacerbation_v1",
    version: "1.0.0",
    title: "Pediatric asthma exacerbation discharge documentation",
    ...PEDIATRIC_TEMPLATE_GOVERNANCE,
    escalationSeverity: "urgent",
    minimumEscalationLevel: "urgent",
    requiresReevaluationWarning: true,
    requiredDangerSignCategories: [
      "breathing_difficulty",
      "blue_lips",
      "worsening_symptoms",
    ],
    diagnosisMappings: {
      keyword: ["pediatric asthma", "child wheezing", "pediatric wheezing", "asthme enfant"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Asthma in children",
        url: "https://medlineplus.gov/asthmainchildren.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("pa-peds", "PEDIATRICS", "within 1–2 weeks"),
      registryFollowUp("pa-pcp", "PRIMARY_CARE", "as clinically appropriate"),
    ],
    suggestedText: PEDIATRIC_ASTHMA_EXACERBATION_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_rash_v1",
    version: "1.0.0",
    title: "Pediatric rash discharge documentation",
    ...PEDIATRIC_TEMPLATE_GOVERNANCE,
    escalationSeverity: "urgent",
    minimumEscalationLevel: "urgent",
    requiredDangerSignCategories: [
      "breathing_difficulty",
      "lethargy",
      "worsening_symptoms",
    ],
    diagnosisMappings: {
      icdExact: ["R21"],
      keyword: ["pediatric rash", "child rash", "infant rash", "éruption enfant"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Rashes",
        url: "https://medlineplus.gov/rashes.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("pr-pcp", "PRIMARY_CARE", "if rash spreads or concerns develop")],
    suggestedText: PEDIATRIC_RASH_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_minor_head_injury_v1",
    version: "1.0.0",
    title: "Pediatric minor head injury discharge documentation",
    ...PEDIATRIC_TEMPLATE_GOVERNANCE,
    escalationSeverity: "emergency",
    minimumEscalationLevel: "urgent",
    requiresReevaluationWarning: true,
    requiresCaregiverObservationWindow: true,
    caregiverObservationWindowHours: 24,
    requiredDangerSignCategories: [
      "persistent_vomiting",
      "confusion_behavior",
      "trouble_waking",
      "seizure",
    ],
    diagnosisMappings: {
      icdExact: ["S00.93XA"],
      keyword: ["pediatric head injury", "child head injury", "minor head injury child", "traumatisme crânien enfant"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Head injuries",
        url: "https://medlineplus.gov/headinjuries.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("ph-pcp", "PRIMARY_CARE", "if new or worsening symptoms develop")],
    suggestedText: PEDIATRIC_MINOR_HEAD_INJURY_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_febrile_seizure_v1",
    version: "1.0.0",
    title: "Pediatric febrile seizure discharge documentation",
    ...PEDIATRIC_HIGHER_RISK_TEMPLATE_GOVERNANCE,
    escalationSeverity: "emergency",
    minimumEscalationLevel: "urgent",
    requiresReevaluationWarning: true,
    requiredDangerSignCategories: [
      "seizure",
      "breathing_difficulty",
      "lethargy",
      "confusion_behavior",
      "worsening_symptoms",
    ],
    diagnosisMappings: {
      icdExact: ["R56.00"],
      keyword: ["febrile seizure", "febrile convulsion", "crise convulsive fébrile", "convulsion fébrile"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Febrile seizures",
        url: "https://medlineplus.gov/febrileseizures.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("pfs-peds", "PEDIATRICS", "within 1–2 weeks"),
      registryFollowUp("pfs-pcp", "PRIMARY_CARE", "as clinically appropriate"),
    ],
    suggestedText: PEDIATRIC_FEBRILE_SEIZURE_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_abdominal_pain_v1",
    version: "1.0.0",
    title: "Pediatric abdominal pain discharge documentation",
    ...PEDIATRIC_HIGHER_RISK_TEMPLATE_GOVERNANCE,
    escalationSeverity: "urgent",
    minimumEscalationLevel: "urgent",
    requiredDangerSignCategories: [
      "persistent_vomiting",
      "worsening_symptoms",
      "dehydration",
      "lethargy",
    ],
    diagnosisMappings: {
      keyword: [
        "pediatric abdominal pain",
        "child abdominal pain",
        "belly pain child",
        "douleur abdominale enfant",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Abdominal pain",
        url: "https://medlineplus.gov/abdominalpain.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("pap-pcp", "PRIMARY_CARE", "if symptoms persist or worsen")],
    suggestedText: PEDIATRIC_ABDOMINAL_PAIN_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_vomiting_v1",
    version: "1.0.0",
    title: "Pediatric vomiting discharge documentation",
    ...PEDIATRIC_HIGHER_RISK_TEMPLATE_GOVERNANCE,
    escalationSeverity: "urgent",
    minimumEscalationLevel: "urgent",
    requiredDangerSignCategories: [
      "persistent_vomiting",
      "dehydration",
      "lethargy",
      "worsening_symptoms",
    ],
    diagnosisMappings: {
      keyword: ["pediatric vomiting", "child vomiting", "vomissements enfant", "vomiting child"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Nausea and vomiting",
        url: "https://medlineplus.gov/nauseaandvomiting.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("pv-pcp", "PRIMARY_CARE", "if vomiting persists beyond expected recovery")],
    suggestedText: PEDIATRIC_VOMITING_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_dehydration_escalation_v1",
    version: "1.0.0",
    title: "Pediatric dehydration escalation discharge documentation",
    ...PEDIATRIC_HIGHER_RISK_TEMPLATE_GOVERNANCE,
    escalationSeverity: "emergency",
    minimumEscalationLevel: "urgent",
    requiresReevaluationWarning: true,
    requiredDangerSignCategories: [
      "dehydration",
      "lethargy",
      "poor_intake",
      "trouble_waking",
      "persistent_vomiting",
    ],
    diagnosisMappings: {
      keyword: [
        "pediatric dehydration escalation",
        "child severe dehydration",
        "déshydratation sévère enfant",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Dehydration",
        url: "https://medlineplus.gov/dehydration.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("pde-pcp", "PRIMARY_CARE", "if hydration concerns persist")],
    suggestedText: PEDIATRIC_DEHYDRATION_ESCALATION_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_rsv_bronchiolitis_v1",
    version: "1.0.0",
    title: "Pediatric RSV / bronchiolitis discharge documentation",
    ...PEDIATRIC_HIGHER_RISK_TEMPLATE_GOVERNANCE,
    escalationSeverity: "urgent",
    minimumEscalationLevel: "urgent",
    requiredDangerSignCategories: [
      "breathing_difficulty",
      "blue_lips",
      "poor_intake",
      "dehydration",
      "worsening_symptoms",
    ],
    diagnosisMappings: {
      icdExact: ["J21.0", "J21.9"],
      keyword: ["pediatric bronchiolitis", "rsv child", "bronchiolite enfant", "vrs enfant"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Bronchiolitis",
        url: "https://medlineplus.gov/bronchiolitis.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "CDC — Respiratory syncytial virus (RSV)",
        url: "https://www.cdc.gov/rsv/",
        publisher: "Centers for Disease Control and Prevention (CDC)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("prsv-peds", "PEDIATRICS", "if breathing symptoms persist or worsen")],
    suggestedText: PEDIATRIC_RSV_BRONCHIOLITIS_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_croup_v1",
    version: "1.0.0",
    title: "Pediatric croup discharge documentation",
    ...PEDIATRIC_HIGHER_RISK_TEMPLATE_GOVERNANCE,
    escalationSeverity: "urgent",
    minimumEscalationLevel: "urgent",
    requiredDangerSignCategories: [
      "breathing_difficulty",
      "blue_lips",
      "lethargy",
      "worsening_symptoms",
    ],
    diagnosisMappings: {
      icdExact: ["J05.0"],
      keyword: ["pediatric croup", "croup child", "croup enfant", "laryngotracheitis"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Croup",
        url: "https://medlineplus.gov/croup.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("pcr-peds", "PEDIATRICS", "if breathing symptoms recur or worsen")],
    suggestedText: PEDIATRIC_CROUP_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_allergic_reaction_v1",
    version: "1.0.0",
    title: "Pediatric allergic reaction discharge documentation",
    ...PEDIATRIC_HIGHER_RISK_TEMPLATE_GOVERNANCE,
    escalationSeverity: "emergency",
    minimumEscalationLevel: "urgent",
    requiresReevaluationWarning: true,
    requiredDangerSignCategories: [
      "breathing_difficulty",
      "worsening_symptoms",
      "persistent_vomiting",
    ],
    diagnosisMappings: {
      keyword: [
        "pediatric allergic reaction",
        "child allergic reaction",
        "réaction allergique enfant",
        "allergie enfant",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Food allergy",
        url: "https://medlineplus.gov/foodallergy.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("par-pcp", "PRIMARY_CARE", "for allergy follow-up as arranged")],
    suggestedText: PEDIATRIC_ALLERGIC_REACTION_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_concussion_v1",
    version: "1.0.0",
    title: "Pediatric concussion discharge documentation",
    ...PEDIATRIC_HIGHER_RISK_TEMPLATE_GOVERNANCE,
    escalationSeverity: "emergency",
    minimumEscalationLevel: "urgent",
    requiresReevaluationWarning: true,
    requiresCaregiverObservationWindow: true,
    caregiverObservationWindowHours: 24,
    requiredDangerSignCategories: [
      "persistent_vomiting",
      "confusion_behavior",
      "trouble_waking",
      "seizure",
    ],
    diagnosisMappings: {
      keyword: [
        "pediatric concussion",
        "child concussion",
        "commotion cérébrale enfant",
        "commotion enfant",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Concussion",
        url: "https://medlineplus.gov/concussion.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "NIH/NINDS — Concussion",
        url: "https://www.ninds.nih.gov/health-information/disorders/concussion",
        publisher: "National Institute of Neurological Disorders and Stroke (NINDS)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("pcn-pcp", "PRIMARY_CARE", "if new or worsening symptoms develop")],
    suggestedText: PEDIATRIC_CONCUSSION_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_wheezing_v1",
    version: "1.0.0",
    title: "Pediatric wheezing discharge documentation",
    ...PEDIATRIC_HIGHER_RISK_TEMPLATE_GOVERNANCE,
    escalationSeverity: "urgent",
    minimumEscalationLevel: "urgent",
    requiresReevaluationWarning: true,
    requiredDangerSignCategories: [
      "breathing_difficulty",
      "blue_lips",
      "worsening_symptoms",
      "poor_intake",
    ],
    diagnosisMappings: {
      icdExact: ["R06.2"],
      keyword: [
        "pediatric wheezing illness",
        "infant wheezing",
        "toddler wheezing",
        "sibilances enfant",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Wheezing",
        url: "https://medlineplus.gov/wheezing.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("pw-peds", "PEDIATRICS", "within 1–2 weeks"),
      registryFollowUp("pw-pcp", "PRIMARY_CARE", "as clinically appropriate"),
    ],
    suggestedText: PEDIATRIC_WHEEZING_SUGGESTED_TEXT,
  },
  {
    id: "pediatric_influenza_like_illness_v1",
    version: "1.0.0",
    title: "Pediatric influenza-like illness discharge documentation",
    ...PEDIATRIC_HIGHER_RISK_TEMPLATE_GOVERNANCE,
    escalationSeverity: "urgent",
    minimumEscalationLevel: "urgent",
    requiredDangerSignCategories: [
      "breathing_difficulty",
      "dehydration",
      "lethargy",
      "worsening_symptoms",
      "trouble_waking",
    ],
    diagnosisMappings: {
      icdExact: ["J11.1"],
      icdFamily: ["J10"],
      keyword: ["pediatric influenza", "flu-like illness child", "grippe enfant", "syndrome grippal enfant"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Flu",
        url: "https://medlineplus.gov/flu.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "CDC — Influenza (Flu)",
        url: "https://www.cdc.gov/flu/",
        publisher: "Centers for Disease Control and Prevention (CDC)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("pflu-pcp", "PRIMARY_CARE", "if symptoms persist or worsen")],
    suggestedText: PEDIATRIC_INFLUENZA_LIKE_ILLNESS_SUGGESTED_TEXT,
  },
  {
    id: "obgyn_vaginal_bleeding_v1",
    version: "1.0.0",
    title: "OB/GYN vaginal bleeding discharge documentation",
    ...OBGYN_TEMPLATE_GOVERNANCE,
    obGynSafety: {
      pregnancySensitive: true,
      requiresPregnancyStatusDocumentation: true,
      requiresBleedingPrecautions: true,
      requiresEctopicPrecautions: true,
      requiresOBGynFollowUp: true,
    },
    diagnosisMappings: {
      icdExact: ["N93.9"],
      icdFamily: ["N93"],
      keyword: ["obgyn vaginal bleeding", "gynecologic bleeding", "saignements vaginaux obgyn"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Vaginal bleeding",
        url: "https://medlineplus.gov/vaginalbleeding.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("ovb-ob", "OBGYN", "within 1–2 days or as directed")],
    suggestedText: OBGYN_VAGINAL_BLEEDING_SUGGESTED_TEXT,
  },
  {
    id: "obgyn_pelvic_pain_v1",
    version: "1.0.0",
    title: "OB/GYN pelvic pain discharge documentation",
    ...OBGYN_TEMPLATE_GOVERNANCE,
    obGynSafety: {
      pregnancySensitive: true,
      requiresPregnancyStatusDocumentation: true,
      requiresPelvicPainPrecautions: true,
      requiresEctopicPrecautions: true,
      requiresOBGynFollowUp: true,
    },
    diagnosisMappings: {
      icdExact: ["R10.2"],
      keyword: ["obgyn pelvic pain", "gynecologic pelvic pain", "douleur pelvienne obgyn"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Pelvic pain",
        url: "https://medlineplus.gov/pelvicpain.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("opp-ob", "OBGYN", "within 1–2 days or as directed")],
    suggestedText: OBGYN_PELVIC_PAIN_SUGGESTED_TEXT,
  },
  {
    id: "obgyn_dysmenorrhea_v1",
    version: "1.0.0",
    title: "OB/GYN dysmenorrhea discharge documentation",
    ...OBGYN_TEMPLATE_GOVERNANCE,
    obGynSafety: {
      requiresOBGynFollowUp: true,
    },
    diagnosisMappings: {
      icdExact: ["N94.6"],
      keyword: ["obgyn dysmenorrhea", "painful periods obgyn", "dysménorrhée"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Painful menstrual periods",
        url: "https://medlineplus.gov/ency/article/003150.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("odys-ob", "OBGYN", "if symptoms persist or worsen")],
    suggestedText: OBGYN_DYSMENORRHEA_SUGGESTED_TEXT,
  },
  {
    id: "obgyn_hyperemesis_v1",
    version: "1.0.0",
    title: "OB/GYN hyperemesis discharge documentation",
    ...OBGYN_TEMPLATE_GOVERNANCE,
    obGynSafety: {
      pregnancySensitive: true,
      requiresPregnancyStatusDocumentation: true,
      requiresOBGynFollowUp: true,
    },
    diagnosisMappings: {
      icdExact: ["O21.9"],
      keyword: ["obgyn hyperemesis", "pregnancy vomiting obgyn", "hyperémèse gravidique"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Morning sickness",
        url: "https://medlineplus.gov/ency/article/001919.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("oh-ob", "OBGYN", "within 1–3 days or as directed")],
    suggestedText: OBGYN_HYPEREMESIS_SUGGESTED_TEXT,
  },
  {
    id: "obgyn_early_pregnancy_symptoms_v1",
    version: "1.0.0",
    title: "OB/GYN early pregnancy symptoms discharge documentation",
    ...OBGYN_TEMPLATE_GOVERNANCE,
    obGynSafety: {
      pregnancySensitive: true,
      requiresPregnancyStatusDocumentation: true,
      requiresBleedingPrecautions: true,
      requiresEctopicPrecautions: true,
      requiresOBGynFollowUp: true,
    },
    diagnosisMappings: {
      icdExact: ["O20.9"],
      keyword: ["obgyn early pregnancy", "early pregnancy symptoms obgyn", "début grossesse obgyn"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Pregnancy",
        url: "https://medlineplus.gov/pregnancy.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("oeps-ob", "OBGYN", "within 1–2 days or as directed")],
    suggestedText: OBGYN_EARLY_PREGNANCY_SYMPTOMS_SUGGESTED_TEXT,
  },
  {
    id: "obgyn_threatened_miscarriage_precautions_v1",
    version: "1.0.0",
    title: "OB/GYN early pregnancy bleeding precautions discharge documentation",
    ...OBGYN_TEMPLATE_GOVERNANCE,
    obGynSafety: {
      pregnancySensitive: true,
      requiresPregnancyStatusDocumentation: true,
      requiresBleedingPrecautions: true,
      requiresEctopicPrecautions: true,
      requiresOBGynFollowUp: true,
    },
    diagnosisMappings: {
      icdExact: ["O20.0"],
      keyword: [
        "obgyn pregnancy bleeding precautions",
        "early pregnancy bleeding precautions",
        "précautions saignement grossesse",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Bleeding during pregnancy",
        url: "https://medlineplus.gov/ency/article/003265.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("otmp-ob", "OBGYN", "within 1–2 days or as directed")],
    suggestedText: OBGYN_THREATENED_MISCARRIAGE_PRECAUTIONS_SUGGESTED_TEXT,
  },
  {
    id: "obgyn_vaginitis_v1",
    version: "1.0.0",
    title: "OB/GYN vaginitis discharge documentation",
    ...OBGYN_TEMPLATE_GOVERNANCE,
    obGynSafety: {
      requiresSexualHealthPrivacyWarning: true,
      requiresOBGynFollowUp: true,
    },
    diagnosisMappings: {
      icdExact: ["N76.0"],
      keyword: ["obgyn vaginitis", "gynecologic discharge", "vaginite obgyn"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Vaginitis",
        url: "https://medlineplus.gov/vaginitis.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("ovag-ob", "OBGYN", "if symptoms persist or worsen")],
    suggestedText: OBGYN_VAGINITIS_SUGGESTED_TEXT,
  },
  {
    id: "obgyn_uti_pregnancy_precautions_v1",
    version: "1.0.0",
    title: "OB/GYN UTI in pregnancy precautions discharge documentation",
    ...OBGYN_TEMPLATE_GOVERNANCE,
    obGynSafety: {
      pregnancySensitive: true,
      requiresPregnancyStatusDocumentation: true,
      requiresOBGynFollowUp: true,
    },
    diagnosisMappings: {
      icdExact: ["O23.41"],
      keyword: ["obgyn uti pregnancy", "urinary symptoms pregnancy obgyn", "infection urinaire grossesse"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Urinary tract infections",
        url: "https://medlineplus.gov/urinarytractinfections.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("outi-ob", "OBGYN", "within 1–3 days or as directed")],
    suggestedText: OBGYN_UTI_PREGNANCY_PRECAUTIONS_SUGGESTED_TEXT,
  },
  {
    id: "obgyn_round_ligament_pain_v1",
    version: "1.0.0",
    title: "OB/GYN round ligament pain discharge documentation",
    ...OBGYN_TEMPLATE_GOVERNANCE,
    obGynSafety: {
      pregnancySensitive: true,
      requiresPregnancyStatusDocumentation: true,
      requiresPelvicPainPrecautions: true,
      requiresOBGynFollowUp: true,
    },
    diagnosisMappings: {
      icdExact: ["O26.89"],
      keyword: ["obgyn round ligament pain", "round ligament pregnancy", "ligaments ronds"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Pregnancy",
        url: "https://medlineplus.gov/pregnancy.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("orl-ob", "OBGYN", "as clinically appropriate")],
    suggestedText: OBGYN_ROUND_LIGAMENT_PAIN_SUGGESTED_TEXT,
  },
  {
    id: "obgyn_postpartum_warning_v1",
    version: "1.0.0",
    title: "OB/GYN postpartum warning symptoms discharge documentation",
    ...OBGYN_TEMPLATE_GOVERNANCE,
    obGynSafety: {
      requiresOBGynFollowUp: true,
    },
    diagnosisMappings: {
      icdExact: ["O90.89"],
      icdFamily: ["Z39"],
      keyword: ["obgyn postpartum warning", "postpartum symptoms obgyn", "signes post-partum obgyn"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Postpartum care",
        url: "https://medlineplus.gov/ency/article/007215.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("opw-ob", "OBGYN", "within 1–3 days or as directed")],
    suggestedText: OBGYN_POSTPARTUM_WARNING_SUGGESTED_TEXT,
  },
  {
    id: "behavioral_health_anxiety_panic_symptoms_v1",
    version: "1.0.0",
    title: "Behavioral health anxiety / panic symptoms discharge documentation",
    ...BEHAVIORAL_HEALTH_TEMPLATE_GOVERNANCE,
    behavioralHealthSafety: {
      requiresCrisisResources: true,
      requiresSelfHarmEscalation: true,
      requiresBehavioralHealthFollowUp: true,
    },
    diagnosisMappings: {
      icdExact: ["F41.0"],
      keyword: ["bh anxiety panic", "behavioral health panic symptoms", "anxiété panique bh"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Anxiety",
        url: "https://medlineplus.gov/anxiety.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("bha-bh", "BEHAVIORAL_HEALTH", "within 1–2 weeks or as directed"),
    ],
    suggestedText: BEHAVIORAL_HEALTH_ANXIETY_PANIC_SYMPTOMS_SUGGESTED_TEXT,
  },
  {
    id: "behavioral_health_depression_crisis_precautions_v1",
    version: "1.0.0",
    title: "Behavioral health depression crisis precautions discharge documentation",
    ...BEHAVIORAL_HEALTH_TEMPLATE_GOVERNANCE,
    behavioralHealthSafety: {
      requiresCrisisResources: true,
      requiresSelfHarmEscalation: true,
      requiresBehavioralHealthFollowUp: true,
    },
    diagnosisMappings: {
      icdExact: ["F32.9"],
      icdFamily: ["F32"],
      keyword: ["bh depression crisis", "depression crisis precautions", "dépression crise bh"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Depression",
        url: "https://medlineplus.gov/depression.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("bhd-bh", "BEHAVIORAL_HEALTH", "within several days or as directed"),
    ],
    suggestedText: BEHAVIORAL_HEALTH_DEPRESSION_CRISIS_PRECAUTIONS_SUGGESTED_TEXT,
  },
  {
    id: "behavioral_health_suicidal_ideation_precautions_v1",
    version: "1.0.0",
    title: "Behavioral health suicidal ideation precautions discharge documentation",
    ...BEHAVIORAL_HEALTH_TEMPLATE_GOVERNANCE,
    behavioralHealthSafety: {
      requiresSafetyPlan: true,
      requiresCrisisResources: true,
      requiresSelfHarmEscalation: true,
      requiresBehavioralHealthFollowUp: true,
      requiresPrivacySensitiveWording: true,
    },
    diagnosisMappings: {
      icdExact: ["R45.851"],
      keyword: ["bh suicidal ideation", "suicidal ideation precautions", "idées suicidaires bh"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Suicide",
        url: "https://medlineplus.gov/suicide.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("bhs-crisis", "CRISIS_CLINIC", "within 24–72 hours or as directed"),
      registryFollowUp("bhs-bh", "BEHAVIORAL_HEALTH", "as directed"),
    ],
    suggestedText: BEHAVIORAL_HEALTH_SUICIDAL_IDEATION_PRECAUTIONS_SUGGESTED_TEXT,
  },
  {
    id: "behavioral_health_alcohol_intoxication_follow_up_v1",
    version: "1.0.0",
    title: "Behavioral health alcohol intoxication follow-up discharge documentation",
    ...BEHAVIORAL_HEALTH_TEMPLATE_GOVERNANCE,
    behavioralHealthSafety: {
      requiresSubstanceUseResources: true,
      requiresBehavioralHealthFollowUp: true,
      requiresCapacityCaution: true,
    },
    diagnosisMappings: {
      keyword: [
        "bh alcohol intoxication follow-up",
        "behavioral health alcohol intoxication",
        "intoxication alcool bh suivi",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Alcohol use disorder",
        url: "https://medlineplus.gov/alcoholusedisorderaud.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("bhai-sub", "SUBSTANCE_USE_TREATMENT", "within several days or as directed"),
    ],
    suggestedText: BEHAVIORAL_HEALTH_ALCOHOL_INTOXICATION_FOLLOW_UP_SUGGESTED_TEXT,
  },
  {
    id: "behavioral_health_alcohol_withdrawal_precautions_v1",
    version: "1.0.0",
    title: "Behavioral health alcohol withdrawal precautions discharge documentation",
    ...BEHAVIORAL_HEALTH_TEMPLATE_GOVERNANCE,
    behavioralHealthSafety: {
      requiresSubstanceUseResources: true,
      requiresWithdrawalPrecautions: true,
      requiresBehavioralHealthFollowUp: true,
    },
    diagnosisMappings: {
      icdExact: ["F10.239"],
      keyword: ["bh alcohol withdrawal", "alcohol withdrawal precautions", "sevrage alcool bh"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Alcohol withdrawal",
        url: "https://medlineplus.gov/ency/article/000764.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("bhaw-sub", "SUBSTANCE_USE_TREATMENT", "within 1–3 days or as directed"),
    ],
    suggestedText: BEHAVIORAL_HEALTH_ALCOHOL_WITHDRAWAL_PRECAUTIONS_SUGGESTED_TEXT,
  },
  {
    id: "behavioral_health_substance_use_resources_v1",
    version: "1.0.0",
    title: "Behavioral health substance-use resource discharge documentation",
    ...BEHAVIORAL_HEALTH_TEMPLATE_GOVERNANCE,
    behavioralHealthSafety: {
      requiresSubstanceUseResources: true,
      requiresBehavioralHealthFollowUp: true,
      requiresPrivacySensitiveWording: true,
    },
    diagnosisMappings: {
      icdExact: ["F19.90"],
      keyword: ["bh substance use resources", "substance use resource discharge", "ressources usage substances bh"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Substance use disorder",
        url: "https://medlineplus.gov/substanceusedisorder.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("bhsu-sub", "SUBSTANCE_USE_TREATMENT", "within several days or as directed"),
    ],
    suggestedText: BEHAVIORAL_HEALTH_SUBSTANCE_USE_RESOURCES_SUGGESTED_TEXT,
  },
  {
    id: "behavioral_health_opioid_overdose_aftercare_v1",
    version: "1.0.0",
    title: "Behavioral health opioid overdose aftercare discharge documentation",
    ...BEHAVIORAL_HEALTH_TEMPLATE_GOVERNANCE,
    behavioralHealthSafety: {
      requiresCrisisResources: true,
      requiresSubstanceUseResources: true,
      requiresBehavioralHealthFollowUp: true,
    },
    diagnosisMappings: {
      icdExact: ["T40.2X5A"],
      keyword: ["bh opioid overdose", "opioid overdose aftercare", "surdose opioïdes bh"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Opioid overdose",
        url: "https://medlineplus.gov/opioidoverdose.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("bho-sub", "SUBSTANCE_USE_TREATMENT", "within 1–3 days or as directed"),
    ],
    suggestedText: BEHAVIORAL_HEALTH_OPIOID_OVERDOSE_AFTERCARE_SUGGESTED_TEXT,
  },
  {
    id: "behavioral_health_crisis_follow_up_v1",
    version: "1.0.0",
    title: "Behavioral health crisis follow-up discharge documentation",
    ...BEHAVIORAL_HEALTH_TEMPLATE_GOVERNANCE,
    behavioralHealthSafety: {
      requiresCrisisResources: true,
      requiresSelfHarmEscalation: true,
      requiresHomicideRiskEscalation: true,
      requiresBehavioralHealthFollowUp: true,
    },
    diagnosisMappings: {
      icdExact: ["R45.89"],
      keyword: ["bh behavioral crisis", "behavioral crisis follow-up", "crise comportementale bh"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Mental health",
        url: "https://medlineplus.gov/mentalhealth.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("bhc-crisis", "CRISIS_CLINIC", "within 24–72 hours or as directed"),
    ],
    suggestedText: BEHAVIORAL_HEALTH_CRISIS_FOLLOW_UP_SUGGESTED_TEXT,
  },
  {
    id: "behavioral_health_insomnia_stress_reaction_v1",
    version: "1.0.0",
    title: "Behavioral health insomnia / acute stress reaction discharge documentation",
    ...BEHAVIORAL_HEALTH_TEMPLATE_GOVERNANCE,
    behavioralHealthSafety: {
      requiresCrisisResources: true,
      requiresSelfHarmEscalation: true,
      requiresBehavioralHealthFollowUp: true,
    },
    diagnosisMappings: {
      icdExact: ["G47.00", "F43.0"],
      keyword: ["bh insomnia stress", "acute stress reaction bh", "insomnie stress aigu bh"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Sleep disorders",
        url: "https://medlineplus.gov/sleepdisorders.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("bhi-bh", "BEHAVIORAL_HEALTH", "within 1–2 weeks or as directed"),
    ],
    suggestedText: BEHAVIORAL_HEALTH_INSOMNIA_STRESS_REACTION_SUGGESTED_TEXT,
  },
  {
    id: "behavioral_health_grief_adjustment_v1",
    version: "1.0.0",
    title: "Behavioral health grief / adjustment symptoms discharge documentation",
    ...BEHAVIORAL_HEALTH_TEMPLATE_GOVERNANCE,
    behavioralHealthSafety: {
      requiresCrisisResources: true,
      requiresBehavioralHealthFollowUp: true,
      requiresPrivacySensitiveWording: true,
    },
    diagnosisMappings: {
      icdExact: ["F43.20", "F43.21"],
      keyword: ["bh grief adjustment", "grief reaction adjustment", "deuil adaptation bh"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Bereavement",
        url: "https://medlineplus.gov/bereavement.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("bhg-bh", "BEHAVIORAL_HEALTH", "within 1–2 weeks or as directed"),
    ],
    suggestedText: BEHAVIORAL_HEALTH_GRIEF_ADJUSTMENT_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_ankle_sprain_v1",
    version: "1.0.0",
    title: "Trauma/MSK ankle sprain discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresReturnActivityRestrictions: true,
      requiresOrthopedicFollowUp: true,
    },
    diagnosisMappings: {
      icdFamily: ["S93.4"],
      keyword: ["msk ankle sprain", "ankle sprain msk", "entorse cheville msk"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Ankle injuries and sprains",
        url: "https://medlineplus.gov/ency/article/000041.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "OrthoInfo — Ankle sprain",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/ankle-sprain/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tma-ortho", "ORTHOPEDICS", "within 1–2 weeks or as directed")],
    suggestedText: TRAUMA_MSK_ANKLE_SPRAIN_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_wrist_sprain_v1",
    version: "1.0.0",
    title: "Trauma/MSK wrist sprain discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresReturnActivityRestrictions: true,
      requiresOrthopedicFollowUp: true,
    },
    diagnosisMappings: {
      icdFamily: ["S63.5"],
      keyword: ["msk wrist sprain", "wrist sprain msk", "entorse poignet msk"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Wrist injuries",
        url: "https://medlineplus.gov/ency/article/000042.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "OrthoInfo — Wrist sprains",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/wrist-sprains/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmw-ortho", "ORTHOPEDICS", "within 1–2 weeks or as directed")],
    suggestedText: TRAUMA_MSK_WRIST_SPRAIN_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_knee_injury_v1",
    version: "1.0.0",
    title: "Trauma/MSK knee injury discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresReturnActivityRestrictions: true,
      requiresOrthopedicFollowUp: true,
    },
    diagnosisMappings: {
      icdFamily: ["S89"],
      keyword: ["msk knee injury", "knee injury msk", "blessure genou msk"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Knee injuries",
        url: "https://medlineplus.gov/kneeinjuriesanddisorders.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "OrthoInfo — Knee sprains",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/knee-sprains/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmk-ortho", "ORTHOPEDICS", "within 1–2 weeks or as directed")],
    suggestedText: TRAUMA_MSK_KNEE_INJURY_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_shoulder_pain_v1",
    version: "1.0.0",
    title: "Trauma/MSK shoulder pain discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresReturnActivityRestrictions: true,
      requiresOrthopedicFollowUp: true,
    },
    diagnosisMappings: {
      icdFamily: ["M25.51"],
      keyword: ["msk shoulder pain", "shoulder pain msk", "douleur épaule msk"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Shoulder injuries",
        url: "https://medlineplus.gov/shoulderinjuriesanddisorders.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "OrthoInfo — Shoulder pain",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/shoulder-pain/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tms-ortho", "ORTHOPEDICS", "within 1–2 weeks or as directed")],
    suggestedText: TRAUMA_MSK_SHOULDER_PAIN_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_back_strain_v1",
    version: "1.0.0",
    title: "Trauma/MSK back strain discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresHeadNeckSpineEscalation: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdExact: ["S39.012"],
      keyword: ["msk back strain", "back strain msk", "entorse dos msk"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Back pain",
        url: "https://medlineplus.gov/backpain.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "CDC — Heads Up",
        url: "https://www.cdc.gov/heads-up/",
        publisher: "U.S. Centers for Disease Control and Prevention (CDC)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmb-pcp", "PRIMARY_CARE", "within 1–2 weeks or as directed")],
    suggestedText: TRAUMA_MSK_BACK_STRAIN_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_neck_strain_v1",
    version: "1.0.0",
    title: "Trauma/MSK neck strain discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresHeadNeckSpineEscalation: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdExact: ["S16.1"],
      keyword: ["msk neck strain", "neck strain msk", "entorse cou msk"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Neck injuries",
        url: "https://medlineplus.gov/ency/article/000029.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "CDC — Heads Up",
        url: "https://www.cdc.gov/heads-up/",
        publisher: "U.S. Centers for Disease Control and Prevention (CDC)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmn-pcp", "PRIMARY_CARE", "within 1–2 weeks or as directed")],
    suggestedText: TRAUMA_MSK_NECK_STRAIN_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_contusion_v1",
    version: "1.0.0",
    title: "Trauma/MSK contusion discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      keyword: ["msk contusion", "soft tissue contusion msk", "contusion msk"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Bruises",
        url: "https://medlineplus.gov/bruises.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmc-pcp", "PRIMARY_CARE", "if symptoms persist or worsen")],
    suggestedText: TRAUMA_MSK_CONTUSION_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_rib_injury_v1",
    version: "1.0.0",
    title: "Trauma/MSK rib injury discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      imagingSensitive: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S22.3", "S20"],
      keyword: ["msk rib injury", "rib injury msk", "blessure côte msk"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Rib injuries",
        url: "https://medlineplus.gov/ency/article/003109.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmr-pcp", "PRIMARY_CARE", "within several days or as directed")],
    suggestedText: TRAUMA_MSK_RIB_INJURY_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_minor_fracture_precautions_v1",
    version: "1.0.0",
    title: "Trauma/MSK minor fracture precautions discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      imagingSensitive: true,
      requiresFracturePrecautions: true,
      requiresNeurovascularPrecautions: true,
      requiresCompartmentSyndromePrecautions: true,
      requiresSplintCastPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      keyword: [
        "msk minor fracture precautions",
        "minor fracture precautions msk",
        "précautions fracture mineure msk",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Fractures",
        url: "https://medlineplus.gov/fractures.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "OrthoInfo — Fractures",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/fractures-broken-bones/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmf-ortho", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_MINOR_FRACTURE_PRECAUTIONS_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_mvc_soreness_v1",
    version: "1.0.0",
    title: "Trauma/MSK motor vehicle collision soreness discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      imagingSensitive: true,
      requiresHeadNeckSpineEscalation: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdExact: ["V89.2XXA"],
      keyword: [
        "msk motor vehicle collision soreness",
        "mvc soreness msk",
        "courbatures collision msk",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Motor vehicle safety",
        url: "https://medlineplus.gov/motorvehiclesafety.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "CDC — Motor vehicle safety",
        url: "https://www.cdc.gov/transportationsafety/",
        publisher: "U.S. Centers for Disease Control and Prevention (CDC)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmm-pcp", "PRIMARY_CARE", "within several days or as directed")],
    suggestedText: TRAUMA_MSK_MVC_SORENESS_SUGGESTED_TEXT,
  },
  {
    id: GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
    version: "1.0.0",
    title: "Generic ED discharge documentation",
    specialtyCategory: "emergency_medicine",
    riskCategory: "unspecified",
    clinicalReviewStatus: "draft",
    effectiveFrom: GOVERNANCE_EFFECTIVE_FROM,
    diagnosisMappings: {},
    sourceReferences: [
      {
        label: "Medora-S — clinician-authored generic ED discharge scaffold",
        publisher: "Medora-S (internal governance scaffold)",
        accessedAt: ACCESSED_AT,
      },
    ],
    suggestedText: GENERIC_ED_DISCHARGE_SUGGESTED_TEXT,
  },
] as const;

/** Known clinical paragraph fragments — must exist only in registry/catalog (regression gate). */
export const PROVIDER_DISCHARGE_REGISTRY_PARAGRAPH_FRAGMENTS = [
  "You were evaluated in the emergency department for chest pain",
  "You were evaluated in the emergency department for abdominal pain",
  "You were evaluated in the emergency department for headache",
  "You were evaluated in the emergency department for cough or upper respiratory symptoms",
  "You were evaluated in the emergency department for urinary symptoms",
  "Your laceration or wound was evaluated in the emergency department",
  "You were evaluated in the emergency department for nausea or vomiting",
  "You were evaluated in the emergency department for diarrhea or gastroenteritis",
  "You were evaluated in the emergency department for back pain",
  "You were evaluated in the emergency department for dental or tooth pain",
  "You were evaluated in the emergency department for ear pain or sore throat",
  "You were evaluated in the emergency department for elevated blood pressure or hypertension",
  "You were evaluated in the emergency department for a skin infection or cellulitis",
  "You were evaluated in the emergency department for dehydration",
  "Return immediately or call emergency services for returning or worsening chest pain",
  "Vous avez été pris en charge aux urgences pour une douleur thoracique",
  "Vous avez été pris en charge aux urgences pour une douleur abdominale",
  "Vous avez été pris en charge aux urgences pour des céphalées",
  "Vous avez été pris en charge aux urgences pour une toux ou des signes d'infection des voies respiratoires supérieures",
  "Vous avez été pris en charge aux urgences pour des troubles liés aux voies urinaires",
  "Votre lacération ou plaie a été évaluée aux urgences",
  "Vous avez été pris en charge aux urgences pour des nausées ou des vomissements",
  "Vous avez été pris en charge aux urgences pour une diarrhée ou une gastro-entérite",
  "Vous avez été pris en charge aux urgences pour une douleur du dos",
  "Vous avez été pris en charge aux urgences pour une douleur dentaire",
  "Vous avez été pris en charge aux urgences pour une otalgie ou un mal de gorge",
  "Vous avez été pris en charge aux urgences pour une pression artérielle élevée ou une hypertension",
  "Vous avez été pris en charge aux urgences pour une infection cutanée ou une cellulite",
  "Vous avez été pris en charge aux urgences pour une déshydratation",
  "You were evaluated in the emergency department for an asthma exacerbation",
  "You were evaluated in the emergency department for a COPD exacerbation",
  "You were evaluated in the emergency department for bronchitis",
  "You were evaluated in the emergency department for pneumonia",
  "You were evaluated in the emergency department after fainting or syncope",
  "You were evaluated in the emergency department for dizziness or vertigo",
  "You were evaluated in the emergency department for kidney stone symptoms or flank pain",
  "You were evaluated in the emergency department for constipation",
  "You were evaluated in the emergency department for an allergic reaction without anaphylaxis",
  "You were evaluated in the emergency department for a minor head injury or concussion",
  "Vous avez été pris en charge aux urgences pour une exacerbation d'asthme",
  "Vous avez été pris en charge aux urgences pour une exacerbation de BPCO",
  "Vous avez été pris en charge aux urgences pour une bronchite",
  "Vous avez été pris en charge aux urgences pour une pneumonie",
  "Vous avez été pris en charge aux urgences après un malaise ou un épisode syncopal",
  "Vous avez été pris en charge aux urgences pour des vertiges ou des étourdissements",
  "Vous avez été pris en charge aux urgences pour des signes évocateurs de calcul rénal ou une douleur lombaire/flanc",
  "Vous avez été pris en charge aux urgences pour une constipation",
  "Vous avez été pris en charge aux urgences pour une réaction allergique sans anaphylaxie",
  "Vous avez été pris en charge aux urgences pour un traumatisme crânien mineur ou une commotion",
  "You were evaluated in the emergency department for TIA or stroke-like symptoms",
  "You were evaluated in the emergency department after a seizure",
  "You were evaluated in the emergency department for palpitations",
  "You were evaluated in the emergency department for shortness of breath",
  "You were evaluated in the emergency department for chest wall pain",
  "You were evaluated in the emergency department for epistaxis (nosebleed)",
  "You were evaluated in the emergency department for hypoglycemia (low blood sugar)",
  "You were evaluated in the emergency department for hyperglycemia (high blood sugar)",
  "You were evaluated in the emergency department for alcohol intoxication",
  "You were evaluated in the emergency department for anxiety or panic symptoms",
  "Vous avez été pris en charge aux urgences pour un AIT ou des signes évoquant un accident vasculaire cérébral",
  "Vous avez été pris en charge aux urgences après une crise convulsive",
  "Vous avez été pris en charge aux urgences pour des palpitations",
  "Vous avez été pris en charge aux urgences pour un essoufflement",
  "Vous avez été pris en charge aux urgences pour une douleur pariétale thoracique",
  "Vous avez été pris en charge aux urgences pour un épistaxis (saignement de nez)",
  "Vous avez été pris en charge aux urgences pour une hypoglycémie (baisse de la glycémie)",
  "Vous avez été pris en charge aux urgences pour une hyperglycémie (élévation de la glycémie)",
  "Vous avez été pris en charge aux urgences pour une intoxication alcoolique",
  "Vous avez été pris en charge aux urgences pour de l'anxiété ou des signes de crise d'angoisse",
  "Your child was evaluated in the emergency department for fever",
  "Your child was evaluated in the emergency department for a viral illness",
  "Your child was evaluated in the emergency department for upper respiratory symptoms",
  "Your child was evaluated in the emergency department for ear pain consistent with otitis media",
  "Your child was evaluated in the emergency department for vomiting or diarrhea",
  "Your child was evaluated in the emergency department for mild dehydration",
  "Your child was evaluated in the emergency department for constipation",
  "Your child was evaluated in the emergency department for wheezing or breathing symptoms related to asthma",
  "Your child was evaluated in the emergency department for a rash",
  "Your child was evaluated in the emergency department after a minor head injury",
  "Votre enfant a été pris en charge aux urgences pour de la fièvre",
  "Votre enfant a été pris en charge aux urgences pour une maladie virale",
  "Votre enfant a été pris en charge aux urgences pour des signes respiratoires supérieurs",
  "Votre enfant a été pris en charge aux urgences pour une otalgie compatible avec une otite moyenne",
  "Votre enfant a été pris en charge aux urgences pour des vomissements ou une diarrhée",
  "Votre enfant a été pris en charge aux urgences pour une déshydratation légère",
  "Votre enfant a été pris en charge aux urgences pour une constipation",
  "Votre enfant a été pris en charge aux urgences pour une respiration sifflante ou des signes respiratoires liés à l'asthme",
  "Votre enfant a été pris en charge aux urgences pour une éruption cutanée",
  "Votre enfant a été pris en charge aux urgences après un traumatisme crânien mineur",
  "Your child was evaluated in the emergency department after a febrile seizure",
  "Your child was evaluated in the emergency department for abdominal pain",
  "Your child was evaluated in the emergency department for vomiting",
  "Your child was evaluated in the emergency department for worsening dehydration concerns",
  "Your child was evaluated in the emergency department for bronchiolitis or an RSV-related respiratory illness",
  "Your child was evaluated in the emergency department for croup",
  "Your child was evaluated in the emergency department for an allergic reaction",
  "Your child was evaluated in the emergency department for a concussion",
  "Your child was evaluated in the emergency department for wheezing or noisy breathing",
  "Your child was evaluated in the emergency department for influenza-like illness",
  "Votre enfant a été pris en charge aux urgences après une crise convulsive fébrile",
  "Votre enfant a été pris en charge aux urgences pour une douleur abdominale",
  "Votre enfant a été pris en charge aux urgences pour des vomissements",
  "Votre enfant a été pris en charge aux urgences pour une déshydratation préoccupante",
  "Votre enfant a été pris en charge aux urgences pour une bronchiolite ou une infection respiratoire liée au VRS",
  "Votre enfant a été pris en charge aux urgences pour un croup",
  "Votre enfant a été pris en charge aux urgences pour une réaction allergique",
  "Votre enfant a été pris en charge aux urgences pour une commotion cérébrale",
  "Votre enfant a été pris en charge aux urgences pour une respiration sifflante ou bruyante",
  "Votre enfant a été pris en charge aux urgences pour un tableau grippal",
  "You were evaluated in the emergency department for vaginal bleeding",
  "You were evaluated in the emergency department for pelvic pain",
  "You were evaluated in the emergency department for painful menstrual cramps",
  "You were evaluated in the emergency department for nausea and vomiting during pregnancy",
  "You were evaluated in the emergency department for early pregnancy symptoms",
  "You were evaluated in the emergency department for bleeding or cramping during early pregnancy",
  "You were evaluated in the emergency department for vaginal discharge or irritation",
  "You were evaluated in the emergency department for urinary symptoms during pregnancy",
  "You were evaluated in the emergency department for pregnancy-related abdominal or pelvic discomfort consistent with round ligament pain",
  "You were evaluated in the emergency department for postpartum symptoms",
  "Vous avez été pris en charge aux urgences pour des saignements vaginaux",
  "Vous avez été pris en charge aux urgences pour une douleur pelvienne",
  "Vous avez été pris en charge aux urgences pour des crampes menstruelles douloureuses",
  "Vous avez été pris en charge aux urgences pour des nausées et vomissements pendant la grossesse",
  "Vous avez été pris en charge aux urgences pour des signes du début de grossesse",
  "Vous avez été pris en charge aux urgences pour des saignements ou crampes en début de grossesse",
  "Vous avez été pris en charge aux urgences pour des pertes vaginales ou une irritation",
  "Vous avez été pris en charge aux urgences pour des signes urinaires pendant la grossesse",
  "Vous avez été pris en charge aux urgences pour une gêne abdominale ou pelvienne liée à la grossesse",
  "Vous avez été pris en charge aux urgences pour des signes post-partum",
  "You were evaluated in the emergency department for anxiety or panic symptoms. Symptoms may recur or worsen after an emergency visit",
  "You were evaluated in the emergency department during a period of worsening depression or emotional distress",
  "You were evaluated in the emergency department for concerns related to thoughts of self-harm",
  "You were evaluated in the emergency department related to alcohol use. Symptoms may continue to change after an emergency visit",
  "You were evaluated in the emergency department for symptoms that may be related to alcohol withdrawal",
  "You were evaluated in the emergency department for concerns related to substance use",
  "You were evaluated in the emergency department after a suspected opioid overdose or related emergency",
  "You were evaluated in the emergency department during a behavioral health crisis or severe emotional distress",
  "You were evaluated in the emergency department for insomnia, acute stress, or related symptoms",
  "You were evaluated in the emergency department for grief, adjustment, or emotional distress symptoms",
  "Vous avez été pris en charge aux urgences pour de l'anxiété ou des signes de crise d'angoisse. Les symptômes peuvent récidiver",
  "Vous avez été pris en charge aux urgences pendant une période d'aggravation de la dépression ou de détresse émotionnelle",
  "Vous avez été pris en charge aux urgences pour des préoccupations liées à des idées de se faire du mal",
  "Vous avez été pris en charge aux urgences pour un motif lié à l'usage d'alcool",
  "Vous avez été pris en charge aux urgences pour des signes pouvant être liés à un sevrage alcoolique",
  "Vous avez été pris en charge aux urgences pour des préoccupations liées à l'usage de substances",
  "Vous avez été pris en charge aux urgences après une suspicion de surdose d'opioïdes ou une urgence connexe",
  "Vous avez été pris en charge aux urgences lors d'une crise de santé comportementale ou d'une détresse émotionnelle importante",
  "Vous avez été pris en charge aux urgences pour de l'insomnie, un stress aigu ou des signes connexes",
  "Vous avez été pris en charge aux urgences pour des signes de deuil, d'adaptation ou de détresse émotionnelle",
  "You were evaluated in the emergency department for pain or injury involving the ankle",
  "You were evaluated in the emergency department for pain or injury involving the wrist",
  "You were evaluated in the emergency department for pain or injury involving the knee",
  "You were evaluated in the emergency department for pain or injury involving the shoulder",
  "You were evaluated in the emergency department for back strain or back pain after injury",
  "You were evaluated in the emergency department for neck strain or neck pain after injury",
  "You were evaluated in the emergency department for a contusion (bruise) after injury",
  "You were evaluated in the emergency department for rib or chest wall injury after trauma",
  "You were evaluated in the emergency department for a possible bone injury",
  "You were evaluated in the emergency department for soreness or symptoms after a motor vehicle collision",
  "Vous avez été pris en charge aux urgences pour une douleur ou une blessure à la cheville",
  "Vous avez été pris en charge aux urgences pour une douleur ou une blessure au poignet",
  "Vous avez été pris en charge aux urgences pour une douleur ou une blessure au genou",
  "Vous avez été pris en charge aux urgences pour une douleur ou une blessure à l'épaule",
  "Vous avez été pris en charge aux urgences pour une entorse ou une douleur dorsale après un traumatisme",
  "Vous avez été pris en charge aux urgences pour une entorse ou une douleur cervicale après un traumatisme",
  "Vous avez été pris en charge aux urgences pour un contusion (ecchymose) après un traumatisme",
  "Vous avez été pris en charge aux urgences pour une blessure des côtes ou de la paroi thoracique après un traumatisme",
  "Vous avez été pris en charge aux urgences pour une possible lésion osseuse",
  "Vous avez été pris en charge aux urgences pour des courbatures ou symptômes après une collision de véhicule",
] as const;

export { getProviderDischargeSuggestedTextBody };

function normalizeIcdCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s/g, "");
}

function normalizeMatchToken(value: string): string {
  return value.trim().toLowerCase();
}

function familyPrefix(raw: string): string {
  return normalizeIcdCode(raw.replace(/\.\*$/, "").replace(/\*$/, ""));
}

function nonGenericTemplates(): ProviderDischargeTemplate[] {
  return PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter((t) => t.id !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
}

function genericTemplate(): ProviderDischargeTemplate {
  return PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID)!;
}

export function resolveProviderDischargeTemplateForDiagnosis(input: {
  code?: string;
  displayName?: string;
  label?: string;
}): ProviderDischargeTemplateResolveResult {
  const code = normalizeIcdCode(input.code ?? "");
  const labelText = normalizeMatchToken(
    [input.displayName, input.label, input.code].filter(Boolean).join(" ")
  );

  for (const template of nonGenericTemplates()) {
    for (const exact of template.diagnosisMappings.icdExact ?? []) {
      if (code && normalizeIcdCode(exact) === code) {
        return { template, matchLevel: "icdExact" };
      }
    }
  }

  let bestFamily: { template: ProviderDischargeTemplate; prefixLen: number } | null = null;
  for (const template of nonGenericTemplates()) {
    for (const family of template.diagnosisMappings.icdFamily ?? []) {
      const prefix = familyPrefix(family);
      if (code && prefix && code.startsWith(prefix)) {
        if (!bestFamily || prefix.length > bestFamily.prefixLen) {
          bestFamily = { template, prefixLen: prefix.length };
        }
      }
    }
  }
  if (bestFamily) {
    return { template: bestFamily.template, matchLevel: "icdFamily" };
  }

  let bestKeyword: { template: ProviderDischargeTemplate; tokenLen: number } | null = null;
  for (const template of nonGenericTemplates()) {
    for (const keyword of template.diagnosisMappings.keyword ?? []) {
      const token = normalizeMatchToken(keyword);
      if (token && labelText.includes(token)) {
        if (!bestKeyword || token.length > bestKeyword.tokenLen) {
          bestKeyword = { template, tokenLen: token.length };
        }
      }
    }
  }
  if (bestKeyword) {
    return { template: bestKeyword.template, matchLevel: "keyword" };
  }

  return { template: genericTemplate(), matchLevel: "generic" };
}

export type BuildProviderDischargeCardInput = {
  sourceEncounterDiagnosisId: string;
  code: string;
  displayName: string;
  displayOrder: number;
  isPrimaryDiagnosis: boolean;
  applyTemplateSuggestion?: boolean;
  locale?: ProviderDischargeTemplateLocale;
  actor?: { displayName?: string; appliedAt?: string };
};

export function buildProviderDischargeCardFromDiagnosis(
  input: BuildProviderDischargeCardInput
): ProviderDischargeDiagnosisCard {
  const card: ProviderDischargeDiagnosisCard = {
    id: newDiagnosisDocId(),
    sourceEncounterDiagnosisId: input.sourceEncounterDiagnosisId,
    encounterDiagnosisId: input.sourceEncounterDiagnosisId,
    code: input.code,
    displayName: input.displayName,
    isPrimaryDiagnosis: input.isPrimaryDiagnosis,
    displayOrder: input.displayOrder,
    description: "",
    diagnosisInstructions: "",
    medicationTreatment: "",
    treatment: "",
    returnPrecautions: "",
    returnWorkSchool: "",
    followUps: [],
    medicationLines: [],
  };

  if (!input.applyTemplateSuggestion) return card;

  const resolved = resolveProviderDischargeTemplateForDiagnosis({
    code: input.code,
    displayName: input.displayName,
  });

  if (resolved.matchLevel === "generic") return card;

  return applyProviderDischargeTemplateToCard(card, resolved, {
    locale: input.locale ?? "fr",
    actor: input.actor,
    providerConfirmed: false,
    overwriteExisting: false,
  });
}

export function applyProviderDischargeTemplateToCard(
  card: ProviderDischargeDiagnosisCard,
  resolved: ProviderDischargeTemplateResolveResult,
  options: {
    locale: ProviderDischargeTemplateLocale;
    actor?: { displayName?: string; appliedAt?: string };
    overwriteExisting?: boolean;
    providerConfirmed?: boolean;
  }
): ProviderDischargeDiagnosisCard {
  const { template, matchLevel } = resolved;
  const overwrite = options.overwriteExisting === true;
  const locale = options.locale;
  const text = getProviderDischargeSuggestedTextBody(template, locale);
  const sourceReferences = template.sourceReferences.map((r) => r.label);

  const next: ProviderDischargeDiagnosisCard = { ...card };

  if (overwrite || !next.description.trim()) next.description = text.description;
  const appliedInstructions = buildAppliedDiagnosisInstructionsFromTemplateBody(text);
  if (overwrite || !next.diagnosisInstructions.trim()) next.diagnosisInstructions = appliedInstructions;
  if (overwrite || !next.medicationTreatment.trim()) next.medicationTreatment = text.medicationTreatment;
  if (text.treatment && (overwrite || !(next.treatment ?? "").trim())) next.treatment = text.treatment;

  next.templateMeta = {
    templateId: template.id,
    templateVersion: template.version,
    matchLevel,
    sourceReferences,
    appliedLocale: locale,
    templateAppliedHash: computeProviderDischargeTemplateAppliedHash(template, locale),
    ...(template.specialtyCategory?.trim() ? { specialtyCategory: template.specialtyCategory.trim() } : {}),
    ...(template.riskCategory?.trim() ? { riskCategory: template.riskCategory.trim() } : {}),
    appliedAt: options.actor?.appliedAt,
    appliedByDisplayName: options.actor?.displayName,
    providerConfirmed: options.providerConfirmed ?? false,
  };
  next.sourceTemplateId = template.id;
  next.sourceVersion = template.version;

  return next;
}
