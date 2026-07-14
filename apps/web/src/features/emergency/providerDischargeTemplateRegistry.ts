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
import type { ProviderDischargeTemplateCardioHighRiskSafety } from "./providerDischargeTemplateCardioHighRiskGovernance";
import type { ProviderDischargeTemplateInfectiousRiskSafety } from "./providerDischargeTemplateInfectiousRiskGovernance";
import type { ProviderDischargeTemplateRenalElectrolyteSafety } from "./providerDischargeTemplateRenalElectrolyteGovernance";
import type { ProviderDischargeTemplateEndocrineMetabolicSafety } from "./providerDischargeTemplateEndocrineMetabolicGovernance";
import type { ProviderDischargeTemplateNeurologySafety } from "./providerDischargeTemplateNeurologyGovernance";
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
  TRAUMA_MSK_DISLOCATION_ELBOW_SUGGESTED_TEXT,
  TRAUMA_MSK_DISLOCATION_GENERIC_SUGGESTED_TEXT,
  TRAUMA_MSK_DISLOCATION_HAND_SUGGESTED_TEXT,
  TRAUMA_MSK_DISLOCATION_HIP_SUGGESTED_TEXT,
  TRAUMA_MSK_DISLOCATION_JAW_SUGGESTED_TEXT,
  TRAUMA_MSK_DISLOCATION_PATELLA_SUGGESTED_TEXT,
  TRAUMA_MSK_DISLOCATION_SHOULDER_SUGGESTED_TEXT,
  TRAUMA_MSK_FRACTURE_FACIAL_SUGGESTED_TEXT,
  TRAUMA_MSK_FRACTURE_HAND_SUGGESTED_TEXT,
  TRAUMA_MSK_FRACTURE_HIP_SUGGESTED_TEXT,
  TRAUMA_MSK_FRACTURE_OPEN_SUGGESTED_TEXT,
  TRAUMA_MSK_FRACTURE_SPINE_SUGGESTED_TEXT,
  TRAUMA_MSK_KNEE_INJURY_SUGGESTED_TEXT,
  TRAUMA_MSK_MINOR_FRACTURE_PRECAUTIONS_SUGGESTED_TEXT,
  TRAUMA_MSK_MVC_SORENESS_SUGGESTED_TEXT,
  TRAUMA_MSK_NECK_STRAIN_SUGGESTED_TEXT,
  TRAUMA_MSK_RIB_INJURY_SUGGESTED_TEXT,
  TRAUMA_MSK_SPRAIN_GENERIC_SUGGESTED_TEXT,
  TRAUMA_MSK_TENDON_ACHILLES_SUGGESTED_TEXT,
  TRAUMA_MSK_TENDON_EXTENSOR_MECHANISM_SUGGESTED_TEXT,
  TRAUMA_MSK_TENDON_SHOULDER_SUGGESTED_TEXT,
  TRAUMA_MSK_TENDON_HAND_SUGGESTED_TEXT,
  TRAUMA_MSK_TENDON_GENERIC_SUGGESTED_TEXT,
  TRAUMA_MSK_LIGAMENT_KNEE_SUGGESTED_TEXT,
  TRAUMA_MSK_LIGAMENT_ANKLE_SUGGESTED_TEXT,
  TRAUMA_MSK_LIGAMENT_HAND_SUGGESTED_TEXT,
  TRAUMA_MSK_LIGAMENT_UPPER_EXTREMITY_SUGGESTED_TEXT,
  TRAUMA_MSK_LIGAMENT_SHOULDER_SUGGESTED_TEXT,
  TRAUMA_MSK_LIGAMENT_GENERIC_SUGGESTED_TEXT,
  CARDIO_HYPERTENSION_ELEVATED_BP_SUGGESTED_TEXT,
  HIGH_RISK_MEDICAL_FATIGUE_SUGGESTED_TEXT,
  HIGH_RISK_MEDICAL_GENERAL_WEAKNESS_SUGGESTED_TEXT,
  HIGH_RISK_MEDICAL_DIZZINESS_SUGGESTED_TEXT,
  HIGH_RISK_MEDICAL_HEADACHE_SUGGESTED_TEXT,
  HIGH_RISK_MEDICAL_LEG_SWELLING_SUGGESTED_TEXT,
  CARDIO_CHEST_PAIN_FOLLOW_UP_SUGGESTED_TEXT,
  CARDIO_SYNCOPE_FOLLOW_UP_SUGGESTED_TEXT,
  CARDIO_AFIB_RATE_CONTROLLED_SUGGESTED_TEXT,
  CARDIO_HEART_FAILURE_SYMPTOMS_SUGGESTED_TEXT,
  INFECTIOUS_FEVER_UNKNOWN_SOURCE_SUGGESTED_TEXT,
  INFECTIOUS_UPPER_RESPIRATORY_INFECTION_SUGGESTED_TEXT,
  INFECTIOUS_VIRAL_SYNDROME_SUGGESTED_TEXT,
  INFECTIOUS_PHARYNGITIS_SUGGESTED_TEXT,
  INFECTIOUS_SINUSITIS_SUGGESTED_TEXT,
  INFECTIOUS_PNEUMONIA_FOLLOWUP_SUGGESTED_TEXT,
  INFECTIOUS_COVID_LIKE_ILLNESS_SUGGESTED_TEXT,
  GI_INFECTIOUS_GASTROENTERITIS_SUGGESTED_TEXT,
  INFECTIOUS_CELLULITIS_FOLLOWUP_SUGGESTED_TEXT,
  SEPSIS_RISK_RETURN_PRECAUTIONS_SUGGESTED_TEXT,
  DIALYSIS_RETURN_PRECAUTIONS_SUGGESTED_TEXT,
  RENAL_AKI_FOLLOWUP_SUGGESTED_TEXT,
  RENAL_DEHYDRATION_FOLLOWUP_SUGGESTED_TEXT,
  RENAL_ELECTROLYTE_ABNORMALITY_FOLLOWUP_SUGGESTED_TEXT,
  UROLOGY_RENAL_COLIC_FOLLOWUP_SUGGESTED_TEXT,
  UROLOGY_UTI_FOLLOWUP_SUGGESTED_TEXT,
  UROLOGY_PYELONEPHRITIS_FOLLOWUP_SUGGESTED_TEXT,
  UROLOGY_HEMATURIA_FOLLOWUP_SUGGESTED_TEXT,
  UROLOGY_URINARY_RETENTION_FOLLOWUP_SUGGESTED_TEXT,
  UROLOGY_FOLEY_CATHETER_PRECAUTIONS_SUGGESTED_TEXT,
  DIABETES_HYPERGLYCEMIA_FOLLOWUP_SUGGESTED_TEXT,
  DIABETES_HYPOGLYCEMIA_FOLLOWUP_SUGGESTED_TEXT,
  DIABETES_DKA_RETURN_PRECAUTIONS_SUGGESTED_TEXT,
  DIABETES_INSULIN_MANAGEMENT_PRECAUTIONS_SUGGESTED_TEXT,
  ENDOCRINE_THYROID_SYMPTOM_FOLLOWUP_SUGGESTED_TEXT,
  METABOLIC_DEHYDRATION_FOLLOWUP_SUGGESTED_TEXT,
  METABOLIC_NAUSEA_WEAKNESS_FOLLOWUP_SUGGESTED_TEXT,
  METABOLIC_ELECTROLYTE_FOLLOWUP_SUGGESTED_TEXT,
  ENDOCRINE_POLYURIA_POLYDIPSIA_FOLLOWUP_SUGGESTED_TEXT,
  DIABETES_SICK_DAY_PRECAUTIONS_SUGGESTED_TEXT,
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
  TYPE_2_DIABETES_SUGGESTED_TEXT,
  VACCINATION_VISIT_SUGGESTED_TEXT,
  WELLNESS_VISIT_SUGGESTED_TEXT,
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
  ANIMAL_BITE_SUGGESTED_TEXT,
} from "./providerDischargeTemplateSuggestedTextCatalog";
import {
  newDefaultFollowUpRow,
  newDiagnosisDocId,
  type ProviderDischargeDiagnosisCard,
  type ProviderDischargeFollowUpRow,
} from "./providerDischargeDocumentationModel";
import { buildAppliedDiagnosisInstructionsFromTemplateBody } from "./providerDischargeTemplatePediatricGovernance";
import { personalizeGenericDischargeTemplateBody } from "./providerDischargeTemplateGoldStandard";
import {
  ED_DEFAULT_PCP_FOLLOW_UP_TIMING,
  ED_DEFAULT_PCP_FOLLOW_UP_TIMING_OR_DIRECTED,
  ED_DEFAULT_SPECIALIST_FOLLOW_UP_TIMING,
} from "./providerDischargeFollowUpTimingLocale";

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
  /** Phase 19Y.15 — cardiology / high-risk medical safety governance metadata (not shown in UI). */
  cardioHighRiskSafety?: ProviderDischargeTemplateCardioHighRiskSafety;
  /** Phase 19Y.17 — infectious disease / sepsis-risk safety governance metadata (not shown in UI). */
  infectiousRiskSafety?: ProviderDischargeTemplateInfectiousRiskSafety;
  /** Phase 19Y.19 — renal/urology/electrolyte-risk safety governance metadata (not shown in UI). */
  renalElectrolyteSafety?: ProviderDischargeTemplateRenalElectrolyteSafety;
  /** Phase 19Y.21 — endocrine/diabetes/metabolic-risk safety governance metadata (not shown in UI). */
  endocrineMetabolicSafety?: ProviderDischargeTemplateEndocrineMetabolicSafety;
  /** Phase 19Y.23 — neurology / seizure / stroke-risk safety governance metadata (not shown in UI). */
  neurologySafety?: ProviderDischargeTemplateNeurologySafety;
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
export type { ProviderDischargeTemplateCardioHighRiskSafety } from "./providerDischargeTemplateCardioHighRiskGovernance";
export type { ProviderDischargeTemplateInfectiousRiskSafety } from "./providerDischargeTemplateInfectiousRiskGovernance";
export type { ProviderDischargeTemplateRenalElectrolyteSafety } from "./providerDischargeTemplateRenalElectrolyteGovernance";
export type { ProviderDischargeTemplateEndocrineMetabolicSafety } from "./providerDischargeTemplateEndocrineMetabolicGovernance";
export type { ProviderDischargeTemplateNeurologySafety } from "./providerDischargeTemplateNeurologyGovernance";

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

/** Phase 19Y.16 — cardiology & high-risk medical ED discharge template batch 10. */
export const BATCH_10_CARDIO_HIGH_RISK_ED_DISCHARGE_TEMPLATE_IDS = [
  "cardio_hypertension_elevated_bp_v1",
  "high_risk_medical_fatigue_v1",
  "high_risk_medical_general_weakness_v1",
  "high_risk_medical_dizziness_v1",
  "high_risk_medical_headache_v1",
  "high_risk_medical_leg_swelling_v1",
  "cardio_chest_pain_low_risk_v1",
  "cardio_syncope_v1",
  "cardio_afib_rate_controlled_v1",
  "cardio_heart_failure_symptoms_v1",
] as const;

/** Phase 19Y.18 — infectious disease & sepsis-risk ED discharge template batch 11. */
export const BATCH_11_INFECTIOUS_SEPSIS_ED_DISCHARGE_TEMPLATE_IDS = [
  "infectious_fever_unknown_source_v1",
  "infectious_upper_respiratory_infection_v1",
  "infectious_viral_syndrome_v1",
  "infectious_pharyngitis_v1",
  "infectious_sinusitis_v1",
  "infectious_pneumonia_followup_v1",
  "infectious_covid_like_illness_v1",
  "gi_infectious_gastroenteritis_v1",
  "infectious_cellulitis_followup_v1",
  "sepsis_risk_return_precautions_v1",
] as const;

/** Phase 19Y.20 — renal/urology/electrolyte-risk ED discharge template batch 12. */
export const BATCH_12_RENAL_UROLOGY_ELECTROLYTE_TEMPLATE_IDS = [
  "renal_aki_followup_v1",
  "renal_dehydration_followup_v1",
  "renal_electrolyte_abnormality_followup_v1",
  "urology_renal_colic_followup_v1",
  "urology_uti_followup_v1",
  "urology_pyelonephritis_followup_v1",
  "urology_hematuria_followup_v1",
  "urology_urinary_retention_followup_v1",
  "urology_foley_catheter_precautions_v1",
  "dialysis_return_precautions_v1",
] as const;

/** Phase 19Y.22 — endocrine/diabetes/metabolic-risk ED discharge template batch 13. */
export const BATCH_13_ENDOCRINE_METABOLIC_TEMPLATE_IDS = [
  "diabetes_hyperglycemia_followup_v1",
  "diabetes_hypoglycemia_followup_v1",
  "diabetes_dka_return_precautions_v1",
  "diabetes_insulin_management_precautions_v1",
  "endocrine_thyroid_symptom_followup_v1",
  "metabolic_dehydration_followup_v1",
  "metabolic_nausea_weakness_followup_v1",
  "metabolic_electrolyte_followup_v1",
  "endocrine_polyuria_polydipsia_followup_v1",
  "diabetes_sick_day_precautions_v1",
] as const;

/** Phase MEDUI.ED.DISCHARGE.DIAGNOSIS_INSTRUCTIONS.2 — common diagnosis-tab templates. */
export const BATCH_14_ED_COMMON_DIAGNOSIS_TEMPLATE_IDS = [
  "vaccination_visit_v1",
  "wellness_visit_v1",
  "type_2_diabetes_v1",
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

const CARDIO_HIGH_RISK_TEMPLATE_GOVERNANCE = {
  ...BATCH_GOVERNANCE_DRAFT,
  specialtyCategory: "cardiology",
  riskCategory: "high",
};

const HIGH_RISK_MEDICAL_TEMPLATE_GOVERNANCE = {
  ...BATCH_GOVERNANCE_DRAFT,
  specialtyCategory: "emergency_medicine",
  riskCategory: "high",
};

const INFECTIOUS_TEMPLATE_GOVERNANCE = {
  ...BATCH_GOVERNANCE_DRAFT,
  specialtyCategory: "infectious_disease",
  riskCategory: "high",
};

const RENAL_UROLOGY_ELECTROLYTE_TEMPLATE_GOVERNANCE = {
  ...BATCH_GOVERNANCE_DRAFT,
  specialtyCategory: "nephrology_urology",
  riskCategory: "high",
};

const ENDOCRINE_METABOLIC_TEMPLATE_GOVERNANCE = {
  ...BATCH_GOVERNANCE_DRAFT,
  specialtyCategory: "endocrinology",
  riskCategory: "high",
};

/** @deprecated Use BATCH_GOVERNANCE_DRAFT */
const BATCH_1_GOVERNANCE = BATCH_GOVERNANCE_DRAFT;

export {
  ED_DEFAULT_PCP_FOLLOW_UP_TIMING,
  ED_DEFAULT_PCP_FOLLOW_UP_TIMING_OR_DIRECTED,
  ED_DEFAULT_SPECIALIST_FOLLOW_UP_TIMING,
} from "./providerDischargeFollowUpTimingLocale";

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
      registryFollowUp("chest-pcp", "PRIMARY_CARE", "within 1–2 days"),
      registryFollowUp("chest-cardiology", "CARDIOLOGY", "within 1–2 days or as clinically appropriate"),
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
      registryFollowUp("abd-pcp", "PRIMARY_CARE", "within 1–2 days"),
      registryFollowUp("abd-gi", "GASTROENTEROLOGY", "within 1–2 days or as clinically appropriate"),
      registryFollowUp("abd-surgery", "GENERAL_SURGERY", "within 1–2 days or as clinically appropriate"),
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
      registryFollowUp("headache-pcp", "PRIMARY_CARE", "within 1–2 days"),
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
      icdExact: ["J00"],
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
    defaultFollowUps: [registryFollowUp("uri-pcp", "PRIMARY_CARE", "within 1–2 days")],
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
      registryFollowUp("uti-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
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
    id: "animal_bite_v1",
    version: "1.0.0",
    title: "Animal bite discharge documentation",
    specialtyCategory: "wound_care",
    riskCategory: "moderate_to_high",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdExact: [
        "W54.0XXA",
        "W55.01XA",
        "W55.03XA",
        "W55.81XA",
        "W50.3XXA",
        "S61.459A",
        "S01.05XA",
      ],
      icdFamily: [
        "W54",
        "W55",
        "W50.3",
        "S01.05",
        "S01.15",
        "S01.25",
        "S01.35",
        "S01.45",
        "S01.55",
        "S11.95",
        "S41.15",
        "S51.85",
        "S61.45",
        "S71.15",
        "S81.85",
        "S91.15",
      ],
      keyword: [
        "animal bite",
        "dog bite",
        "cat bite",
        "human bite",
        "mammal bite",
        "bite wound",
        "open bite",
        "bitten by dog",
        "bitten by cat",
        "morsure animale",
        "morsure de chien",
        "morsure de chat",
        "morsure humaine",
        "plaie par morsure",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Animal bites",
        url: "https://medlineplus.gov/animalbites.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "CDC — Animal bites",
        url: "https://www.cdc.gov/healthypets/pets/dogs.html",
        publisher: "Centers for Disease Control and Prevention (CDC)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("bite-wound-check", "ED_RECHECK", "within 1–2 days for high-risk wounds"),
      registryFollowUp("bite-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
      registryFollowUp("bite-wound-care", "WOUND_CARE", "within 1–2 days or as directed"),
    ],
    suggestedText: ANIMAL_BITE_SUGGESTED_TEXT,
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
    defaultFollowUps: [registryFollowUp("nausea-pcp", "PRIMARY_CARE", "within 1–2 days")],
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
      icdExact: ["R19.7", "A09", "K59.1"],
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
    defaultFollowUps: [registryFollowUp("gastro-pcp", "PRIMARY_CARE", "within 1–2 days")],
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
      registryFollowUp("back-pcp", "PRIMARY_CARE", "within 1–2 days"),
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
      registryFollowUp("dental-fu", "PRIMARY_CARE", "within 1–2 days", "Dentist or oral surgery as directed"),
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
      icdFamily: ["H66", "J02", "J03"],
      keyword: ["ear pain", "otitis", "sore throat", "pharyngitis", "tonsillitis"],
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
      registryFollowUp("otitis-pcp", "PRIMARY_CARE", "within 1–2 days"),
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
      registryFollowUp("htn-pcp", "PRIMARY_CARE", "within 1–2 days"),
      registryFollowUp("htn-cardiology", "CARDIOLOGY", "within 1–2 days or as clinically appropriate"),
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
      icdFamily: ["L03", "L08"],
      icdExact: ["L08.9"],
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
      registryFollowUp("cellulitis-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
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
    defaultFollowUps: [registryFollowUp("dehydration-pcp", "PRIMARY_CARE", "within 1–2 days")],
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
      registryFollowUp("asthma-pcp", "PRIMARY_CARE", "within 1–2 days"),
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
      registryFollowUp("copd-pcp", "PRIMARY_CARE", "within 1–2 days"),
      registryFollowUp("copd-pulm", "PULMONOLOGY", "within 1–2 days or as clinically appropriate"),
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
    defaultFollowUps: [registryFollowUp("bronchitis-pcp", "PRIMARY_CARE", "within 1–2 days")],
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
      registryFollowUp("pneumonia-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
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
      registryFollowUp("syncope-pcp", "PRIMARY_CARE", "within 1–2 days"),
      registryFollowUp("syncope-cardiology", "CARDIOLOGY", "within 1–2 days or as clinically appropriate"),
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
      registryFollowUp("vertigo-pcp", "PRIMARY_CARE", "within 1–2 days"),
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
      registryFollowUp("stone-urology", "UROLOGY", "within 1–2 days or as directed"),
      registryFollowUp("stone-pcp", "PRIMARY_CARE", "within 1–2 days or as clinically appropriate"),
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
      icdFamily: ["K59.0"],
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
      registryFollowUp("constipation-pcp", "PRIMARY_CARE", "within 1–2 days"),
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
      registryFollowUp("allergy-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
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
      registryFollowUp("head-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
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
      registryFollowUp("tia-neuro", "NEUROLOGY", "within 1–2 days or as directed"),
      registryFollowUp("tia-pcp", "PRIMARY_CARE", "within 1–2 days or as clinically appropriate"),
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
      registryFollowUp("seizure-neuro", "NEUROLOGY", "within 1–2 days or as directed"),
      registryFollowUp("seizure-pcp", "PRIMARY_CARE", "within 1–2 days or as clinically appropriate"),
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
      registryFollowUp("palp-pcp", "PRIMARY_CARE", "within 1–2 days"),
      registryFollowUp("palp-cardiology", "CARDIOLOGY", "within 1–2 days or as clinically appropriate"),
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
      registryFollowUp("sob-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
      registryFollowUp("sob-pulm", "PULMONOLOGY", "within 1–2 days or as clinically appropriate"),
      registryFollowUp("sob-cardiology", "CARDIOLOGY", "within 1–2 days or as clinically appropriate"),
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
    defaultFollowUps: [registryFollowUp("chestwall-pcp", "PRIMARY_CARE", "within 1–2 days or as directed")],
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
      registryFollowUp("hypo-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
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
      registryFollowUp("hyper-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
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
      registryFollowUp("alc-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
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
      registryFollowUp("anx-pcp", "PRIMARY_CARE", "within 1–2 days"),
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
      registryFollowUp("pf-peds", "PEDIATRICS", "within 1–2 days or as clinically appropriate"),
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
    defaultFollowUps: [registryFollowUp("puri-pcp", "PRIMARY_CARE", "within 1–2 days")],
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
      registryFollowUp("pot-peds", "PEDIATRICS", "within 1–2 days"),
      registryFollowUp("pot-pcp", "PRIMARY_CARE", "within 1–2 days or as clinically appropriate"),
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
      registryFollowUp("pa-peds", "PEDIATRICS", "within 1–2 days"),
      registryFollowUp("pa-pcp", "PRIMARY_CARE", "within 1–2 days or as clinically appropriate"),
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
      registryFollowUp("pfs-peds", "PEDIATRICS", "within 1–2 days"),
      registryFollowUp("pfs-pcp", "PRIMARY_CARE", "within 1–2 days or as clinically appropriate"),
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
    defaultFollowUps: [registryFollowUp("pap-pcp", "PRIMARY_CARE", "within 1–2 days")],
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
      registryFollowUp("pw-peds", "PEDIATRICS", "within 1–2 days"),
      registryFollowUp("pw-pcp", "PRIMARY_CARE", "within 1–2 days or as clinically appropriate"),
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
    defaultFollowUps: [registryFollowUp("pflu-pcp", "PRIMARY_CARE", "within 1–2 days")],
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
    defaultFollowUps: [registryFollowUp("odys-ob", "OBGYN", "within 1–2 days")],
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
    defaultFollowUps: [registryFollowUp("ovag-ob", "OBGYN", "within 1–2 days")],
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
    defaultFollowUps: [registryFollowUp("orl-ob", "OBGYN", "within 1–2 days or as clinically appropriate")],
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
      registryFollowUp("bha-bh", "BEHAVIORAL_HEALTH", "within 1–2 days or as directed"),
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
      registryFollowUp("bhd-bh", "BEHAVIORAL_HEALTH", "within 1–2 days or as directed"),
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
      registryFollowUp("bhai-sub", "SUBSTANCE_USE_TREATMENT", "within 1–2 days or as directed"),
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
      registryFollowUp("bhsu-sub", "SUBSTANCE_USE_TREATMENT", "within 1–2 days or as directed"),
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
      registryFollowUp("bhi-bh", "BEHAVIORAL_HEALTH", "within 1–2 days or as directed"),
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
      registryFollowUp("bhg-bh", "BEHAVIORAL_HEALTH", "within 1–2 days or as directed"),
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
      keyword: [
        "msk ankle sprain",
        "ankle sprain msk",
        "entorse cheville msk",
        "ankle sprain",
        "twisted ankle",
        "entorse de la cheville",
        "entorse cheville",
        "cheville tordue",
      ],
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
    defaultFollowUps: [registryFollowUp("tma-ortho", "ORTHOPEDICS", "within 1–2 days or as directed")],
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
      keyword: [
        "msk wrist sprain",
        "wrist sprain msk",
        "entorse poignet msk",
        "wrist sprain",
        "entorse du poignet",
        "entorse poignet",
      ],
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
    defaultFollowUps: [registryFollowUp("tmw-ortho", "ORTHOPEDICS", "within 1–2 days or as directed")],
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
      icdFamily: ["S83.2", "S83.3", "S83.6", "S83.9", "S89"],
      keyword: [
        "msk knee injury",
        "knee injury msk",
        "blessure genou msk",
        "knee sprain",
        "entorse genou",
        "entorse du genou",
        "entorse genou",
      ],
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
    defaultFollowUps: [registryFollowUp("tmk-ortho", "ORTHOPEDICS", "within 1–2 days or as directed")],
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
      icdFamily: ["M25.51", "S43.4", "S43.5"],
      keyword: [
        "msk shoulder pain",
        "shoulder pain msk",
        "douleur épaule msk",
        "shoulder sprain",
        "shoulder strain",
        "entorse de l'épaule",
        "entorse épaule",
      ],
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
    defaultFollowUps: [registryFollowUp("tms-ortho", "ORTHOPEDICS", "within 1–2 days or as directed")],
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
      icdExact: ["S39.012", "S39.012A"],
      icdFamily: ["S33.5", "S39.01"],
      keyword: [
        "msk back strain",
        "back strain msk",
        "entorse dos msk",
        "back strain",
        "lumbar strain",
        "entorse lombaire",
        "entorse du dos",
      ],
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
    defaultFollowUps: [registryFollowUp("tmb-pcp", "PRIMARY_CARE", "within 1–2 days or as directed")],
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
      icdExact: ["S16.1", "S16.1XXA"],
      icdFamily: ["S13.4", "S16"],
      keyword: [
        "msk neck strain",
        "neck strain msk",
        "entorse cou msk",
        "neck strain",
        "cervical strain",
        "whiplash",
        "entorse cervicale",
        "entorse du cou",
      ],
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
    defaultFollowUps: [registryFollowUp("tmn-pcp", "PRIMARY_CARE", "within 1–2 days or as directed")],
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
    defaultFollowUps: [registryFollowUp("tmc-pcp", "PRIMARY_CARE", "within 1–2 days")],
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
      icdFamily: ["S22.3", "S22.4", "S22.5", "S20"],
      keyword: [
        "msk rib injury",
        "rib injury msk",
        "blessure côte msk",
        "rib fracture",
        "broken rib",
        "multiple rib fractures",
        "flail chest",
        "fracture de côte",
        "côte cassée",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Rib injuries",
        url: "https://medlineplus.gov/ency/article/003109.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmr-pcp", "PRIMARY_CARE", "within 1–2 days or as directed")],
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
      icdFamily: [
        "S42",
        "S52",
        "S72",
        "S82",
        "S92",
        "M84",
        "S32.1",
        "S32.2",
        "S32.3",
        "S32.4",
        "S32.5",
        "S32.6",
        "S32.8",
        "S32.9",
      ],
      keyword: [
        "msk minor fracture precautions",
        "minor fracture precautions msk",
        "précautions fracture mineure msk",
        "fracture",
        "broken bone",
        "broken arm",
        "broken wrist",
        "broken leg",
        "broken ankle",
        "broken collarbone",
        "broken shoulder",
        "broken foot",
        "broken toe",
        "closed fracture",
        "stress fracture",
        "pathologic fracture",
        "greenstick fracture",
        "buckle fracture",
        "avulsion fracture",
        "pelvic fracture",
        "pelvis fracture",
        "broken pelvis",
        "os cassé",
        "bras cassé",
        "poignet cassé",
        "jambe cassée",
        "cheville cassée",
        "épaule cassée",
        "clavicule cassée",
        "fracture fermée",
        "fracture de stress",
        "fracture pathologique",
        "fracture du bassin",
        "bassin cassé",
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
    id: "trauma_msk_fracture_hip_v1",
    version: "1.0.0",
    title: "Trauma/MSK hip fracture discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      imagingSensitive: true,
      requiresFracturePrecautions: true,
      requiresNeurovascularPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S72.0", "S72.1", "S72.2"],
      keyword: [
        "hip fracture",
        "broken hip",
        "fractured hip",
        "femoral neck fracture",
        "femur neck fracture",
        "fracture de la hanche",
        "hanche cassée",
        "fracture du col du fémur",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Hip fractures",
        url: "https://medlineplus.gov/hipinjuriesanddisorders.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "OrthoInfo — Hip fractures",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/hip-fractures/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmfh-ortho", "ORTHOPEDICS", "within 24–72 hours or as directed")],
    suggestedText: TRAUMA_MSK_FRACTURE_HIP_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_fracture_hand_v1",
    version: "1.0.0",
    title: "Trauma/MSK hand/finger/wrist bone fracture discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      imagingSensitive: true,
      requiresFracturePrecautions: true,
      requiresNeurovascularPrecautions: true,
      requiresSplintCastPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S62"],
      keyword: [
        "hand fracture",
        "broken hand",
        "finger fracture",
        "broken finger",
        "broken thumb",
        "metacarpal fracture",
        "phalanx fracture",
        "fracture de la main",
        "main cassée",
        "fracture du doigt",
        "doigt cassé",
        "fracture métacarpienne",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Hand injuries and disorders",
        url: "https://medlineplus.gov/handinjuriesanddisorders.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "OrthoInfo — Hand fractures",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/hand-fractures/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmfha-ortho", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_FRACTURE_HAND_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_fracture_facial_v1",
    version: "1.0.0",
    title: "Trauma/MSK facial/nasal/orbital/mandible fracture discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      imagingSensitive: true,
      requiresFracturePrecautions: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S02"],
      keyword: [
        "facial fracture",
        "broken jaw",
        "jaw fracture",
        "mandible fracture",
        "orbital fracture",
        "broken nose",
        "nasal fracture",
        "broken cheekbone",
        "cheekbone fracture",
        "eye socket fracture",
        "fracture faciale",
        "mâchoire cassée",
        "fracture de la mâchoire",
        "fracture orbitaire",
        "nez cassé",
        "fracture du nez",
        "fracture de la pommette",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Facial injuries and disorders",
        url: "https://medlineplus.gov/facialinjuriesanddisorders.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmff-ent", "ENT", "within 3–5 days or as directed")],
    suggestedText: TRAUMA_MSK_FRACTURE_FACIAL_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_fracture_spine_v1",
    version: "1.0.0",
    title: "Trauma/MSK spinal (vertebral) fracture discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      imagingSensitive: true,
      requiresFracturePrecautions: true,
      requiresHeadNeckSpineEscalation: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S12", "S22.0", "S22.1", "S32.0"],
      keyword: [
        "spinal fracture",
        "vertebral fracture",
        "back fracture",
        "compression fracture spine",
        "cervical spine fracture",
        "lumbar spine fracture",
        "broken back",
        "broken neck",
        "fracture de la colonne",
        "fracture vertébrale",
        "fracture du dos",
        "fracture cervicale",
        "fracture lombaire",
        "dos cassé",
        "cou cassé",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Back injuries",
        url: "https://medlineplus.gov/backinjuries.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "OrthoInfo — Spinal fractures",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/osteoporosis-and-spinal-fractures/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmfs-ortho", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_FRACTURE_SPINE_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_fracture_open_v1",
    version: "1.0.0",
    title: "Trauma/MSK open (compound) fracture discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      imagingSensitive: true,
      requiresFracturePrecautions: true,
      requiresNeurovascularPrecautions: true,
      requiresCompartmentSyndromePrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdExact: ["S82.201B", "S52.531B", "S72.001B"],
      keyword: ["open fracture", "compound fracture", "open bone fracture", "fracture ouverte", "fracture composée"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Fractures",
        url: "https://medlineplus.gov/fractures.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
      {
        label: "OrthoInfo — Open fractures",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/open-fractures/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmfo-ortho", "ORTHOPEDICS", "within 24–48 hours or as directed")],
    suggestedText: TRAUMA_MSK_FRACTURE_OPEN_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_dislocation_shoulder_v1",
    version: "1.0.0",
    title: "Trauma/MSK shoulder dislocation discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S43.0", "S43.1", "S43.2"],
      keyword: [
        "shoulder dislocation",
        "dislocated shoulder",
        "ac separation",
        "acromioclavicular",
        "luxation de l'épaule",
        "épaule luxée",
      ],
    },
    sourceReferences: [
      {
        label: "OrthoInfo — Shoulder dislocation",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/shoulder-dislocation/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmds-ortho", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_DISLOCATION_SHOULDER_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_dislocation_elbow_v1",
    version: "1.0.0",
    title: "Trauma/MSK elbow / nursemaid dislocation discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S53.0", "S53.1"],
      keyword: [
        "elbow dislocation",
        "nursemaid elbow",
        "pulled elbow",
        "radial head subluxation",
        "poignet de bonne",
        "luxation du coude",
      ],
    },
    sourceReferences: [
      {
        label: "OrthoInfo — Nursemaid's elbow",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/nursemaids-elbow/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmde-ortho", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_DISLOCATION_ELBOW_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_dislocation_hip_v1",
    version: "1.0.0",
    title: "Trauma/MSK hip dislocation discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S73.0"],
      keyword: ["hip dislocation", "dislocated hip", "luxation de la hanche", "hanche luxée"],
    },
    sourceReferences: [
      {
        label: "OrthoInfo — Hip dislocation",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/hip-dislocation/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmdh-ortho", "ORTHOPEDICS", "within 24–72 hours or as directed")],
    suggestedText: TRAUMA_MSK_DISLOCATION_HIP_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_dislocation_patella_v1",
    version: "1.0.0",
    title: "Trauma/MSK patella / knee dislocation discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S83.0", "S83.1"],
      keyword: [
        "patella dislocation",
        "dislocated kneecap",
        "patellar dislocation",
        "knee dislocation",
        "luxation de la rotule",
        "rotule luxée",
      ],
    },
    sourceReferences: [
      {
        label: "OrthoInfo — Patellar dislocation",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/patellar-dislocation-and-instability-in-children/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmdp-ortho", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_DISLOCATION_PATELLA_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_dislocation_hand_v1",
    version: "1.0.0",
    title: "Trauma/MSK hand/finger/wrist dislocation discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresSplintCastPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S63.0", "S63.1", "S63.2"],
      keyword: [
        "finger dislocation",
        "thumb dislocation",
        "wrist dislocation",
        "dislocated finger",
        "luxation du doigt",
        "doigt luxé",
      ],
    },
    sourceReferences: [
      {
        label: "OrthoInfo — Finger dislocation",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/finger-fractures/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmdha-ortho", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_DISLOCATION_HAND_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_dislocation_jaw_v1",
    version: "1.0.0",
    title: "Trauma/MSK jaw/TMJ dislocation discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S03.0"],
      keyword: ["jaw dislocation", "tmj dislocation", "dislocated jaw", "luxation de la mâchoire", "luxation atm"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Jaw injuries",
        url: "https://medlineplus.gov/jawinjuriesanddisorders.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmdj-ent", "ENT", "within 3–5 days or as directed")],
    suggestedText: TRAUMA_MSK_DISLOCATION_JAW_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_dislocation_generic_v1",
    version: "1.0.0",
    title: "Trauma/MSK joint dislocation discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S93.0", "S93.1", "S93.3"],
      keyword: [
        "ankle dislocation",
        "foot dislocation",
        "toe dislocation",
        "joint dislocation",
        "dislocation",
        "luxation",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Dislocations",
        url: "https://medlineplus.gov/dislocations.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmdg-ortho", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_DISLOCATION_GENERIC_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_sprain_generic_v1",
    version: "1.0.0",
    title: "Trauma/MSK sprain or strain discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresReturnActivityRestrictions: true,
      requiresOrthopedicFollowUp: true,
    },
    diagnosisMappings: {
      icdFamily: ["S53.3", "S63.4", "S73.1", "S76.3", "S93.5", "S93.6", "S23.3", "S29"],
      keyword: [
        "sprain",
        "strain",
        "hamstring strain",
        "groin strain",
        "pulled muscle",
        "entorse",
        "élongation",
        "claquage",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Sprains and strains",
        url: "https://medlineplus.gov/sprainsandstrains.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmsg-ortho", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_SPRAIN_GENERIC_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_tendon_achilles_v1",
    version: "1.0.0",
    title: "Trauma/MSK Achilles tendon injury discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
      requiresSplintCastPrecautions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S86.0"],
      keyword: ["achilles tendon", "achilles rupture", "tendon d'achille", "rupture d'achille"],
    },
    sourceReferences: [
      {
        label: "OrthoInfo — Achilles tendon rupture",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/achilles-tendon-rupture/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmta-ortho", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_TENDON_ACHILLES_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_tendon_extensor_mechanism_v1",
    version: "1.0.0",
    title: "Trauma/MSK extensor-mechanism tendon injury discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
      requiresSplintCastPrecautions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S76.1"],
      keyword: ["quadriceps tendon", "patellar tendon", "tendon rotulien", "tendon du quadriceps"],
    },
    sourceReferences: [
      {
        label: "OrthoInfo — Quadriceps tendon rupture",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/quadriceps-tendon-tear/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmtem-ortho", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_TENDON_EXTENSOR_MECHANISM_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_tendon_shoulder_v1",
    version: "1.0.0",
    title: "Trauma/MSK shoulder tendon injury discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S46.0", "S46.1", "S46.2", "S46.3", "M75.1"],
      keyword: [
        "rotator cuff",
        "rotator cuff tear",
        "biceps tendon",
        "triceps tendon",
        "coiffe des rotateurs",
        "tendon du biceps",
      ],
    },
    sourceReferences: [
      {
        label: "OrthoInfo — Rotator cuff tears",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/rotator-cuff-tears/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmts-ortho", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_TENDON_SHOULDER_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_tendon_hand_v1",
    version: "1.0.0",
    title: "Trauma/MSK hand tendon injury discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
      requiresSplintCastPrecautions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S66.1", "S66.2", "S66.3", "S66.5", "M66.2", "M66.3"],
      keyword: [
        "flexor tendon",
        "extensor tendon",
        "mallet finger",
        "tendon laceration",
        "tendon extenseur",
        "tendon fléchisseur",
        "doigt en maillet",
      ],
    },
    sourceReferences: [
      {
        label: "OrthoInfo — Flexor tendon injuries",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/flexor-tendon-injuries/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmth-hand", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_TENDON_HAND_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_tendon_generic_v1",
    version: "1.0.0",
    title: "Trauma/MSK tendon injury discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S76.0", "S76.2", "S86.3", "S86.8"],
      keyword: ["tendon injury", "tendon rupture", "tendon tear", "lésion tendineuse", "rupture tendineuse"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Tendon injuries",
        url: "https://medlineplus.gov/tendons.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmtg-ortho", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_TENDON_GENERIC_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_ligament_knee_v1",
    version: "1.0.0",
    title: "Trauma/MSK knee ligament injury discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S83.41", "S83.42", "S83.51", "S83.52", "S83.4", "S83.5"],
      keyword: ["acl", "pcl", "mcl", "lcl", "knee ligament", "anterior cruciate", "lca", "croisé antérieur"],
    },
    sourceReferences: [
      {
        label: "OrthoInfo — ACL injury",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/anterior-cruciate-ligament-acl-injuries/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmlk-ortho", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_LIGAMENT_KNEE_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_ligament_ankle_v1",
    version: "1.0.0",
    title: "Trauma/MSK ankle ligament injury discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S93.41", "S93.42", "S93.43"],
      keyword: ["syndesmosis", "high ankle sprain", "deltoid ligament", "entorse haute", "syndesmose"],
    },
    sourceReferences: [
      {
        label: "OrthoInfo — High ankle sprain",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/sprained-ankle/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmla-ortho", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_LIGAMENT_ANKLE_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_ligament_hand_v1",
    version: "1.0.0",
    title: "Trauma/MSK hand ligament injury discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
      requiresSplintCastPrecautions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S63.64", "S63.61", "S63.62", "S63.3"],
      keyword: ["thumb ucl", "skier thumb", "gamekeeper", "finger collateral", "pouce du skieur"],
    },
    sourceReferences: [
      {
        label: "OrthoInfo — Thumb sprains",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/thumb-sprains/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmlh-hand", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_LIGAMENT_HAND_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_ligament_upper_extremity_v1",
    version: "1.0.0",
    title: "Trauma/MSK wrist or elbow ligament injury discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S63.51", "S53.4"],
      keyword: ["scapholunate", "wrist ligament", "elbow collateral", "scapho-lunaire"],
    },
    sourceReferences: [
      {
        label: "OrthoInfo — Wrist sprains",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/wrist-sprains/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmlu-ortho", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_LIGAMENT_UPPER_EXTREMITY_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_ligament_shoulder_v1",
    version: "1.0.0",
    title: "Trauma/MSK shoulder ligament injury discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      keyword: [
        "ac ligament",
        "acromioclavicular ligament",
        "shoulder ligament",
        "ligament acromio-claviculaire",
      ],
    },
    sourceReferences: [
      {
        label: "OrthoInfo — Shoulder separation",
        url: "https://orthoinfo.aaos.org/en/diseases--conditions/shoulder-separation/",
        publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmls-ortho", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_LIGAMENT_SHOULDER_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_ligament_generic_v1",
    version: "1.0.0",
    title: "Trauma/MSK ligament injury discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S13.1", "S33.4"],
      keyword: ["ligament tear", "ligament injury", "lésion ligamentaire", "déchirure ligamentaire"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Sprains and strains",
        url: "https://medlineplus.gov/sprainsandstrains.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("tmlg-ortho", "ORTHOPEDICS", "within 3–7 days or as directed")],
    suggestedText: TRAUMA_MSK_LIGAMENT_GENERIC_SUGGESTED_TEXT,
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
    defaultFollowUps: [registryFollowUp("tmm-pcp", "PRIMARY_CARE", "within 1–2 days or as directed")],
    suggestedText: TRAUMA_MSK_MVC_SORENESS_SUGGESTED_TEXT,
  },
  {
    id: "cardio_hypertension_elevated_bp_v1",
    version: "1.0.0",
    title: "Cardiology elevated blood pressure discharge documentation",
    ...CARDIO_HIGH_RISK_TEMPLATE_GOVERNANCE,
    cardioHighRiskSafety: {
      requiresEmergencyEscalation: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: [
        "cardio elevated blood pressure",
        "cardio hypertension elevated bp",
        "cardio elevated bp",
        "hypertension cardio elevated",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — High blood pressure",
        url: "https://medlineplus.gov/highbloodpressure.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("cardiohtn-pcp", "PRIMARY_CARE", "within 1–2 days or as directed")],
    suggestedText: CARDIO_HYPERTENSION_ELEVATED_BP_SUGGESTED_TEXT,
  },
  {
    id: "high_risk_medical_fatigue_v1",
    version: "1.0.0",
    title: "High-risk medical fatigue discharge documentation",
    ...HIGH_RISK_MEDICAL_TEMPLATE_GOVERNANCE,
    cardioHighRiskSafety: {
      requiresEmergencyEscalation: true,
    },
    diagnosisMappings: {
      keyword: ["high risk medical fatigue", "hrm fatigue", "fatigue high risk medical"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Fatigue",
        url: "https://medlineplus.gov/fatigue.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("hrmf-pcp", "PRIMARY_CARE", "within 1–2 days or as directed")],
    suggestedText: HIGH_RISK_MEDICAL_FATIGUE_SUGGESTED_TEXT,
  },
  {
    id: "high_risk_medical_general_weakness_v1",
    version: "1.0.0",
    title: "High-risk medical generalized weakness discharge documentation",
    ...HIGH_RISK_MEDICAL_TEMPLATE_GOVERNANCE,
    cardioHighRiskSafety: {
      requiresEmergencyEscalation: true,
    },
    diagnosisMappings: {
      icdFamily: ["R53"],
      keyword: [
        "high risk medical weakness",
        "hrm general weakness",
        "generalized weakness high risk medical",
        "generalized weakness",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Muscle weakness",
        url: "https://medlineplus.gov/ency/article/003174.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("hrmw-pcp", "PRIMARY_CARE", "within 1–2 days or as directed")],
    suggestedText: HIGH_RISK_MEDICAL_GENERAL_WEAKNESS_SUGGESTED_TEXT,
  },
  {
    id: "high_risk_medical_dizziness_v1",
    version: "1.0.0",
    title: "High-risk medical dizziness discharge documentation",
    ...HIGH_RISK_MEDICAL_TEMPLATE_GOVERNANCE,
    cardioHighRiskSafety: {
      requiresDrivingRestrictionCaution: true,
      requiresEmergencyEscalation: true,
      requiresNeurologicEscalation: true,
    },
    diagnosisMappings: {
      keyword: ["high risk medical dizziness", "hrm dizziness", "dizziness high risk medical"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Dizziness and vertigo",
        url: "https://medlineplus.gov/dizzinessandvertigo.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("hrmd-pcp", "PRIMARY_CARE", "within 1–2 days or as directed")],
    suggestedText: HIGH_RISK_MEDICAL_DIZZINESS_SUGGESTED_TEXT,
  },
  {
    id: "high_risk_medical_headache_v1",
    version: "1.0.0",
    title: "High-risk medical headache discharge documentation",
    ...HIGH_RISK_MEDICAL_TEMPLATE_GOVERNANCE,
    cardioHighRiskSafety: {
      requiresNeurologicEscalation: true,
      requiresEmergencyEscalation: true,
    },
    diagnosisMappings: {
      keyword: ["high risk medical headache", "hrm headache", "headache high risk medical"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Headache",
        url: "https://medlineplus.gov/headache.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("hrmh-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
      registryFollowUp("hrmh-neuro", "NEUROLOGY", "within 1–2 days or as clinically appropriate"),
    ],
    suggestedText: HIGH_RISK_MEDICAL_HEADACHE_SUGGESTED_TEXT,
  },
  {
    id: "high_risk_medical_leg_swelling_v1",
    version: "1.0.0",
    title: "High-risk medical leg swelling discharge documentation",
    ...HIGH_RISK_MEDICAL_TEMPLATE_GOVERNANCE,
    cardioHighRiskSafety: {
      peSensitive: true,
      requiresEmergencyEscalation: true,
    },
    diagnosisMappings: {
      keyword: [
        "high risk medical leg swelling",
        "hrm leg swelling",
        "leg swelling high risk medical",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Leg swelling",
        url: "https://medlineplus.gov/ency/article/003104.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("hrmls-pcp", "PRIMARY_CARE", "within 1–2 days or as directed")],
    suggestedText: HIGH_RISK_MEDICAL_LEG_SWELLING_SUGGESTED_TEXT,
  },
  {
    id: "cardio_chest_pain_low_risk_v1",
    version: "1.0.0",
    title: "Cardiology chest pain follow-up discharge documentation",
    ...CARDIO_HIGH_RISK_TEMPLATE_GOVERNANCE,
    cardioHighRiskSafety: {
      acsSensitive: true,
      ekgSensitive: true,
      troponinLabSensitive: true,
      requiresChestPainEscalation: true,
      requiresEmergencyEscalation: true,
      requiresResultInterpretationCaution: true,
      requiresCardiologyFollowUp: true,
    },
    diagnosisMappings: {
      keyword: ["chest pain follow-up", "nonspecific chest pain", "atypical chest pain"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Chest pain",
        url: "https://medlineplus.gov/chestpain.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("cardiocp-cardiology", "CARDIOLOGY", "within 1–2 days or as directed"),
      registryFollowUp("cardiocp-ed", "EMERGENCY_MEDICINE", "if symptoms recur before cardiology follow-up"),
    ],
    suggestedText: CARDIO_CHEST_PAIN_FOLLOW_UP_SUGGESTED_TEXT,
  },
  {
    id: "cardio_syncope_v1",
    version: "1.0.0",
    title: "Cardiology syncope discharge documentation",
    ...CARDIO_HIGH_RISK_TEMPLATE_GOVERNANCE,
    cardioHighRiskSafety: {
      syncopeSensitive: true,
      requiresDrivingRestrictionCaution: true,
      requiresEmergencyEscalation: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["cardio syncope", "cardio syncope follow-up", "cardio fainting follow-up"],
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
      registryFollowUp("cardiosync-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
      registryFollowUp("cardiosync-cardiology", "CARDIOLOGY", "within 1–2 days or as clinically appropriate"),
    ],
    suggestedText: CARDIO_SYNCOPE_FOLLOW_UP_SUGGESTED_TEXT,
  },
  {
    id: "cardio_afib_rate_controlled_v1",
    version: "1.0.0",
    title: "Cardiology atrial fibrillation discharge documentation",
    ...CARDIO_HIGH_RISK_TEMPLATE_GOVERNANCE,
    cardioHighRiskSafety: {
      anticoagulationSensitive: true,
      requiresAnticoagulationPrecautions: true,
      requiresCardiologyFollowUp: true,
      requiresEmergencyEscalation: true,
    },
    diagnosisMappings: {
      icdFamily: ["I48"],
      keyword: ["atrial fibrillation cardio", "afib cardio", "cardio afib"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Atrial fibrillation",
        url: "https://medlineplus.gov/atrialfibrillation.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("cardioafib-cardiology", "CARDIOLOGY", "within 1–2 days or as directed")],
    suggestedText: CARDIO_AFIB_RATE_CONTROLLED_SUGGESTED_TEXT,
  },
  {
    id: "cardio_heart_failure_symptoms_v1",
    version: "1.0.0",
    title: "Cardiology heart failure symptoms discharge documentation",
    ...CARDIO_HIGH_RISK_TEMPLATE_GOVERNANCE,
    cardioHighRiskSafety: {
      dyspneaSensitive: true,
      requiresFluidStatusPrecautions: true,
      requiresEmergencyEscalation: true,
      requiresCardiologyFollowUp: true,
    },
    diagnosisMappings: {
      icdFamily: ["I50"],
      keyword: ["heart failure symptoms cardio", "cardio heart failure symptoms", "chf symptoms cardio"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Heart failure",
        url: "https://medlineplus.gov/heartfailure.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("cardiohf-cardiology", "CARDIOLOGY", "within 1–2 days or as directed"),
      registryFollowUp("cardiohf-pcp", "PRIMARY_CARE", "within 1–2 days or as clinically appropriate"),
    ],
    suggestedText: CARDIO_HEART_FAILURE_SYMPTOMS_SUGGESTED_TEXT,
  },
  {
    id: "infectious_fever_unknown_source_v1",
    version: "1.0.0",
    title: "Infectious fever unknown source discharge documentation",
    ...INFECTIOUS_TEMPLATE_GOVERNANCE,
    infectiousRiskSafety: {
      sepsisSensitive: true,
      requiresFeverEscalation: true,
      requiresReturnIfWorsening: true,
      requiresPrimaryCareFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["infectious fever follow-up", "fever unknown source", "fever return precautions"],
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
      registryFollowUp("inffever-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
    ],
    suggestedText: INFECTIOUS_FEVER_UNKNOWN_SOURCE_SUGGESTED_TEXT,
  },
  {
    id: "infectious_upper_respiratory_infection_v1",
    version: "1.0.0",
    title: "Infectious upper respiratory infection discharge documentation",
    ...INFECTIOUS_TEMPLATE_GOVERNANCE,
    infectiousRiskSafety: {
      respiratoryInfectiousSensitive: true,
      requiresRespiratoryEscalation: true,
      requiresReturnIfWorsening: true,
      requiresPrimaryCareFollowUp: true,
    },
    diagnosisMappings: {
      keyword: ["infectious URI follow-up", "upper respiratory infection follow-up"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Common cold",
        url: "https://medlineplus.gov/commoncold.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("infuri-pcp", "PRIMARY_CARE", "within 1–2 days"),
    ],
    suggestedText: INFECTIOUS_UPPER_RESPIRATORY_INFECTION_SUGGESTED_TEXT,
  },
  {
    id: "infectious_viral_syndrome_v1",
    version: "1.0.0",
    title: "Infectious viral syndrome discharge documentation",
    ...INFECTIOUS_TEMPLATE_GOVERNANCE,
    infectiousRiskSafety: {
      respiratoryInfectiousSensitive: true,
      requiresFeverEscalation: true,
      requiresHydrationEscalation: true,
      requiresReturnIfWorsening: true,
    },
    diagnosisMappings: {
      keyword: ["viral syndrome follow-up", "flu-like infectious symptoms"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Viral infections",
        url: "https://medlineplus.gov/viralinfections.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("infviral-pcp", "PRIMARY_CARE", "within 1–2 days")],
    suggestedText: INFECTIOUS_VIRAL_SYNDROME_SUGGESTED_TEXT,
  },
  {
    id: "infectious_pharyngitis_v1",
    version: "1.0.0",
    title: "Infectious pharyngitis discharge documentation",
    ...INFECTIOUS_TEMPLATE_GOVERNANCE,
    infectiousRiskSafety: {
      requiresFeverEscalation: true,
      requiresHydrationEscalation: true,
      requiresReturnIfWorsening: true,
    },
    diagnosisMappings: {
      keyword: ["pharyngitis follow-up", "infectious pharyngitis follow-up"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Pharyngitis",
        url: "https://medlineplus.gov/pharyngitis.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("infphary-pcp", "PRIMARY_CARE", "within 1–2 days")],
    suggestedText: INFECTIOUS_PHARYNGITIS_SUGGESTED_TEXT,
  },
  {
    id: "infectious_sinusitis_v1",
    version: "1.0.0",
    title: "Infectious sinusitis discharge documentation",
    ...INFECTIOUS_TEMPLATE_GOVERNANCE,
    infectiousRiskSafety: {
      requiresFeverEscalation: true,
      requiresNeurologicEscalation: true,
      requiresReturnIfWorsening: true,
    },
    diagnosisMappings: {
      keyword: ["sinusitis follow-up", "infectious sinusitis follow-up"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Sinusitis",
        url: "https://medlineplus.gov/sinusitis.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("infsinus-pcp", "PRIMARY_CARE", "within 1–2 days")],
    suggestedText: INFECTIOUS_SINUSITIS_SUGGESTED_TEXT,
  },
  {
    id: "infectious_pneumonia_followup_v1",
    version: "1.0.0",
    title: "Infectious pneumonia follow-up discharge documentation",
    ...INFECTIOUS_TEMPLATE_GOVERNANCE,
    infectiousRiskSafety: {
      pneumoniaSensitive: true,
      respiratoryInfectiousSensitive: true,
      requiresRespiratoryEscalation: true,
      requiresReturnIfWorsening: true,
      requiresPrimaryCareFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["pneumonia follow-up", "infectious pneumonia follow-up"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Pneumonia",
        url: "https://medlineplus.gov/pneumonia.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("infpneum-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
      registryFollowUp("infpneum-pulm", "PULMONOLOGY", "within 1–2 days or as clinically appropriate"),
    ],
    suggestedText: INFECTIOUS_PNEUMONIA_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "infectious_covid_like_illness_v1",
    version: "1.0.0",
    title: "Infectious COVID-like illness discharge documentation",
    ...INFECTIOUS_TEMPLATE_GOVERNANCE,
    infectiousRiskSafety: {
      respiratoryInfectiousSensitive: true,
      requiresRespiratoryEscalation: true,
      requiresHydrationEscalation: true,
      requiresReturnIfWorsening: true,
    },
    diagnosisMappings: {
      keyword: ["covid-like illness follow-up", "infectious covid-like illness"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — COVID-19",
        url: "https://medlineplus.gov/covid19.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("infcovid-pcp", "PRIMARY_CARE", "within 1–2 days")],
    suggestedText: INFECTIOUS_COVID_LIKE_ILLNESS_SUGGESTED_TEXT,
  },
  {
    id: "gi_infectious_gastroenteritis_v1",
    version: "1.0.0",
    title: "GI infectious gastroenteritis discharge documentation",
    ...INFECTIOUS_TEMPLATE_GOVERNANCE,
    infectiousRiskSafety: {
      giInfectiousSensitive: true,
      dehydrationSensitive: true,
      requiresHydrationEscalation: true,
      requiresReturnIfWorsening: true,
    },
    diagnosisMappings: {
      keyword: ["GI infectious gastroenteritis follow-up", "infectious gastroenteritis follow-up"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Gastroenteritis",
        url: "https://medlineplus.gov/gastroenteritis.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("infgi-pcp", "PRIMARY_CARE", "within 1–2 days")],
    suggestedText: GI_INFECTIOUS_GASTROENTERITIS_SUGGESTED_TEXT,
  },
  {
    id: "infectious_cellulitis_followup_v1",
    version: "1.0.0",
    title: "Infectious cellulitis follow-up discharge documentation",
    ...INFECTIOUS_TEMPLATE_GOVERNANCE,
    infectiousRiskSafety: {
      requiresFeverEscalation: true,
      requiresRashEscalation: true,
      requiresReturnIfWorsening: true,
      requiresPrimaryCareFollowUp: true,
    },
    diagnosisMappings: {
      keyword: ["cellulitis follow-up", "infectious cellulitis follow-up"],
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
      registryFollowUp("infcell-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
    ],
    suggestedText: INFECTIOUS_CELLULITIS_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "sepsis_risk_return_precautions_v1",
    version: "1.0.0",
    title: "Sepsis-risk return precautions discharge documentation",
    ...INFECTIOUS_TEMPLATE_GOVERNANCE,
    infectiousRiskSafety: {
      sepsisSensitive: true,
      requiresFeverEscalation: true,
      requiresHydrationEscalation: true,
      requiresRespiratoryEscalation: true,
      requiresNeurologicEscalation: true,
      requiresReturnIfWorsening: true,
      requiresPrimaryCareFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["sepsis-risk return precautions", "sepsis risk return precautions"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Sepsis",
        url: "https://medlineplus.gov/sepsis.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("sepsis-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
    ],
    suggestedText: SEPSIS_RISK_RETURN_PRECAUTIONS_SUGGESTED_TEXT,
  },
  {
    id: "renal_aki_followup_v1",
    version: "1.0.0",
    title: "Renal AKI follow-up discharge documentation",
    ...RENAL_UROLOGY_ELECTROLYTE_TEMPLATE_GOVERNANCE,
    renalElectrolyteSafety: {
      akiSensitive: true,
      requiresHydrationPrecautions: true,
      requiresElectrolyteEscalation: true,
      requiresNephrologyFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["AKI follow-up", "acute kidney injury follow-up", "renal follow-up precautions"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Kidney disease",
        url: "https://medlineplus.gov/kidneydiseases.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("renalaki-neph", "NEPHROLOGY", "within 1–2 days or as directed"),
      registryFollowUp("renalaki-pcp", "PRIMARY_CARE", "within 1–2 days or as clinically appropriate"),
    ],
    suggestedText: RENAL_AKI_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "renal_dehydration_followup_v1",
    version: "1.0.0",
    title: "Renal dehydration follow-up discharge documentation",
    ...RENAL_UROLOGY_ELECTROLYTE_TEMPLATE_GOVERNANCE,
    renalElectrolyteSafety: {
      dehydrationSensitive: true,
      requiresHydrationPrecautions: true,
    },
    diagnosisMappings: {
      keyword: ["renal dehydration follow-up", "dehydration renal precautions"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Dehydration",
        url: "https://medlineplus.gov/dehydration.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("renaldehyd-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
    ],
    suggestedText: RENAL_DEHYDRATION_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "renal_electrolyte_abnormality_followup_v1",
    version: "1.0.0",
    title: "Renal electrolyte abnormality follow-up discharge documentation",
    ...RENAL_UROLOGY_ELECTROLYTE_TEMPLATE_GOVERNANCE,
    renalElectrolyteSafety: {
      electrolyteSensitive: true,
      requiresElectrolyteEscalation: true,
      requiresNephrologyFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: [
        "electrolyte follow-up",
        "potassium follow-up",
        "sodium follow-up",
        "magnesium follow-up",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Fluid and electrolyte balance",
        url: "https://medlineplus.gov/fluidandelectrolytebalance.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("renalelect-neph", "NEPHROLOGY", "within 1–2 days or as directed"),
      registryFollowUp("renalelect-pcp", "PRIMARY_CARE", "within 1–2 days or as clinically appropriate"),
    ],
    suggestedText: RENAL_ELECTROLYTE_ABNORMALITY_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "urology_renal_colic_followup_v1",
    version: "1.0.0",
    title: "Urology renal colic follow-up discharge documentation",
    ...RENAL_UROLOGY_ELECTROLYTE_TEMPLATE_GOVERNANCE,
    renalElectrolyteSafety: {
      renalColicSensitive: true,
      requiresUrinaryObstructionEscalation: true,
      requiresHydrationPrecautions: true,
      requiresUrologyFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["renal colic follow-up", "kidney stone follow-up", "flank pain follow-up"],
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
      registryFollowUp("urocolic-uro", "UROLOGY", "within 1–2 days or as directed"),
      registryFollowUp("urocolic-pcp", "PRIMARY_CARE", "within 1–2 days or as clinically appropriate"),
    ],
    suggestedText: UROLOGY_RENAL_COLIC_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "urology_uti_followup_v1",
    version: "1.0.0",
    title: "Urology UTI follow-up discharge documentation",
    ...RENAL_UROLOGY_ELECTROLYTE_TEMPLATE_GOVERNANCE,
    renalElectrolyteSafety: {
      utiSensitive: true,
      requiresHydrationPrecautions: true,
    },
    diagnosisMappings: {
      keyword: ["UTI follow-up", "urinary tract infection follow-up"],
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
      registryFollowUp("urouti-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
    ],
    suggestedText: UROLOGY_UTI_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "urology_pyelonephritis_followup_v1",
    version: "1.0.0",
    title: "Urology pyelonephritis follow-up discharge documentation",
    ...RENAL_UROLOGY_ELECTROLYTE_TEMPLATE_GOVERNANCE,
    renalElectrolyteSafety: {
      pyelonephritisSensitive: true,
      requiresHydrationPrecautions: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["pyelonephritis follow-up", "kidney infection follow-up"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Kidney infections",
        url: "https://medlineplus.gov/urinarytractinfections.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("uropyelo-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
    ],
    suggestedText: UROLOGY_PYELONEPHRITIS_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "urology_hematuria_followup_v1",
    version: "1.0.0",
    title: "Urology hematuria follow-up discharge documentation",
    ...RENAL_UROLOGY_ELECTROLYTE_TEMPLATE_GOVERNANCE,
    renalElectrolyteSafety: {
      hematuriaSensitive: true,
      requiresUrinaryObstructionEscalation: true,
      requiresUrologyFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["hematuria follow-up", "blood in urine follow-up"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Urine and urination",
        url: "https://medlineplus.gov/urineandurination.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("urohem-uro", "UROLOGY", "within 1–2 days or as directed"),
      registryFollowUp("urohem-pcp", "PRIMARY_CARE", "within 1–2 days or as clinically appropriate"),
    ],
    suggestedText: UROLOGY_HEMATURIA_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "urology_urinary_retention_followup_v1",
    version: "1.0.0",
    title: "Urology urinary retention follow-up discharge documentation",
    ...RENAL_UROLOGY_ELECTROLYTE_TEMPLATE_GOVERNANCE,
    renalElectrolyteSafety: {
      urinaryRetentionSensitive: true,
      requiresUrinaryObstructionEscalation: true,
      requiresUrologyFollowUp: true,
    },
    diagnosisMappings: {
      keyword: ["urinary retention follow-up", "unable to urinate follow-up"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Urine and urination",
        url: "https://medlineplus.gov/urineandurination.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("uroret-uro", "UROLOGY", "within 1–2 days or as directed"),
      registryFollowUp("uroret-pcp", "PRIMARY_CARE", "within 1–2 days or as clinically appropriate"),
    ],
    suggestedText: UROLOGY_URINARY_RETENTION_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "urology_foley_catheter_precautions_v1",
    version: "1.0.0",
    title: "Urology Foley catheter precautions discharge documentation",
    ...RENAL_UROLOGY_ELECTROLYTE_TEMPLATE_GOVERNANCE,
    renalElectrolyteSafety: {
      catheterSensitive: true,
      requiresCatheterPrecautions: true,
      requiresUrologyFollowUp: true,
    },
    diagnosisMappings: {
      keyword: ["Foley catheter precautions", "urinary catheter precautions"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Urinary catheters",
        url: "https://medlineplus.gov/ency/patientinstructions/000141.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("urofoley-uro", "UROLOGY", "as directed"),
      registryFollowUp("urofoley-pcp", "PRIMARY_CARE", "within 1–2 days or as clinically appropriate"),
    ],
    suggestedText: UROLOGY_FOLEY_CATHETER_PRECAUTIONS_SUGGESTED_TEXT,
  },
  {
    id: "dialysis_return_precautions_v1",
    version: "1.0.0",
    title: "Dialysis return precautions discharge documentation",
    ...RENAL_UROLOGY_ELECTROLYTE_TEMPLATE_GOVERNANCE,
    renalElectrolyteSafety: {
      dialysisSensitive: true,
      requiresDialysisEscalation: true,
      requiresElectrolyteEscalation: true,
      requiresNephrologyFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["dialysis return precautions", "dialysis follow-up precautions"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Dialysis",
        url: "https://medlineplus.gov/dialysis.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("dialysis-neph", "NEPHROLOGY", "as directed by dialysis team"),
      registryFollowUp("dialysis-pcp", "PRIMARY_CARE", "within 1–2 days or as clinically appropriate"),
    ],
    suggestedText: DIALYSIS_RETURN_PRECAUTIONS_SUGGESTED_TEXT,
  },
  {
    id: "diabetes_hyperglycemia_followup_v1",
    version: "1.0.0",
    title: "Diabetes hyperglycemia follow-up discharge documentation",
    ...ENDOCRINE_METABOLIC_TEMPLATE_GOVERNANCE,
    endocrineMetabolicSafety: {
      diabetesSensitive: true,
      hyperglycemiaSensitive: true,
      requiresGlucoseEscalation: true,
      requiresHydrationEscalation: true,
      requiresDiabetesFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["diabetes hyperglycemia follow-up", "high blood sugar follow-up"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Hyperglycemia",
        url: "https://medlineplus.gov/ency/article/003435.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("diabhyper-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
    ],
    suggestedText: DIABETES_HYPERGLYCEMIA_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "diabetes_hypoglycemia_followup_v1",
    version: "1.0.0",
    title: "Diabetes hypoglycemia follow-up discharge documentation",
    ...ENDOCRINE_METABOLIC_TEMPLATE_GOVERNANCE,
    endocrineMetabolicSafety: {
      diabetesSensitive: true,
      hypoglycemiaSensitive: true,
      requiresGlucoseEscalation: true,
      requiresNeurologicEscalation: true,
      requiresDiabetesFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["diabetes hypoglycemia follow-up", "low blood sugar follow-up"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Low blood sugar",
        url: "https://medlineplus.gov/ency/article/000386.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("diabhypo-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
    ],
    suggestedText: DIABETES_HYPOGLYCEMIA_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "diabetes_dka_return_precautions_v1",
    version: "1.0.0",
    title: "Diabetes DKA return precautions discharge documentation",
    ...ENDOCRINE_METABOLIC_TEMPLATE_GOVERNANCE,
    endocrineMetabolicSafety: {
      diabetesSensitive: true,
      dkaSensitive: true,
      dehydrationSensitive: true,
      requiresGlucoseEscalation: true,
      requiresHydrationEscalation: true,
      requiresNeurologicEscalation: true,
      requiresDiabetesFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["DKA return precautions", "diabetic ketoacidosis precautions"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Diabetic ketoacidosis",
        url: "https://medlineplus.gov/ency/article/000320.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("diabdka-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
      registryFollowUp("diabdka-endo", "ENDOCRINOLOGY", "within 1–2 days or as clinically appropriate"),
    ],
    suggestedText: DIABETES_DKA_RETURN_PRECAUTIONS_SUGGESTED_TEXT,
  },
  {
    id: "diabetes_insulin_management_precautions_v1",
    version: "1.0.0",
    title: "Diabetes insulin management precautions discharge documentation",
    ...ENDOCRINE_METABOLIC_TEMPLATE_GOVERNANCE,
    endocrineMetabolicSafety: {
      diabetesSensitive: true,
      insulinSensitive: true,
      requiresInsulinPrecautions: true,
      requiresGlucoseEscalation: true,
      requiresDiabetesFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["insulin management precautions", "insulin follow-up precautions"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Diabetes",
        url: "https://medlineplus.gov/diabetes.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("diabinsulin-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
    ],
    suggestedText: DIABETES_INSULIN_MANAGEMENT_PRECAUTIONS_SUGGESTED_TEXT,
  },
  {
    id: "endocrine_thyroid_symptom_followup_v1",
    version: "1.0.0",
    title: "Endocrine thyroid symptom follow-up discharge documentation",
    ...ENDOCRINE_METABOLIC_TEMPLATE_GOVERNANCE,
    endocrineMetabolicSafety: {
      endocrineSensitive: true,
      requiresEndocrinologyFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["thyroid symptoms follow-up", "endocrine thyroid follow-up"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Thyroid diseases",
        url: "https://medlineplus.gov/thyroiddiseases.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("thyroid-endo", "ENDOCRINOLOGY", "within 1–2 days or as directed"),
    ],
    suggestedText: ENDOCRINE_THYROID_SYMPTOM_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "metabolic_dehydration_followup_v1",
    version: "1.0.0",
    title: "Metabolic dehydration follow-up discharge documentation",
    ...ENDOCRINE_METABOLIC_TEMPLATE_GOVERNANCE,
    endocrineMetabolicSafety: {
      metabolicSensitive: true,
      dehydrationSensitive: true,
      requiresHydrationEscalation: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["metabolic dehydration follow-up"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Dehydration",
        url: "https://medlineplus.gov/dehydration.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("metdehyd-pcp", "PRIMARY_CARE", "within 1–2 days"),
    ],
    suggestedText: METABOLIC_DEHYDRATION_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "metabolic_nausea_weakness_followup_v1",
    version: "1.0.0",
    title: "Metabolic nausea weakness follow-up discharge documentation",
    ...ENDOCRINE_METABOLIC_TEMPLATE_GOVERNANCE,
    endocrineMetabolicSafety: {
      metabolicSensitive: true,
      requiresGlucoseEscalation: true,
      requiresHydrationEscalation: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["metabolic nausea weakness follow-up"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Nausea and vomiting",
        url: "https://medlineplus.gov/nauseaandvomiting.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("metnausea-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
    ],
    suggestedText: METABOLIC_NAUSEA_WEAKNESS_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "metabolic_electrolyte_followup_v1",
    version: "1.0.0",
    title: "Metabolic electrolyte follow-up discharge documentation",
    ...ENDOCRINE_METABOLIC_TEMPLATE_GOVERNANCE,
    endocrineMetabolicSafety: {
      metabolicSensitive: true,
      requiresGlucoseEscalation: true,
      requiresNeurologicEscalation: true,
      requiresEndocrinologyFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["metabolic electrolyte follow-up", "electrolyte abnormality follow-up"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Fluid and electrolyte balance",
        url: "https://medlineplus.gov/fluidandelectrolytebalance.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("metelect-endo", "ENDOCRINOLOGY", "within 1–2 days or as directed"),
    ],
    suggestedText: METABOLIC_ELECTROLYTE_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "endocrine_polyuria_polydipsia_followup_v1",
    version: "1.0.0",
    title: "Endocrine polyuria polydipsia follow-up discharge documentation",
    ...ENDOCRINE_METABOLIC_TEMPLATE_GOVERNANCE,
    endocrineMetabolicSafety: {
      endocrineSensitive: true,
      diabetesSensitive: true,
      requiresGlucoseEscalation: true,
      requiresHydrationEscalation: true,
      requiresDiabetesFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["polyuria polydipsia follow-up", "excessive thirst urination follow-up"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Diabetes",
        url: "https://medlineplus.gov/diabetes.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("polyuria-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
    ],
    suggestedText: ENDOCRINE_POLYURIA_POLYDIPSIA_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "diabetes_sick_day_precautions_v1",
    version: "1.0.0",
    title: "Diabetes sick day precautions discharge documentation",
    ...ENDOCRINE_METABOLIC_TEMPLATE_GOVERNANCE,
    endocrineMetabolicSafety: {
      diabetesSensitive: true,
      insulinSensitive: true,
      dehydrationSensitive: true,
      requiresInsulinPrecautions: true,
      requiresHydrationEscalation: true,
      requiresDiabetesFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    diagnosisMappings: {
      keyword: ["diabetes sick day precautions", "sick day diabetes follow-up"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Diabetes",
        url: "https://medlineplus.gov/diabetes.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("sickday-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
    ],
    suggestedText: DIABETES_SICK_DAY_PRECAUTIONS_SUGGESTED_TEXT,
  },
  {
    id: "type_2_diabetes_v1",
    version: "1.0.0",
    title: "Type 2 diabetes outpatient discharge documentation",
    specialtyCategory: "primary_care",
    riskCategory: "low_to_moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdExact: ["E11.9"],
      icdFamily: ["E11"],
      keyword: ["type 2 diabetes", "diabetes type 2", "diabète de type 2"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Diabetes type 2",
        url: "https://medlineplus.gov/diabetestype2.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("t2dm-pcp", "PRIMARY_CARE", ED_DEFAULT_PCP_FOLLOW_UP_TIMING),
    ],
    suggestedText: TYPE_2_DIABETES_SUGGESTED_TEXT,
  },
  {
    id: "vaccination_visit_v1",
    version: "1.0.0",
    title: "Vaccination / immunization visit discharge documentation",
    specialtyCategory: "primary_care",
    riskCategory: "low",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdExact: ["Z23"],
      keyword: ["vaccination", "immunization", "vaccine"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Vaccines",
        url: "https://medlineplus.gov/vaccines.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("vacc-pcp", "PRIMARY_CARE", ED_DEFAULT_PCP_FOLLOW_UP_TIMING),
    ],
    suggestedText: VACCINATION_VISIT_SUGGESTED_TEXT,
  },
  {
    id: "wellness_visit_v1",
    version: "1.0.0",
    title: "General wellness / routine visit discharge documentation",
    specialtyCategory: "primary_care",
    riskCategory: "low",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdExact: ["Z00.0"],
      icdFamily: ["Z00"],
      keyword: ["wellness visit", "general medical examination", "routine checkup"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Health screenings",
        url: "https://medlineplus.gov/healthcheckup.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("well-pcp", "PRIMARY_CARE", ED_DEFAULT_PCP_FOLLOW_UP_TIMING),
    ],
    suggestedText: WELLNESS_VISIT_SUGGESTED_TEXT,
  },
  {
    id: GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
    version: "1.0.0",
    title: "Generic ED discharge documentation",
    specialtyCategory: "emergency_medicine",
    riskCategory: "unspecified",
    clinicalReviewStatus: "reviewed",
    effectiveFrom: GOVERNANCE_EFFECTIVE_FROM,
    diagnosisMappings: {},
    sourceReferences: [
      {
        label: "Medora-S — clinician-authored generic ED discharge scaffold",
        publisher: "Medora-S (internal governance scaffold)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("generic-pcp", "PRIMARY_CARE", ED_DEFAULT_PCP_FOLLOW_UP_TIMING),
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
  "You were evaluated in the emergency department for elevated blood pressure or hypertension concerns",
  "You were evaluated in the emergency department for fatigue or decreased energy",
  "You were evaluated in the emergency department for generalized weakness",
  "You were evaluated in the emergency department for dizziness or lightheadedness",
  "You were evaluated in the emergency department for leg swelling",
  "You were evaluated in the emergency department for atrial fibrillation or related heart rhythm concerns",
  "You were evaluated in the emergency department for heart failure symptoms such as shortness of breath or swelling",
  "Vous avez été pris en charge aux urgences pour une pression artérielle élevée ou des signes d'hypertension",
  "Vous avez été pris en charge aux urgences pour une fatigue ou une baisse d'énergie",
  "Vous avez été pris en charge aux urgences pour une faiblesse généralisée",
  "Vous avez été pris en charge aux urgences pour des étourdissements ou des vertiges",
  "Vous avez été pris en charge aux urgences pour une enflure d'une jambe",
  "Vous avez été pris en charge aux urgences pour une fibrillation auriculaire ou un trouble du rythme cardiaque connexe",
  "Vous avez été pris en charge aux urgences pour des signes d'insuffisance cardiaque tels que l'essoufflement ou l'enflure",
  "You were evaluated in the emergency department for fever without a clear source identified during this visit",
  "You were evaluated in the emergency department for upper respiratory infection symptoms",
  "You were evaluated in the emergency department for a possible viral illness with flu-like symptoms",
  "You were evaluated in the emergency department for sore throat or pharyngitis symptoms",
  "You were evaluated in the emergency department for sinusitis symptoms",
  "You were evaluated in the emergency department for pneumonia-related symptoms requiring outpatient follow-up",
  "You were evaluated in the emergency department for a COVID-like respiratory illness",
  "You were evaluated in the emergency department for infectious gastroenteritis symptoms",
  "You were evaluated in the emergency department for cellulitis requiring outpatient follow-up",
  "You were evaluated in the emergency department for symptoms that may be associated with serious infection or sepsis risk",
  "Vous avez été pris en charge aux urgences pour de la fièvre sans source claire identifiée pendant cette visite",
  "Vous avez été pris en charge aux urgences pour des signes d'infection des voies respiratoires supérieures",
  "Vous avez été pris en charge aux urgences pour une possible maladie virale avec signes pseudo-grippaux",
  "Vous avez été pris en charge aux urgences pour un mal de gorge ou des signes de pharyngite",
  "Vous avez été pris en charge aux urgences pour des signes de sinusite",
  "Vous avez été pris en charge aux urgences pour des signes liés à une pneumonie nécessitant un suivi ambulatoire",
  "Vous avez été pris en charge aux urgences pour une maladie respiratoire de type COVID",
  "Vous avez été pris en charge aux urgences pour des signes de gastro-entérite infectieuse",
  "Vous avez été pris en charge aux urgences pour une cellulite nécessitant un suivi ambulatoire",
  "Vous avez été pris en charge aux urgences pour des signes pouvant être associés à une infection grave ou un risque de sepsis",
  "You were evaluated in the emergency department for acute kidney injury concerns requiring outpatient follow-up",
  "You were evaluated in the emergency department for dehydration with kidney-related follow-up needs",
  "You were evaluated in the emergency department for electrolyte abnormality concerns requiring outpatient follow-up",
  "You were evaluated in the emergency department for renal colic or kidney stone symptoms requiring outpatient follow-up",
  "You were evaluated in the emergency department for urinary tract infection symptoms requiring outpatient follow-up",
  "You were evaluated in the emergency department for pyelonephritis or kidney infection symptoms requiring outpatient follow-up",
  "You were evaluated in the emergency department for blood in the urine (hematuria) requiring outpatient follow-up",
  "You were evaluated in the emergency department for urinary retention or difficulty urinating requiring outpatient follow-up",
  "You were evaluated in the emergency department for Foley or urinary catheter care and precautions",
  "You were evaluated in the emergency department for dialysis-related concerns and return precautions",
  "Vous avez été pris en charge aux urgences pour des signes d'insuffisance rénale aiguë nécessitant un suivi ambulatoire",
  "Vous avez été pris en charge aux urgences pour une déshydratation avec besoins de suivi rénal",
  "Vous avez été pris en charge aux urgences pour une anomalie électrolytique nécessitant un suivi ambulatoire",
  "Vous avez été pris en charge aux urgences pour une colique néphrétique ou des signes de calcul rénal nécessitant un suivi ambulatoire",
  "Vous avez été pris en charge aux urgences pour des signes d'infection urinaire nécessitant un suivi ambulatoire",
  "Vous avez été pris en charge aux urgences pour une pyélonéphrite ou des signes d'infection rénale nécessitant un suivi ambulatoire",
  "Vous avez été pris en charge aux urgences pour du sang dans les urines (hématurie) nécessitant un suivi ambulatoire",
  "Vous avez été pris en charge aux urgences pour une rétention urinaire ou une difficulté à uriner nécessitant un suivi ambulatoire",
  "Vous avez été pris en charge aux urgences pour les soins et consignes d'un cathéter urinaire ou de Foley",
  "Vous avez été pris en charge aux urgences pour des préoccupations liées à la dialyse et les consignes de retour",
  "You were evaluated in the emergency department for diabetes-related hyperglycemia symptoms requiring outpatient follow-up",
  "You were evaluated in the emergency department for diabetes-related hypoglycemia symptoms requiring outpatient follow-up",
  "You were evaluated in the emergency department for diabetic ketoacidosis-related concerns and return precautions",
  "You were evaluated in the emergency department for diabetes insulin management and precautions",
  "You were evaluated in the emergency department for thyroid-related symptoms requiring outpatient follow-up",
  "You were evaluated in the emergency department for metabolic dehydration concerns requiring outpatient follow-up",
  "You were evaluated in the emergency department for metabolic nausea and weakness requiring outpatient follow-up",
  "You were evaluated in the emergency department for metabolic electrolyte concerns requiring outpatient follow-up",
  "You were evaluated in the emergency department for polyuria and polydipsia symptoms requiring outpatient follow-up",
  "You were evaluated in the emergency department for diabetes sick-day precautions and follow-up needs",
  "Vous avez été pris en charge aux urgences pour des signes d'hyperglycémie liés au diabète nécessitant un suivi ambulatoire",
  "Vous avez été pris en charge aux urgences pour des signes d'hypoglycémie liés au diabète nécessitant un suivi ambulatoire",
  "Vous avez été pris en charge aux urgences pour des préoccupations liées à l'acidocétose diabétique et les consignes de retour",
  "Vous avez été pris en charge aux urgences pour la gestion de l'insuline et les consignes liées au diabète",
  "Vous avez été pris en charge aux urgences pour des signes liés à la thyroïde nécessitant un suivi ambulatoire",
  "Vous avez été pris en charge aux urgences pour une déshydratation d'origine métabolique nécessitant un suivi ambulatoire",
  "Vous avez été pris en charge aux urgences pour des nausées et une faiblesse d'origine métabolique nécessitant un suivi ambulatoire",
  "Vous avez été pris en charge aux urgences pour des préoccupations électrolytiques d'origine métabolique nécessitant un suivi ambulatoire",
  "Vous avez été pris en charge aux urgences pour une polyurie et une polydipsie nécessitant un suivi ambulatoire",
  "Vous avez été pris en charge aux urgences pour les consignes de jour de maladie liées au diabète",
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

export type BuildProviderDischargeCardBaseInput = {
  sourceEncounterDiagnosisId: string;
  code: string;
  displayName: string;
  displayOrder: number;
  isPrimaryDiagnosis: boolean;
  actor?: { displayName?: string; appliedAt?: string };
};

export type BuildProviderDischargeCardInput =
  | (BuildProviderDischargeCardBaseInput & {
      applyTemplateSuggestion?: false;
      locale?: ProviderDischargeTemplateLocale;
    })
  | (BuildProviderDischargeCardBaseInput & {
      applyTemplateSuggestion: true;
      locale: ProviderDischargeTemplateLocale;
    });

export function requireProviderDischargeTemplateLocale(
  locale: ProviderDischargeTemplateLocale | undefined,
  context: string
): ProviderDischargeTemplateLocale {
  if (!locale) {
    throw new Error(`providerDischarge: locale is required (${context})`);
  }
  return locale;
}

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

  return applyProviderDischargeTemplateToCard(card, resolved, {
    locale: requireProviderDischargeTemplateLocale(input.locale, "buildProviderDischargeCardFromDiagnosis"),
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
  const rawText = getProviderDischargeSuggestedTextBody(template, locale);
  const text =
    template.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID ?
      personalizeGenericDischargeTemplateBody(rawText, card.displayName, locale)
    : rawText;
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
