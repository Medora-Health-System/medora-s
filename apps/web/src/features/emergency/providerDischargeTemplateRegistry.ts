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
  ensureGoldStandardReturnPrecautions,
} from "./providerDischargeTemplateGoldStandard";
import type { DischargeInstructionCareSettingContext } from "@medora/shared";
import { adaptDischargeSuggestedTextBodyForCareSetting, bilingualStorageLocaleOrEn } from "@medora/shared";
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
  SPINE_CERVICAL_STRAIN_SUGGESTED_TEXT,
  SPINE_THORACIC_STRAIN_SUGGESTED_TEXT,
  SPINE_LUMBAR_STRAIN_SUGGESTED_TEXT,
  SPINE_MECHANICAL_BACK_PAIN_SUGGESTED_TEXT,
  SPINE_CERVICAL_RADICULOPATHY_SUGGESTED_TEXT,
  SPINE_LUMBAR_RADICULOPATHY_SCIATICA_SUGGESTED_TEXT,
  SPINE_DISC_HERNIATION_SUGGESTED_TEXT,
  SPINE_STENOSIS_SUGGESTED_TEXT,
  SPINE_VERTEBRAL_COMPRESSION_FRACTURE_SUGGESTED_TEXT,
  SPINE_STABLE_VERTEBRAL_FRACTURE_SUGGESTED_TEXT,
  SPINE_POST_TRAUMA_EVALUATION_SUGGESTED_TEXT,
  SPINE_POST_CAUDA_RED_FLAG_EVALUATION_SUGGESTED_TEXT,
  SPINE_INFECTION_FOLLOWUP_SUGGESTED_TEXT,
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
  TRAUMA_MSK_CRUSH_HAND_FINGER_SUGGESTED_TEXT,
  TRAUMA_MSK_CRUSH_UPPER_EXTREMITY_SUGGESTED_TEXT,
  TRAUMA_MSK_CRUSH_LOWER_EXTREMITY_SUGGESTED_TEXT,
  TRAUMA_MSK_CRUSH_FOOT_TOE_SUGGESTED_TEXT,
  TRAUMA_MSK_CRUSH_CHEST_ABDOMEN_PELVIS_SUGGESTED_TEXT,
  TRAUMA_MSK_CRUSH_PROLONGED_COMPRESSION_SUGGESTED_TEXT,
  TRAUMA_MSK_CRUSH_DEGLOVING_SUGGESTED_TEXT,
  TRAUMA_MSK_CRUSH_COMPARTMENT_RISK_SUGGESTED_TEXT,
  TRAUMA_MSK_CRUSH_GENERIC_SUGGESTED_TEXT,
  TRAUMA_MSK_AMPUTATION_FINGER_THUMB_SUGGESTED_TEXT,
  TRAUMA_MSK_AMPUTATION_HAND_UPPER_EXTREMITY_SUGGESTED_TEXT,
  TRAUMA_MSK_AMPUTATION_TOE_SUGGESTED_TEXT,
  TRAUMA_MSK_AMPUTATION_FOOT_LOWER_EXTREMITY_SUGGESTED_TEXT,
  TRAUMA_MSK_AMPUTATION_PARTIAL_SUGGESTED_TEXT,
  TRAUMA_MSK_AMPUTATION_COMPLETE_SUGGESTED_TEXT,
  TRAUMA_MSK_AMPUTATION_POSTOPERATIVE_OR_FOLLOWUP_SUGGESTED_TEXT,
  TRAUMA_MSK_AMPUTATION_GENERIC_SUGGESTED_TEXT,
  TRAUMA_MSK_FOREIGN_BODY_EYE_SUGGESTED_TEXT,
  TRAUMA_MSK_FOREIGN_BODY_EAR_NOSE_SUGGESTED_TEXT,
  TRAUMA_MSK_FOREIGN_BODY_SKIN_SOFT_TISSUE_SUGGESTED_TEXT,
  TRAUMA_MSK_FOREIGN_BODY_HAND_FINGER_SUGGESTED_TEXT,
  TRAUMA_MSK_FOREIGN_BODY_FOOT_TOE_SUGGESTED_TEXT,
  TRAUMA_MSK_FOREIGN_BODY_FISHHOOK_SUGGESTED_TEXT,
  TRAUMA_MSK_FOREIGN_BODY_INGESTED_SUGGESTED_TEXT,
  TRAUMA_MSK_FOREIGN_BODY_ASPIRATED_SUGGESTED_TEXT,
  TRAUMA_MSK_FOREIGN_BODY_RETAINED_FRAGMENT_SUGGESTED_TEXT,
  TRAUMA_MSK_FOREIGN_BODY_GENERIC_SUGGESTED_TEXT,
  BURN_SUPERFICIAL_SUGGESTED_TEXT,
  BURN_PARTIAL_THICKNESS_SUGGESTED_TEXT,
  BURN_FULL_THICKNESS_FOLLOWUP_SUGGESTED_TEXT,
  BURN_FACE_SUGGESTED_TEXT,
  BURN_HAND_SUGGESTED_TEXT,
  BURN_FOOT_SUGGESTED_TEXT,
  BURN_EYE_SUGGESTED_TEXT,
  BURN_CHEMICAL_SUGGESTED_TEXT,
  BURN_ELECTRICAL_SUGGESTED_TEXT,
  BURN_INHALATION_AFTERCARE_SUGGESTED_TEXT,
  PENETRATING_WOUND_MINOR_SUGGESTED_TEXT,
  GUNSHOT_WOUND_EXTREMITY_SUGGESTED_TEXT,
  STAB_WOUND_MINOR_SUGGESTED_TEXT,
  RETAINED_PROJECTILE_SUGGESTED_TEXT,
  PENETRATING_HAND_INJURY_SUGGESTED_TEXT,
  PENETRATING_FOOT_INJURY_SUGGESTED_TEXT,
  PENETRATING_FACE_SUGGESTED_TEXT,
  PENETRATING_EYE_FOLLOWUP_SUGGESTED_TEXT,
  PENETRATING_CHEST_SUGGESTED_TEXT,
  PENETRATING_ABDOMEN_SUGGESTED_TEXT,
  PENETRATING_NECK_SUGGESTED_TEXT,
  PENETRATING_HEAD_SUGGESTED_TEXT,
  POST_WOUND_EXPLORATION_SUGGESTED_TEXT,
  POST_FOREIGN_BODY_REMOVAL_SUGGESTED_TEXT,
  POST_TOURNIQUET_EXTREMITY_SUGGESTED_TEXT,
  HUMAN_BITE_SUGGESTED_TEXT,
  FIGHT_BITE_SUGGESTED_TEXT,
  HIGH_RISK_HAND_WOUND_SUGGESTED_TEXT,
  CONTAMINATED_WOUND_SUGGESTED_TEXT,
  WATER_EXPOSED_WOUND_SUGGESTED_TEXT,
  DELAYED_WOUND_SUGGESTED_TEXT,
  DEEP_CONTAMINATED_WOUND_SUGGESTED_TEXT,
  ANIMAL_BITE_RABIES_FOLLOWUP_SUGGESTED_TEXT,
  INFECTED_TRAUMATIC_WOUND_SUGGESTED_TEXT,
  BITE_CELLULITIS_SUGGESTED_TEXT,
  POST_BITE_ABSCESS_DRAINAGE_SUGGESTED_TEXT,
  TETANUS_FOLLOWUP_SUGGESTED_TEXT,
  BLAST_EAR_INJURY_SUGGESTED_TEXT,
  BLAST_LUNG_AFTERCARE_SUGGESTED_TEXT,
  BLAST_ABDOMINAL_OBSERVATION_SUGGESTED_TEXT,
  BLAST_MILD_TBI_SUGGESTED_TEXT,
  BLAST_FRAGMENT_WOUND_SUGGESTED_TEXT,
  BLAST_BURN_AFTERCARE_SUGGESTED_TEXT,
  BLAST_CRUSH_AFTERCARE_SUGGESTED_TEXT,
  POST_STRUCTURAL_COLLAPSE_SUGGESTED_TEXT,
  POLYTRAUMA_FOLLOWUP_SUGGESTED_TEXT,
  BLAST_INJURY_MINOR_SUGGESTED_TEXT,
  FROSTBITE_SUGGESTED_TEXT,
  SUNBURN_SUGGESTED_TEXT,
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
  CONCUSSION_MILD_TBI_SUGGESTED_TEXT,
  POST_HEAD_INJURY_OBSERVATION_SUGGESTED_TEXT,
  SKULL_FRACTURE_FOLLOWUP_SUGGESTED_TEXT,
  INTRACRANIAL_HEMORRHAGE_FOLLOWUP_SUGGESTED_TEXT,
  NASAL_FRACTURE_SUGGESTED_TEXT,
  ORBITAL_FRACTURE_SUGGESTED_TEXT,
  MANDIBULAR_FRACTURE_SUGGESTED_TEXT,
  MAXILLARY_LEFORT_FRACTURE_SUGGESTED_TEXT,
  DENTAL_TRAUMA_SUGGESTED_TEXT,
  TOOTH_AVULSION_SUGGESTED_TEXT,
  JAW_DISLOCATION_POST_REDUCTION_SUGGESTED_TEXT,
  AURICULAR_HEMATOMA_FOLLOWUP_SUGGESTED_TEXT,
  SEPTAL_HEMATOMA_FOLLOWUP_SUGGESTED_TEXT,
  FACIAL_LACERATION_SUGGESTED_TEXT,
  CORNEAL_ABRASION_V1_SUGGESTED_TEXT,
  CORNEAL_FOREIGN_BODY_V1_SUGGESTED_TEXT,
  POST_OCULAR_FOREIGN_BODY_REMOVAL_V1_SUGGESTED_TEXT,
  PHOTOKERATITIS_V1_SUGGESTED_TEXT,
  CORNEAL_ULCER_FOLLOWUP_V1_SUGGESTED_TEXT,
  CHEMICAL_EYE_INJURY_V1_SUGGESTED_TEXT,
  TRAUMATIC_IRITIS_V1_SUGGESTED_TEXT,
  HYPHEMA_FOLLOWUP_V1_SUGGESTED_TEXT,
  OPEN_GLOBE_POST_ACUTE_V1_SUGGESTED_TEXT,
  ACUTE_GLAUCOMA_FOLLOWUP_V1_SUGGESTED_TEXT,
  RETINAL_DETACHMENT_FOLLOWUP_V1_SUGGESTED_TEXT,
  VITREOUS_HEMORRHAGE_V1_SUGGESTED_TEXT,
  ORBITAL_CELLULITIS_FOLLOWUP_V1_SUGGESTED_TEXT,
  PRESEPTAL_CELLULITIS_V1_SUGGESTED_TEXT,
  UVEITIS_IRITIS_V1_SUGGESTED_TEXT,
  SCLERITIS_V1_SUGGESTED_TEXT,
  EYELID_LACERATION_V1_SUGGESTED_TEXT,
  CANALICULAR_INJURY_FOLLOWUP_V1_SUGGESTED_TEXT,
  ENDOPHTHALMITIS_POST_ACUTE_V1_SUGGESTED_TEXT,
  CRAO_CRVO_FOLLOWUP_V1_SUGGESTED_TEXT,
  ACUTE_OTITIS_EXTERNA_V1_SUGGESTED_TEXT,
  MALIGNANT_OTITIS_EXTERNA_POST_ACUTE_V1_SUGGESTED_TEXT,
  MASTOIDITIS_POST_ACUTE_V1_SUGGESTED_TEXT,
  TM_PERFORATION_V1_SUGGESTED_TEXT,
  SUDDEN_HEARING_LOSS_FOLLOWUP_V1_SUGGESTED_TEXT,
  BPPV_V1_SUGGESTED_TEXT,
  VESTIBULAR_NEURITIS_V1_SUGGESTED_TEXT,
  LABYRINTHITIS_V1_SUGGESTED_TEXT,
  FACIAL_NERVE_PALSY_V1_SUGGESTED_TEXT,
  RAMSAY_HUNT_FOLLOWUP_V1_SUGGESTED_TEXT,
  POST_NASAL_PACKING_V1_SUGGESTED_TEXT,
  POSTERIOR_EPISTAXIS_POST_ACUTE_V1_SUGGESTED_TEXT,
  NASAL_FOREIGN_BODY_V1_SUGGESTED_TEXT,
  PERITONSILLAR_ABSCESS_POST_DRAINAGE_V1_SUGGESTED_TEXT,
  DEEP_NECK_INFECTION_POST_ACUTE_V1_SUGGESTED_TEXT,
  LUDWIG_ANGINA_POST_ACUTE_V1_SUGGESTED_TEXT,
  EPIGLOTTITIS_POST_ACUTE_V1_SUGGESTED_TEXT,
  SIALADENITIS_V1_SUGGESTED_TEXT,
  SALIVARY_OBSTRUCTION_V1_SUGGESTED_TEXT,
  THROAT_FOREIGN_BODY_FOLLOWUP_V1_SUGGESTED_TEXT,
  ERYSIPELAS_V1_SUGGESTED_TEXT,
  POST_ABSCESS_DRAINAGE_V1_SUGGESTED_TEXT,
  ABSCESS_WITHOUT_DRAINAGE_V1_SUGGESTED_TEXT,
  FURUNCLE_CARBUNCLE_V1_SUGGESTED_TEXT,
  FELON_POST_PROCEDURE_V1_SUGGESTED_TEXT,
  PARONYCHIA_V1_SUGGESTED_TEXT,
  PILONIDAL_ABSCESS_V1_SUGGESTED_TEXT,
  HIDRADENITIS_FLARE_V1_SUGGESTED_TEXT,
  POSTOPERATIVE_WOUND_INFECTION_V1_SUGGESTED_TEXT,
  WOUND_DEHISCENCE_POST_ACUTE_V1_SUGGESTED_TEXT,
  DIABETIC_FOOT_INFECTION_V1_SUGGESTED_TEXT,
  INFECTED_ULCER_V1_SUGGESTED_TEXT,
  SEPTIC_BURSITIS_V1_SUGGESTED_TEXT,
  DEEP_HAND_INFECTION_POST_ACUTE_V1_SUGGESTED_TEXT,
  FLEXOR_TENOSYNOVITIS_POST_ACUTE_V1_SUGGESTED_TEXT,
  NECROTIZING_SOFT_TISSUE_INFECTION_POST_ACUTE_V1_SUGGESTED_TEXT,
  PYOMYOSITIS_POST_ACUTE_V1_SUGGESTED_TEXT,
  WATER_EXPOSED_WOUND_INFECTION_V1_SUGGESTED_TEXT,
  FOREIGN_BODY_ASSOCIATED_INFECTION_V1_SUGGESTED_TEXT,
  ALLERGIC_CONTACT_DERMATITIS_V1_SUGGESTED_TEXT,
  IRRITANT_CONTACT_DERMATITIS_V1_SUGGESTED_TEXT,
  ATOPIC_DERMATITIS_V1_SUGGESTED_TEXT,
  UNCOMPLICATED_URTICARIA_V1_SUGGESTED_TEXT,
  PSORIASIS_FLARE_V1_SUGGESTED_TEXT,
  ROSACEA_V1_SUGGESTED_TEXT,
  IMPETIGO_V1_SUGGESTED_TEXT,
  FOLLICULITIS_V1_SUGGESTED_TEXT,
  HERPES_SIMPLEX_V1_SUGGESTED_TEXT,
  HERPES_ZOSTER_V1_SUGGESTED_TEXT,
  OPHTHALMIC_ZOSTER_POST_ACUTE_V1_SUGGESTED_TEXT,
  VARICELLA_V1_SUGGESTED_TEXT,
  MOLLUSCUM_CONTAGIOSUM_V1_SUGGESTED_TEXT,
  VIRAL_EXANTHEM_V1_SUGGESTED_TEXT,
  PITYRIASIS_ROSEA_V1_SUGGESTED_TEXT,
  TINEA_CORPORIS_V1_SUGGESTED_TEXT,
  TINEA_CAPITIS_V1_SUGGESTED_TEXT,
  TINEA_CRURIS_V1_SUGGESTED_TEXT,
  TINEA_PEDIS_V1_SUGGESTED_TEXT,
  TINEA_VERSICOLOR_V1_SUGGESTED_TEXT,
  CANDIDAL_INTERTRIGO_V1_SUGGESTED_TEXT,
  SCABIES_V1_SUGGESTED_TEXT,
  PEDICULOSIS_V1_SUGGESTED_TEXT,
  ERYTHEMA_MULTIFORME_V1_SUGGESTED_TEXT,
  DRUG_ERUPTION_V1_SUGGESTED_TEXT,
  SJS_TEN_POST_ACUTE_V1_SUGGESTED_TEXT,
  DRESS_POST_ACUTE_V1_SUGGESTED_TEXT,
  BULLOUS_DISORDER_POST_ACUTE_V1_SUGGESTED_TEXT,
  CUTANEOUS_VASCULITIS_FOLLOWUP_V1_SUGGESTED_TEXT,
  SUSPICIOUS_SKIN_LESION_V1_SUGGESTED_TEXT,
  HEAT_CRAMPS_V1_SUGGESTED_TEXT,
  HEAT_SYNCOPE_V1_SUGGESTED_TEXT,
  HEAT_EXHAUSTION_V1_SUGGESTED_TEXT,
  EXERTIONAL_HEAT_ILLNESS_V1_SUGGESTED_TEXT,
  HEAT_STROKE_POST_ACUTE_V1_SUGGESTED_TEXT,
  MILD_HYPOTHERMIA_V1_SUGGESTED_TEXT,
  HYPOTHERMIA_POST_ACUTE_V1_SUGGESTED_TEXT,
  SUPERFICIAL_FROSTBITE_V1_SUGGESTED_TEXT,
  DEEP_FROSTBITE_POST_ACUTE_V1_SUGGESTED_TEXT,
  CHILBLAINS_PERNIO_V1_SUGGESTED_TEXT,
  IMMERSION_FOOT_V1_SUGGESTED_TEXT,
  POST_SUBMERSION_OBSERVATION_V1_SUGGESTED_TEXT,
  NONFATAL_DROWNING_POST_ACUTE_V1_SUGGESTED_TEXT,
  LOW_VOLTAGE_ELECTRICAL_INJURY_V1_SUGGESTED_TEXT,
  HIGH_VOLTAGE_ELECTRICAL_INJURY_POST_ACUTE_V1_SUGGESTED_TEXT,
  LIGHTNING_INJURY_POST_ACUTE_V1_SUGGESTED_TEXT,
  ACUTE_MOUNTAIN_SICKNESS_V1_SUGGESTED_TEXT,
  HACE_POST_ACUTE_V1_SUGGESTED_TEXT,
  HAPE_POST_ACUTE_V1_SUGGESTED_TEXT,
  BAROTRAUMA_V1_SUGGESTED_TEXT,
  DECOMPRESSION_ILLNESS_POST_ACUTE_V1_SUGGESTED_TEXT,
  RADIATION_EXPOSURE_FOLLOWUP_V1_SUGGESTED_TEXT,
  RADIATION_INJURY_POST_ACUTE_V1_SUGGESTED_TEXT,
  LOW_RISK_TOXIC_EXPOSURE_V1_SUGGESTED_TEXT,
  ACCIDENTAL_INGESTION_V1_SUGGESTED_TEXT,
  ACETAMINOPHEN_EXPOSURE_FOLLOWUP_V1_SUGGESTED_TEXT,
  SALICYLATE_EXPOSURE_FOLLOWUP_V1_SUGGESTED_TEXT,
  OPIOID_OVERDOSE_POST_OBSERVATION_V1_SUGGESTED_TEXT,
  SEDATIVE_OVERDOSE_POST_OBSERVATION_V1_SUGGESTED_TEXT,
  ALCOHOL_WITHDRAWAL_POST_ACUTE_V1_SUGGESTED_TEXT,
  STIMULANT_INTOXICATION_V1_SUGGESTED_TEXT,
  CANNABIS_INTOXICATION_V1_SUGGESTED_TEXT,
  UNKNOWN_INGESTION_POST_OBSERVATION_V1_SUGGESTED_TEXT,
  CARBON_MONOXIDE_POST_ACUTE_V1_SUGGESTED_TEXT,
  CAUSTIC_INGESTION_POST_ACUTE_V1_SUGGESTED_TEXT,
  HYDROCARBON_EXPOSURE_V1_SUGGESTED_TEXT,
  PESTICIDE_EXPOSURE_POST_ACUTE_V1_SUGGESTED_TEXT,
  METHEMOGLOBINEMIA_POST_ACUTE_V1_SUGGESTED_TEXT,
  SNAKE_ENVENOMATION_POST_ACUTE_V1_SUGGESTED_TEXT,
  SPIDER_ENVENOMATION_V1_SUGGESTED_TEXT,
  SCORPION_ENVENOMATION_V1_SUGGESTED_TEXT,
  MARINE_ENVENOMATION_V1_SUGGESTED_TEXT,
  POISON_CONTROL_FOLLOWUP_V1_SUGGESTED_TEXT,
  EARLY_PREGNANCY_BLEEDING_V1_SUGGESTED_TEXT,
  PREGNANCY_UNKNOWN_LOCATION_V1_SUGGESTED_TEXT,
  THREATENED_ABORTION_V1_SUGGESTED_TEXT,
  EARLY_PREGNANCY_LOSS_POST_ACUTE_V1_SUGGESTED_TEXT,
  ECTOPIC_PREGNANCY_POST_ACUTE_V1_SUGGESTED_TEXT,
  HYPEREMESIS_GRAVIDARUM_V1_SUGGESTED_TEXT,
  PREGNANCY_ABDOMINAL_PAIN_V1_SUGGESTED_TEXT,
  LATE_PREGNANCY_BLEEDING_POST_ACUTE_V1_SUGGESTED_TEXT,
  FALSE_LABOR_V1_SUGGESTED_TEXT,
  PRETERM_LABOR_POST_ACUTE_V1_SUGGESTED_TEXT,
  RUPTURE_OF_MEMBRANES_POST_ACUTE_V1_SUGGESTED_TEXT,
  HYPERTENSIVE_PREGNANCY_POST_ACUTE_V1_SUGGESTED_TEXT,
  POSTPARTUM_BLEEDING_POST_ACUTE_V1_SUGGESTED_TEXT,
  POSTPARTUM_ENDOMETRITIS_V1_SUGGESTED_TEXT,
  POSTPARTUM_HYPERTENSION_V1_SUGGESTED_TEXT,
  ACUTE_PELVIC_PAIN_V1_SUGGESTED_TEXT,
  OVARIAN_CYST_V1_SUGGESTED_TEXT,
  OVARIAN_TORSION_POST_ACUTE_V1_SUGGESTED_TEXT,
  PELVIC_INFLAMMATORY_DISEASE_V1_SUGGESTED_TEXT,
  TUBO_OVARIAN_ABSCESS_POST_ACUTE_V1_SUGGESTED_TEXT,
  CERVICITIS_V1_SUGGESTED_TEXT,
  VAGINITIS_V1_SUGGESTED_TEXT,
  BARTHOLIN_CYST_ABSCESS_V1_SUGGESTED_TEXT,
  ABNORMAL_UTERINE_BLEEDING_V1_SUGGESTED_TEXT,
  POSTMENOPAUSAL_BLEEDING_V1_SUGGESTED_TEXT,
  VAGINAL_FOREIGN_BODY_V1_SUGGESTED_TEXT,
  IUD_COMPLICATION_V1_SUGGESTED_TEXT,
  UNCOMPLICATED_RENAL_COLIC_V1_SUGGESTED_TEXT,
  OBSTRUCTING_URETERAL_STONE_POST_ACUTE_V1_SUGGESTED_TEXT,
  CYSTITIS_V1_SUGGESTED_TEXT,
  PYELONEPHRITIS_V1_SUGGESTED_TEXT,
  INFECTED_OBSTRUCTED_STONE_POST_ACUTE_V1_SUGGESTED_TEXT,
  HEMATURIA_V1_SUGGESTED_TEXT,
  URINARY_RETENTION_V1_SUGGESTED_TEXT,
  URINARY_CATHETER_COMPLICATION_V1_SUGGESTED_TEXT,
  EPIDIDYMITIS_V1_SUGGESTED_TEXT,
  ORCHITIS_V1_SUGGESTED_TEXT,
  TESTICULAR_TORSION_POST_ACUTE_V1_SUGGESTED_TEXT,
  PROSTATITIS_V1_SUGGESTED_TEXT,
  URETHRITIS_V1_SUGGESTED_TEXT,
  PRIAPISM_POST_ACUTE_V1_SUGGESTED_TEXT,
  PARAPHIMOSIS_POST_ACUTE_V1_SUGGESTED_TEXT,
  PENILE_FRACTURE_POST_ACUTE_V1_SUGGESTED_TEXT,
} from "./providerDischargeTemplateSuggestedTextCatalog";
import { buildPhase18PsychiatricBehavioralDischargeTemplates } from "./psychiatricBehavioralDischargeTemplateEntries";
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
export {
  PHASE_18_PSYCHIATRIC_BEHAVIORAL_ED_DISCHARGE_TEMPLATE_IDS,
  buildPhase18PsychiatricBehavioralDischargeTemplates,
} from "./psychiatricBehavioralDischargeTemplateEntries";

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

/** Phase 11 — eye emergencies discharge governance (documentation advisory only). */
const EYE_EMERGENCY_TEMPLATE_GOVERNANCE = {
  ...BATCH_GOVERNANCE_DRAFT,
  specialtyCategory: "ophthalmology",
  riskCategory: "moderate",
};

/** Phase 12 — ENT emergencies discharge governance (documentation advisory only). */
const ENT_EMERGENCY_TEMPLATE_GOVERNANCE = {
  ...BATCH_GOVERNANCE_DRAFT,
  specialtyCategory: "ent",
  riskCategory: "moderate",
};

/** Phase 13 — soft tissue / wound infection discharge governance (documentation advisory only, Commit 2). */
const SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE = {
  ...BATCH_GOVERNANCE_DRAFT,
  specialtyCategory: "wound_care",
  riskCategory: "moderate",
};

/** Phase 14 — dermatology discharge governance (documentation advisory only, Commit 2). Mirrors SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE. */
const DERMATOLOGY_TEMPLATE_GOVERNANCE = {
  ...BATCH_GOVERNANCE_DRAFT,
  specialtyCategory: "dermatology",
  riskCategory: "moderate",
};

/** Phase 15 — environmental / exposure discharge governance (documentation advisory only, Commit 2). Mirrors DERMATOLOGY_TEMPLATE_GOVERNANCE. */
const ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE = {
  ...BATCH_GOVERNANCE_DRAFT,
  specialtyCategory: "emergency_medicine",
  riskCategory: "moderate",
};

/** Phase 16 — toxicology / envenomation discharge governance (Commit 2). */
const TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE = {
  ...BATCH_GOVERNANCE_DRAFT,
  specialtyCategory: "emergency_medicine",
  riskCategory: "moderate",
};

/** Phase 17 — OB/GYN discharge governance (Commit 2). Mirrors BATCH_7 OBGYN_TEMPLATE_GOVERNANCE. */
const OBGYN_UROLOGY_TEMPLATE_GOVERNANCE = {
  ...BATCH_GOVERNANCE_DRAFT,
  specialtyCategory: "obgyn",
  riskCategory: "high",
};

/** Phase 17 — urology discharge governance; matches RENAL_UROLOGY_ELECTROLYTE specialtyCategory. */
const UROLOGY_PHASE17_TEMPLATE_GOVERNANCE = {
  ...BATCH_GOVERNANCE_DRAFT,
  specialtyCategory: "nephrology_urology",
  riskCategory: "moderate",
};

const OBGYN_PHASE17_PREGNANCY_SAFETY = {
  pregnancySensitive: true,
  requiresPregnancyStatusDocumentation: true,
  requiresEctopicPrecautions: true,
  requiresOBGynFollowUp: true,
} as const;

const OBGYN_PHASE17_PREGNANCY_BLEEDING_SAFETY = {
  ...OBGYN_PHASE17_PREGNANCY_SAFETY,
  requiresBleedingPrecautions: true,
} as const;

const OBGYN_PHASE17_PELVIC_SAFETY = {
  pregnancySensitive: true,
  requiresPregnancyStatusDocumentation: true,
  requiresPelvicPainPrecautions: true,
  requiresEctopicPrecautions: true,
  requiresOBGynFollowUp: true,
} as const;

const OBGYN_PHASE17_ROUTINE_SAFETY = {
  requiresOBGynFollowUp: true,
} as const;

const OBGYN_PHASE17_SEXUAL_HEALTH_SAFETY = {
  requiresSexualHealthPrivacyWarning: true,
  requiresOBGynFollowUp: true,
} as const;

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
    clinicalReviewStatus: "reviewed",
    effectiveFrom: GOVERNANCE_EFFECTIVE_FROM,
    diagnosisMappings: {
      icdExact: [
        "W54.0XXA",
        "W55.01XA",
        "W55.03XA",
        "W55.81XA",
        "S61.459A",
        "S01.05XA",
      ],
      icdFamily: [
        "W54",
        "W55",
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
        "mammal bite",
        "bite wound",
        "open bite",
        "bitten by dog",
        "bitten by cat",
        "morsure animale",
        "morsure de chien",
        "morsure de chat",
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
    title: "Back pain discharge documentation",
    specialtyCategory: "primary_care",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["M54"],
      keyword: ["back pain", "low back pain"],
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
      icdFamily: ["N20"],
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
      icdFamily: ["S00", "S09"],
      keyword: ["minor head injury", "head injury"],
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
        // Do not use bare "tia" — it matches French "initiale" (rencontre initiale) via substring.
        "transient ischemic attack",
        "accident ischémique transitoire",
        "stroke-like symptoms",
        "symptômes d'allure d'avc",
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
      // F10.23* withdrawal is owned by alcohol_withdrawal_post_acute_v1 (longer prefix wins).
      // Do not use bare "intoxication" — it steals medication-poisoning French labels.
      icdFamily: ["F10.92", "F10"],
      keyword: [
        "alcohol intoxication",
        "intoxication alcoolique",
        "ethanol intoxication",
        "alcohol use disorder intoxication",
      ],
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
      keyword: ["obgyn hyperemesis", "pregnancy vomiting obgyn"],
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
    // F10.23* medical withdrawal aftercare is owned by Phase 16 alcohol_withdrawal_post_acute_v1.
    // This BH template remains keyword-only for behavioral-health framing ("bh alcohol withdrawal").
    diagnosisMappings: {
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
      icdFamily: ["S39.01"],
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
        "broken cheekbone",
        "cheekbone fracture",
        "zygomatic fracture",
        "malar fracture",
        "fracture faciale",
        "fracture de la pommette",
        "fracture zygomatique",
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
    id: "concussion_mild_tbi_v1",
    version: "1.0.0",
    title: "Concussion / mild traumatic brain injury discharge documentation",
    specialtyCategory: "neurology",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["S06.0"],
      keyword: [
        "concussion",
        "mild tbi",
        "mild traumatic brain injury",
        "commotion cérébrale",
        "traumatisme crânien léger",
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
        label: "CDC — HEADS UP concussion information",
        url: "https://www.cdc.gov/heads-up/index.html",
        publisher: "U.S. Centers for Disease Control and Prevention (CDC)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("cmt-pcp", "PRIMARY_CARE", "within 1–2 days or as directed"),
      registryFollowUp("cmt-neuro", "NEUROLOGY", "for persistent concussion symptoms"),
    ],
    suggestedText: CONCUSSION_MILD_TBI_SUGGESTED_TEXT,
  },
  {
    id: "post_head_injury_observation_v1",
    version: "1.0.0",
    title: "Post head-injury observation discharge documentation",
    specialtyCategory: "emergency_medicine",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      keyword: [
        "head injury observation",
        "post head injury observation",
        "observation période tête",
        "observation post-traumatisme crânien",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Head injuries",
        url: "https://medlineplus.gov/headinjuries.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("phio-pcp", "PRIMARY_CARE", "within 1–2 days or as directed")],
    suggestedText: POST_HEAD_INJURY_OBSERVATION_SUGGESTED_TEXT,
  },
  {
    id: "skull_fracture_followup_v1",
    version: "1.0.0",
    title: "Skull fracture follow-up discharge documentation",
    specialtyCategory: "neurosurgery",
    riskCategory: "moderate_to_high",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["S02.0", "S02.1"],
      keyword: [
        "skull fracture",
        "basilar skull fracture",
        "fracture du crâne",
        "fracture de la base du crâne",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Skull fracture",
        url: "https://medlineplus.gov/ency/article/000060.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("sff-neuro", "NEUROLOGY", "within 3–5 days or as directed")],
    suggestedText: SKULL_FRACTURE_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "intracranial_hemorrhage_followup_v1",
    version: "1.0.0",
    title: "Traumatic intracranial hemorrhage follow-up discharge documentation (post-evaluation, clinician-selected only)",
    specialtyCategory: "neurosurgery",
    riskCategory: "high",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["S06.1", "S06.2", "S06.3", "S06.4", "S06.5", "S06.6", "S06.8", "S06.9"],
      keyword: [
        "intracranial hemorrhage",
        "subdural hematoma",
        "epidural hematoma",
        "traumatic brain injury",
        "hémorragie intracrânienne",
        "hématome sous-dural",
        "hématome extradural",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Traumatic brain injury",
        url: "https://medlineplus.gov/traumaticbraininjury.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [
      registryFollowUp("ichf-neurosurg", "NEUROSURGERY", "as directed — do not skip"),
      registryFollowUp("ichf-neuro", "NEUROLOGY", "as directed"),
    ],
    suggestedText: INTRACRANIAL_HEMORRHAGE_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "nasal_fracture_v1",
    version: "1.0.0",
    title: "Nasal fracture discharge documentation",
    specialtyCategory: "ent",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["S02.2"],
      keyword: ["nasal fracture", "broken nose", "fracture nasale", "nez cassé", "fracture du nez"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Facial injuries and disorders",
        url: "https://medlineplus.gov/facialinjuriesanddisorders.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("nf-ent", "ENT", "within 3–5 days or as directed")],
    suggestedText: NASAL_FRACTURE_SUGGESTED_TEXT,
  },
  {
    id: "orbital_fracture_v1",
    version: "1.0.0",
    title: "Orbital fracture discharge documentation",
    specialtyCategory: "ophthalmology",
    riskCategory: "moderate_to_high",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["S02.3"],
      keyword: [
        "orbital fracture",
        "blowout fracture",
        "eye socket fracture",
        "hyphema",
        "traumatic hyphema",
        "fracture orbitaire",
        "fracture du plancher orbitaire",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Eye injuries",
        url: "https://medlineplus.gov/eyeinjuries.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("of-ophtho", "OPHTHALMOLOGY", "within 24–72 hours or as directed")],
    suggestedText: ORBITAL_FRACTURE_SUGGESTED_TEXT,
  },
  {
    id: "mandibular_fracture_v1",
    version: "1.0.0",
    title: "Mandibular (jaw) fracture discharge documentation",
    specialtyCategory: "oral_maxillofacial",
    riskCategory: "moderate_to_high",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["S02.6"],
      keyword: [
        "mandibular fracture",
        "mandible fracture",
        "broken jaw",
        "jaw fracture",
        "fracture mandibulaire",
        "mâchoire cassée",
        "fracture de la mâchoire",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Jaw injuries",
        url: "https://medlineplus.gov/jawinjuriesanddisorders.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("mf-omfs", "ENT", "within 3–5 days or as directed")],
    suggestedText: MANDIBULAR_FRACTURE_SUGGESTED_TEXT,
  },
  {
    id: "maxillary_lefort_fracture_v1",
    version: "1.0.0",
    title: "Maxillary (Le Fort) fracture discharge documentation",
    specialtyCategory: "oral_maxillofacial",
    riskCategory: "high",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["S02.41"],
      keyword: [
        "lefort fracture",
        "le fort fracture",
        "maxillary lefort fracture",
        "fracture de lefort",
        "fracture maxillaire de lefort",
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
    defaultFollowUps: [registryFollowUp("mlf-omfs", "ENT", "within 24–72 hours or as directed")],
    suggestedText: MAXILLARY_LEFORT_FRACTURE_SUGGESTED_TEXT,
  },
  {
    id: "dental_trauma_v1",
    version: "1.0.0",
    title: "Traumatic tooth fracture discharge documentation",
    specialtyCategory: "dental",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["S02.5"],
      keyword: [
        "tooth fracture",
        "dental fracture",
        "fractured tooth",
        "fracture dentaire",
        "dent fracturée",
        "dent cassée",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Tooth injuries",
        url: "https://medlineplus.gov/dentalhealth.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("dt-dental", "PRIMARY_CARE", "with dentistry within a few days or as directed")],
    suggestedText: DENTAL_TRAUMA_SUGGESTED_TEXT,
  },
  {
    id: "tooth_avulsion_v1",
    version: "1.0.0",
    title: "Tooth avulsion / dislocation discharge documentation",
    specialtyCategory: "dental",
    riskCategory: "high",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["S03.2"],
      keyword: [
        "tooth avulsion",
        "avulsed tooth",
        "knocked out tooth",
        "avulsion dentaire",
        "dent arrachée",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Tooth injuries",
        url: "https://medlineplus.gov/dentalhealth.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("ta-dental", "PRIMARY_CARE", "same day with dentistry or as directed")],
    suggestedText: TOOTH_AVULSION_SUGGESTED_TEXT,
  },
  {
    id: "jaw_dislocation_post_reduction_v1",
    version: "1.0.0",
    title: "Jaw (TMJ) dislocation post-reduction discharge documentation",
    specialtyCategory: "ent",
    riskCategory: "moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      keyword: [
        "jaw dislocation post-reduction",
        "tmj dislocation post reduction",
        "post-reduction jaw dislocation",
        "réduction luxation mâchoire",
        "après réduction luxation de la mâchoire",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Jaw injuries",
        url: "https://medlineplus.gov/jawinjuriesanddisorders.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("jdpr-ent", "ENT", "within 3–5 days or as directed")],
    suggestedText: JAW_DISLOCATION_POST_REDUCTION_SUGGESTED_TEXT,
  },
  {
    id: "auricular_hematoma_followup_v1",
    version: "1.0.0",
    title: "Auricular (ear) hematoma follow-up discharge documentation",
    specialtyCategory: "ent",
    riskCategory: "moderate_to_high",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["H61.12"],
      keyword: [
        "auricular hematoma",
        "hematoma of the ear",
        "cauliflower ear",
        "hématome auriculaire",
        "hématome de l'oreille",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Ear disorders",
        url: "https://medlineplus.gov/eardisorders.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("ahf-ent", "ENT", "within 24–48 hours or as directed")],
    suggestedText: AURICULAR_HEMATOMA_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "septal_hematoma_followup_v1",
    version: "1.0.0",
    title: "Nasal septal hematoma follow-up discharge documentation (urgent ENT escalation)",
    specialtyCategory: "ent",
    riskCategory: "high",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      icdFamily: ["S00.33"],
      keyword: [
        "septal hematoma",
        "nasal septal hematoma",
        "hématome de la cloison nasale",
        "hématome septal",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Nose injuries and disorders",
        url: "https://medlineplus.gov/noseinjuriesanddisorders.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("shf-ent", "ENT", "urgent — within 24 hours or as directed")],
    suggestedText: SEPTAL_HEMATOMA_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "facial_laceration_v1",
    version: "1.0.0",
    title: "Facial laceration discharge documentation",
    specialtyCategory: "wound_care",
    riskCategory: "low_to_moderate",
    ...BATCH_GOVERNANCE_DRAFT,
    diagnosisMappings: {
      keyword: [
        "facial laceration",
        "face laceration",
        "laceration to the face",
        "lacération faciale",
        "plaie du visage",
      ],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Wounds and injuries",
        url: "https://medlineplus.gov/woundsandinjuries.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: ACCESSED_AT,
      },
    ],
    defaultFollowUps: [registryFollowUp("fl-pcp", "PRIMARY_CARE", "for suture/staple removal or wound check as directed")],
    suggestedText: FACIAL_LACERATION_SUGGESTED_TEXT,
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
      icdFamily: ["S53.3", "S63.4", "S73.1", "S93.5", "S93.6", "S23.3", "S29"],
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
      icdFamily: ["S76.0", "S76.2", "S76.3", "S86.3", "S86.8", "S56", "S96"],
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
      icdFamily: ["S13.1", "S33.4", "S33.5"],
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
    id: "trauma_msk_crush_hand_finger_v1",
    version: "1.0.0",
    title: "Trauma/MSK crush hand/finger discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: {
      requiresNeurovascularPrecautions: true,
      requiresOrthopedicFollowUp: true,
      requiresReturnActivityRestrictions: true,
      requiresCompartmentSyndromePrecautions: true,
    },
    diagnosisMappings: {
      icdFamily: ["S67.1", "S67.2", "S67"],
      keyword: ["crush injury hand", "crushed hand", "crushed finger", "écrasement main"],
    },
    sourceReferences: [{ label: "MedlinePlus — Crush injuries", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmchf-ortho", "ORTHOPEDICS", "within 24–72 hours or as directed")],
    suggestedText: TRAUMA_MSK_CRUSH_HAND_FINGER_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_crush_upper_extremity_v1",
    version: "1.0.0",
    title: "Trauma/MSK crush upper extremity discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresOrthopedicFollowUp: true, requiresReturnActivityRestrictions: true, requiresCompartmentSyndromePrecautions: true },
    diagnosisMappings: { icdFamily: ["S47", "S57"], keyword: ["crush injury arm", "crushing injury forearm", "écrasement bras"] },
    sourceReferences: [{ label: "MedlinePlus — Crush injuries", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmcue-ortho", "ORTHOPEDICS", "within 24–72 hours or as directed")],
    suggestedText: TRAUMA_MSK_CRUSH_UPPER_EXTREMITY_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_crush_lower_extremity_v1",
    version: "1.0.0",
    title: "Trauma/MSK crush lower extremity discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresOrthopedicFollowUp: true, requiresReturnActivityRestrictions: true, requiresCompartmentSyndromePrecautions: true },
    diagnosisMappings: { icdFamily: ["S77", "S87"], keyword: ["crush injury leg", "crushed thigh", "écrasement jambe"] },
    sourceReferences: [{ label: "MedlinePlus — Crush injuries", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmcle-ortho", "ORTHOPEDICS", "within 24–72 hours or as directed")],
    suggestedText: TRAUMA_MSK_CRUSH_LOWER_EXTREMITY_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_crush_foot_toe_v1",
    version: "1.0.0",
    title: "Trauma/MSK crush foot/toe discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresOrthopedicFollowUp: true, requiresReturnActivityRestrictions: true, requiresCompartmentSyndromePrecautions: true },
    diagnosisMappings: { icdFamily: ["S97"], keyword: ["crush injury foot", "crushed foot", "crushed toe", "écrasement pied"] },
    sourceReferences: [{ label: "MedlinePlus — Crush injuries", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmcft-ortho", "ORTHOPEDICS", "within 24–72 hours or as directed")],
    suggestedText: TRAUMA_MSK_CRUSH_FOOT_TOE_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_crush_chest_abdomen_pelvis_v1",
    version: "1.0.0",
    title: "Trauma/MSK crush chest/abdomen/pelvis discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: false, requiresOrthopedicFollowUp: false, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { icdFamily: ["S28", "S38"], keyword: ["crushed chest", "crush abdomen", "crush pelvis", "écrasement thorax"] },
    sourceReferences: [{ label: "MedlinePlus — Crush injuries", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmccap-ortho", "ORTHOPEDICS", "as directed")],
    suggestedText: TRAUMA_MSK_CRUSH_CHEST_ABDOMEN_PELVIS_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_crush_prolonged_compression_v1",
    version: "1.0.0",
    title: "Trauma/MSK crush prolonged compression discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresOrthopedicFollowUp: true, requiresReturnActivityRestrictions: true, requiresCompartmentSyndromePrecautions: true },
    diagnosisMappings: { icdFamily: ["T79.6"], keyword: ["prolonged compression", "crush syndrome", "traumatic ischemia", "compression prolongée"] },
    sourceReferences: [{ label: "MedlinePlus — Rhabdomyolysis", url: "https://medlineplus.gov/ency/article/000473.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmcpc-ortho", "ORTHOPEDICS", "as directed")],
    suggestedText: TRAUMA_MSK_CRUSH_PROLONGED_COMPRESSION_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_crush_degloving_v1",
    version: "1.0.0",
    title: "Trauma/MSK crush degloving discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresOrthopedicFollowUp: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { keyword: ["degloving", "degloving injury", "dégantage"] },
    sourceReferences: [{ label: "MedlinePlus — Wounds and injuries", url: "https://medlineplus.gov/woundsandinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmcdg-ortho", "ORTHOPEDICS", "within 24 hours or as directed")],
    suggestedText: TRAUMA_MSK_CRUSH_DEGLOVING_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_crush_compartment_risk_v1",
    version: "1.0.0",
    title: "Trauma/MSK crush compartment-risk discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresOrthopedicFollowUp: true, requiresReturnActivityRestrictions: true, requiresCompartmentSyndromePrecautions: true },
    diagnosisMappings: { keyword: ["compartment syndrome concern", "syndrome des loges", "compartment risk after crush"] },
    sourceReferences: [{ label: "OrthoInfo — Compartment syndrome", url: "https://orthoinfo.aaos.org/en/diseases--conditions/compartment-syndrome/", publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmccr-ortho", "ORTHOPEDICS", "urgent / as directed")],
    suggestedText: TRAUMA_MSK_CRUSH_COMPARTMENT_RISK_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_crush_generic_v1",
    version: "1.0.0",
    title: "Trauma/MSK crush generic discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresOrthopedicFollowUp: true, requiresReturnActivityRestrictions: true, requiresCompartmentSyndromePrecautions: true },
    diagnosisMappings: { icdFamily: ["S07"], keyword: ["crush injury", "crushing injury", "écrasement", "industrial crush"] },
    sourceReferences: [{ label: "MedlinePlus — Crush injuries", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmcg-ortho", "ORTHOPEDICS", "within 24–72 hours or as directed")],
    suggestedText: TRAUMA_MSK_CRUSH_GENERIC_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_amputation_finger_thumb_v1",
    version: "1.0.0",
    title: "Trauma/MSK amputation finger/thumb discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresOrthopedicFollowUp: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { icdFamily: ["S68.1", "S68.0", "S68"], keyword: ["traumatic amputation finger", "severed finger", "thumb cut off", "amputation doigt"] },
    sourceReferences: [{ label: "OrthoInfo — Amputations", url: "https://orthoinfo.aaos.org/", publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmaf-ortho", "ORTHOPEDICS", "urgent / as directed")],
    suggestedText: TRAUMA_MSK_AMPUTATION_FINGER_THUMB_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_amputation_hand_upper_extremity_v1",
    version: "1.0.0",
    title: "Trauma/MSK amputation hand/upper extremity discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresOrthopedicFollowUp: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { icdFamily: ["S48", "S58"], keyword: ["hand amputation", "arm amputation", "amputation main"] },
    sourceReferences: [{ label: "OrthoInfo — Amputations", url: "https://orthoinfo.aaos.org/", publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmaue-ortho", "ORTHOPEDICS", "urgent / as directed")],
    suggestedText: TRAUMA_MSK_AMPUTATION_HAND_UPPER_EXTREMITY_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_amputation_toe_v1",
    version: "1.0.0",
    title: "Trauma/MSK amputation toe discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresOrthopedicFollowUp: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { icdFamily: ["S98.1", "S98.2"], keyword: ["traumatic amputation toe", "severed toe", "toe cut off"] },
    sourceReferences: [{ label: "OrthoInfo — Amputations", url: "https://orthoinfo.aaos.org/", publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmat-ortho", "ORTHOPEDICS", "within 24–72 hours or as directed")],
    suggestedText: TRAUMA_MSK_AMPUTATION_TOE_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_amputation_foot_lower_extremity_v1",
    version: "1.0.0",
    title: "Trauma/MSK amputation foot/lower extremity discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresOrthopedicFollowUp: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { icdFamily: ["S78", "S88", "S98.0", "S98.3"], keyword: ["foot amputation", "leg amputation", "amputation pied"] },
    sourceReferences: [{ label: "OrthoInfo — Amputations", url: "https://orthoinfo.aaos.org/", publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmafle-ortho", "ORTHOPEDICS", "urgent / as directed")],
    suggestedText: TRAUMA_MSK_AMPUTATION_FOOT_LOWER_EXTREMITY_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_amputation_partial_v1",
    version: "1.0.0",
    title: "Trauma/MSK partial amputation discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresOrthopedicFollowUp: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { keyword: ["partial amputation", "partial traumatic amputation", "amputation partielle"] },
    sourceReferences: [{ label: "OrthoInfo — Amputations", url: "https://orthoinfo.aaos.org/", publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmap-ortho", "ORTHOPEDICS", "urgent / as directed")],
    suggestedText: TRAUMA_MSK_AMPUTATION_PARTIAL_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_amputation_complete_v1",
    version: "1.0.0",
    title: "Trauma/MSK complete amputation discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresOrthopedicFollowUp: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { keyword: ["complete amputation", "complete traumatic amputation", "amputation complète"] },
    sourceReferences: [{ label: "OrthoInfo — Amputations", url: "https://orthoinfo.aaos.org/", publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmac-ortho", "ORTHOPEDICS", "urgent / as directed")],
    suggestedText: TRAUMA_MSK_AMPUTATION_COMPLETE_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_amputation_postoperative_or_followup_v1",
    version: "1.0.0",
    title: "Trauma/MSK amputation postoperative/follow-up discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: false, requiresOrthopedicFollowUp: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { keyword: ["amputation followup", "stump care", "soins de moignon"] },
    sourceReferences: [{ label: "MedlinePlus — Amputation", url: "https://medlineplus.gov/amputation.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmapf-ortho", "ORTHOPEDICS", "as directed")],
    suggestedText: TRAUMA_MSK_AMPUTATION_POSTOPERATIVE_OR_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_amputation_generic_v1",
    version: "1.0.0",
    title: "Trauma/MSK amputation generic discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresOrthopedicFollowUp: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { keyword: ["traumatic amputation", "amputation traumatique", "severed digit"] },
    sourceReferences: [{ label: "OrthoInfo — Amputations", url: "https://orthoinfo.aaos.org/", publisher: "American Academy of Orthopaedic Surgeons (OrthoInfo)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmag-ortho", "ORTHOPEDICS", "urgent / as directed")],
    suggestedText: TRAUMA_MSK_AMPUTATION_GENERIC_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_foreign_body_eye_v1",
    version: "1.0.0",
    title: "Trauma/MSK foreign body eye discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: false, requiresOrthopedicFollowUp: false, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { icdFamily: ["T15"], keyword: ["foreign body eye", "corneal foreign body", "corps étranger oeil"] },
    sourceReferences: [{ label: "MedlinePlus — Eye injuries", url: "https://medlineplus.gov/eyeinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmfbe-ophtho", "OPHTHALMOLOGY", "within 24 hours or as directed")],
    suggestedText: TRAUMA_MSK_FOREIGN_BODY_EYE_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_foreign_body_ear_nose_v1",
    version: "1.0.0",
    title: "Trauma/MSK foreign body ear/nose discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: false, requiresOrthopedicFollowUp: false, requiresReturnActivityRestrictions: true },
    // T17.0/T17.1 (nasal FB) take precedence over the broader T17 aspirated-airway family below —
    // mirrors the trauma_foreign_body_ear_nose condition family's longest-prefix ownership.
    diagnosisMappings: { icdFamily: ["T16", "T17.0", "T17.1"], keyword: ["foreign body ear", "foreign body nose", "corps étranger oreille"] },
    sourceReferences: [{ label: "MedlinePlus — Ear disorders", url: "https://medlineplus.gov/eardisorders.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmfben-ent", "ENT", "within 24–72 hours or as directed")],
    suggestedText: TRAUMA_MSK_FOREIGN_BODY_EAR_NOSE_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_foreign_body_skin_soft_tissue_v1",
    version: "1.0.0",
    title: "Trauma/MSK foreign body skin/soft tissue discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: false, requiresOrthopedicFollowUp: false, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { keyword: ["foreign body skin", "splinter", "glass in skin", "écharde"] },
    sourceReferences: [{ label: "MedlinePlus — Wounds and injuries", url: "https://medlineplus.gov/woundsandinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmfbs-wound", "PRIMARY_CARE", "within 48–72 hours or as directed")],
    suggestedText: TRAUMA_MSK_FOREIGN_BODY_SKIN_SOFT_TISSUE_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_foreign_body_hand_finger_v1",
    version: "1.0.0",
    title: "Trauma/MSK foreign body hand/finger discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresOrthopedicFollowUp: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { icdFamily: ["S61.44", "S61.4"], keyword: ["foreign body hand", "foreign body finger", "splinter hand", "corps étranger main"] },
    sourceReferences: [{ label: "MedlinePlus — Wounds and injuries", url: "https://medlineplus.gov/woundsandinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmfbh-ortho", "ORTHOPEDICS", "within 24–72 hours or as directed")],
    suggestedText: TRAUMA_MSK_FOREIGN_BODY_HAND_FINGER_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_foreign_body_foot_toe_v1",
    version: "1.0.0",
    title: "Trauma/MSK foreign body foot/toe discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresOrthopedicFollowUp: false, requiresReturnActivityRestrictions: true },
    // Keep with-FB foot puncture prefixes only; bare S91.3 puncture without FB routes to penetrating_foot_injury_v1.
    diagnosisMappings: { icdFamily: ["S91.34"], keyword: ["foreign body foot", "splinter in foot", "corps étranger pied"] },
    sourceReferences: [{ label: "MedlinePlus — Wounds and injuries", url: "https://medlineplus.gov/woundsandinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmfbf-wound", "PRIMARY_CARE", "within 48–72 hours or as directed")],
    suggestedText: TRAUMA_MSK_FOREIGN_BODY_FOOT_TOE_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_foreign_body_fishhook_v1",
    version: "1.0.0",
    title: "Trauma/MSK foreign body fishhook discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: false, requiresOrthopedicFollowUp: false, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { keyword: ["fishhook", "hameçon", "hamecon"] },
    sourceReferences: [{ label: "MedlinePlus — Wounds and injuries", url: "https://medlineplus.gov/woundsandinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmfbfh-wound", "PRIMARY_CARE", "within 48–72 hours or as directed")],
    suggestedText: TRAUMA_MSK_FOREIGN_BODY_FISHHOOK_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_foreign_body_ingested_v1",
    version: "1.0.0",
    title: "Trauma/MSK foreign body ingested discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: false, requiresOrthopedicFollowUp: false, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { icdFamily: ["T18"], keyword: ["swallowed foreign body", "ingested foreign body", "corps étranger avalé"] },
    sourceReferences: [{ label: "MedlinePlus — Foreign object in esophagus", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmfbi-gi", "GI", "as directed")],
    suggestedText: TRAUMA_MSK_FOREIGN_BODY_INGESTED_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_foreign_body_aspirated_v1",
    version: "1.0.0",
    title: "Trauma/MSK foreign body aspirated discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: false, requiresOrthopedicFollowUp: false, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { icdFamily: ["T17"], keyword: ["aspirated foreign body", "airway foreign body", "corps étranger inhalé"] },
    sourceReferences: [{ label: "MedlinePlus — Choking", url: "https://medlineplus.gov/choking.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmfba-airway", "PULMONOLOGY", "urgent / as directed")],
    suggestedText: TRAUMA_MSK_FOREIGN_BODY_ASPIRATED_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_foreign_body_retained_fragment_v1",
    version: "1.0.0",
    title: "Trauma/MSK foreign body retained fragment discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: false, requiresOrthopedicFollowUp: false, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { keyword: ["retained fragment", "retained foreign body", "fragment retenu"] },
    sourceReferences: [{ label: "MedlinePlus — Wounds and injuries", url: "https://medlineplus.gov/woundsandinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmfbr-wound", "PRIMARY_CARE", "within 48–72 hours or as directed")],
    suggestedText: TRAUMA_MSK_FOREIGN_BODY_RETAINED_FRAGMENT_SUGGESTED_TEXT,
  },
  {
    id: "trauma_msk_foreign_body_generic_v1",
    version: "1.0.0",
    title: "Trauma/MSK foreign body generic discharge documentation",
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: false, requiresOrthopedicFollowUp: false, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { keyword: ["foreign body", "foreign object", "corps étranger"] },
    sourceReferences: [{ label: "MedlinePlus — Wounds and injuries", url: "https://medlineplus.gov/woundsandinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tmfbg-wound", "PRIMARY_CARE", "within 48–72 hours or as directed")],
    suggestedText: TRAUMA_MSK_FOREIGN_BODY_GENERIC_SUGGESTED_TEXT,
  },
  {
    id: "burn_superficial_v1", version: "1.0.0", title: "Superficial burn discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["T21.1", "T22.1", "T24.1", "T30.0", "T30.1"], keyword: ["superficial burn", "first-degree burn", "brûlure superficielle"] },
    sourceReferences: [{ label: "MedlinePlus — Burns", url: "https://medlineplus.gov/burns.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("burn-superficial-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: BURN_SUPERFICIAL_SUGGESTED_TEXT,
  },
  {
    id: "penetrating_wound_minor_v1", version: "1.0.0", title: "Minor penetrating wound discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { icdFamily: ["S11", "S21", "S31"], keyword: ["penetrating wound", "puncture wound", "plaie pénétrante", "plaie perforante"] },
    sourceReferences: [{ label: "MedlinePlus — Wounds and injuries", url: "https://medlineplus.gov/woundsandinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("pen-minor-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: PENETRATING_WOUND_MINOR_SUGGESTED_TEXT,
  },
  {
    id: "gunshot_wound_extremity_v1", version: "1.0.0", title: "Gunshot wound extremity discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, riskCategory: "high",
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresReturnActivityRestrictions: true, requiresOrthopedicFollowUp: true },
    diagnosisMappings: { keyword: ["gunshot", "firearm", "bullet", "blessure par balle"] },
    sourceReferences: [{ label: "MedlinePlus — Gunshot wounds", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("pen-gsw-trauma", "TRAUMA_CLINIC", "within 24 hours or as directed")], suggestedText: GUNSHOT_WOUND_EXTREMITY_SUGGESTED_TEXT,
  },
  {
    id: "stab_wound_minor_v1", version: "1.0.0", title: "Minor stab wound discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { keyword: ["stab", "knife", "arme blanche", "couteau"] },
    sourceReferences: [{ label: "MedlinePlus — Wounds and injuries", url: "https://medlineplus.gov/woundsandinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("pen-stab-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: STAB_WOUND_MINOR_SUGGESTED_TEXT,
  },
  {
    id: "retained_projectile_v1", version: "1.0.0", title: "Retained projectile discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, riskCategory: "high",
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { keyword: ["retained bullet", "retained projectile", "projectile retained", "balle retenue", "projectile retenu"] },
    sourceReferences: [{ label: "MedlinePlus — Wounds and injuries", url: "https://medlineplus.gov/woundsandinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("pen-projectile-trauma", "TRAUMA_CLINIC", "within 24 hours or as directed")], suggestedText: RETAINED_PROJECTILE_SUGGESTED_TEXT,
  },
  {
    id: "penetrating_hand_injury_v1", version: "1.0.0", title: "Penetrating hand injury discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresReturnActivityRestrictions: true, requiresOrthopedicFollowUp: true },
    diagnosisMappings: { icdFamily: ["S61.0", "S61.1", "S61.2", "S61.3", "S61.5", "S65"], keyword: ["penetrating hand", "puncture hand", "plaie pénétrante main"] },
    sourceReferences: [{ label: "MedlinePlus — Hand injuries", url: "https://medlineplus.gov/handinjuriesanddisorders.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("pen-hand-trauma", "TRAUMA_CLINIC", "within 24–48 hours or as directed")], suggestedText: PENETRATING_HAND_INJURY_SUGGESTED_TEXT,
  },
  {
    id: "penetrating_foot_injury_v1", version: "1.0.0", title: "Penetrating foot injury discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresReturnActivityRestrictions: true, requiresOrthopedicFollowUp: true },
    diagnosisMappings: { icdFamily: ["S91.0", "S91.1", "S91.2", "S91.3", "S95"], keyword: ["penetrating foot", "puncture foot", "plaie pénétrante pied", "plaie punctiforme du pied"] },
    sourceReferences: [{ label: "MedlinePlus — Foot injuries", url: "https://medlineplus.gov/footinjuriesanddisorders.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("pen-foot-trauma", "TRAUMA_CLINIC", "within 24–48 hours or as directed")], suggestedText: PENETRATING_FOOT_INJURY_SUGGESTED_TEXT,
  },
  {
    id: "penetrating_face_v1", version: "1.0.0", title: "Penetrating face injury discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, riskCategory: "high",
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { keyword: ["penetrating face", "facial penetrating", "plaie pénétrante visage"] },
    sourceReferences: [{ label: "MedlinePlus — Facial injuries", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("pen-face-trauma", "TRAUMA_CLINIC", "within 24 hours or as directed")], suggestedText: PENETRATING_FACE_SUGGESTED_TEXT,
  },
  {
    id: "penetrating_eye_followup_v1", version: "1.0.0", title: "Penetrating eye injury follow-up discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, specialtyCategory: "ophthalmology", riskCategory: "high",
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { icdFamily: ["S05.4", "S05.50", "S05.51", "S05.52", "S05.5", "S05.6"], keyword: ["penetrating eye", "ocular penetration", "plaie pénétrante oeil", "plaie pénétrante de l'œil"] },
    sourceReferences: [{ label: "MedlinePlus — Eye injuries", url: "https://medlineplus.gov/eyeinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("pen-eye-oph", "OPHTHALMOLOGY", "within 24 hours or as directed")], suggestedText: PENETRATING_EYE_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "penetrating_chest_v1", version: "1.0.0", title: "Penetrating chest injury discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, specialtyCategory: "emergency_medicine", riskCategory: "high",
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { icdFamily: ["S21.1", "S21.2", "S21.3", "S21.4", "S25", "S26", "S27"], keyword: ["penetrating chest", "gunshot chest", "stab chest"] },
    sourceReferences: [{ label: "MedlinePlus — Chest injuries", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("pen-chest-trauma", "TRAUMA_CLINIC", "within 24 hours or as directed")], suggestedText: PENETRATING_CHEST_SUGGESTED_TEXT,
  },
  {
    id: "penetrating_abdomen_v1", version: "1.0.0", title: "Penetrating abdomen injury discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, specialtyCategory: "emergency_medicine", riskCategory: "high",
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { icdFamily: ["S31.0", "S31.1", "S31.5", "S31.6", "S31.8", "S35", "S36", "S37"], keyword: ["penetrating abdomen", "gunshot abdomen", "stab abdomen"] },
    sourceReferences: [{ label: "MedlinePlus — Abdominal injuries", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("pen-abd-trauma", "TRAUMA_CLINIC", "within 24 hours or as directed")], suggestedText: PENETRATING_ABDOMEN_SUGGESTED_TEXT,
  },
  {
    id: "penetrating_neck_v1", version: "1.0.0", title: "Penetrating neck injury discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, specialtyCategory: "emergency_medicine", riskCategory: "high",
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresHeadNeckSpineEscalation: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { icdFamily: ["S11.0", "S11.1", "S11.2", "S11.8", "S11.9", "S15"], keyword: ["penetrating neck", "gunshot neck", "stab neck", "plaie ouverte du cou"] },
    sourceReferences: [{ label: "MedlinePlus — Neck injuries", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("pen-neck-trauma", "TRAUMA_CLINIC", "within 24 hours or as directed")], suggestedText: PENETRATING_NECK_SUGGESTED_TEXT,
  },
  {
    id: "penetrating_head_v1", version: "1.0.0", title: "Penetrating head injury discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, specialtyCategory: "emergency_medicine", riskCategory: "high",
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresHeadNeckSpineEscalation: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { icdFamily: ["S01.0", "S01.1", "S01.2", "S01.3", "S01.4", "S01.5", "S01.8", "S01.9"], keyword: ["penetrating head", "gunshot head", "stab head"] },
    sourceReferences: [{ label: "MedlinePlus — Head injuries", url: "https://medlineplus.gov/headinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("pen-head-trauma", "TRAUMA_CLINIC", "within 24 hours or as directed")], suggestedText: PENETRATING_HEAD_SUGGESTED_TEXT,
  },
  {
    id: "post_wound_exploration_v1", version: "1.0.0", title: "Post wound exploration discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { keyword: ["post wound exploration", "wound exploration aftercare"] },
    sourceReferences: [{ label: "MedlinePlus — Wounds and injuries", url: "https://medlineplus.gov/woundsandinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("pen-explore-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: POST_WOUND_EXPLORATION_SUGGESTED_TEXT,
  },
  {
    id: "post_foreign_body_removal_v1", version: "1.0.0", title: "Post foreign body removal discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresReturnActivityRestrictions: true },
    diagnosisMappings: { keyword: ["post foreign body removal", "foreign body removal aftercare"] },
    sourceReferences: [{ label: "MedlinePlus — Wounds and injuries", url: "https://medlineplus.gov/woundsandinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("pen-fbremove-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: POST_FOREIGN_BODY_REMOVAL_SUGGESTED_TEXT,
  },
  {
    id: "post_tourniquet_extremity_v1", version: "1.0.0", title: "Post tourniquet extremity discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, riskCategory: "high",
    traumaMskSafety: { requiresNeurovascularPrecautions: true, requiresReturnActivityRestrictions: true, requiresOrthopedicFollowUp: true },
    diagnosisMappings: { keyword: ["post tourniquet", "tourniquet aftercare", "garrot"] },
    sourceReferences: [{ label: "MedlinePlus — Wounds and injuries", url: "https://medlineplus.gov/woundsandinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("pen-tourniquet-trauma", "TRAUMA_CLINIC", "within 24 hours or as directed")], suggestedText: POST_TOURNIQUET_EXTREMITY_SUGGESTED_TEXT,
  },
  {
    id: "burn_partial_thickness_v1", version: "1.0.0", title: "Partial-thickness burn discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["T21.2", "T22.2", "T24.2", "T30.2", "T21", "T22", "T24", "T28", "T30", "T31"], keyword: ["partial-thickness burn", "second-degree burn", "brûlure partielle", "burn", "thermal burn", "scald", "ébouillantage"] },
    sourceReferences: [{ label: "MedlinePlus — Burns", url: "https://medlineplus.gov/burns.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("burn-partial-wound", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: BURN_PARTIAL_THICKNESS_SUGGESTED_TEXT,
  },
  {
    id: "burn_full_thickness_followup_v1", version: "1.0.0", title: "Full-thickness burn follow-up documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, specialtyCategory: "burn_surgery", riskCategory: "high",
    diagnosisMappings: { icdFamily: ["T21.3", "T22.3", "T24.3", "T28.3", "T30.3"], keyword: ["full-thickness burn", "third-degree burn", "brûlure profonde"] },
    sourceReferences: [{ label: "MedlinePlus — Burns", url: "https://medlineplus.gov/burns.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("burn-full-specialist", "SPECIALIST", "within 24 hours or as directed")], suggestedText: BURN_FULL_THICKNESS_FOLLOWUP_SUGGESTED_TEXT,
  },
  {
    id: "burn_face_v1", version: "1.0.0", title: "Facial burn discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, specialtyCategory: "burn_surgery", riskCategory: "high",
    diagnosisMappings: { icdFamily: ["T20.0", "T20.1", "T20.2", "T20.3"], keyword: ["facial burn", "burn face", "brûlure du visage"] },
    sourceReferences: [{ label: "MedlinePlus — Burns", url: "https://medlineplus.gov/burns.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("burn-face-specialist", "SPECIALIST", "within 24 hours or as directed")], suggestedText: BURN_FACE_SUGGESTED_TEXT,
  },
  {
    id: "burn_hand_v1", version: "1.0.0", title: "Hand burn discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, specialtyCategory: "burn_surgery", riskCategory: "moderate_to_high",
    diagnosisMappings: { icdFamily: ["T23.0", "T23.1", "T23.2", "T23.3"], keyword: ["hand burn", "burn hand", "brûlure de la main"] },
    sourceReferences: [{ label: "MedlinePlus — Burns", url: "https://medlineplus.gov/burns.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("burn-hand-specialist", "SPECIALIST", "within 24–48 hours or as directed")], suggestedText: BURN_HAND_SUGGESTED_TEXT,
  },
  {
    id: "burn_foot_v1", version: "1.0.0", title: "Foot burn discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, specialtyCategory: "burn_surgery", riskCategory: "moderate_to_high",
    diagnosisMappings: { icdFamily: ["T25.0", "T25.1", "T25.2", "T25.3"], keyword: ["foot burn", "burn foot", "brûlure du pied"] },
    sourceReferences: [{ label: "MedlinePlus — Burns", url: "https://medlineplus.gov/burns.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("burn-foot-specialist", "SPECIALIST", "within 24–48 hours or as directed")], suggestedText: BURN_FOOT_SUGGESTED_TEXT,
  },
  {
    id: "burn_eye_v1", version: "1.0.0", title: "Eye burn discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, specialtyCategory: "emergency_medicine", riskCategory: "high",
    diagnosisMappings: { icdFamily: ["T26"], keyword: ["burn eye", "ocular burn", "brûlure oeil"] },
    sourceReferences: [{ label: "MedlinePlus — Eye injuries", url: "https://medlineplus.gov/eyeinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("burn-eye-specialist", "SPECIALIST", "within 24 hours or as directed")], suggestedText: BURN_EYE_SUGGESTED_TEXT,
  },
  {
    id: "burn_chemical_v1", version: "1.0.0", title: "Chemical burn discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, specialtyCategory: "burn_surgery", riskCategory: "high",
    diagnosisMappings: { icdFamily: ["T20.4", "T20.5", "T20.6", "T20.7", "T21.4", "T21.5", "T21.6", "T21.7", "T22.4", "T22.5", "T22.6", "T22.7", "T23.4", "T23.5", "T23.6", "T23.7", "T24.4", "T24.5", "T24.6", "T24.7", "T25.4", "T25.5", "T25.6", "T25.7", "T26.4", "T26.5", "T26.6", "T26.7", "T27.4", "T27.5", "T27.6", "T27.7", "T28.4", "T28.5", "T28.6", "T28.7", "T32"], keyword: ["chemical burn", "corrosion", "acid burn", "alkali", "brûlure chimique"] },
    sourceReferences: [{ label: "MedlinePlus — Chemical burns", url: "https://medlineplus.gov/ency/article/000059.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("burn-chemical-specialist", "SPECIALIST", "within 24 hours or as directed")], suggestedText: BURN_CHEMICAL_SUGGESTED_TEXT,
  },
  {
    // Phase 15: retargeted to T75.4 (electrocution) only — T75.0 (effects of lightning) ownership moved to
    // lightning_injury_post_acute_v1 (environmental-mechanism template); this template keeps tissue-injury-phase
    // ownership of electrical burns. "lightning"/"foudre" keywords removed for the same reason.
    id: "burn_electrical_v1", version: "1.0.0", title: "Electrical burn discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, specialtyCategory: "emergency_medicine", riskCategory: "high",
    diagnosisMappings: { icdFamily: ["T75.4"], keyword: ["electrical burn", "brûlure électrique"] },
    sourceReferences: [{ label: "MedlinePlus — Electrical injuries", url: "https://medlineplus.gov/ency/article/000030.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("burn-electrical-ed", "EMERGENCY_MEDICINE", "within 24 hours or as directed")], suggestedText: BURN_ELECTRICAL_SUGGESTED_TEXT,
  },
  {
    id: "burn_inhalation_aftercare_v1", version: "1.0.0", title: "Burn inhalation injury discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, specialtyCategory: "emergency_medicine", riskCategory: "high",
    diagnosisMappings: { icdFamily: ["T27"], keyword: ["smoke inhalation", "inhalation injury", "airway burn", "inhalation de fumée"] },
    sourceReferences: [{ label: "MedlinePlus — Smoke inhalation", url: "https://medlineplus.gov/ency/article/000051.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("burn-inhalation-ed", "EMERGENCY_MEDICINE", "within 24 hours or as directed")], suggestedText: BURN_INHALATION_AFTERCARE_SUGGESTED_TEXT,
  },
  {
    id: "frostbite_v1", version: "1.0.0", title: "Frostbite discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, specialtyCategory: "emergency_medicine",
    diagnosisMappings: { icdFamily: ["T33", "T34", "T35"], keyword: ["frostbite", "gelure", "cold injury"] },
    sourceReferences: [{ label: "MedlinePlus — Frostbite", url: "https://medlineplus.gov/ency/article/000057.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("frostbite-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: FROSTBITE_SUGGESTED_TEXT,
  },
  {
    id: "sunburn_v1", version: "1.0.0", title: "Sunburn discharge documentation", ...TRAUMA_MSK_TEMPLATE_GOVERNANCE, specialtyCategory: "emergency_medicine", riskCategory: "low_to_moderate",
    diagnosisMappings: { icdFamily: ["L55"], keyword: ["sunburn", "coup de soleil"] },
    sourceReferences: [{ label: "MedlinePlus — Sunburn", url: "https://medlineplus.gov/sunburn.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sunburn-pcp", "PRIMARY_CARE", "within 48–72 hours or as directed")], suggestedText: SUNBURN_SUGGESTED_TEXT,
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
  ...[
    ["human_bite_v1", "Human bite discharge documentation", ["W50.3", "Y04.1"], ["human bite", "morsure humaine"], HUMAN_BITE_SUGGESTED_TEXT],
    ["fight_bite_v1", "Fight bite discharge documentation", [], ["fight bite", "clenched fist", "knuckle bite", "morsure du poing"], FIGHT_BITE_SUGGESTED_TEXT],
    ["high_risk_hand_wound_v1", "High-risk hand wound discharge documentation", ["M65.14", "M65.13", "M65.17"], ["high risk hand wound", "hand bite", "flexor tenosynovitis", "ténosynovite infectieuse"], HIGH_RISK_HAND_WOUND_SUGGESTED_TEXT],
    ["contaminated_wound_v1", "Contaminated wound discharge documentation", [], ["contaminated wound", "dirty wound", "plaie contaminée", "plaie sale"], CONTAMINATED_WOUND_SUGGESTED_TEXT],
    ["water_exposed_wound_v1", "Water-exposed wound discharge documentation", [], ["freshwater", "saltwater", "lake", "river", "ocean", "aquarium"], WATER_EXPOSED_WOUND_SUGGESTED_TEXT],
    ["delayed_wound_v1", "Delayed wound discharge documentation", [], ["delayed wound", "delayed presentation wound"], DELAYED_WOUND_SUGGESTED_TEXT],
    ["deep_contaminated_wound_v1", "Deep contaminated wound discharge documentation", [], ["deep contaminated", "sewage", "farm contamination"], DEEP_CONTAMINATED_WOUND_SUGGESTED_TEXT],
    ["animal_bite_rabies_followup_v1", "Animal bite rabies follow-up documentation", [], ["rabies follow-up", "animal observation", "suivi rage"], ANIMAL_BITE_RABIES_FOLLOWUP_SUGGESTED_TEXT],
    ["infected_traumatic_wound_v1", "Infected traumatic wound discharge documentation", [], ["infected traumatic wound", "infected bite", "morsure infectée", "plaie infectée"], INFECTED_TRAUMATIC_WOUND_SUGGESTED_TEXT],
    ["bite_cellulitis_v1", "Bite-associated cellulitis discharge documentation", [], ["bite cellulitis", "cellulitis following bite", "cellulite après morsure"], BITE_CELLULITIS_SUGGESTED_TEXT],
    ["post_bite_abscess_drainage_v1", "Post bite abscess drainage documentation", [], ["post bite abscess", "abscess drainage bite"], POST_BITE_ABSCESS_DRAINAGE_SUGGESTED_TEXT],
    ["tetanus_followup_v1", "Tetanus follow-up documentation", [], ["tetanus follow-up", "suivi antitétanique"], TETANUS_FOLLOWUP_SUGGESTED_TEXT],
    ["blast_ear_injury_v1", "Blast ear injury discharge documentation", ["S09.2", "T70.0", "H83.3"], ["blast ear", "otitic barotrauma", "explosion ear"], BLAST_EAR_INJURY_SUGGESTED_TEXT],
    ["blast_lung_aftercare_v1", "Blast lung aftercare documentation", ["T70.8", "T70.9"], ["blast lung", "pulmonary barotrauma", "pressure effects"], BLAST_LUNG_AFTERCARE_SUGGESTED_TEXT],
    ["blast_abdominal_observation_v1", "Blast abdominal observation documentation", [], ["blast abdomen", "abdominal blast", "explosion abdominal"], BLAST_ABDOMINAL_OBSERVATION_SUGGESTED_TEXT],
    ["blast_mild_tbi_v1", "Blast mild traumatic brain injury documentation", [], ["blast head injury", "blast concussion", "explosion head injury"], BLAST_MILD_TBI_SUGGESTED_TEXT],
    ["blast_fragment_wound_v1", "Blast fragment wound documentation", [], ["fragment", "shrapnel", "explosion fragment"], BLAST_FRAGMENT_WOUND_SUGGESTED_TEXT],
    ["blast_burn_aftercare_v1", "Blast burn aftercare documentation", [], ["explosion burn", "blast burn"], BLAST_BURN_AFTERCARE_SUGGESTED_TEXT],
    ["blast_crush_aftercare_v1", "Blast crush aftercare documentation", [], ["blast crush", "explosion crush", "entrapment"], BLAST_CRUSH_AFTERCARE_SUGGESTED_TEXT],
    ["post_structural_collapse_v1", "Post structural collapse documentation", ["T71.21"], ["building collapse", "cave-in", "ensevelissement"], POST_STRUCTURAL_COLLAPSE_SUGGESTED_TEXT],
    ["polytrauma_followup_v1", "Polytrauma follow-up documentation", ["T07", "T79.4"], ["polytrauma", "multiple trauma", "multisystem"], POLYTRAUMA_FOLLOWUP_SUGGESTED_TEXT],
    ["blast_injury_minor_v1", "Minor blast injury documentation", ["W35", "W36", "W37", "W38", "W39", "W40", "X75", "X96", "Y25", "Y35", "Y36", "Y37", "Y38", "V"], ["explosion", "firework", "blasting material"], BLAST_INJURY_MINOR_SUGGESTED_TEXT],
    ["cervical_strain_v1", "Cervical strain discharge documentation", [], ["cervical muscle strain"], SPINE_CERVICAL_STRAIN_SUGGESTED_TEXT],
    ["thoracic_strain_v1", "Thoracic strain discharge documentation", [], ["thoracic strain"], SPINE_THORACIC_STRAIN_SUGGESTED_TEXT],
    ["lumbar_strain_v1", "Lumbar strain discharge documentation", [], ["lumbar muscle strain"], SPINE_LUMBAR_STRAIN_SUGGESTED_TEXT],
    ["acute_mechanical_back_pain_v1", "Mechanical back pain discharge documentation", [], ["mechanical back pain"], SPINE_MECHANICAL_BACK_PAIN_SUGGESTED_TEXT],
    ["cervical_radiculopathy_v1", "Cervical radiculopathy discharge documentation", ["M54.12"], ["cervical radiculopathy"], SPINE_CERVICAL_RADICULOPATHY_SUGGESTED_TEXT],
    ["lumbar_radiculopathy_sciatica_v1", "Lumbar radiculopathy / sciatica discharge documentation", ["M54.1", "M54.3", "M54.4"], ["lumbar radiculopathy", "sciatica"], SPINE_LUMBAR_RADICULOPATHY_SCIATICA_SUGGESTED_TEXT],
    ["disc_herniation_conservative_v1", "Disc herniation discharge documentation", ["M50", "M51"], ["disc herniation", "herniated disc"], SPINE_DISC_HERNIATION_SUGGESTED_TEXT],
    ["spinal_stenosis_v1", "Spinal stenosis discharge documentation", ["M48"], ["spinal stenosis"], SPINE_STENOSIS_SUGGESTED_TEXT],
    ["vertebral_compression_fracture_v1", "Vertebral compression fracture discharge documentation", [], ["vertebral compression fracture"], SPINE_VERTEBRAL_COMPRESSION_FRACTURE_SUGGESTED_TEXT],
    ["stable_vertebral_fracture_followup_v1", "Stable vertebral fracture follow-up documentation", [], ["stable vertebral fracture"], SPINE_STABLE_VERTEBRAL_FRACTURE_SUGGESTED_TEXT],
    ["post_spinal_trauma_evaluation_v1", "Post spinal trauma evaluation documentation", ["S14", "S24", "S34"], ["spinal trauma", "spinal cord injury"], SPINE_POST_TRAUMA_EVALUATION_SUGGESTED_TEXT],
    ["post_caudal_red_flag_evaluation_v1", "Post cauda red-flag evaluation documentation", ["G83.4"], ["cauda equina"], SPINE_POST_CAUDA_RED_FLAG_EVALUATION_SUGGESTED_TEXT],
    ["spinal_infection_followup_v1", "Spinal infection follow-up documentation", ["G06.1", "M46"], ["spinal infection", "epidural abscess", "discitis", "vertebral osteomyelitis"], SPINE_INFECTION_FOLLOWUP_SUGGESTED_TEXT],
  ].map((row) => {
    const [id, title, icdFamily, keyword, suggestedText] = row as [
      string,
      string,
      string[],
      string[],
      ProviderDischargeTemplateSuggestedText,
    ];
    return ({
    id,
    version: "1.0.0",
    title,
    ...TRAUMA_MSK_TEMPLATE_GOVERNANCE,
    specialtyCategory: "emergency_medicine" as const,
    riskCategory: "moderate_to_high" as const,
    diagnosisMappings: { icdFamily, keyword },
    sourceReferences: [{ label: "MedlinePlus — Injuries and wounds", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp(`blast-${id}`, "PRIMARY_CARE", ED_DEFAULT_PCP_FOLLOW_UP_TIMING_OR_DIRECTED)],
      suggestedText,
    });
  }),
  {
    id: "corneal_abrasion_v1", version: "1.0.0", title: "Corneal abrasion discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE,
    // S05.0 only — H16.1 is superficial keratitis (a different clinical entity, and H16.13 photokeratitis is
    // already owned by photokeratitis_v1); use keywords to also catch abrasion documented without an S05.0 code.
    diagnosisMappings: { icdFamily: ["S05.0"], keyword: ["corneal abrasion", "abrasion cornéenne", "scratched eye"] },
    sourceReferences: [{ label: "MedlinePlus — Eye injuries", url: "https://medlineplus.gov/eyeinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-abrasion-oph", "OPHTHALMOLOGY", "within 24–48 hours or as directed")], suggestedText: CORNEAL_ABRASION_V1_SUGGESTED_TEXT,
  },
  {
    id: "corneal_foreign_body_v1", version: "1.0.0", title: "Corneal foreign body discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE,
    // Keyword-only: T15 (all eye foreign body codes, including T15.0 corneal) is already owned by
    // trauma_msk_foreign_body_eye_v1 (Phase pre-11); this avoids duplicate/competing ICD ownership.
    diagnosisMappings: { keyword: ["foreign body in cornea"] },
    sourceReferences: [{ label: "MedlinePlus — Eye injuries", url: "https://medlineplus.gov/eyeinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-cfb-oph", "OPHTHALMOLOGY", "within 24 hours or as directed")], suggestedText: CORNEAL_FOREIGN_BODY_V1_SUGGESTED_TEXT,
  },
  {
    id: "post_ocular_foreign_body_removal_v1", version: "1.0.0", title: "Post ocular foreign body removal discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { keyword: ["post ocular foreign body removal", "after corneal foreign body removal", "retrait de corps étranger oculaire"] },
    sourceReferences: [{ label: "MedlinePlus — Eye injuries", url: "https://medlineplus.gov/eyeinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-postfbr-oph", "OPHTHALMOLOGY", "within 24–48 hours or as directed")], suggestedText: POST_OCULAR_FOREIGN_BODY_REMOVAL_V1_SUGGESTED_TEXT,
  },
  {
    id: "photokeratitis_v1", version: "1.0.0", title: "Photokeratitis discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["H16.13"], keyword: ["photokeratitis", "welder's flash", "uv keratitis", "snow blindness", "arc eye"] },
    sourceReferences: [{ label: "MedlinePlus — Eye injuries", url: "https://medlineplus.gov/eyeinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-pk-pcp", "PRIMARY_CARE", "within 48–72 hours or as directed")], suggestedText: PHOTOKERATITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "corneal_ulcer_followup_v1", version: "1.0.0", title: "Corneal ulcer follow-up discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "moderate_to_high",
    diagnosisMappings: { icdFamily: ["H16.0"], keyword: ["corneal ulcer", "microbial keratitis"] },
    sourceReferences: [{ label: "MedlinePlus — Eye infections", url: "https://medlineplus.gov/eyeinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-ulcer-oph", "OPHTHALMOLOGY", "within 24 hours or as directed")], suggestedText: CORNEAL_ULCER_FOLLOWUP_V1_SUGGESTED_TEXT,
  },
  {
    id: "chemical_eye_injury_v1", version: "1.0.0", title: "Chemical eye injury discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "moderate_to_high",
    // Keyword-only: T26 chemical/thermal eye burn ICD prefixes are already owned by burn_eye_v1 / burn_chemical_v1 (Phase 10); this avoids duplicate ICD ownership.
    diagnosisMappings: { keyword: ["chemical eye injury", "eye irrigation aftercare", "alkali eye exposure", "acid eye exposure"] },
    sourceReferences: [{ label: "MedlinePlus — Eye injuries", url: "https://medlineplus.gov/eyeinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-chem-oph", "OPHTHALMOLOGY", "within 24 hours or as directed")], suggestedText: CHEMICAL_EYE_INJURY_V1_SUGGESTED_TEXT,
  },
  {
    id: "traumatic_iritis_v1", version: "1.0.0", title: "Traumatic iritis discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { keyword: ["traumatic iritis", "traumatic iridocyclitis"] },
    sourceReferences: [{ label: "MedlinePlus — Eye injuries", url: "https://medlineplus.gov/eyeinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-tirit-oph", "OPHTHALMOLOGY", "within 24–48 hours or as directed")], suggestedText: TRAUMATIC_IRITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "hyphema_followup_v1", version: "1.0.0", title: "Hyphema follow-up discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "moderate_to_high",
    diagnosisMappings: { icdFamily: ["H21.0"], keyword: ["hyphema follow-up"] },
    sourceReferences: [{ label: "MedlinePlus — Eye injuries", url: "https://medlineplus.gov/eyeinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-hyphema-oph", "OPHTHALMOLOGY", "within 24 hours or as directed")], suggestedText: HYPHEMA_FOLLOWUP_V1_SUGGESTED_TEXT,
  },
  {
    id: "open_globe_post_acute_v1", version: "1.0.0", title: "Open globe post-acute discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ["S05.2", "S05.3"], keyword: ["open globe", "globe rupture", "ruptured globe"] },
    sourceReferences: [{ label: "MedlinePlus — Eye injuries", url: "https://medlineplus.gov/eyeinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-globe-oph", "OPHTHALMOLOGY", "urgent — within 24 hours or as directed")], suggestedText: OPEN_GLOBE_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "acute_glaucoma_followup_v1", version: "1.0.0", title: "Acute glaucoma follow-up discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "high",
    // H40.21 (Acute angle-closure glaucoma) only — H40.22/H40.23/H40.24 are chronic/intermittent/residual
    // angle-closure glaucoma, which are not acute emergencies and should not route to this template.
    diagnosisMappings: { icdFamily: ["H40.21"], keyword: ["acute angle-closure glaucoma", "angle closure glaucoma"] },
    sourceReferences: [{ label: "MedlinePlus — Glaucoma", url: "https://medlineplus.gov/glaucoma.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-glaucoma-oph", "OPHTHALMOLOGY", "urgent — within 24 hours or as directed")], suggestedText: ACUTE_GLAUCOMA_FOLLOWUP_V1_SUGGESTED_TEXT,
  },
  {
    id: "retinal_detachment_followup_v1", version: "1.0.0", title: "Retinal detachment follow-up discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "high",
    // H33.0/H33.2/H33.4/H33.8 (actual detachment codes) only — H33.1x retinoschisis/retinal cysts and
    // H33.3x retinal breaks without detachment are different entities and are intentionally excluded.
    diagnosisMappings: { icdFamily: ["H33.0", "H33.2", "H33.4", "H33.8"], keyword: ["retinal detachment"] },
    sourceReferences: [{ label: "MedlinePlus — Retinal disorders", url: "https://medlineplus.gov/retinaldisorders.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-rd-oph", "OPHTHALMOLOGY", "urgent — within 24 hours or as directed")], suggestedText: RETINAL_DETACHMENT_FOLLOWUP_V1_SUGGESTED_TEXT,
  },
  {
    id: "vitreous_hemorrhage_v1", version: "1.0.0", title: "Vitreous hemorrhage discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "moderate_to_high",
    diagnosisMappings: { icdFamily: ["H43.1"], keyword: ["vitreous hemorrhage"] },
    sourceReferences: [{ label: "MedlinePlus — Retinal disorders", url: "https://medlineplus.gov/retinaldisorders.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-vh-oph", "OPHTHALMOLOGY", "within 24–48 hours or as directed")], suggestedText: VITREOUS_HEMORRHAGE_V1_SUGGESTED_TEXT,
  },
  {
    id: "orbital_cellulitis_followup_v1", version: "1.0.0", title: "Orbital cellulitis follow-up discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ["H05.01"], keyword: ["orbital cellulitis"] },
    sourceReferences: [{ label: "MedlinePlus — Eye infections", url: "https://medlineplus.gov/eyeinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-orbcell-oph", "OPHTHALMOLOGY", "urgent — within 24 hours or as directed")], suggestedText: ORBITAL_CELLULITIS_FOLLOWUP_V1_SUGGESTED_TEXT,
  },
  {
    id: "preseptal_cellulitis_v1", version: "1.0.0", title: "Preseptal cellulitis discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "moderate_to_high",
    // L03.213 "Periorbital cellulitis" only — L03.211/L03.212 are face cellulitis/lymphangitis, not preseptal.
    diagnosisMappings: { icdFamily: ["L03.213"], keyword: ["preseptal cellulitis", "periorbital cellulitis"] },
    sourceReferences: [{ label: "MedlinePlus — Eye infections", url: "https://medlineplus.gov/eyeinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-presep-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: PRESEPTAL_CELLULITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "uveitis_iritis_v1", version: "1.0.0", title: "Uveitis/iritis discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["H20"], keyword: ["uveitis", "iritis", "iridocyclitis"] },
    sourceReferences: [{ label: "MedlinePlus — Eye diseases", url: "https://medlineplus.gov/eyediseases.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-uveitis-oph", "OPHTHALMOLOGY", "within 24–48 hours or as directed")], suggestedText: UVEITIS_IRITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "scleritis_v1", version: "1.0.0", title: "Scleritis discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["H15.0"], keyword: ["scleritis"] },
    sourceReferences: [{ label: "MedlinePlus — Eye diseases", url: "https://medlineplus.gov/eyediseases.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-scleritis-oph", "OPHTHALMOLOGY", "within 24–48 hours or as directed")], suggestedText: SCLERITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "eyelid_laceration_v1", version: "1.0.0", title: "Eyelid laceration discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE, specialtyCategory: "wound_care",
    diagnosisMappings: { icdFamily: ["S01.11", "S01.12"], keyword: ["eyelid laceration", "lid laceration"] },
    sourceReferences: [{ label: "MedlinePlus — Eye injuries", url: "https://medlineplus.gov/eyeinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-lidlac-oph", "OPHTHALMOLOGY", "for suture/staple removal or wound check as directed")], suggestedText: EYELID_LACERATION_V1_SUGGESTED_TEXT,
  },
  {
    id: "canalicular_injury_followup_v1", version: "1.0.0", title: "Canalicular injury follow-up discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "moderate_to_high",
    diagnosisMappings: { keyword: ["canalicular injury", "canalicular laceration", "lacrimal duct injury"] },
    sourceReferences: [{ label: "MedlinePlus — Eye injuries", url: "https://medlineplus.gov/eyeinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-canal-oph", "OPHTHALMOLOGY", "as directed by the specialist who performed repair")], suggestedText: CANALICULAR_INJURY_FOLLOWUP_V1_SUGGESTED_TEXT,
  },
  {
    id: "endophthalmitis_post_acute_v1", version: "1.0.0", title: "Endophthalmitis post-acute discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ["H44.0"], keyword: ["endophthalmitis"] },
    sourceReferences: [{ label: "MedlinePlus — Eye infections", url: "https://medlineplus.gov/eyeinjuries.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-endo-oph", "OPHTHALMOLOGY", "urgent — as directed by ophthalmology")], suggestedText: ENDOPHTHALMITIS_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "crao_crvo_followup_v1", version: "1.0.0", title: "Central retinal artery/vein occlusion follow-up discharge documentation", ...EYE_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "high",
    // H34.1 (central retinal artery occlusion) and H34.81 (central retinal vein occlusion) only —
    // H34.0 (transient), H34.2 (partial/branch artery), and H34.82/H34.83 (venous engorgement/branch vein) are distinct entities.
    diagnosisMappings: { icdFamily: ["H34.1", "H34.81"], keyword: ["central retinal artery occlusion", "central retinal vein occlusion", "crao", "crvo"] },
    sourceReferences: [{ label: "MedlinePlus — Retinal disorders", url: "https://medlineplus.gov/retinaldisorders.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("eye-crao-oph", "OPHTHALMOLOGY", "urgent — within 24 hours or as directed")], suggestedText: CRAO_CRVO_FOLLOWUP_V1_SUGGESTED_TEXT,
  },
  {
    id: "acute_otitis_externa_v1", version: "1.0.0", title: "Acute otitis externa discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE,
    // H60.3 acute infective otitis externa only — H60.2 malignant/necrotizing otitis externa is owned separately.
    diagnosisMappings: { icdFamily: ["H60.3"], keyword: ["otitis externa", "swimmer's ear", "ear canal infection"] },
    sourceReferences: [{ label: "MedlinePlus — Ear infections", url: "https://medlineplus.gov/earinfections.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-aoe-pcp", "PRIMARY_CARE", "within 5–7 days if not improved or as directed")], suggestedText: ACUTE_OTITIS_EXTERNA_V1_SUGGESTED_TEXT,
  },
  {
    id: "malignant_otitis_externa_post_acute_v1", version: "1.0.0", title: "Malignant otitis externa post-acute discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ["H60.2"], keyword: ["malignant otitis externa", "necrotizing otitis externa", "skull base osteomyelitis"] },
    sourceReferences: [{ label: "MedlinePlus — Ear infections", url: "https://medlineplus.gov/earinfections.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-moe-ent", "ENT", "urgent — as directed by ENT/infectious disease")], suggestedText: MALIGNANT_OTITIS_EXTERNA_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "mastoiditis_post_acute_v1", version: "1.0.0", title: "Mastoiditis post-acute discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ["H70"], keyword: ["mastoiditis", "postauricular swelling"] },
    sourceReferences: [{ label: "MedlinePlus — Ear infections", url: "https://medlineplus.gov/earinfections.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-mast-ent", "ENT", "urgent — as directed by ENT")], suggestedText: MASTOIDITIS_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "tm_perforation_v1", version: "1.0.0", title: "Tympanic membrane perforation discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["H72"], keyword: ["tympanic membrane perforation", "perforated eardrum"] },
    sourceReferences: [{ label: "MedlinePlus — Ear disorders", url: "https://medlineplus.gov/eardisorders.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-tmp-ent", "ENT", "within 7–14 days or as directed")], suggestedText: TM_PERFORATION_V1_SUGGESTED_TEXT,
  },
  {
    id: "sudden_hearing_loss_followup_v1", version: "1.0.0", title: "Sudden sensorineural hearing loss follow-up discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ["H91.2"], keyword: ["sudden sensorineural hearing loss", "ssnhl", "sudden hearing loss"] },
    sourceReferences: [{ label: "MedlinePlus — Hearing disorders", url: "https://medlineplus.gov/hearingdisordersanddeafness.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-ssnhl-ent", "ENT", "urgent — within 24–48 hours or as directed")], suggestedText: SUDDEN_HEARING_LOSS_FOLLOWUP_V1_SUGGESTED_TEXT,
  },
  {
    id: "bppv_v1", version: "1.0.0", title: "BPPV discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["H81.10", "H81.11"], keyword: ["benign vertigo", "bppv", "benign paroxysmal positional vertigo"] },
    sourceReferences: [{ label: "MedlinePlus — Dizziness and vertigo", url: "https://medlineplus.gov/dizzinessandvertigo.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-bppv-pcp", "PRIMARY_CARE", "if symptoms persist or as directed")], suggestedText: BPPV_V1_SUGGESTED_TEXT,
  },
  {
    id: "vestibular_neuritis_v1", version: "1.0.0", title: "Vestibular neuritis discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["H81.2"], keyword: ["vestibular neuritis", "acute unilateral vestibulopathy"] },
    sourceReferences: [{ label: "MedlinePlus — Dizziness and vertigo", url: "https://medlineplus.gov/dizzinessandvertigo.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-vn-pcp", "PRIMARY_CARE", "within 1 week if not improving or as directed")], suggestedText: VESTIBULAR_NEURITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "labyrinthitis_v1", version: "1.0.0", title: "Labyrinthitis discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["H83.0"], keyword: ["labyrinthitis"] },
    sourceReferences: [{ label: "MedlinePlus — Dizziness and vertigo", url: "https://medlineplus.gov/dizzinessandvertigo.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-laby-ent", "ENT", "within 1 week or as directed")], suggestedText: LABYRINTHITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "facial_nerve_palsy_v1", version: "1.0.0", title: "Facial nerve (Bell's) palsy discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdExact: ["G51.0"], keyword: ["facial nerve palsy", "bell's palsy", "facial droop"] },
    sourceReferences: [{ label: "MedlinePlus — Bell's palsy", url: "https://medlineplus.gov/bellspalsy.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-fnp-ent", "ENT", "within 3–5 days or as directed")], suggestedText: FACIAL_NERVE_PALSY_V1_SUGGESTED_TEXT,
  },
  {
    id: "ramsay_hunt_followup_v1", version: "1.0.0", title: "Ramsay Hunt syndrome follow-up discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "moderate_to_high",
    diagnosisMappings: { icdExact: ["B02.2"], keyword: ["ramsay hunt", "herpes zoster oticus"] },
    sourceReferences: [{ label: "MedlinePlus — Shingles", url: "https://medlineplus.gov/shingles.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-rh-ent", "ENT", "urgent — as directed by ENT/neurology")], suggestedText: RAMSAY_HUNT_FOLLOWUP_V1_SUGGESTED_TEXT,
  },
  {
    id: "post_nasal_packing_v1", version: "1.0.0", title: "Post nasal packing aftercare discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE,
    // Keyword-only: does not claim R04.0 (owned by epistaxis_v1).
    diagnosisMappings: { keyword: ["nasal packing", "post nasal packing"] },
    sourceReferences: [{ label: "MedlinePlus — Nosebleed", url: "https://medlineplus.gov/nosebleeds.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-pnp-ent", "ENT", "for packing removal as scheduled")], suggestedText: POST_NASAL_PACKING_V1_SUGGESTED_TEXT,
  },
  {
    id: "posterior_epistaxis_post_acute_v1", version: "1.0.0", title: "Posterior epistaxis post-acute discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "high",
    // Keyword-only: higher-risk posterior bleed source, distinct from anterior R04.0 (owned by epistaxis_v1).
    diagnosisMappings: { keyword: ["posterior epistaxis", "posterior nosebleed", "failed anterior packing"] },
    sourceReferences: [{ label: "MedlinePlus — Nosebleed", url: "https://medlineplus.gov/nosebleeds.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-pepa-ent", "ENT", "urgent — as directed by ENT")], suggestedText: POSTERIOR_EPISTAXIS_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "nasal_foreign_body_v1", version: "1.0.0", title: "Nasal foreign body discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE,
    // Keyword-only: T17.0/T17.1 already owned by trauma_msk_foreign_body_ear_nose_v1.
    diagnosisMappings: { keyword: ["nasal foreign body", "foreign body in the nose", "object in the nostril"] },
    sourceReferences: [{ label: "MedlinePlus — Foreign object in nose", url: "https://medlineplus.gov/ency/article/000047.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-nfb-pcp", "PRIMARY_CARE", "if symptoms persist or as directed")], suggestedText: NASAL_FOREIGN_BODY_V1_SUGGESTED_TEXT,
  },
  {
    id: "peritonsillar_abscess_post_drainage_v1", version: "1.0.0", title: "Peritonsillar abscess post-drainage discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ["J36"], keyword: ["peritonsillar abscess", "quinsy"] },
    sourceReferences: [{ label: "MedlinePlus — Tonsillitis", url: "https://medlineplus.gov/tonsillitis.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-pta-ent", "ENT", "within 24–48 hours or as directed")], suggestedText: PERITONSILLAR_ABSCESS_POST_DRAINAGE_V1_SUGGESTED_TEXT,
  },
  {
    id: "deep_neck_infection_post_acute_v1", version: "1.0.0", title: "Deep neck space infection post-acute discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ["J39.0"], keyword: ["retropharyngeal abscess", "parapharyngeal abscess", "deep neck space infection", "prevertebral soft tissue swelling"] },
    sourceReferences: [{ label: "MedlinePlus — Throat disorders", url: "https://medlineplus.gov/throatdisorders.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-dnip-ent", "ENT", "urgent — as directed by ENT/surgery")], suggestedText: DEEP_NECK_INFECTION_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "ludwig_angina_post_acute_v1", version: "1.0.0", title: "Ludwig's angina post-acute discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ["K12.2"], keyword: ["ludwig's angina", "ludwig angina", "bilateral submandibular swelling", "floor of mouth swelling"] },
    sourceReferences: [{ label: "MedlinePlus — Mouth disorders", url: "https://medlineplus.gov/mouthdisorders.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-la-ent", "ENT", "urgent — as directed by ENT/oral surgery")], suggestedText: LUDWIG_ANGINA_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "epiglottitis_post_acute_v1", version: "1.0.0", title: "Epiglottitis post-acute discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE, riskCategory: "high",
    // J05.1 is longer/more specific than the broader J05 pediatric_respiratory (J05.0 croup) prefix.
    diagnosisMappings: { icdFamily: ["J05.1"], keyword: ["epiglottitis", "thumbprint sign"] },
    sourceReferences: [{ label: "MedlinePlus — Throat disorders", url: "https://medlineplus.gov/throatdisorders.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-epig-ent", "ENT", "urgent — as directed by ENT")], suggestedText: EPIGLOTTITIS_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "sialadenitis_v1", version: "1.0.0", title: "Sialadenitis discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["K11.2"], keyword: ["sialadenitis", "salivary gland infection"] },
    sourceReferences: [{ label: "MedlinePlus — Salivary gland disorders", url: "https://medlineplus.gov/salivaryglanddisorders.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-sial-pcp", "PRIMARY_CARE", "within 5–7 days if not improved or as directed")], suggestedText: SIALADENITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "salivary_obstruction_v1", version: "1.0.0", title: "Salivary duct obstruction discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["K11.5"], keyword: ["sialolithiasis", "salivary duct obstruction", "salivary stone"] },
    sourceReferences: [{ label: "MedlinePlus — Salivary gland disorders", url: "https://medlineplus.gov/salivaryglanddisorders.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-salob-ent", "ENT", "within 7–14 days if not resolved or as directed")], suggestedText: SALIVARY_OBSTRUCTION_V1_SUGGESTED_TEXT,
  },
  {
    id: "throat_foreign_body_followup_v1", version: "1.0.0", title: "Throat foreign body follow-up discharge documentation", ...ENT_EMERGENCY_TEMPLATE_GOVERNANCE,
    // Keyword-only: T17.2/T18.1 already owned by trauma_msk_foreign_body_aspirated_v1 / trauma_msk_foreign_body_ingested_v1.
    diagnosisMappings: { keyword: ["throat foreign body", "fish bone", "food bolus impaction"] },
    sourceReferences: [{ label: "MedlinePlus — Foreign object swallowed or inhaled", url: "https://medlineplus.gov/ency/article/000047.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("ent-tfb-pcp", "PRIMARY_CARE", "if symptoms persist or as directed")], suggestedText: THROAT_FOREIGN_BODY_FOLLOWUP_V1_SUGGESTED_TEXT,
  },
  // Phase 13 — Soft tissue / wound infection discharge templates
  {
    id: "erysipelas_v1", version: "1.0.0", title: "Erysipelas discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["A46"], keyword: ["erysipelas", "érysipèle"] },
    sourceReferences: [{ label: "MedlinePlus — Cellulitis", url: "https://medlineplus.gov/cellulitis.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-erys-pcp", "PRIMARY_CARE", "within 48–72 hours or as directed")], suggestedText: ERYSIPELAS_V1_SUGGESTED_TEXT,
  },
  {
    id: "post_abscess_drainage_v1", version: "1.0.0", title: "Post abscess drainage discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { keyword: ["post abscess drainage", "after incision and drainage", "après drainage d'abcès"] },
    sourceReferences: [{ label: "MedlinePlus — Abscess", url: "https://medlineplus.gov/abscess.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-iad-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: POST_ABSCESS_DRAINAGE_V1_SUGGESTED_TEXT,
  },
  {
    id: "abscess_without_drainage_v1", version: "1.0.0", title: "Abscess without drainage discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["L02"], keyword: ["cutaneous abscess", "skin abscess", "abcès cutané"] },
    sourceReferences: [{ label: "MedlinePlus — Abscess", url: "https://medlineplus.gov/abscess.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-abs-pcp", "PRIMARY_CARE", "within 48–72 hours or as directed")], suggestedText: ABSCESS_WITHOUT_DRAINAGE_V1_SUGGESTED_TEXT,
  },
  {
    id: "furuncle_carbuncle_v1", version: "1.0.0", title: "Furuncle / carbuncle discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { keyword: ["furuncle", "carbuncle", "boil", "furoncle", "anthrax cutané"] },
    sourceReferences: [{ label: "MedlinePlus — Abscess", url: "https://medlineplus.gov/abscess.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-fur-pcp", "PRIMARY_CARE", "within 3–7 days or as directed")], suggestedText: FURUNCLE_CARBUNCLE_V1_SUGGESTED_TEXT,
  },
  {
    id: "felon_post_procedure_v1", version: "1.0.0", title: "Felon post-procedure discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE, riskCategory: "moderate_to_high",
    diagnosisMappings: { keyword: ["felon", "pulp space infection", "panaris pulpaire"] },
    sourceReferences: [{ label: "MedlinePlus — Finger infections", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-felon-hand", "HAND_SURGERY", "within 24–48 hours or as directed")], suggestedText: FELON_POST_PROCEDURE_V1_SUGGESTED_TEXT,
  },
  {
    id: "paronychia_v1", version: "1.0.0", title: "Paronychia discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { keyword: ["paronychia", "paronychie", "nail fold infection"] },
    sourceReferences: [{ label: "MedlinePlus — Nail diseases", url: "https://medlineplus.gov/naildiseases.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-paro-pcp", "PRIMARY_CARE", "within 48–72 hours or as directed")], suggestedText: PARONYCHIA_V1_SUGGESTED_TEXT,
  },
  {
    id: "pilonidal_abscess_v1", version: "1.0.0", title: "Pilonidal abscess discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["L05.0"], keyword: ["pilonidal abscess", "abcès pilonidal"] },
    sourceReferences: [{ label: "MedlinePlus — Pilonidal sinus", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-pil-surg", "GENERAL_SURGERY", "within 3–7 days or as directed")], suggestedText: PILONIDAL_ABSCESS_V1_SUGGESTED_TEXT,
  },
  {
    id: "hidradenitis_flare_v1", version: "1.0.0", title: "Hidradenitis flare discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE,
    // Phase 14 note: L73.2 has a single owner (this template). A separate "hidradenitis_suppurativa_v1" was
    // deliberately NOT created — HS is coded L73.2 regardless of acute-flare vs chronic framing, so a second
    // template would require a duplicate icdFamily mapping and fail registry validation. Chronic-HS keywords
    // are added here instead; suggested text already covers chronic long-term management language.
    diagnosisMappings: {
      icdFamily: ["L73.2"],
      keyword: ["hidradenitis", "hidradénite", "hidrosadénite", "hidradenitis suppurativa", "chronic hidradenitis suppurativa", "hidradénite suppurée chronique"],
    },
    sourceReferences: [{ label: "MedlinePlus — Hidradenitis", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-hs-derm", "DERMATOLOGY", "within 3–7 days or as directed")], suggestedText: HIDRADENITIS_FLARE_V1_SUGGESTED_TEXT,
  },
  {
    id: "postoperative_wound_infection_v1", version: "1.0.0", title: "Postoperative wound infection discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE, riskCategory: "moderate_to_high",
    diagnosisMappings: { icdFamily: ["T81.4"], keyword: ["surgical site infection", "postoperative wound infection", "infection du site opératoire"] },
    sourceReferences: [{ label: "MedlinePlus — After surgery", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-ssi-surg", "GENERAL_SURGERY", "within 24–48 hours or as directed")], suggestedText: POSTOPERATIVE_WOUND_INFECTION_V1_SUGGESTED_TEXT,
  },
  {
    id: "wound_dehiscence_post_acute_v1", version: "1.0.0", title: "Wound dehiscence post-acute discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ["T81.3"], keyword: ["wound dehiscence", "déhiscence de plaie", "surgical wound disruption"] },
    sourceReferences: [{ label: "MedlinePlus — After surgery", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-deh-surg", "GENERAL_SURGERY", "urgent / as directed")], suggestedText: WOUND_DEHISCENCE_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "diabetic_foot_infection_v1", version: "1.0.0", title: "Diabetic foot infection discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ["E11.62"], keyword: ["diabetic foot infection", "infected diabetic foot ulcer", "infection du pied diabétique"] },
    sourceReferences: [{ label: "MedlinePlus — Diabetic foot", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-dfi-pod", "PODIATRY", "within 24–48 hours or as directed")], suggestedText: DIABETIC_FOOT_INFECTION_V1_SUGGESTED_TEXT,
  },
  {
    id: "infected_ulcer_v1", version: "1.0.0", title: "Infected ulcer discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE, riskCategory: "moderate_to_high",
    diagnosisMappings: { keyword: ["infected ulcer", "infected venous ulcer", "infected pressure ulcer", "ulcère infecté", "escarre infectée"] },
    sourceReferences: [{ label: "MedlinePlus — Pressure sores", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-ulc-wc", "WOUND_CARE", "within 48–72 hours or as directed")], suggestedText: INFECTED_ULCER_V1_SUGGESTED_TEXT,
  },
  {
    id: "septic_bursitis_v1", version: "1.0.0", title: "Septic bursitis discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE, riskCategory: "moderate_to_high",
    diagnosisMappings: { icdFamily: ["M71.1"], keyword: ["septic bursitis", "infective bursitis", "bursite septique"] },
    sourceReferences: [{ label: "MedlinePlus — Bursitis", url: "https://medlineplus.gov/bursitis.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-burs-ortho", "ORTHOPEDICS", "within 24–48 hours or as directed")], suggestedText: SEPTIC_BURSITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "deep_hand_infection_post_acute_v1", version: "1.0.0", title: "Deep hand infection post-acute discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { keyword: ["deep space hand infection", "deep palmar space infection", "infection profonde de la main"] },
    sourceReferences: [{ label: "MedlinePlus — Hand injuries", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-dhi-hand", "HAND_SURGERY", "urgent / as directed")], suggestedText: DEEP_HAND_INFECTION_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "flexor_tenosynovitis_post_acute_v1", version: "1.0.0", title: "Flexor tenosynovitis post-acute discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE, riskCategory: "high",
    // Keyword-only aftercare; M65.1 / "flexor tenosynovitis" remain owned by high_risk_hand_wound_v1.
    diagnosisMappings: { keyword: ["infectious flexor tenosynovitis aftercare", "ténosynovite infectieuse des fléchisseurs post-aiguë"] },
    sourceReferences: [{ label: "MedlinePlus — Hand injuries", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-fts-hand", "HAND_SURGERY", "urgent / as directed")], suggestedText: FLEXOR_TENOSYNOVITIS_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "necrotizing_soft_tissue_infection_post_acute_v1", version: "1.0.0", title: "Necrotizing soft tissue infection post-acute discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ["M72.6", "A48.0", "N49.3"], keyword: ["necrotizing fasciitis", "necrotizing soft tissue infection", "gas gangrene", "fournier gangrene", "fasciite nécrosante"] },
    sourceReferences: [{ label: "MedlinePlus — Necrotizing soft tissue infection", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-nsti-surg", "GENERAL_SURGERY", "urgent / as directed")], suggestedText: NECROTIZING_SOFT_TISSUE_INFECTION_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "pyomyositis_post_acute_v1", version: "1.0.0", title: "Pyomyositis post-acute discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ["M60.0"], keyword: ["pyomyositis", "infective myositis", "pyomyosite"] },
    sourceReferences: [{ label: "MedlinePlus — Muscle disorders", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-pyo-surg", "GENERAL_SURGERY", "urgent / as directed")], suggestedText: PYOMYOSITIS_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "water_exposed_wound_infection_v1", version: "1.0.0", title: "Water-exposed wound infection discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE, riskCategory: "moderate_to_high",
    diagnosisMappings: { keyword: ["water exposed wound infection", "saltwater wound infection", "freshwater wound infection", "infection de plaie exposée à l'eau"] },
    sourceReferences: [{ label: "MedlinePlus — Wounds", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-h2o-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: WATER_EXPOSED_WOUND_INFECTION_V1_SUGGESTED_TEXT,
  },
  {
    id: "foreign_body_associated_infection_v1", version: "1.0.0", title: "Foreign-body-associated infection discharge documentation", ...SOFT_TISSUE_WOUND_INFECTION_TEMPLATE_GOVERNANCE, riskCategory: "moderate_to_high",
    diagnosisMappings: { keyword: ["foreign body wound infection", "infected retained foreign body", "infection associée à un corps étranger"] },
    sourceReferences: [{ label: "MedlinePlus — Foreign body", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("sti-fbi-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: FOREIGN_BODY_ASSOCIATED_INFECTION_V1_SUGGESTED_TEXT,
  },
  // Phase 14 — Dermatology discharge templates (Commit 2). Allergic/inflammatory, infectious (bacterial/viral/fungal/parasitic),
  // and high-risk post-acute (SJS/TEN, DRESS, bullous, ophthalmic zoster) discharge documentation. Preserves Phase 13
  // soft tissue ownership of L02/L03/A46/NSTI and allergy ownership of L50 urticaria/anaphylaxis (allergic_reaction_v1).
  {
    id: "allergic_contact_dermatitis_v1", version: "1.0.0", title: "Allergic contact dermatitis discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["L23"], keyword: ["allergic contact dermatitis", "poison ivy dermatitis", "poison oak dermatitis", "dermite de contact allergique"] },
    sourceReferences: [{ label: "MedlinePlus — Contact dermatitis", url: "https://medlineplus.gov/contactdermatitis.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-acd-pcp", "PRIMARY_CARE", "within 1 week or as directed")], suggestedText: ALLERGIC_CONTACT_DERMATITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "irritant_contact_dermatitis_v1", version: "1.0.0", title: "Irritant contact dermatitis discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["L24"], keyword: ["irritant contact dermatitis", "dermite de contact irritative"] },
    sourceReferences: [{ label: "MedlinePlus — Contact dermatitis", url: "https://medlineplus.gov/contactdermatitis.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-icd-pcp", "PRIMARY_CARE", "within 1 week or as directed")], suggestedText: IRRITANT_CONTACT_DERMATITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "atopic_dermatitis_v1", version: "1.0.0", title: "Atopic dermatitis discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["L20"], keyword: ["atopic dermatitis", "eczema flare", "dermatite atopique"] },
    sourceReferences: [{ label: "MedlinePlus — Atopic dermatitis", url: "https://medlineplus.gov/eczema.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-ad-pcp", "PRIMARY_CARE", "within 1 week or as directed")], suggestedText: ATOPIC_DERMATITIS_V1_SUGGESTED_TEXT,
  },
  {
    // Keyword-only: L50 (urticaria) remains fully owned by allergy's allergic_reaction_v1 — no icdFamily here.
    id: "uncomplicated_urticaria_v1", version: "1.0.0", title: "Uncomplicated urticaria discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { keyword: ["uncomplicated urticaria", "chronic urticaria without angioedema", "urticaire non compliquée", "urticaire chronique sans angio-œdème"] },
    sourceReferences: [{ label: "MedlinePlus — Hives", url: "https://medlineplus.gov/hives.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-urt-pcp", "PRIMARY_CARE", "for recurrent or worsening symptoms")], suggestedText: UNCOMPLICATED_URTICARIA_V1_SUGGESTED_TEXT,
  },
  {
    // Excludes L40.1–L40.3 (pustular/acrodermatitis/palmoplantar pustulosis) — high-acuity variants never get routine reassurance.
    id: "psoriasis_flare_v1", version: "1.0.0", title: "Psoriasis flare discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["L40.0", "L40.4", "L40.8", "L40.9"], keyword: ["psoriasis flare", "plaque psoriasis", "guttate psoriasis", "poussée de psoriasis", "psoriasis en plaques"] },
    sourceReferences: [{ label: "MedlinePlus — Psoriasis", url: "https://medlineplus.gov/psoriasis.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-pso-derm", "DERMATOLOGY", "within 1 week or as directed")], suggestedText: PSORIASIS_FLARE_V1_SUGGESTED_TEXT,
  },
  {
    id: "rosacea_v1", version: "1.0.0", title: "Rosacea discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["L71"], keyword: ["rosacea", "rosacée"] },
    sourceReferences: [{ label: "MedlinePlus — Rosacea", url: "https://medlineplus.gov/rosacea.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-ros-derm", "DERMATOLOGY", "within 2 weeks or as directed")], suggestedText: ROSACEA_V1_SUGGESTED_TEXT,
  },
  {
    id: "impetigo_v1", version: "1.0.0", title: "Impetigo discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["L01"], keyword: ["impetigo", "impétigo"] },
    sourceReferences: [{ label: "MedlinePlus — Impetigo", url: "https://medlineplus.gov/impetigo.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-imp-pcp", "PRIMARY_CARE", "within 48–72 hours or as directed")], suggestedText: IMPETIGO_V1_SUGGESTED_TEXT,
  },
  {
    // L73.9 (follicular disorder, unspecified) — does not overlap with hidradenitis_flare_v1's more specific L73.2 mapping.
    id: "folliculitis_v1", version: "1.0.0", title: "Folliculitis discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["L73.9"], keyword: ["folliculitis", "folliculite"] },
    sourceReferences: [{ label: "MedlinePlus — Folliculitis", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-fol-pcp", "PRIMARY_CARE", "within 3–7 days or as directed")], suggestedText: FOLLICULITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "herpes_simplex_v1", version: "1.0.0", title: "Herpes simplex discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["B00"], keyword: ["herpes simplex", "cold sore", "oral herpes", "genital herpes", "herpès simplex", "herpès labial", "herpès génital"] },
    sourceReferences: [{ label: "MedlinePlus — Herpes simplex", url: "https://medlineplus.gov/herpessimplex.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-hsv-pcp", "PRIMARY_CARE", "if symptoms persist or as directed")], suggestedText: HERPES_SIMPLEX_V1_SUGGESTED_TEXT,
  },
  {
    // icdFamily B02 catches all zoster except B02.2 (icdExact — Ramsay Hunt/ENT, checked first) and B02.3 (ophthalmic, longer/more specific prefix wins).
    id: "herpes_zoster_v1", version: "1.0.0", title: "Herpes zoster discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["B02"], keyword: ["herpes zoster", "shingles", "zona"] },
    sourceReferences: [{ label: "MedlinePlus — Shingles", url: "https://medlineplus.gov/shingles.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-zos-pcp", "PRIMARY_CARE", "within 3–7 days or as directed")], suggestedText: HERPES_ZOSTER_V1_SUGGESTED_TEXT,
  },
  {
    // B02.3 (zoster ocular disease) — eye-owned continuity template; distinct from B02.2 Ramsay Hunt (ENT) and plain B02 zoster.
    id: "ophthalmic_zoster_post_acute_v1", version: "1.0.0", title: "Ophthalmic zoster post-acute discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ["B02.3"], keyword: ["ophthalmic zoster", "zoster ophthalmicus", "zona ophtalmique"] },
    sourceReferences: [{ label: "MedlinePlus — Shingles", url: "https://medlineplus.gov/shingles.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-ozos-oph", "OPHTHALMOLOGY", "urgent — as directed by ophthalmology")], suggestedText: OPHTHALMIC_ZOSTER_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "varicella_v1", version: "1.0.0", title: "Varicella discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["B01"], keyword: ["varicella", "chickenpox", "varicelle"] },
    sourceReferences: [{ label: "MedlinePlus — Chickenpox", url: "https://medlineplus.gov/chickenpox.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-var-pcp", "PRIMARY_CARE", "if new or worsening symptoms develop")], suggestedText: VARICELLA_V1_SUGGESTED_TEXT,
  },
  {
    id: "molluscum_contagiosum_v1", version: "1.0.0", title: "Molluscum contagiosum discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["B08.1"], keyword: ["molluscum contagiosum", "molluscum contagieux"] },
    sourceReferences: [{ label: "MedlinePlus — Molluscum contagiosum", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-mol-pcp", "PRIMARY_CARE", "within 2 weeks or as directed")], suggestedText: MOLLUSCUM_CONTAGIOSUM_V1_SUGGESTED_TEXT,
  },
  {
    // B08.1 (molluscum, more specific) takes precedence over this broader B08 mapping.
    id: "viral_exanthem_v1", version: "1.0.0", title: "Viral exanthem discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: {
      icdFamily: ["B08", "B05", "B06", "B09"],
      keyword: ["viral exanthem", "measles", "rubella", "roseola", "fifth disease", "hand foot and mouth disease", "exanthème viral", "cinquième maladie", "syndrome pieds-mains-bouche"],
    },
    sourceReferences: [{ label: "MedlinePlus — Rashes", url: "https://medlineplus.gov/rashes.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-vex-pcp", "PRIMARY_CARE", "if rash spreads or concerns develop")], suggestedText: VIRAL_EXANTHEM_V1_SUGGESTED_TEXT,
  },
  {
    id: "pityriasis_rosea_v1", version: "1.0.0", title: "Pityriasis rosea discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["L42"], keyword: ["pityriasis rosea", "pityriasis rosé"] },
    sourceReferences: [{ label: "MedlinePlus — Skin conditions", url: "https://medlineplus.gov/skinconditions.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-pr-pcp", "PRIMARY_CARE", "within 2 weeks or as directed")], suggestedText: PITYRIASIS_ROSEA_V1_SUGGESTED_TEXT,
  },
  {
    id: "tinea_corporis_v1", version: "1.0.0", title: "Tinea corporis discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["B35.4"], keyword: ["tinea corporis", "ringworm body", "tinea du corps", "dermatophytose du corps"] },
    sourceReferences: [{ label: "MedlinePlus — Ringworm", url: "https://medlineplus.gov/ringworm.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-tco-pcp", "PRIMARY_CARE", "within 2 weeks or as directed")], suggestedText: TINEA_CORPORIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "tinea_capitis_v1", version: "1.0.0", title: "Tinea capitis discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["B35.0"], keyword: ["tinea capitis", "ringworm scalp", "tinea du cuir chevelu"] },
    sourceReferences: [{ label: "MedlinePlus — Ringworm", url: "https://medlineplus.gov/ringworm.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-tca-pcp", "PRIMARY_CARE", "within 2 weeks or as directed")], suggestedText: TINEA_CAPITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "tinea_cruris_v1", version: "1.0.0", title: "Tinea cruris discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["B35.6"], keyword: ["tinea cruris", "jock itch", "tinea de l'aine"] },
    sourceReferences: [{ label: "MedlinePlus — Ringworm", url: "https://medlineplus.gov/ringworm.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-tcr-pcp", "PRIMARY_CARE", "within 2 weeks or as directed")], suggestedText: TINEA_CRURIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "tinea_pedis_v1", version: "1.0.0", title: "Tinea pedis discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["B35.3"], keyword: ["tinea pedis", "athlete's foot", "pied d'athlète"] },
    sourceReferences: [{ label: "MedlinePlus — Athlete's foot", url: "https://medlineplus.gov/athletesfoot.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-tpe-pcp", "PRIMARY_CARE", "within 2 weeks or as directed")], suggestedText: TINEA_PEDIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "tinea_versicolor_v1", version: "1.0.0", title: "Tinea versicolor discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["B36.0"], keyword: ["tinea versicolor", "pityriasis versicolor"] },
    sourceReferences: [{ label: "MedlinePlus — Skin conditions", url: "https://medlineplus.gov/skinconditions.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-tve-pcp", "PRIMARY_CARE", "within 2 weeks or as directed")], suggestedText: TINEA_VERSICOLOR_V1_SUGGESTED_TEXT,
  },
  {
    id: "candidal_intertrigo_v1", version: "1.0.0", title: "Candidal intertrigo discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["B37.2"], keyword: ["candidal intertrigo", "yeast skin infection", "intertrigo candidosique"] },
    sourceReferences: [{ label: "MedlinePlus — Candidiasis", url: "https://medlineplus.gov/candidiasis.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-cin-pcp", "PRIMARY_CARE", "within 1 week or as directed")], suggestedText: CANDIDAL_INTERTRIGO_V1_SUGGESTED_TEXT,
  },
  {
    id: "scabies_v1", version: "1.0.0", title: "Scabies discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["B86"], keyword: ["scabies", "gale"] },
    sourceReferences: [{ label: "MedlinePlus — Scabies", url: "https://medlineplus.gov/scabies.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-sca-pcp", "PRIMARY_CARE", "within 2 weeks or as directed")], suggestedText: SCABIES_V1_SUGGESTED_TEXT,
  },
  {
    id: "pediculosis_v1", version: "1.0.0", title: "Pediculosis discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["B85"], keyword: ["pediculosis", "head lice", "body lice", "pédiculose", "poux"] },
    sourceReferences: [{ label: "MedlinePlus — Head lice", url: "https://medlineplus.gov/headlice.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-ped-pcp", "PRIMARY_CARE", "within 2 weeks or as directed")], suggestedText: PEDICULOSIS_V1_SUGGESTED_TEXT,
  },
  {
    // icdFamily L51 excludes L51.1/L51.2/L51.3 by virtue of sjs_ten_post_acute_v1's more specific mapping winning on longest-prefix match.
    id: "erythema_multiforme_v1", version: "1.0.0", title: "Erythema multiforme discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["L51"], keyword: ["erythema multiforme", "érythème polymorphe"] },
    sourceReferences: [{ label: "MedlinePlus — Skin conditions", url: "https://medlineplus.gov/skinconditions.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-em-pcp", "PRIMARY_CARE", "within 1 week or as directed")], suggestedText: ERYTHEMA_MULTIFORME_V1_SUGGESTED_TEXT,
  },
  {
    id: "drug_eruption_v1", version: "1.0.0", title: "Drug eruption (uncomplicated) discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["L27"], keyword: ["drug eruption", "morbilliform drug rash", "exanthematous drug eruption", "éruption médicamenteuse"] },
    sourceReferences: [{ label: "MedlinePlus — Drug reactions", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-drg-pcp", "PRIMARY_CARE", "within 1 week or as directed")], suggestedText: DRUG_ERUPTION_V1_SUGGESTED_TEXT,
  },
  {
    // L51.1 (SJS), L51.2 (TEN), L51.3 (SJS-TEN overlap) — more specific than erythema_multiforme_v1's L51 mapping; overrides drug_eruption_v1's separate L27 range entirely (no shared codes).
    id: "sjs_ten_post_acute_v1", version: "1.0.0", title: "SJS/TEN post-acute discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: {
      icdFamily: ["L51.1", "L51.2", "L51.3"],
      keyword: ["stevens-johnson syndrome post-acute care", "toxic epidermal necrolysis post-acute care", "syndrome de stevens-johnson soins post-aigus", "nécrolyse épidermique toxique soins post-aigus"],
    },
    sourceReferences: [{ label: "MedlinePlus — Stevens-Johnson syndrome", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-sjsten-derm", "DERMATOLOGY", "urgent / as directed")], suggestedText: SJS_TEN_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    // Keyword-only: DRESS has no dedicated ICD-10-CM code; avoids ambiguous overlap with drug_eruption_v1's L27 range.
    id: "dress_post_acute_v1", version: "1.0.0", title: "DRESS syndrome post-acute discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: {
      icdExact: ["D72.12"],
      keyword: ["dress syndrome post-acute care", "drug reaction with eosinophilia and systemic symptoms post-acute", "syndrome dress soins post-aigus"],
    },
    sourceReferences: [{ label: "MedlinePlus — Drug reactions", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-dress-derm", "DERMATOLOGY", "urgent / as directed")], suggestedText: DRESS_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "bullous_disorder_post_acute_v1", version: "1.0.0", title: "Autoimmune bullous disorder post-acute discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: {
      icdFamily: ["L10", "L12"],
      keyword: ["bullous pemphigoid post-acute care", "pemphigus vulgaris post-acute care", "pemphigoïde bulleuse soins post-aigus", "pemphigus vulgaire soins post-aigus"],
    },
    sourceReferences: [{ label: "MedlinePlus — Skin conditions", url: "https://medlineplus.gov/skinconditions.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-bull-derm", "DERMATOLOGY", "within 1 week if not improving or as directed")], suggestedText: BULLOUS_DISORDER_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "cutaneous_vasculitis_followup_v1", version: "1.0.0", title: "Cutaneous vasculitis follow-up discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE, riskCategory: "moderate_to_high",
    diagnosisMappings: { icdFamily: ["L95"], keyword: ["cutaneous vasculitis", "vasculite cutanée"] },
    sourceReferences: [{ label: "MedlinePlus — Vasculitis", url: "https://medlineplus.gov/vasculitis.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-vasc-derm", "DERMATOLOGY", "within 1 week or as directed")], suggestedText: CUTANEOUS_VASCULITIS_FOLLOWUP_V1_SUGGESTED_TEXT,
  },
  {
    // Keyword-only, no ICD — documentation advisory only; never establishes a neoplasm/melanoma diagnosis.
    id: "suspicious_skin_lesion_v1", version: "1.0.0", title: "Suspicious skin lesion discharge documentation", ...DERMATOLOGY_TEMPLATE_GOVERNANCE, riskCategory: "moderate",
    diagnosisMappings: {
      keyword: ["suspicious skin lesion", "irregular pigmented lesion", "changing mole", "non-healing skin lesion", "concern for melanoma", "lésion cutanée suspecte", "grain de beauté suspect", "lésion cutanée non cicatrisante"],
    },
    sourceReferences: [{ label: "MedlinePlus — Skin cancer", url: "https://medlineplus.gov/skincancer.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("derm-lesion-derm", "DERMATOLOGY", "within 2 weeks or as directed")], suggestedText: SUSPICIOUS_SKIN_LESION_V1_SUGGESTED_TEXT,
  },
  // Phase 15 — environmental / exposure discharge templates (Commit 2). Heat illness, cold illness/frostbite,
  // submersion/electrical/lightning, altitude/diving, and radiation. Preserves Phase 5 burn ownership of
  // frostbite (T33-T35, keyword "frostbite"/"gelure"/"cold injury") and electrical burns (T75.4); preserves
  // ENT ownership of otitic/sinus barotrauma (T70.0/T70.1) and blast ownership of blast ear/lung (T70.0/T70.8/T70.9).
  {
    id: "heat_cramps_v1", version: "1.0.0", title: "Heat cramps discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["T67.2"], keyword: ["heat cramp", "heat cramps", "crampe de chaleur", "crampes de chaleur"] },
    sourceReferences: [{ label: "MedlinePlus — Heat illness", url: "https://medlineplus.gov/heatillness.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-heatcramp-pcp", "PRIMARY_CARE", "within 1 week or as directed")], suggestedText: HEAT_CRAMPS_V1_SUGGESTED_TEXT,
  },
  {
    id: "heat_syncope_v1", version: "1.0.0", title: "Heat syncope discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["T67.1"], keyword: ["heat syncope", "syncope de chaleur"] },
    sourceReferences: [{ label: "MedlinePlus — Heat illness", url: "https://medlineplus.gov/heatillness.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-heatsync-pcp", "PRIMARY_CARE", "within 48–72 hours or as directed")], suggestedText: HEAT_SYNCOPE_V1_SUGGESTED_TEXT,
  },
  {
    // icdFamily excludes T67.0 (heatstroke, longer/more specific prefix owned by heat_stroke_post_acute_v1),
    // T67.1 (heat syncope), and T67.2 (heat cramp) — all more specific and win on longest-prefix match.
    id: "heat_exhaustion_v1", version: "1.0.0", title: "Heat exhaustion discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["T67.3", "T67.4", "T67.5", "T67.6", "T67.7", "T67.8", "T67.9"], keyword: ["heat exhaustion", "épuisement par la chaleur", "épuisement dû à la chaleur"] },
    sourceReferences: [{ label: "MedlinePlus — Heat illness", url: "https://medlineplus.gov/heatillness.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-heatexh-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: HEAT_EXHAUSTION_V1_SUGGESTED_TEXT,
  },
  {
    // Keyword-only — no dedicated ICD-10-CM code distinguishes exertional from classic/nonexertional heat
    // exhaustion; avoids ambiguous overlap with heat_exhaustion_v1's T67 range.
    id: "exertional_heat_illness_v1", version: "1.0.0", title: "Exertional heat illness discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { keyword: ["exertional heat illness", "exercise-associated heat illness", "maladie de chaleur d'effort", "maladie de chaleur liée à l'effort"] },
    sourceReferences: [{ label: "MedlinePlus — Heat illness", url: "https://medlineplus.gov/heatillness.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-exheat-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: EXERTIONAL_HEAT_ILLNESS_V1_SUGGESTED_TEXT,
  },
  {
    id: "heat_stroke_post_acute_v1", version: "1.0.0", title: "Heat stroke post-acute discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ["T67.0"], keyword: ["heat stroke post-acute care", "sunstroke post-acute care", "coup de chaleur soins post-aigus"] },
    sourceReferences: [{ label: "MedlinePlus — Heat illness", url: "https://medlineplus.gov/heatillness.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-heatstroke-em", "EMERGENCY_MEDICINE", "urgent / as directed")], suggestedText: HEAT_STROKE_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "mild_hypothermia_v1", version: "1.0.0", title: "Mild hypothermia discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["T68"], keyword: ["mild hypothermia", "hypothermie légère"] },
    sourceReferences: [{ label: "MedlinePlus — Hypothermia", url: "https://medlineplus.gov/ency/article/000038.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-mildhypo-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: MILD_HYPOTHERMIA_V1_SUGGESTED_TEXT,
  },
  {
    // Keyword-only — a single ICD-10-CM code (T68) covers hypothermia regardless of severity; T68 stays
    // mild_hypothermia_v1's default routine mapping, and severity is documentation-driven, not code-driven.
    id: "hypothermia_post_acute_v1", version: "1.0.0", title: "Hypothermia post-acute discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { keyword: ["moderate to severe hypothermia post-acute care", "severe hypothermia post-acute care", "hypothermie modérée à sévère soins post-aigus", "hypothermie sévère soins post-aigus"] },
    sourceReferences: [{ label: "MedlinePlus — Hypothermia", url: "https://medlineplus.gov/ency/article/000038.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-severhypo-em", "EMERGENCY_MEDICINE", "urgent / as directed")], suggestedText: HYPOTHERMIA_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    // Keyword-only, more specific than frostbite_v1's bare "frostbite"/"gelure"/"cold injury" — never reuses
    // those bare terms. frostbite_v1 (Phase 5 burn) keeps icdFamily T33/T34/T35 ownership for general frostbite.
    id: "superficial_frostbite_v1", version: "1.0.0", title: "Superficial frostbite discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { keyword: ["superficial frostbite", "frostnip", "gelure superficielle"] },
    sourceReferences: [{ label: "MedlinePlus — Frostbite", url: "https://medlineplus.gov/ency/article/000057.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-supfrost-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: SUPERFICIAL_FROSTBITE_V1_SUGGESTED_TEXT,
  },
  {
    // Keyword-only, more specific than frostbite_v1's bare "frostbite"/"gelure"/"cold injury" — never reuses
    // those bare terms. frostbite_v1 (Phase 5 burn) keeps icdFamily T33/T34/T35 ownership for general frostbite.
    id: "deep_frostbite_post_acute_v1", version: "1.0.0", title: "Deep frostbite post-acute discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { keyword: ["deep frostbite", "frostbite with tissue necrosis", "gelure profonde", "gelure avec nécrose tissulaire"] },
    sourceReferences: [{ label: "MedlinePlus — Frostbite", url: "https://medlineplus.gov/ency/article/000057.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-deepfrost-surg", "GENERAL_SURGERY", "urgent / as directed")], suggestedText: DEEP_FROSTBITE_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "chilblains_pernio_v1", version: "1.0.0", title: "Chilblains (pernio) discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["T69.1"], keyword: ["chilblains", "pernio", "engelures"] },
    sourceReferences: [{ label: "MedlinePlus — Cold exposure", url: "https://medlineplus.gov/ency/article/000057.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-chilblain-pcp", "PRIMARY_CARE", "within 1 week or as directed")], suggestedText: CHILBLAINS_PERNIO_V1_SUGGESTED_TEXT,
  },
  {
    // T69.02 (immersion foot) only — excludes T69.01 (immersion hand), a distinct body-region entity.
    id: "immersion_foot_v1", version: "1.0.0", title: "Immersion foot discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["T69.02"], keyword: ["immersion foot", "trench foot", "pied d'immersion", "pied des tranchées"] },
    sourceReferences: [{ label: "MedlinePlus — Cold exposure", url: "https://medlineplus.gov/ency/article/000057.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-immfoot-pcp", "PRIMARY_CARE", "within 48–72 hours or as directed")], suggestedText: IMMERSION_FOOT_V1_SUGGESTED_TEXT,
  },
  {
    id: "post_submersion_observation_v1", version: "1.0.0", title: "Post-submersion observation discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["T75.1"], keyword: ["submersion observation", "brief submersion", "near-drowning observation", "observation post-submersion"] },
    sourceReferences: [{ label: "MedlinePlus — Drowning", url: "https://medlineplus.gov/drowning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-postsubm-pcp", "PRIMARY_CARE", "within 24 hours or as directed")], suggestedText: POST_SUBMERSION_OBSERVATION_V1_SUGGESTED_TEXT,
  },
  {
    // Keyword-only — a single ICD-10-CM code (T75.1) covers drowning/submersion effects regardless of
    // severity; T75.1 stays post_submersion_observation_v1's default routine mapping. Never uses "dry
    // drowning" or "secondary drowning" language.
    id: "nonfatal_drowning_post_acute_v1", version: "1.0.0", title: "Nonfatal drowning post-acute discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { keyword: ["nonfatal drowning post-acute care", "drowning aspiration post-acute care", "noyade non mortelle soins post-aigus"] },
    sourceReferences: [{ label: "MedlinePlus — Drowning", url: "https://medlineplus.gov/drowning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-drowningpa-em", "EMERGENCY_MEDICINE", "urgent / as directed")], suggestedText: NONFATAL_DROWNING_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    // Keyword-only — T75.4 stays burn_electrical_v1-owned (tissue-injury phase); differentiated here purely
    // by voltage-specific keywords, never by ICD code.
    id: "low_voltage_electrical_injury_v1", version: "1.0.0", title: "Low-voltage electrical injury discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { keyword: ["low-voltage electrical injury", "low voltage electrical injury", "blessure électrique basse tension"] },
    sourceReferences: [{ label: "MedlinePlus — Electrical injuries", url: "https://medlineplus.gov/ency/article/000030.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-lowvolt-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: LOW_VOLTAGE_ELECTRICAL_INJURY_V1_SUGGESTED_TEXT,
  },
  {
    id: "high_voltage_electrical_injury_post_acute_v1", version: "1.0.0", title: "High-voltage electrical injury post-acute discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { keyword: ["high-voltage electrical injury post-acute care", "high voltage electrical injury post-acute care", "blessure électrique haute tension soins post-aigus"] },
    sourceReferences: [{ label: "MedlinePlus — Electrical injuries", url: "https://medlineplus.gov/ency/article/000030.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-highvoltpa-em", "EMERGENCY_MEDICINE", "urgent / as directed")], suggestedText: HIGH_VOLTAGE_ELECTRICAL_INJURY_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    // T75.0 (effects of lightning) — carved out of burn_electrical_v1 (now T75.4-only). Always uses
    // clinician-directed disposition language per Phase 15 guardrail, even for uncomplicated contact.
    id: "lightning_injury_post_acute_v1", version: "1.0.0", title: "Lightning injury post-acute discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ["T75.0"], keyword: ["lightning injury", "effects of lightning", "foudroiement", "effet de la foudre"] },
    sourceReferences: [{ label: "MedlinePlus — Electrical injuries", url: "https://medlineplus.gov/ency/article/000030.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-lightning-em", "EMERGENCY_MEDICINE", "urgent / as directed")], suggestedText: LIGHTNING_INJURY_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "acute_mountain_sickness_v1", version: "1.0.0", title: "Acute mountain sickness discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["T70.2"], keyword: ["acute mountain sickness", "altitude sickness", "mal des montagnes", "mal aigu des montagnes"] },
    sourceReferences: [{ label: "MedlinePlus — Altitude sickness", url: "https://medlineplus.gov/ency/article/000133.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-ams-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: ACUTE_MOUNTAIN_SICKNESS_V1_SUGGESTED_TEXT,
  },
  {
    // Keyword-only — no dedicated ICD-10-CM code distinguishes HACE from AMS; T70.2 stays
    // acute_mountain_sickness_v1's default routine mapping, and severity is documentation-driven.
    id: "hace_post_acute_v1", version: "1.0.0", title: "HACE post-acute discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { keyword: ["high-altitude cerebral edema post-acute care", "hace post-acute care", "œdème cérébral de haute altitude soins post-aigus"] },
    sourceReferences: [{ label: "MedlinePlus — Altitude sickness", url: "https://medlineplus.gov/ency/article/000133.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-hace-em", "EMERGENCY_MEDICINE", "urgent / as directed")], suggestedText: HACE_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    // Keyword-only — no dedicated ICD-10-CM code distinguishes HAPE from AMS; T70.2 stays
    // acute_mountain_sickness_v1's default routine mapping, and severity is documentation-driven.
    id: "hape_post_acute_v1", version: "1.0.0", title: "HAPE post-acute discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { keyword: ["high-altitude pulmonary edema post-acute care", "hape post-acute care", "œdème pulmonaire de haute altitude soins post-aigus"] },
    sourceReferences: [{ label: "MedlinePlus — Altitude sickness", url: "https://medlineplus.gov/ency/article/000133.htm", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-hape-em", "EMERGENCY_MEDICINE", "urgent / as directed")], suggestedText: HAPE_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    // Keyword-only — never steals T70.0/T70.1 (ENT/blast-owned otitic/sinus barotrauma) or T70.8/T70.9
    // (blast_lung_aftercare_v1's pulmonary-barotrauma mapping). "diving barotrauma" is a unique keyword.
    id: "barotrauma_v1", version: "1.0.0", title: "Diving barotrauma discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { keyword: ["diving barotrauma", "barotraumatisme de plongée"] },
    sourceReferences: [{ label: "MedlinePlus — Diving and undersea medicine", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-baro-pcp", "PRIMARY_CARE", "within 48–72 hours or as directed")], suggestedText: BAROTRAUMA_V1_SUGGESTED_TEXT,
  },
  {
    id: "decompression_illness_post_acute_v1", version: "1.0.0", title: "Decompression illness post-acute discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ["T70.3"], keyword: ["decompression illness post-acute care", "decompression sickness post-acute care", "maladie de décompression soins post-aigus"] },
    sourceReferences: [{ label: "MedlinePlus — Diving and undersea medicine", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-dci-em", "EMERGENCY_MEDICINE", "urgent / as directed")], suggestedText: DECOMPRESSION_ILLNESS_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "radiation_exposure_followup_v1", version: "1.0.0", title: "Radiation exposure follow-up discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["T66"], keyword: ["radiation exposure follow-up", "occupational radiation exposure", "suivi d'exposition aux radiations"] },
    sourceReferences: [{ label: "MedlinePlus — Radiation exposure", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-radexp-pcp", "PRIMARY_CARE", "within 1 week or as directed")], suggestedText: RADIATION_EXPOSURE_FOLLOWUP_V1_SUGGESTED_TEXT,
  },
  {
    // Keyword-only — a single ICD-10-CM code (T66) covers radiation sickness regardless of severity; T66
    // stays radiation_exposure_followup_v1's default routine mapping, and severity is documentation-driven.
    id: "radiation_injury_post_acute_v1", version: "1.0.0", title: "Radiation injury post-acute discharge documentation", ...ENVIRONMENTAL_EXPOSURE_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { keyword: ["radiation injury post-acute care", "acute radiation syndrome post-acute care", "lésion par radiation soins post-aigus", "syndrome d'irradiation aiguë soins post-aigus"] },
    sourceReferences: [{ label: "MedlinePlus — Radiation exposure", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("env-radinjpa-em", "EMERGENCY_MEDICINE", "urgent / as directed")], suggestedText: RADIATION_INJURY_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  // Phase 16 — toxicology / envenomation discharge templates (Commit 2).
  // Preserves BH alcohol_intoxication_v1; preserves T40.x5 adverse-effect ownership on BH opioid aftercare;
  // preserves ordinary animal_bite_v1 for nonvenomous bites; claims T58 CO and T63 envenomation.
  {
    id: "low_risk_toxic_exposure_v1", version: "1.0.0", title: "Low-risk toxic exposure discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { keyword: ['low-risk toxic exposure', 'exposition toxique à faible risque'] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-lowrisk-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: LOW_RISK_TOXIC_EXPOSURE_V1_SUGGESTED_TEXT,
  },
  {
    id: "accidental_ingestion_v1", version: "1.0.0", title: "Accidental ingestion discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { keyword: ['accidental ingestion', 'pediatric accidental ingestion', 'ingestion accidentelle'] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-accing-pcp", "PRIMARY_CARE", "within 24 hours or as directed")], suggestedText: ACCIDENTAL_INGESTION_V1_SUGGESTED_TEXT,
  },
  {
    id: "acetaminophen_exposure_followup_v1", version: "1.0.0", title: "Acetaminophen exposure follow-up discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ['T39.1'], keyword: ['acetaminophen overdose', 'acetaminophen poisoning', 'paracetamol overdose', 'surdosage au paracétamol', 'intoxication au paracétamol'] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-apap-pcp", "PRIMARY_CARE", "within 24 hours or as directed")], suggestedText: ACETAMINOPHEN_EXPOSURE_FOLLOWUP_V1_SUGGESTED_TEXT,
  },
  {
    id: "salicylate_exposure_followup_v1", version: "1.0.0", title: "Salicylate exposure follow-up discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ['T39.0'], keyword: ['salicylate toxicity', 'aspirin overdose', 'toxicité aux salicylates', "surdosage d'aspirine"] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-asa-pcp", "PRIMARY_CARE", "within 24 hours or as directed")], suggestedText: SALICYLATE_EXPOSURE_FOLLOWUP_V1_SUGGESTED_TEXT,
  },
  {
    id: "opioid_overdose_post_observation_v1", version: "1.0.0", title: "Opioid overdose post-observation discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ['T40.0X1', 'T40.0X2', 'T40.0X3', 'T40.0X4', 'T40.1X1', 'T40.1X2', 'T40.1X3', 'T40.1X4', 'T40.2X1', 'T40.2X2', 'T40.2X3', 'T40.2X4', 'T40.4X1', 'T40.4X2', 'T40.4X3', 'T40.4X4'], keyword: ['opioid overdose', 'fentanyl overdose', 'methadone overdose', "surdosage d'opioïde", 'surdosage de fentanyl'] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-opioid-em", "EMERGENCY_MEDICINE", "as directed after observation")], suggestedText: OPIOID_OVERDOSE_POST_OBSERVATION_V1_SUGGESTED_TEXT,
  },
  {
    id: "sedative_overdose_post_observation_v1", version: "1.0.0", title: "Sedative overdose post-observation discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ['T42.4X1', 'T42.4X2', 'T42.4X3', 'T42.4X4'], keyword: ['benzodiazepine overdose', 'sedative overdose', 'surdosage de benzodiazépine', 'surdosage de sédatif'] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-sed-em", "EMERGENCY_MEDICINE", "as directed after observation")], suggestedText: SEDATIVE_OVERDOSE_POST_OBSERVATION_V1_SUGGESTED_TEXT,
  },
  {
    id: "alcohol_withdrawal_post_acute_v1", version: "1.0.0", title: "Alcohol withdrawal post-acute discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ['F10.23'], keyword: ['alcohol withdrawal post-acute care', 'delirium tremens post-acute care', 'sevrage alcoolique soins post-aigus'] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-etohwd-em", "EMERGENCY_MEDICINE", "urgent / as directed")], suggestedText: ALCOHOL_WITHDRAWAL_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "stimulant_intoxication_v1", version: "1.0.0", title: "Stimulant intoxication discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ['F14.12', 'F14.92', 'F15.12', 'F15.92'], keyword: ['cocaine toxicity', 'methamphetamine intoxication', 'stimulant overdose', 'intoxication à la cocaïne', 'intoxication à la méthamphétamine'] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-stim-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: STIMULANT_INTOXICATION_V1_SUGGESTED_TEXT,
  },
  {
    id: "cannabis_intoxication_v1", version: "1.0.0", title: "Cannabis intoxication discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ['F12.12', 'F12.92'], keyword: ['cannabis intoxication', 'synthetic cannabinoid intoxication', 'intoxication au cannabis'] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-cann-pcp", "PRIMARY_CARE", "within 1–2 days or as directed")], suggestedText: CANNABIS_INTOXICATION_V1_SUGGESTED_TEXT,
  },
  {
    id: "unknown_ingestion_post_observation_v1", version: "1.0.0", title: "Unknown ingestion post-observation discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ['T50.901', 'T50.902', 'T50.903', 'T50.904'], keyword: ['unknown ingestion', 'mixed overdose', 'ingestion inconnue', 'surdosage mixte'] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-unk-em", "EMERGENCY_MEDICINE", "as directed after observation")], suggestedText: UNKNOWN_INGESTION_POST_OBSERVATION_V1_SUGGESTED_TEXT,
  },
  {
    id: "carbon_monoxide_post_acute_v1", version: "1.0.0", title: "Carbon monoxide post-acute discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ['T58'], keyword: ['carbon monoxide poisoning', 'intoxication au monoxyde de carbone', 'carbon monoxide post-acute care'] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-co-em", "EMERGENCY_MEDICINE", "urgent / as directed")], suggestedText: CARBON_MONOXIDE_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "caustic_ingestion_post_acute_v1", version: "1.0.0", title: "Caustic ingestion post-acute discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ['T54'], keyword: ['caustic ingestion', 'corrosive ingestion', 'ingestion caustique', 'ingestion corrosive'] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-caustic-em", "EMERGENCY_MEDICINE", "urgent / as directed")], suggestedText: CAUSTIC_INGESTION_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "hydrocarbon_exposure_v1", version: "1.0.0", title: "Hydrocarbon exposure discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ['T52'], keyword: ['hydrocarbon ingestion', 'petroleum product toxicity', "ingestion d'hydrocarbures"] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-hc-pcp", "PRIMARY_CARE", "within 24 hours or as directed")], suggestedText: HYDROCARBON_EXPOSURE_V1_SUGGESTED_TEXT,
  },
  {
    id: "pesticide_exposure_post_acute_v1", version: "1.0.0", title: "Pesticide exposure post-acute discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ['T60'], keyword: ['pesticide poisoning', 'organophosphate poisoning', 'intoxication par pesticide', 'intoxication aux organophosphorés'] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-pest-em", "EMERGENCY_MEDICINE", "urgent / as directed")], suggestedText: PESTICIDE_EXPOSURE_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "methemoglobinemia_post_acute_v1", version: "1.0.0", title: "Methemoglobinemia post-acute discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ['D74.8', 'D74.9'], keyword: ['methemoglobinemia', 'méthémoglobinémie'] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-metHb-em", "EMERGENCY_MEDICINE", "urgent / as directed")], suggestedText: METHEMOGLOBINEMIA_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "snake_envenomation_post_acute_v1", version: "1.0.0", title: "Snake envenomation post-acute discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdFamily: ['T63.0'], keyword: ['snake envenomation', 'venomous snake bite', 'envenimation par serpent', 'morsure de serpent venimeux'] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-snake-em", "EMERGENCY_MEDICINE", "urgent / as directed")], suggestedText: SNAKE_ENVENOMATION_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "spider_envenomation_v1", version: "1.0.0", title: "Spider envenomation discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ['T63.3'], keyword: ['spider envenomation', 'black widow bite', 'brown recluse bite', 'envenimation par araignée', 'morsure de veuve noire'] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-spider-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: SPIDER_ENVENOMATION_V1_SUGGESTED_TEXT,
  },
  {
    id: "scorpion_envenomation_v1", version: "1.0.0", title: "Scorpion envenomation discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ['T63.2'], keyword: ['scorpion sting', 'scorpion envenomation', 'piqûre de scorpion', 'envenimation par scorpion'] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-scorp-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: SCORPION_ENVENOMATION_V1_SUGGESTED_TEXT,
  },
  {
    id: "marine_envenomation_v1", version: "1.0.0", title: "Marine envenomation discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ['T63.5', 'T63.6'], keyword: ['marine envenomation', 'venomous marine injury', 'envenimation marine'] },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-marine-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")], suggestedText: MARINE_ENVENOMATION_V1_SUGGESTED_TEXT,
  },
  {
    id: "poison_control_followup_v1", version: "1.0.0", title: "Poison control follow-up discharge documentation", ...TOXICOLOGY_ENVENOMATION_TEMPLATE_GOVERNANCE,
    diagnosisMappings: {
      icdExact: ["G90.81", "G21.0"],
      // Cardio/CNS agent poisoning + heavy-metal/lithium toxic-effect follow-up (poison-control pathway).
      icdFamily: ["G90.81", "G21.0", "T44.7", "T46.0", "T46.1", "T43.5", "T56.8"],
      keyword: [
        "poison control follow-up",
        "suivi centre antipoison",
        "poison-control follow-up",
        "serotonin syndrome",
        "syndrome sérotoninergique",
        "neuroleptic malignant syndrome",
        "syndrome malin des neuroleptiques",
        "beta blocker overdose",
        "calcium channel blocker overdose",
        "digoxin toxicity",
        "lithium toxicity",
        "surdosage de bêta-bloquant",
        "surdosage d'inhibiteur calcique",
        "toxicité à la digoxine",
        "toxicité au lithium",
      ],
    },
    sourceReferences: [{ label: "MedlinePlus — Poisoning", url: "https://medlineplus.gov/poisoning.html", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("tox-pc-pcp", "PRIMARY_CARE", "as directed by poison control / clinician")], suggestedText: POISON_CONTROL_FOLLOWUP_V1_SUGGESTED_TEXT,
  },
  // Phase 17 — OB/GYN / urology discharge templates (Commit 2).
  // Preserves Batch 7 OB/GYN and Batch 12 urology legacy templates; N49.3 stays Phase 13 NSTI.
  {
    id: "early_pregnancy_bleeding_v1", version: "1.0.0", title: "Early pregnancy bleeding discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: OBGYN_PHASE17_PREGNANCY_BLEEDING_SAFETY,
    diagnosisMappings: { icdFamily: ["O20"], icdExact: ["O20.9"], keyword: ["early pregnancy bleeding","first trimester bleeding","saignement début grossesse"] },
    sourceReferences: [{ label: "MedlinePlus — Obstetric", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-early_pregna", "OBGYN", "within 1–2 days or as directed")], suggestedText: EARLY_PREGNANCY_BLEEDING_V1_SUGGESTED_TEXT,
  },
  {
    id: "pregnancy_unknown_location_v1", version: "1.0.0", title: "Pregnancy of unknown location discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: OBGYN_PHASE17_PREGNANCY_SAFETY,
    diagnosisMappings: { icdExact: ["O02.81"], icdFamily: ["O02.81"], keyword: ["pregnancy of unknown location","PUL","grossesse de localisation inconnue"] },
    sourceReferences: [{ label: "MedlinePlus — Obstetric", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-pregnancy_un", "OBGYN", "within 24–48 hours or as directed")], suggestedText: PREGNANCY_UNKNOWN_LOCATION_V1_SUGGESTED_TEXT,
  },
  {
    id: "threatened_abortion_v1", version: "1.0.0", title: "Threatened abortion discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: OBGYN_PHASE17_PREGNANCY_BLEEDING_SAFETY,
    diagnosisMappings: { icdExact: ["O20.0"], icdFamily: ["O20.0"], keyword: ["threatened abortion","threatened miscarriage","menace d'avortement"] },
    sourceReferences: [{ label: "MedlinePlus — Obstetric", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-threatened_a", "OBGYN", "within 1–2 days or as directed")], suggestedText: THREATENED_ABORTION_V1_SUGGESTED_TEXT,
  },
  {
    id: "early_pregnancy_loss_post_acute_v1", version: "1.0.0", title: "Early pregnancy loss post-acute discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: OBGYN_PHASE17_PREGNANCY_BLEEDING_SAFETY,
    diagnosisMappings: { icdFamily: ["O03"], keyword: ["early pregnancy loss","spontaneous abortion","miscarriage post-acute","fausse couche"] },
    sourceReferences: [{ label: "MedlinePlus — Obstetric", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-early_pregna", "OBGYN", "within 1–3 days or as directed")], suggestedText: EARLY_PREGNANCY_LOSS_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "ectopic_pregnancy_post_acute_v1", version: "1.0.0", title: "Ectopic pregnancy post-acute discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: OBGYN_PHASE17_PREGNANCY_SAFETY,
    diagnosisMappings: { icdExact: ["O00.90","O00.91","O00.00"], icdFamily: ["O00"], keyword: ["ectopic pregnancy post-acute","tubal pregnancy post-acute","grossesse ectopique soins post-aigus"] },
    sourceReferences: [{ label: "MedlinePlus — Obstetric", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-ectopic_preg", "OBGYN", "urgent / as directed")], suggestedText: ECTOPIC_PREGNANCY_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "hyperemesis_gravidarum_v1", version: "1.0.0", title: "Hyperemesis gravidarum discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: OBGYN_PHASE17_PREGNANCY_SAFETY,
    diagnosisMappings: { icdExact: ["O21.9"], icdFamily: ["O21"], keyword: ["hyperemesis gravidarum","excessive vomiting in pregnancy","hyperémèse gravidique"] },
    sourceReferences: [{ label: "MedlinePlus — Obstetric", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-hyperemesis_", "OBGYN", "within 1–3 days or as directed")], suggestedText: HYPEREMESIS_GRAVIDARUM_V1_SUGGESTED_TEXT,
  },
  {
    id: "pregnancy_abdominal_pain_v1", version: "1.0.0", title: "Pregnancy abdominal pain discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: OBGYN_PHASE17_PREGNANCY_SAFETY,
    diagnosisMappings: { icdFamily: ["O26"], keyword: ["pregnancy abdominal pain","pregnancy pelvic pain","douleur abdominale grossesse"] },
    sourceReferences: [{ label: "MedlinePlus — Obstetric", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-pregnancy_ab", "OBGYN", "within 1–2 days or as directed")], suggestedText: PREGNANCY_ABDOMINAL_PAIN_V1_SUGGESTED_TEXT,
  },
  {
    id: "late_pregnancy_bleeding_post_acute_v1", version: "1.0.0", title: "Late pregnancy bleeding post-acute discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: OBGYN_PHASE17_PREGNANCY_BLEEDING_SAFETY,
    diagnosisMappings: { icdFamily: ["O44","O45","O46"], keyword: ["late pregnancy bleeding","antepartum hemorrhage","saignement fin de grossesse"] },
    sourceReferences: [{ label: "MedlinePlus — Obstetric", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-late_pregnan", "OBGYN", "urgent / as directed")], suggestedText: LATE_PREGNANCY_BLEEDING_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "false_labor_v1", version: "1.0.0", title: "False labor discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, obGynSafety: OBGYN_PHASE17_PREGNANCY_SAFETY,
    diagnosisMappings: { icdFamily: ["O47"], keyword: ["false labor","Braxton Hicks","fausse couche de travail","travail spurious"] },
    sourceReferences: [{ label: "MedlinePlus — Obstetric", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-false_labor_", "OBGYN", "within 1–2 days or as directed")], suggestedText: FALSE_LABOR_V1_SUGGESTED_TEXT,
  },
  {
    id: "preterm_labor_post_acute_v1", version: "1.0.0", title: "Preterm labor post-acute discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: OBGYN_PHASE17_PREGNANCY_SAFETY,
    diagnosisMappings: { icdFamily: ["O60"], keyword: ["preterm labor post-acute","premature labor","travail prématuré soins post-aigus"] },
    sourceReferences: [{ label: "MedlinePlus — Obstetric", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-preterm_labo", "OBGYN", "urgent / as directed")], suggestedText: PRETERM_LABOR_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "rupture_of_membranes_post_acute_v1", version: "1.0.0", title: "Rupture of membranes post-acute discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: OBGYN_PHASE17_PREGNANCY_SAFETY,
    diagnosisMappings: { icdFamily: ["O42"], keyword: ["rupture of membranes","PROM","rupture prématurée des membranes"] },
    sourceReferences: [{ label: "MedlinePlus — Obstetric", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-rupture_of_m", "OBGYN", "urgent / as directed")], suggestedText: RUPTURE_OF_MEMBRANES_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "hypertensive_pregnancy_post_acute_v1", version: "1.0.0", title: "Hypertensive pregnancy post-acute discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: OBGYN_PHASE17_PREGNANCY_SAFETY,
    diagnosisMappings: { icdExact: ["O14.00","O14.10","O14.20"], icdFamily: ["O11","O12","O13","O14","O15"], keyword: ["preeclampsia post-acute","HELLP post-acute","hypertensive disorder of pregnancy","prééclampsie soins post-aigus"] },
    sourceReferences: [{ label: "MedlinePlus — Obstetric", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-hypertensive", "OBGYN", "urgent — within 24–48 hours or as directed")], suggestedText: HYPERTENSIVE_PREGNANCY_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "postpartum_bleeding_post_acute_v1", version: "1.0.0", title: "Postpartum bleeding post-acute discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: { requiresBleedingPrecautions: true, requiresOBGynFollowUp: true },
    diagnosisMappings: { icdExact: ["O72.1"], icdFamily: ["O72"], keyword: ["postpartum hemorrhage post-acute","postpartum bleeding","hémorragie post-partum"] },
    sourceReferences: [{ label: "MedlinePlus — Obstetric", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-postpartum_b", "OBGYN", "urgent / as directed")], suggestedText: POSTPARTUM_BLEEDING_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "postpartum_endometritis_v1", version: "1.0.0", title: "Postpartum endometritis discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: OBGYN_PHASE17_ROUTINE_SAFETY,
    diagnosisMappings: { icdExact: ["O86.12"], icdFamily: ["O86.1"], keyword: ["postpartum endometritis","endometritis following delivery","endométrite post-partum"] },
    sourceReferences: [{ label: "MedlinePlus — Obstetric", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-postpartum_e", "OBGYN", "within 1–3 days or as directed")], suggestedText: POSTPARTUM_ENDOMETRITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "postpartum_hypertension_v1", version: "1.0.0", title: "Postpartum hypertension discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: OBGYN_PHASE17_ROUTINE_SAFETY,
    diagnosisMappings: { icdExact: ["O90.3"], icdFamily: ["O10","O16"], keyword: ["postpartum hypertension","hypertension post-partum"] },
    sourceReferences: [{ label: "MedlinePlus — Obstetric", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-postpartum_h", "OBGYN", "within 1–3 days or as directed")], suggestedText: POSTPARTUM_HYPERTENSION_V1_SUGGESTED_TEXT,
  },
  {
    id: "acute_pelvic_pain_v1", version: "1.0.0", title: "Acute pelvic pain discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: OBGYN_PHASE17_PELVIC_SAFETY,
    diagnosisMappings: { icdExact: ["R10.2"], icdFamily: ["R10.2","N94"], keyword: ["acute pelvic pain","douleur pelvienne aiguë"] },
    sourceReferences: [{ label: "MedlinePlus — Gynecologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-acute_pelvic", "OBGYN", "within 1–2 days or as directed")], suggestedText: ACUTE_PELVIC_PAIN_V1_SUGGESTED_TEXT,
  },
  {
    id: "ovarian_cyst_v1", version: "1.0.0", title: "Ovarian cyst discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, obGynSafety: OBGYN_PHASE17_ROUTINE_SAFETY,
    diagnosisMappings: { icdExact: ["N83.202"], icdFamily: ["N83.2"], keyword: ["ovarian cyst","kyste ovarien"] },
    sourceReferences: [{ label: "MedlinePlus — Gynecologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-ovarian_cyst", "OBGYN", "within 1–2 days or as directed")], suggestedText: OVARIAN_CYST_V1_SUGGESTED_TEXT,
  },
  {
    id: "ovarian_torsion_post_acute_v1", version: "1.0.0", title: "Ovarian torsion post-acute discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: OBGYN_PHASE17_ROUTINE_SAFETY,
    diagnosisMappings: { icdExact: ["N83.511","N83.512"], icdFamily: ["N83.5"], keyword: ["ovarian torsion post-acute","torsion d'ovaire soins post-aigus"] },
    sourceReferences: [{ label: "MedlinePlus — Gynecologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-ovarian_tors", "OBGYN", "urgent / as directed")], suggestedText: OVARIAN_TORSION_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "pelvic_inflammatory_disease_v1", version: "1.0.0", title: "Pelvic inflammatory disease discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: { ...OBGYN_PHASE17_PELVIC_SAFETY, requiresSexualHealthPrivacyWarning: true },
    diagnosisMappings: { icdExact: ["N73.9"], icdFamily: ["N73"], keyword: ["pelvic inflammatory disease","PID","maladie pelvienne inflammatoire"] },
    sourceReferences: [{ label: "MedlinePlus — Gynecologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-pelvic_infla", "OBGYN", "within 2–3 days or as directed")], suggestedText: PELVIC_INFLAMMATORY_DISEASE_V1_SUGGESTED_TEXT,
  },
  {
    id: "tubo_ovarian_abscess_post_acute_v1", version: "1.0.0", title: "Tubo-ovarian abscess post-acute discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: OBGYN_PHASE17_ROUTINE_SAFETY,
    diagnosisMappings: { icdExact: ["N70.03"], icdFamily: ["N70.03"], keyword: ["tubo-ovarian abscess post-acute","TOA post-acute","abcès tubo-ovarien","acute salpingitis and oophoritis"] },
    sourceReferences: [{ label: "MedlinePlus — Gynecologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-tubo_ovarian", "OBGYN", "urgent / as directed")], suggestedText: TUBO_OVARIAN_ABSCESS_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "cervicitis_v1", version: "1.0.0", title: "Cervicitis discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, obGynSafety: OBGYN_PHASE17_SEXUAL_HEALTH_SAFETY,
    diagnosisMappings: { icdExact: ["N72"], icdFamily: ["N72"], keyword: ["cervicitis","cervical inflammation","cervicite"] },
    sourceReferences: [{ label: "MedlinePlus — Gynecologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-cervicitis_v", "OBGYN", "within 1–2 days or as directed")], suggestedText: CERVICITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "vaginitis_v1", version: "1.0.0", title: "Vaginitis discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, obGynSafety: OBGYN_PHASE17_SEXUAL_HEALTH_SAFETY,
    diagnosisMappings: { icdExact: ["N76.0"], icdFamily: ["N76"], keyword: ["vaginitis","vulvovaginitis","vaginite"] },
    sourceReferences: [{ label: "MedlinePlus — Gynecologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-vaginitis_v1", "OBGYN", "within 1–2 days or as directed")], suggestedText: VAGINITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "bartholin_cyst_abscess_v1", version: "1.0.0", title: "Bartholin cyst or abscess discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, obGynSafety: OBGYN_PHASE17_ROUTINE_SAFETY,
    diagnosisMappings: { icdExact: ["N75.0"], icdFamily: ["N75"], keyword: ["Bartholin cyst","Bartholin abscess","kyste de Bartholin"] },
    sourceReferences: [{ label: "MedlinePlus — Gynecologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-bartholin_cy", "OBGYN", "within 3–5 days or as directed")], suggestedText: BARTHOLIN_CYST_ABSCESS_V1_SUGGESTED_TEXT,
  },
  {
    id: "abnormal_uterine_bleeding_v1", version: "1.0.0", title: "Abnormal uterine bleeding discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, obGynSafety: { requiresBleedingPrecautions: true, requiresOBGynFollowUp: true },
    diagnosisMappings: { icdExact: ["N92.0"], icdFamily: ["N92"], keyword: ["abnormal uterine bleeding","menorrhagia","saignements utérins anormaux"] },
    sourceReferences: [{ label: "MedlinePlus — Gynecologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-abnormal_ute", "OBGYN", "within 1–2 days or as directed")], suggestedText: ABNORMAL_UTERINE_BLEEDING_V1_SUGGESTED_TEXT,
  },
  {
    id: "postmenopausal_bleeding_v1", version: "1.0.0", title: "Postmenopausal bleeding discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: { requiresBleedingPrecautions: true, requiresOBGynFollowUp: true },
    diagnosisMappings: { icdExact: ["N95.0"], icdFamily: ["N95.0"], keyword: ["postmenopausal bleeding","saignement postménopausique"] },
    sourceReferences: [{ label: "MedlinePlus — Gynecologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-postmenopaus", "OBGYN", "urgent / as directed")], suggestedText: POSTMENOPAUSAL_BLEEDING_V1_SUGGESTED_TEXT,
  },
  {
    id: "vaginal_foreign_body_v1", version: "1.0.0", title: "Vaginal foreign body discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, obGynSafety: OBGYN_PHASE17_ROUTINE_SAFETY,
    diagnosisMappings: { icdExact: ["T19.9XXA"], icdFamily: ["T19.9"], keyword: ["vaginal foreign body","corps étranger vaginal"] },
    sourceReferences: [{ label: "MedlinePlus — Gynecologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-vaginal_fore", "OBGYN", "within 1–2 days or as directed")], suggestedText: VAGINAL_FOREIGN_BODY_V1_SUGGESTED_TEXT,
  },
  {
    id: "iud_complication_v1", version: "1.0.0", title: "IUD complication discharge documentation", ...OBGYN_UROLOGY_TEMPLATE_GOVERNANCE, riskCategory: "high", obGynSafety: OBGYN_PHASE17_ROUTINE_SAFETY,
    diagnosisMappings: { icdExact: ["T83.32XA"], icdFamily: ["T83.3"], keyword: ["IUD complication","intrauterine device complication","complication DIU"] },
    sourceReferences: [{ label: "MedlinePlus — Gynecologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-iud_complica", "OBGYN", "within 1–3 days or as directed")], suggestedText: IUD_COMPLICATION_V1_SUGGESTED_TEXT,
  },
  {
    id: "uncomplicated_renal_colic_v1", version: "1.0.0", title: "Uncomplicated renal colic discharge documentation", ...UROLOGY_PHASE17_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdFamily: ["N23"], keyword: ["uncomplicated renal colic","kidney stone uncomplicated","colique néphrétique simple"] },
    sourceReferences: [{ label: "MedlinePlus — Urologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-uncomplicate", "UROLOGY", "within 1–2 days or as directed")], suggestedText: UNCOMPLICATED_RENAL_COLIC_V1_SUGGESTED_TEXT,
  },
  {
    id: "obstructing_ureteral_stone_post_acute_v1", version: "1.0.0", title: "Obstructing ureteral stone post-acute discharge documentation", ...UROLOGY_PHASE17_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdExact: ["N13.2"], icdFamily: ["N13"], keyword: ["obstructing ureteral stone","hydronephrosis stone","calcul urétéral obstructif"] },
    sourceReferences: [{ label: "MedlinePlus — Urologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-obstructing_", "UROLOGY", "urgent / as directed")], suggestedText: OBSTRUCTING_URETERAL_STONE_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "cystitis_v1", version: "1.0.0", title: "Cystitis discharge documentation", ...UROLOGY_PHASE17_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdExact: ["N30.00"], icdFamily: ["N30"], keyword: ["cystitis","bladder infection","cystite"] },
    sourceReferences: [{ label: "MedlinePlus — Urologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-cystitis_v1", "PRIMARY_CARE", "within 1–2 days or as directed")], suggestedText: CYSTITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "pyelonephritis_v1", version: "1.0.0", title: "Pyelonephritis discharge documentation", ...UROLOGY_PHASE17_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdExact: ["N10"], icdFamily: ["N10"], keyword: ["pyelonephritis","kidney infection","pyélonéphrite"] },
    sourceReferences: [{ label: "MedlinePlus — Urologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-pyelonephrit", "PRIMARY_CARE", "within 1–3 days or as directed")], suggestedText: PYELONEPHRITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "infected_obstructed_stone_post_acute_v1", version: "1.0.0", title: "Infected obstructed stone post-acute discharge documentation", ...UROLOGY_PHASE17_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdExact: ["N13.6"], icdFamily: ["N13.6"], keyword: ["infected obstructed stone","pyonephrosis","pyélo-urétérite obstructive"] },
    sourceReferences: [{ label: "MedlinePlus — Urologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-infected_obs", "UROLOGY", "urgent / as directed")], suggestedText: INFECTED_OBSTRUCTED_STONE_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "hematuria_v1", version: "1.0.0", title: "Hematuria discharge documentation", ...UROLOGY_PHASE17_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdExact: ["R31.9"], icdFamily: ["R31"], keyword: ["hematuria","blood in urine","hématurie"] },
    sourceReferences: [{ label: "MedlinePlus — Urologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-hematuria_v1", "UROLOGY", "within 1–2 days or as directed")], suggestedText: HEMATURIA_V1_SUGGESTED_TEXT,
  },
  {
    id: "urinary_retention_v1", version: "1.0.0", title: "Urinary retention discharge documentation", ...UROLOGY_PHASE17_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdExact: ["R33.9"], icdFamily: ["R33"], keyword: ["urinary retention","retention urinaire"] },
    sourceReferences: [{ label: "MedlinePlus — Urologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-urinary_rete", "UROLOGY", "within 1–3 days or as directed")], suggestedText: URINARY_RETENTION_V1_SUGGESTED_TEXT,
  },
  {
    id: "urinary_catheter_complication_v1", version: "1.0.0", title: "Urinary catheter complication discharge documentation", ...UROLOGY_PHASE17_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdExact: ["T83.511A"], icdFamily: ["T83.0","T83.1"], keyword: ["urinary catheter complication","Foley complication","complication de sonde urinaire"] },
    sourceReferences: [{ label: "MedlinePlus — Urologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-urinary_cath", "UROLOGY", "within 1–3 days or as directed")], suggestedText: URINARY_CATHETER_COMPLICATION_V1_SUGGESTED_TEXT,
  },
  {
    id: "epididymitis_v1", version: "1.0.0", title: "Epididymitis discharge documentation", ...UROLOGY_PHASE17_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdExact: ["N45.1"], icdFamily: ["N45.1"], keyword: ["epididymitis","épididymite"] },
    sourceReferences: [{ label: "MedlinePlus — Urologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-epididymitis", "UROLOGY", "within 1–2 days or as directed")], suggestedText: EPIDIDYMITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "orchitis_v1", version: "1.0.0", title: "Orchitis discharge documentation", ...UROLOGY_PHASE17_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdExact: ["N45.2"], icdFamily: ["N45.2"], keyword: ["orchitis","orchidite"] },
    sourceReferences: [{ label: "MedlinePlus — Urologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-orchitis_v1", "UROLOGY", "within 1–2 days or as directed")], suggestedText: ORCHITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "testicular_torsion_post_acute_v1", version: "1.0.0", title: "Testicular torsion post-acute discharge documentation", ...UROLOGY_PHASE17_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdExact: ["N44.00"], icdFamily: ["N44"], keyword: ["testicular torsion post-acute","torsion testiculaire soins post-aigus"] },
    sourceReferences: [{ label: "MedlinePlus — Urologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-testicular_t", "UROLOGY", "urgent / as directed")], suggestedText: TESTICULAR_TORSION_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "prostatitis_v1", version: "1.0.0", title: "Prostatitis discharge documentation", ...UROLOGY_PHASE17_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdExact: ["N41.9"], icdFamily: ["N41"], keyword: ["prostatitis","prostatite"] },
    sourceReferences: [{ label: "MedlinePlus — Urologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-prostatitis_", "UROLOGY", "within 1–2 days or as directed")], suggestedText: PROSTATITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "urethritis_v1", version: "1.0.0", title: "Urethritis discharge documentation", ...UROLOGY_PHASE17_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdExact: ["N34.1"], icdFamily: ["N34"], keyword: ["urethritis","uretrite"] },
    sourceReferences: [{ label: "MedlinePlus — Urologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-urethritis_v", "PRIMARY_CARE", "within 1–2 days or as directed")], suggestedText: URETHRITIS_V1_SUGGESTED_TEXT,
  },
  {
    id: "priapism_post_acute_v1", version: "1.0.0", title: "Priapism post-acute discharge documentation", ...UROLOGY_PHASE17_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdExact: ["N48.33"], icdFamily: ["N48.3"], keyword: ["priapism post-acute","priapisme soins post-aigus"] },
    sourceReferences: [{ label: "MedlinePlus — Urologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-priapism_pos", "UROLOGY", "urgent / as directed")], suggestedText: PRIAPISM_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "paraphimosis_post_acute_v1", version: "1.0.0", title: "Paraphimosis post-acute discharge documentation", ...UROLOGY_PHASE17_TEMPLATE_GOVERNANCE,
    diagnosisMappings: { icdExact: ["N47.2"], icdFamily: ["N47.2"], keyword: ["paraphimosis post-acute","paraphimosis","paraphimosis soins post-aigus"] },
    sourceReferences: [{ label: "MedlinePlus — Urologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-paraphimosis", "UROLOGY", "within 1–2 days or as directed")], suggestedText: PARAPHIMOSIS_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  {
    id: "penile_fracture_post_acute_v1", version: "1.0.0", title: "Penile fracture post-acute discharge documentation", ...UROLOGY_PHASE17_TEMPLATE_GOVERNANCE, riskCategory: "high",
    diagnosisMappings: { icdExact: ["S39.840A"], icdFamily: ["S39.840"], keyword: ["penile fracture post-acute","fracture of corpus cavernosum penis","fracture pénienne soins post-aigus"] },
    sourceReferences: [{ label: "MedlinePlus — Urologic", url: "https://medlineplus.gov/", publisher: "U.S. National Library of Medicine (MedlinePlus)", accessedAt: ACCESSED_AT }],
    defaultFollowUps: [registryFollowUp("p17-penile_fract", "UROLOGY", "urgent / as directed")], suggestedText: PENILE_FRACTURE_POST_ACUTE_V1_SUGGESTED_TEXT,
  },
  // Phase 18 — psychiatric / behavioral discharge templates (Commit 2). Preserves Batch 8 legacy families.
  ...buildPhase18PsychiatricBehavioralDischargeTemplates(),
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
  careSettingContext?: DischargeInstructionCareSettingContext | null;
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
    careSettingContext: input.careSettingContext,
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
    /** MEDUI.D4C.7 — typed care-setting context for Clinic / UC narratives. */
    careSettingContext?: DischargeInstructionCareSettingContext | null;
  }
): ProviderDischargeDiagnosisCard {
  const { template, matchLevel } = resolved;
  const overwrite = options.overwriteExisting === true;
  const locale = options.locale;
  const rawText = getProviderDischargeSuggestedTextBody(template, locale);
  let text =
    template.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID ?
      personalizeGenericDischargeTemplateBody(rawText, card.displayName, locale)
    : rawText;

  const careCtx = options.careSettingContext;
  if (careCtx && careCtx.careSetting !== "ED") {
    const localizedCtx: DischargeInstructionCareSettingContext = { ...careCtx, locale };
    text = adaptDischargeSuggestedTextBodyForCareSetting(text, localizedCtx);
    text = {
      ...text,
      returnPrecautions: ensureGoldStandardReturnPrecautions(
        text.returnPrecautions,
        locale,
        localizedCtx
      ),
    };
  }

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
    appliedLocale: bilingualStorageLocaleOrEn(locale),
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
