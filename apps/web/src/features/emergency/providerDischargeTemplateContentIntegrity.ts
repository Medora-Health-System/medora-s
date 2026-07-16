/**
 * Phase 19Y.5A — template body content integrity markers (registry governance + card stale detection).
 */

import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import {
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  type ProviderDischargeTemplate,
} from "./providerDischargeTemplateRegistry";
import type { ProviderDischargeDiagnosisCard } from "./providerDischargeDocumentationModel";

export type ProviderDischargeTemplateContentIntegrityRule = {
  /** At least one marker (case-insensitive) must appear in the locale body blob. */
  mustIncludeAny: { en: readonly string[]; fr: readonly string[] };
  /** None of these markers may appear in the locale body blob. */
  forbiddenCrossTemplateMarkers: { en: readonly string[]; fr: readonly string[] };
};

const WOUND_FORBIDDEN_EN = ["wound", "laceration", "dressing"] as const;
const WOUND_FORBIDDEN_FR = ["plaie", "lacération", "pansement"] as const;

const RENAL_CERTAINTY_FORBIDDEN_EN = [
  "aki resolved",
  "labs normal",
  "labs reassuring",
  "imaging reassuring",
  "safe for discharge",
  "medically cleared",
  "stone passed",
  "dialysis not needed",
  "uti ruled out",
  "pyelonephritis ruled out",
  "infection cleared",
  "creatinine normal",
  "creatinine improved",
  "electrolytes normal",
  "renal function normal",
  "no obstruction",
] as const;

const RENAL_CERTAINTY_FORBIDDEN_FR = [
  "fonction rénale normale",
  "créatinine normale",
  "électrolytes normaux",
  "congé sécuritaire",
  "autorisé médicalement",
] as const;

const RENAL_BATCH_FORBIDDEN_EN = [...WOUND_FORBIDDEN_EN, ...RENAL_CERTAINTY_FORBIDDEN_EN] as const;
const RENAL_BATCH_FORBIDDEN_FR = [...WOUND_FORBIDDEN_FR, ...RENAL_CERTAINTY_FORBIDDEN_FR] as const;

const ENDOCRINE_CERTAINTY_FORBIDDEN_EN = [
  "dka ruled out",
  "hhs ruled out",
  "blood sugar normal",
  "glucose controlled",
  "a1c normal",
  "labs normal",
  "electrolytes normal",
  "ketones negative",
  "insulin not needed",
  "dehydration resolved",
  "no diabetic emergency",
  "hypoglycemia resolved",
  "hyperglycemia resolved",
  "metabolic issue resolved",
  "medically cleared",
  "safe for discharge",
  "glucose reassuring",
  "metabolic panel normal",
  "dka excluded",
  "hhs excluded",
  "sugars controlled",
] as const;

const ENDOCRINE_CERTAINTY_FORBIDDEN_FR = [
  "glycémie normale",
  "congé sécuritaire",
  "autorisé médicalement",
  "cétones négatives",
] as const;

const ENDOCRINE_BATCH_FORBIDDEN_EN = [...WOUND_FORBIDDEN_EN, ...ENDOCRINE_CERTAINTY_FORBIDDEN_EN] as const;
const ENDOCRINE_BATCH_FORBIDDEN_FR = [...WOUND_FORBIDDEN_FR, ...ENDOCRINE_CERTAINTY_FORBIDDEN_FR] as const;

const RESPIRATORY_FORBIDDEN_ON_WOUND_EN = ["asthma", "wheezing", "bronchitis"] as const;
const RESPIRATORY_FORBIDDEN_ON_WOUND_FR = ["asthme", "sifflement", "bronchite"] as const;
const BURN_CROSS_TEMPLATE_FORBIDDEN_EN = ["fracture", "sprain", "cast", "splint"] as const;
const BURN_CROSS_TEMPLATE_FORBIDDEN_FR = ["fracture", "entorse", "plâtre", "attelle"] as const;

/** Per-template integrity rules — prevents catalog/registry copy-paste mismatches. */
export const PROVIDER_DISCHARGE_TEMPLATE_CONTENT_INTEGRITY: Record<
  string,
  ProviderDischargeTemplateContentIntegrityRule
> = {
  chest_pain_v1: {
    mustIncludeAny: { en: ["chest pain"], fr: ["douleur thoracique"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  abdominal_pain_v1: {
    mustIncludeAny: { en: ["abdominal pain"], fr: ["douleur abdominale"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  headache_v1: {
    mustIncludeAny: { en: ["headache"], fr: ["céphalées", "cephalées"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  uri_cough_v1: {
    mustIncludeAny: { en: ["cough", "respiratory"], fr: ["toux", "respiratoires"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  uti_v1: {
    mustIncludeAny: { en: ["urinary"], fr: ["urinaires", "urinaire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  wound_laceration_v1: {
    mustIncludeAny: { en: ["wound", "laceration"], fr: ["plaie", "lacération", "laceration"] },
    forbiddenCrossTemplateMarkers: {
      en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN,
      fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR,
    },
  },
  animal_bite_v1: {
    mustIncludeAny: { en: ["rabies"], fr: ["rage"] },
    forbiddenCrossTemplateMarkers: {
      en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN,
      fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR,
    },
  },
  human_bite_v1: {
    mustIncludeAny: { en: ["human bite", "infection"], fr: ["morsure humaine", "infection"] },
    forbiddenCrossTemplateMarkers: { en: ["rabies", "animal control"], fr: ["rage", "contrôle animalier"] },
  },
  fight_bite_v1: {
    mustIncludeAny: { en: ["fight bite", "fight-bite", "clenched-fist", "hand"], fr: ["morsure du poing", "main"] },
    forbiddenCrossTemplateMarkers: { en: ["rabies", "animal control"], fr: ["rage", "contrôle animalier"] },
  },
  high_risk_hand_wound_v1: {
    mustIncludeAny: { en: ["hand wound", "infection"], fr: ["haut risque", "main", "infection"] },
    forbiddenCrossTemplateMarkers: { en: ["rabies", "animal control"], fr: ["rage", "contrôle animalier"] },
  },
  contaminated_wound_v1: {
    mustIncludeAny: { en: ["contaminated", "infection"], fr: ["contaminée", "infection"] },
    forbiddenCrossTemplateMarkers: { en: ["rabies", "animal control"], fr: ["rage", "contrôle animalier"] },
  },
  water_exposed_wound_v1: {
    mustIncludeAny: { en: ["water-exposed", "infection"], fr: ["exposée à l'eau", "infection"] },
    forbiddenCrossTemplateMarkers: { en: ["rabies", "animal control"], fr: ["rage", "contrôle animalier"] },
  },
  delayed_wound_v1: {
    mustIncludeAny: { en: ["delayed", "infection"], fr: ["retardée", "infection"] },
    forbiddenCrossTemplateMarkers: { en: ["rabies", "animal control"], fr: ["rage", "contrôle animalier"] },
  },
  animal_bite_rabies_followup_v1: {
    mustIncludeAny: { en: ["rabies"], fr: ["rage"] },
    forbiddenCrossTemplateMarkers: { en: ["human bite"], fr: ["morsure humaine"] },
  },
  infected_traumatic_wound_v1: {
    mustIncludeAny: { en: ["infected"], fr: ["infect"] },
    forbiddenCrossTemplateMarkers: { en: ["rabies"], fr: ["rage"] },
  },
  bite_cellulitis_v1: {
    mustIncludeAny: { en: ["cellulitis", "bite"], fr: ["cellulite", "morsure"] },
    forbiddenCrossTemplateMarkers: { en: ["rabies"], fr: ["rage"] },
  },
  post_bite_abscess_drainage_v1: {
    mustIncludeAny: { en: ["abscess", "drainage"], fr: ["abcès", "drainage"] },
    forbiddenCrossTemplateMarkers: { en: ["rabies"], fr: ["rage"] },
  },
  tetanus_followup_v1: {
    mustIncludeAny: { en: ["tetanus"], fr: ["tétanos", "antitétanique"] },
    forbiddenCrossTemplateMarkers: { en: ["rabies"], fr: ["rage"] },
  },
  deep_contaminated_wound_v1: {
    mustIncludeAny: { en: ["deep contaminated", "infection"], fr: ["profonde contaminée", "infection"] },
    forbiddenCrossTemplateMarkers: { en: ["rabies", "animal control"], fr: ["rage", "contrôle animalier"] },
  },
  nausea_vomiting_v1: {
    mustIncludeAny: { en: ["nausea", "vomiting"], fr: ["nausées", "vomissements"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  gastroenteritis_v1: {
    mustIncludeAny: { en: ["diarrhea", "gastroenteritis"], fr: ["diarrhée", "gastro-entérite"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  back_pain_v1: {
    mustIncludeAny: { en: ["back pain"], fr: ["douleur du dos", "lombaire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  dental_pain_v1: {
    mustIncludeAny: { en: ["dental", "tooth pain"], fr: ["dentaire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  otitis_pharyngitis_v1: {
    mustIncludeAny: { en: ["ear pain", "sore throat"], fr: ["otalgie", "mal de gorge"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  hypertension_v1: {
    mustIncludeAny: { en: ["blood pressure", "hypertension"], fr: ["pression artérielle", "hypertension"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  cellulitis_v1: {
    mustIncludeAny: { en: ["cellulitis", "skin infection"], fr: ["cellulite", "infection cutanée"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  dehydration_v1: {
    mustIncludeAny: { en: ["dehydration"], fr: ["déshydratation"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  asthma_exacerbation_v1: {
    mustIncludeAny: { en: ["asthma", "wheezing", "breathing"], fr: ["asthme", "respiratoires"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  copd_exacerbation_v1: {
    mustIncludeAny: { en: ["copd", "breathing"], fr: ["bpco", "respiratoires"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  bronchitis_v1: {
    mustIncludeAny: { en: ["bronchitis", "cough", "breathing"], fr: ["bronchite", "toux"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pneumonia_v1: {
    mustIncludeAny: { en: ["pneumonia", "breathing"], fr: ["pneumonie"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  syncope_v1: {
    mustIncludeAny: { en: ["syncope", "fainting"], fr: ["syncope", "malaise"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  vertigo_dizziness_v1: {
    mustIncludeAny: { en: ["dizziness", "vertigo"], fr: ["vertiges", "étourdissements"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  kidney_stone_v1: {
    mustIncludeAny: { en: ["kidney stone", "flank"], fr: ["calcul rénal", "flanc"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  constipation_v1: {
    mustIncludeAny: { en: ["constipation"], fr: ["constipation"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  allergic_reaction_v1: {
    mustIncludeAny: { en: ["allergic reaction"], fr: ["réaction allergique"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  minor_head_injury_v1: {
    mustIncludeAny: { en: ["head injury", "concussion"], fr: ["traumatisme crânien", "commotion"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  tia_stroke_like_v1: {
    mustIncludeAny: { en: ["tia", "stroke"], fr: ["ait", "vasculaire cérébral"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  seizure_v1: {
    mustIncludeAny: { en: ["seizure"], fr: ["convulsive", "crise"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  palpitations_v1: {
    mustIncludeAny: { en: ["palpitations"], fr: ["palpitations"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  shortness_of_breath_v1: {
    mustIncludeAny: { en: ["shortness of breath", "breathing"], fr: ["essoufflement"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  chest_wall_pain_v1: {
    mustIncludeAny: { en: ["chest wall pain"], fr: ["pariétale thoracique", "parietale thoracique"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  epistaxis_v1: {
    mustIncludeAny: { en: ["epistaxis", "nosebleed"], fr: ["épistaxis", "saignement de nez"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  hypoglycemia_v1: {
    mustIncludeAny: { en: ["hypoglycemia", "low blood sugar"], fr: ["hypoglycémie"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  hyperglycemia_v1: {
    mustIncludeAny: { en: ["hyperglycemia", "high blood sugar"], fr: ["hyperglycémie"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  alcohol_intoxication_v1: {
    mustIncludeAny: { en: ["alcohol intoxication"], fr: ["intoxication alcoolique"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  anxiety_panic_v1: {
    mustIncludeAny: { en: ["anxiety", "panic"], fr: ["anxiété", "angoisse"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_fever_v1: {
    mustIncludeAny: { en: ["fever", "child"], fr: ["fièvre", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_viral_syndrome_v1: {
    mustIncludeAny: { en: ["viral", "child"], fr: ["virale", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_uri_v1: {
    mustIncludeAny: { en: ["respiratory", "child"], fr: ["respiratoires", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_otitis_media_v1: {
    mustIncludeAny: { en: ["ear pain", "otitis"], fr: ["otalgie", "otite"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_gastroenteritis_v1: {
    mustIncludeAny: { en: ["vomiting", "diarrhea"], fr: ["vomissements", "diarrhée"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_mild_dehydration_v1: {
    mustIncludeAny: { en: ["dehydration", "child"], fr: ["déshydratation", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_constipation_v1: {
    mustIncludeAny: { en: ["constipation", "child"], fr: ["constipation", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_asthma_exacerbation_v1: {
    mustIncludeAny: { en: ["asthma", "wheezing", "breathing"], fr: ["asthme", "respiratoires"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_rash_v1: {
    mustIncludeAny: { en: ["rash", "child"], fr: ["éruption", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_minor_head_injury_v1: {
    mustIncludeAny: { en: ["head injury", "child"], fr: ["traumatisme crânien", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_febrile_seizure_v1: {
    mustIncludeAny: { en: ["febrile seizure", "seizure"], fr: ["convulsive fébrile", "crise"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_abdominal_pain_v1: {
    mustIncludeAny: { en: ["abdominal pain", "child"], fr: ["douleur abdominale", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_vomiting_v1: {
    mustIncludeAny: { en: ["vomiting", "child"], fr: ["vomissements", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_dehydration_escalation_v1: {
    mustIncludeAny: { en: ["dehydration", "child"], fr: ["déshydratation", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_rsv_bronchiolitis_v1: {
    mustIncludeAny: { en: ["bronchiolitis", "rsv", "breathing"], fr: ["bronchiolite", "vrs", "respiratoire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_croup_v1: {
    mustIncludeAny: { en: ["croup", "child"], fr: ["croup", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_allergic_reaction_v1: {
    mustIncludeAny: { en: ["allergic reaction", "child"], fr: ["réaction allergique", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_concussion_v1: {
    mustIncludeAny: { en: ["concussion", "child"], fr: ["commotion", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_wheezing_v1: {
    mustIncludeAny: { en: ["wheezing", "breathing"], fr: ["sifflante", "respiratoires"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_influenza_like_illness_v1: {
    mustIncludeAny: { en: ["influenza", "child"], fr: ["grippal", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  obgyn_vaginal_bleeding_v1: {
    mustIncludeAny: { en: ["vaginal bleeding", "bleeding"], fr: ["saignements vaginaux", "saignements"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  obgyn_pelvic_pain_v1: {
    mustIncludeAny: { en: ["pelvic pain", "pelvic"], fr: ["douleur pelvienne", "pelvienne"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  obgyn_dysmenorrhea_v1: {
    mustIncludeAny: { en: ["menstrual", "cramps"], fr: ["menstruelles", "crampes"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  obgyn_hyperemesis_v1: {
    mustIncludeAny: { en: ["vomiting", "pregnancy"], fr: ["vomissements", "grossesse"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  obgyn_early_pregnancy_symptoms_v1: {
    mustIncludeAny: { en: ["early pregnancy", "pregnancy"], fr: ["début de grossesse", "grossesse"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  obgyn_threatened_miscarriage_precautions_v1: {
    mustIncludeAny: { en: ["early pregnancy", "precautionary"], fr: ["début de grossesse", "préventifs"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  obgyn_vaginitis_v1: {
    mustIncludeAny: { en: ["vaginal discharge", "private"], fr: ["pertes vaginales", "confidentielles"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  obgyn_uti_pregnancy_precautions_v1: {
    mustIncludeAny: { en: ["urinary", "pregnancy"], fr: ["urinaires", "grossesse"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  obgyn_round_ligament_pain_v1: {
    mustIncludeAny: { en: ["round ligament", "pregnancy"], fr: ["ligaments ronds", "grossesse"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  obgyn_postpartum_warning_v1: {
    mustIncludeAny: { en: ["postpartum", "bleeding"], fr: ["post-partum", "saignements"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  behavioral_health_anxiety_panic_symptoms_v1: {
    mustIncludeAny: { en: ["anxiety", "panic"], fr: ["anxiété", "angoisse"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  behavioral_health_depression_crisis_precautions_v1: {
    mustIncludeAny: { en: ["depression", "crisis"], fr: ["dépression", "crise"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  behavioral_health_suicidal_ideation_precautions_v1: {
    mustIncludeAny: { en: ["self-harm", "crisis"], fr: ["se faire du mal", "crise"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  behavioral_health_alcohol_intoxication_follow_up_v1: {
    mustIncludeAny: { en: ["alcohol", "substance"], fr: ["alcool", "substances"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  behavioral_health_alcohol_withdrawal_precautions_v1: {
    mustIncludeAny: { en: ["withdrawal", "alcohol"], fr: ["sevrage", "alcool"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  behavioral_health_substance_use_resources_v1: {
    mustIncludeAny: { en: ["substance use", "recovery"], fr: ["substances", "rétablissement"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  behavioral_health_opioid_overdose_aftercare_v1: {
    mustIncludeAny: { en: ["opioid", "overdose"], fr: ["opioïdes", "surdose"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  behavioral_health_crisis_follow_up_v1: {
    mustIncludeAny: { en: ["behavioral health crisis", "crisis"], fr: ["crise", "comportementale"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  behavioral_health_insomnia_stress_reaction_v1: {
    mustIncludeAny: { en: ["insomnia", "stress"], fr: ["insomnie", "stress"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  behavioral_health_grief_adjustment_v1: {
    mustIncludeAny: { en: ["grief", "adjustment"], fr: ["deuil", "adaptation"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_ankle_sprain_v1: {
    mustIncludeAny: { en: ["ankle", "sprain"], fr: ["cheville", "entorse"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_wrist_sprain_v1: {
    mustIncludeAny: { en: ["wrist", "sprain"], fr: ["poignet", "entorse"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_knee_injury_v1: {
    mustIncludeAny: { en: ["knee", "injury"], fr: ["genou", "blessure"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_shoulder_pain_v1: {
    mustIncludeAny: { en: ["shoulder", "pain"], fr: ["épaule", "douleur"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_back_strain_v1: {
    mustIncludeAny: { en: ["back", "strain"], fr: ["dos", "entorse"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_neck_strain_v1: {
    mustIncludeAny: { en: ["neck", "strain"], fr: ["cou", "entorse"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_contusion_v1: {
    mustIncludeAny: { en: ["contusion", "bruise"], fr: ["contusion", "ecchymose"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_rib_injury_v1: {
    mustIncludeAny: { en: ["rib", "chest"], fr: ["côte", "thoracique"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_minor_fracture_precautions_v1: {
    mustIncludeAny: { en: ["fracture", "splint"], fr: ["fracture", "attelle"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_fracture_hip_v1: {
    mustIncludeAny: { en: ["hip"], fr: ["hanche"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_fracture_hand_v1: {
    mustIncludeAny: { en: ["hand", "finger", "wrist"], fr: ["main", "doigt", "poignet"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_fracture_facial_v1: {
    mustIncludeAny: { en: ["facial", "jaw", "nasal", "orbital"], fr: ["visage", "mâchoire", "nez", "orbite"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  concussion_mild_tbi_v1: {
    mustIncludeAny: { en: ["concussion"], fr: ["commotion"] },
    forbiddenCrossTemplateMarkers: {
      en: ["subdural hematoma", "epidural hematoma", "intracranial hemorrhage", ...WOUND_FORBIDDEN_EN],
      fr: ["hématome sous-dural", "hématome extradural", "hémorragie intracrânienne", ...WOUND_FORBIDDEN_FR],
    },
  },
  post_head_injury_observation_v1: {
    mustIncludeAny: { en: ["head injury"], fr: ["traumatisme crânien"] },
    forbiddenCrossTemplateMarkers: {
      en: ["subdural hematoma", "epidural hematoma", "return to sports", ...WOUND_FORBIDDEN_EN],
      fr: ["hématome sous-dural", "hématome extradural", "retour au sport", ...WOUND_FORBIDDEN_FR],
    },
  },
  skull_fracture_followup_v1: {
    mustIncludeAny: { en: ["skull fracture"], fr: ["fracture du crâne", "fracture de la base du crâne"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  intracranial_hemorrhage_followup_v1: {
    mustIncludeAny: {
      en: ["intracranial hemorrhage", "subdural", "epidural"],
      fr: ["hémorragie intracrânienne", "sous-dural", "extradural"],
    },
    forbiddenCrossTemplateMarkers: {
      en: ["return to sports", "return-to-play", ...WOUND_FORBIDDEN_EN],
      fr: ["retour au sport", "retour au jeu", ...WOUND_FORBIDDEN_FR],
    },
  },
  nasal_fracture_v1: {
    mustIncludeAny: { en: ["nasal fracture", "broken nose"], fr: ["fracture nasale", "nez cassé"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  orbital_fracture_v1: {
    mustIncludeAny: { en: ["orbital", "eye socket"], fr: ["orbitaire", "orbite"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  mandibular_fracture_v1: {
    mustIncludeAny: { en: ["mandible", "mandibular"], fr: ["mandibule", "mandibulaire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  maxillary_lefort_fracture_v1: {
    mustIncludeAny: { en: ["le fort", "maxillary"], fr: ["le fort", "maxillaire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  dental_trauma_v1: {
    mustIncludeAny: { en: ["tooth fracture", "dental"], fr: ["fracture dentaire", "dentaire"] },
    forbiddenCrossTemplateMarkers: { en: ["avulsed", "knocked-out"], fr: ["avulsée", "arrachée"] },
  },
  tooth_avulsion_v1: {
    mustIncludeAny: { en: ["avulsed", "knocked-out"], fr: ["avulsée", "arrachée"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  jaw_dislocation_post_reduction_v1: {
    mustIncludeAny: { en: ["jaw", "tmj"], fr: ["mâchoire", "atm"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  auricular_hematoma_followup_v1: {
    mustIncludeAny: { en: ["auricular hematoma", "cauliflower ear"], fr: ["hématome auriculaire", "oreille en chou-fleur"] },
    forbiddenCrossTemplateMarkers: {
      en: ["septal hematoma", "nasal septum"],
      fr: ["hématome septal", "cloison nasale"],
    },
  },
  septal_hematoma_followup_v1: {
    mustIncludeAny: { en: ["septal hematoma"], fr: ["hématome septal", "hématome de la cloison nasale"] },
    forbiddenCrossTemplateMarkers: { en: ["nasal fracture", "broken nose"], fr: ["fracture nasale", "nez cassé"] },
  },
  facial_laceration_v1: {
    mustIncludeAny: { en: ["facial laceration", "laceration"], fr: ["lacération", "visage"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_fracture_spine_v1: {
    mustIncludeAny: { en: ["spinal", "vertebral"], fr: ["vertébrale", "colonne"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_fracture_open_v1: {
    mustIncludeAny: { en: ["open", "compound"], fr: ["ouverte", "composée"] },
    forbiddenCrossTemplateMarkers: { en: ["laceration"], fr: ["lacération"] },
  },
  trauma_msk_dislocation_shoulder_v1: {
    mustIncludeAny: { en: ["shoulder", "dislocation"], fr: ["épaule", "luxation"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_dislocation_elbow_v1: {
    mustIncludeAny: { en: ["elbow", "nursemaid"], fr: ["coude", "poignet de bonne"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_dislocation_hip_v1: {
    mustIncludeAny: { en: ["hip", "dislocation"], fr: ["hanche", "luxation"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_dislocation_patella_v1: {
    mustIncludeAny: { en: ["patella", "kneecap", "knee"], fr: ["rotule", "genou"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_dislocation_hand_v1: {
    mustIncludeAny: { en: ["hand", "finger", "wrist"], fr: ["main", "doigt", "poignet"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_dislocation_jaw_v1: {
    mustIncludeAny: { en: ["jaw", "tmj"], fr: ["mâchoire", "atm"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_dislocation_generic_v1: {
    mustIncludeAny: { en: ["dislocation"], fr: ["luxation"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_sprain_generic_v1: {
    mustIncludeAny: { en: ["sprain", "strain"], fr: ["entorse", "élongation"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_tendon_achilles_v1: {
    mustIncludeAny: { en: ["achilles", "tendon"], fr: ["achille", "tendon"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_tendon_extensor_mechanism_v1: {
    mustIncludeAny: { en: ["quadriceps", "patellar", "tendon"], fr: ["quadriceps", "rotulien", "tendon"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_tendon_shoulder_v1: {
    mustIncludeAny: { en: ["shoulder", "tendon"], fr: ["épaule", "tendon"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_tendon_hand_v1: {
    mustIncludeAny: { en: ["hand", "tendon", "finger"], fr: ["main", "tendon", "doigt"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_tendon_generic_v1: {
    mustIncludeAny: { en: ["tendon"], fr: ["tendineuse", "tendon"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_ligament_knee_v1: {
    mustIncludeAny: { en: ["knee", "ligament"], fr: ["genou", "ligamentaire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_ligament_ankle_v1: {
    mustIncludeAny: { en: ["ankle", "ligament"], fr: ["cheville", "ligamentaire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_ligament_hand_v1: {
    mustIncludeAny: { en: ["thumb", "finger", "ligament"], fr: ["pouce", "doigt", "ligamentaire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_ligament_upper_extremity_v1: {
    mustIncludeAny: { en: ["wrist", "elbow", "ligament"], fr: ["poignet", "coude", "ligamentaire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_ligament_shoulder_v1: {
    mustIncludeAny: { en: ["shoulder", "ligament"], fr: ["épaule", "ligamentaire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_ligament_generic_v1: {
    mustIncludeAny: { en: ["ligament"], fr: ["ligamentaire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },

  trauma_msk_crush_hand_finger_v1: {
    mustIncludeAny: { en: ["crush"], fr: ["écrasement"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_crush_upper_extremity_v1: {
    mustIncludeAny: { en: ["crush"], fr: ["écrasement"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_crush_lower_extremity_v1: {
    mustIncludeAny: { en: ["crush"], fr: ["écrasement"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_crush_foot_toe_v1: {
    mustIncludeAny: { en: ["crush"], fr: ["écrasement"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_crush_chest_abdomen_pelvis_v1: {
    mustIncludeAny: { en: ["crush"], fr: ["écrasement"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_crush_prolonged_compression_v1: {
    mustIncludeAny: { en: ["compression", "crush"], fr: ["compression", "écrasement"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_crush_degloving_v1: {
    mustIncludeAny: { en: ["degloving"], fr: ["dégantage"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_crush_compartment_risk_v1: {
    mustIncludeAny: { en: ["compartment"], fr: ["loges"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_crush_generic_v1: {
    mustIncludeAny: { en: ["crush"], fr: ["écrasement"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  burn_superficial_v1: {
    mustIncludeAny: { en: ["dressing", "return", "infection"], fr: ["pansement", "retournez", "infection"] },
    forbiddenCrossTemplateMarkers: { en: BURN_CROSS_TEMPLATE_FORBIDDEN_EN, fr: BURN_CROSS_TEMPLATE_FORBIDDEN_FR },
  },
  burn_partial_thickness_v1: {
    mustIncludeAny: { en: ["dressing", "return", "infection"], fr: ["pansement", "retournez", "infection"] },
    forbiddenCrossTemplateMarkers: { en: BURN_CROSS_TEMPLATE_FORBIDDEN_EN, fr: BURN_CROSS_TEMPLATE_FORBIDDEN_FR },
  },
  burn_full_thickness_followup_v1: {
    mustIncludeAny: { en: ["dressing", "return", "infection"], fr: ["pansement", "retournez", "infection"] },
    forbiddenCrossTemplateMarkers: { en: BURN_CROSS_TEMPLATE_FORBIDDEN_EN, fr: BURN_CROSS_TEMPLATE_FORBIDDEN_FR },
  },
  burn_face_v1: {
    mustIncludeAny: { en: ["dressing", "return", "breathing"], fr: ["pansement", "retournez", "respiratoire"] },
    forbiddenCrossTemplateMarkers: { en: BURN_CROSS_TEMPLATE_FORBIDDEN_EN, fr: BURN_CROSS_TEMPLATE_FORBIDDEN_FR },
  },
  burn_hand_v1: {
    mustIncludeAny: { en: ["dressing", "return", "numbness"], fr: ["pansement", "retournez", "engourdissement"] },
    forbiddenCrossTemplateMarkers: { en: BURN_CROSS_TEMPLATE_FORBIDDEN_EN, fr: BURN_CROSS_TEMPLATE_FORBIDDEN_FR },
  },
  burn_foot_v1: {
    mustIncludeAny: { en: ["dressing", "return", "numbness"], fr: ["pansement", "retournez", "engourdissement"] },
    forbiddenCrossTemplateMarkers: { en: BURN_CROSS_TEMPLATE_FORBIDDEN_EN, fr: BURN_CROSS_TEMPLATE_FORBIDDEN_FR },
  },
  burn_eye_v1: {
    mustIncludeAny: { en: ["eye", "return", "vision"], fr: ["œil", "retournez", "vision"] },
    forbiddenCrossTemplateMarkers: { en: BURN_CROSS_TEMPLATE_FORBIDDEN_EN, fr: BURN_CROSS_TEMPLATE_FORBIDDEN_FR },
  },
  burn_chemical_v1: {
    mustIncludeAny: { en: ["chemical", "return", "dressing"], fr: ["chimique", "retournez", "pansement"] },
    forbiddenCrossTemplateMarkers: { en: BURN_CROSS_TEMPLATE_FORBIDDEN_EN, fr: BURN_CROSS_TEMPLATE_FORBIDDEN_FR },
  },
  burn_electrical_v1: {
    mustIncludeAny: { en: ["electrical", "return", "wound"], fr: ["électrique", "retournez", "brûlure"] },
    forbiddenCrossTemplateMarkers: { en: BURN_CROSS_TEMPLATE_FORBIDDEN_EN, fr: BURN_CROSS_TEMPLATE_FORBIDDEN_FR },
  },
  burn_inhalation_aftercare_v1: {
    mustIncludeAny: { en: ["inhalation", "return", "breathing"], fr: ["inhalation", "retournez", "respiratoire"] },
    forbiddenCrossTemplateMarkers: { en: BURN_CROSS_TEMPLATE_FORBIDDEN_EN, fr: BURN_CROSS_TEMPLATE_FORBIDDEN_FR },
  },
  frostbite_v1: {
    mustIncludeAny: { en: ["frostbite", "return", "wound"], fr: ["gelure", "retournez", "brûlure"] },
    forbiddenCrossTemplateMarkers: { en: BURN_CROSS_TEMPLATE_FORBIDDEN_EN, fr: BURN_CROSS_TEMPLATE_FORBIDDEN_FR },
  },
  sunburn_v1: {
    mustIncludeAny: { en: ["sunburn", "return", "skin"], fr: ["coup de soleil", "retournez", "peau"] },
    forbiddenCrossTemplateMarkers: { en: BURN_CROSS_TEMPLATE_FORBIDDEN_EN, fr: BURN_CROSS_TEMPLATE_FORBIDDEN_FR },
  },
  penetrating_wound_minor_v1: {
    mustIncludeAny: { en: ["penetrating", "wound"], fr: ["pénétrante", "plaie"] },
    forbiddenCrossTemplateMarkers: { en: ["animal bite"], fr: ["morsure animale"] },
  },
  gunshot_wound_extremity_v1: {
    mustIncludeAny: { en: ["gunshot", "extremity"], fr: ["blessure par balle", "membre"] },
    forbiddenCrossTemplateMarkers: { en: ["animal bite"], fr: ["morsure animale"] },
  },
  stab_wound_minor_v1: {
    mustIncludeAny: { en: ["stab", "wound"], fr: ["arme blanche", "plaie"] },
    forbiddenCrossTemplateMarkers: { en: ["animal bite"], fr: ["morsure animale"] },
  },
  retained_projectile_v1: {
    mustIncludeAny: { en: ["retained", "projectile"], fr: ["projectile", "retenu"] },
    forbiddenCrossTemplateMarkers: { en: ["animal bite"], fr: ["morsure animale"] },
  },
  penetrating_hand_injury_v1: { mustIncludeAny: { en: ["hand", "penetrating"], fr: ["main", "pénétrante"] }, forbiddenCrossTemplateMarkers: { en: ["animal bite"], fr: ["morsure animale"] } },
  penetrating_foot_injury_v1: { mustIncludeAny: { en: ["foot", "penetrating"], fr: ["pied", "pénétrante"] }, forbiddenCrossTemplateMarkers: { en: ["animal bite"], fr: ["morsure animale"] } },
  penetrating_face_v1: { mustIncludeAny: { en: ["facial", "penetrating"], fr: ["visage", "pénétrante"] }, forbiddenCrossTemplateMarkers: { en: ["animal bite"], fr: ["morsure animale"] } },
  penetrating_eye_followup_v1: { mustIncludeAny: { en: ["eye", "penetrating"], fr: ["œil", "pénétrante"] }, forbiddenCrossTemplateMarkers: { en: ["animal bite"], fr: ["morsure animale"] } },
  penetrating_chest_v1: { mustIncludeAny: { en: ["chest", "penetrating"], fr: ["thorax", "pénétrante"] }, forbiddenCrossTemplateMarkers: { en: ["animal bite"], fr: ["morsure animale"] } },
  penetrating_abdomen_v1: { mustIncludeAny: { en: ["abdominal", "penetrating"], fr: ["abdomen", "pénétrante"] }, forbiddenCrossTemplateMarkers: { en: ["animal bite"], fr: ["morsure animale"] } },
  penetrating_neck_v1: { mustIncludeAny: { en: ["neck", "penetrating"], fr: ["cou", "pénétrante"] }, forbiddenCrossTemplateMarkers: { en: ["animal bite"], fr: ["morsure animale"] } },
  penetrating_head_v1: { mustIncludeAny: { en: ["head", "penetrating"], fr: ["tête", "pénétrante"] }, forbiddenCrossTemplateMarkers: { en: ["animal bite"], fr: ["morsure animale"] } },
  post_wound_exploration_v1: { mustIncludeAny: { en: ["penetrating", "wound"], fr: ["pénétrante", "plaie"] }, forbiddenCrossTemplateMarkers: { en: ["animal bite"], fr: ["morsure animale"] } },
  post_foreign_body_removal_v1: { mustIncludeAny: { en: ["retained", "projectile"], fr: ["projectile", "retenu"] }, forbiddenCrossTemplateMarkers: { en: ["animal bite"], fr: ["morsure animale"] } },
  post_tourniquet_extremity_v1: { mustIncludeAny: { en: ["gunshot", "extremity"], fr: ["blessure par balle", "membre"] }, forbiddenCrossTemplateMarkers: { en: ["animal bite"], fr: ["morsure animale"] } },
  trauma_msk_amputation_finger_thumb_v1: {
    mustIncludeAny: { en: ["amputation"], fr: ["amputation"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_amputation_hand_upper_extremity_v1: {
    mustIncludeAny: { en: ["amputation"], fr: ["amputation"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_amputation_toe_v1: {
    mustIncludeAny: { en: ["amputation", "toe"], fr: ["amputation", "orteil"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_amputation_foot_lower_extremity_v1: {
    mustIncludeAny: { en: ["amputation"], fr: ["amputation"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_amputation_partial_v1: {
    mustIncludeAny: { en: ["partial", "amputation"], fr: ["partielle", "amputation"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_amputation_complete_v1: {
    mustIncludeAny: { en: ["complete", "amputation"], fr: ["complète", "amputation"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_amputation_postoperative_or_followup_v1: {
    mustIncludeAny: { en: ["stump", "amputation"], fr: ["moignon", "amputation"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_amputation_generic_v1: {
    mustIncludeAny: { en: ["amputation"], fr: ["amputation"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_foreign_body_eye_v1: {
    mustIncludeAny: { en: ["eye", "foreign body"], fr: ["œil", "oeil", "corps étranger"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_foreign_body_ear_nose_v1: {
    mustIncludeAny: { en: ["ear", "nose", "foreign body"], fr: ["oreille", "nez", "corps étranger"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_foreign_body_skin_soft_tissue_v1: {
    mustIncludeAny: { en: ["foreign body"], fr: ["corps étranger"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_foreign_body_hand_finger_v1: {
    mustIncludeAny: { en: ["hand", "foreign body"], fr: ["main", "corps étranger"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_foreign_body_foot_toe_v1: {
    mustIncludeAny: { en: ["foot", "foreign body"], fr: ["pied", "corps étranger"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_foreign_body_fishhook_v1: {
    mustIncludeAny: { en: ["fishhook"], fr: ["hameçon"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_foreign_body_ingested_v1: {
    mustIncludeAny: { en: ["swallowed", "foreign body"], fr: ["avalé", "corps étranger"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_foreign_body_aspirated_v1: {
    mustIncludeAny: { en: ["aspirated", "airway"], fr: ["inhalé", "voies aériennes"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  trauma_msk_foreign_body_retained_fragment_v1: {
    mustIncludeAny: { en: ["retained", "fragment"], fr: ["retenu", "fragment"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_foreign_body_generic_v1: {
    mustIncludeAny: { en: ["foreign body"], fr: ["corps étranger"] },
    forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR },
  },
  trauma_msk_mvc_soreness_v1: {
    mustIncludeAny: { en: ["motor vehicle", "collision"], fr: ["véhicule", "collision"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  cardio_hypertension_elevated_bp_v1: {
    mustIncludeAny: { en: ["blood pressure", "hypertension"], fr: ["pression artérielle", "hypertension"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  high_risk_medical_fatigue_v1: {
    mustIncludeAny: { en: ["fatigue"], fr: ["fatigue"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  high_risk_medical_general_weakness_v1: {
    mustIncludeAny: { en: ["weakness"], fr: ["faiblesse"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  high_risk_medical_dizziness_v1: {
    mustIncludeAny: { en: ["dizziness", "lightheaded"], fr: ["étourdissements", "vertiges"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  high_risk_medical_headache_v1: {
    mustIncludeAny: { en: ["headache"], fr: ["céphalées"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  high_risk_medical_leg_swelling_v1: {
    mustIncludeAny: { en: ["leg swelling"], fr: ["enflure", "jambe"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  cardio_chest_pain_low_risk_v1: {
    mustIncludeAny: { en: ["chest pain"], fr: ["douleur thoracique"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  cardio_syncope_v1: {
    mustIncludeAny: { en: ["syncope", "fainting"], fr: ["syncope", "évanouissement"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  cardio_afib_rate_controlled_v1: {
    mustIncludeAny: { en: ["atrial fibrillation", "afib"], fr: ["fibrillation auriculaire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  cardio_heart_failure_symptoms_v1: {
    mustIncludeAny: { en: ["heart failure", "shortness of breath"], fr: ["insuffisance cardiaque", "essoufflement"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  infectious_fever_unknown_source_v1: {
    mustIncludeAny: { en: ["fever", "unknown source"], fr: ["fièvre", "source claire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  infectious_upper_respiratory_infection_v1: {
    mustIncludeAny: { en: ["upper respiratory", "respiratory infection"], fr: ["voies respiratoires supérieures"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  infectious_viral_syndrome_v1: {
    mustIncludeAny: { en: ["viral", "flu-like"], fr: ["virale", "pseudo-grippaux"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  infectious_pharyngitis_v1: {
    mustIncludeAny: { en: ["pharyngitis", "sore throat"], fr: ["pharyngite", "mal de gorge"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  infectious_sinusitis_v1: {
    mustIncludeAny: { en: ["sinusitis"], fr: ["sinusite"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  infectious_pneumonia_followup_v1: {
    mustIncludeAny: { en: ["pneumonia", "follow-up"], fr: ["pneumonie", "suivi"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  infectious_covid_like_illness_v1: {
    mustIncludeAny: { en: ["covid-like", "respiratory"], fr: ["type covid", "respiratoire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  gi_infectious_gastroenteritis_v1: {
    mustIncludeAny: { en: ["gastroenteritis", "infectious"], fr: ["gastro-entérite", "infectieuse"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  infectious_cellulitis_followup_v1: {
    mustIncludeAny: { en: ["cellulitis", "follow-up"], fr: ["cellulite", "suivi"] },
    forbiddenCrossTemplateMarkers: { en: ["pneumonia"], fr: ["pneumonie"] },
  },
  sepsis_risk_return_precautions_v1: {
    mustIncludeAny: { en: ["sepsis", "infection"], fr: ["sepsis", "infection"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  renal_aki_followup_v1: {
    mustIncludeAny: { en: ["acute kidney injury", "dehydration"], fr: ["insuffisance rénale aiguë", "déshydratation"] },
    forbiddenCrossTemplateMarkers: { en: RENAL_BATCH_FORBIDDEN_EN, fr: RENAL_BATCH_FORBIDDEN_FR },
  },
  renal_dehydration_followup_v1: {
    mustIncludeAny: { en: ["dehydration", "unable to keep fluids"], fr: ["déshydratation", "liquides"] },
    forbiddenCrossTemplateMarkers: { en: RENAL_BATCH_FORBIDDEN_EN, fr: RENAL_BATCH_FORBIDDEN_FR },
  },
  renal_electrolyte_abnormality_followup_v1: {
    mustIncludeAny: { en: ["electrolyte", "palpitations"], fr: ["électrolytique", "palpitations"] },
    forbiddenCrossTemplateMarkers: { en: RENAL_BATCH_FORBIDDEN_EN, fr: RENAL_BATCH_FORBIDDEN_FR },
  },
  urology_renal_colic_followup_v1: {
    mustIncludeAny: { en: ["renal colic", "kidney stone"], fr: ["colique néphrétique", "calcul rénal"] },
    forbiddenCrossTemplateMarkers: { en: RENAL_BATCH_FORBIDDEN_EN, fr: RENAL_BATCH_FORBIDDEN_FR },
  },
  urology_uti_followup_v1: {
    mustIncludeAny: { en: ["urinary tract infection", "symptoms may worsen"], fr: ["infection urinaire", "aggraver"] },
    forbiddenCrossTemplateMarkers: { en: RENAL_BATCH_FORBIDDEN_EN, fr: RENAL_BATCH_FORBIDDEN_FR },
  },
  urology_pyelonephritis_followup_v1: {
    mustIncludeAny: { en: ["pyelonephritis", "kidney infection"], fr: ["pyélonéphrite", "infection rénale"] },
    forbiddenCrossTemplateMarkers: { en: RENAL_BATCH_FORBIDDEN_EN, fr: RENAL_BATCH_FORBIDDEN_FR },
  },
  urology_hematuria_followup_v1: {
    mustIncludeAny: { en: ["hematuria", "blood in the urine"], fr: ["hématurie", "sang dans les urines"] },
    forbiddenCrossTemplateMarkers: { en: RENAL_BATCH_FORBIDDEN_EN, fr: RENAL_BATCH_FORBIDDEN_FR },
  },
  urology_urinary_retention_followup_v1: {
    mustIncludeAny: { en: ["urinary retention", "inability to urinate"], fr: ["rétention urinaire", "uriner"] },
    forbiddenCrossTemplateMarkers: { en: RENAL_BATCH_FORBIDDEN_EN, fr: RENAL_BATCH_FORBIDDEN_FR },
  },
  urology_foley_catheter_precautions_v1: {
    mustIncludeAny: { en: ["catheter", "foley"], fr: ["cathéter", "foley"] },
    forbiddenCrossTemplateMarkers: { en: RENAL_BATCH_FORBIDDEN_EN, fr: RENAL_BATCH_FORBIDDEN_FR },
  },
  dialysis_return_precautions_v1: {
    mustIncludeAny: { en: ["dialysis", "missed dialysis"], fr: ["dialyse", "dialyse manquée"] },
    forbiddenCrossTemplateMarkers: { en: RENAL_BATCH_FORBIDDEN_EN, fr: RENAL_BATCH_FORBIDDEN_FR },
  },
  diabetes_hyperglycemia_followup_v1: {
    mustIncludeAny: { en: ["hyperglycemia", "excessive thirst"], fr: ["hyperglycémie", "soif excessive"] },
    forbiddenCrossTemplateMarkers: { en: ENDOCRINE_BATCH_FORBIDDEN_EN, fr: ENDOCRINE_BATCH_FORBIDDEN_FR },
  },
  diabetes_hypoglycemia_followup_v1: {
    mustIncludeAny: { en: ["hypoglycemia", "fainting"], fr: ["hypoglycémie", "évanouissement"] },
    forbiddenCrossTemplateMarkers: { en: ENDOCRINE_BATCH_FORBIDDEN_EN, fr: ENDOCRINE_BATCH_FORBIDDEN_FR },
  },
  diabetes_dka_return_precautions_v1: {
    mustIncludeAny: { en: ["ketoacidosis", "return immediately"], fr: ["acidocétose", "retournez immédiatement"] },
    forbiddenCrossTemplateMarkers: { en: ENDOCRINE_BATCH_FORBIDDEN_EN, fr: ENDOCRINE_BATCH_FORBIDDEN_FR },
  },
  diabetes_insulin_management_precautions_v1: {
    mustIncludeAny: { en: ["insulin", "do not skip insulin"], fr: ["insuline", "ne sautez pas l'insuline"] },
    forbiddenCrossTemplateMarkers: { en: ENDOCRINE_BATCH_FORBIDDEN_EN, fr: ENDOCRINE_BATCH_FORBIDDEN_FR },
  },
  endocrine_thyroid_symptom_followup_v1: {
    mustIncludeAny: { en: ["thyroid", "endocrinology"], fr: ["thyroïde", "endocrinologie"] },
    forbiddenCrossTemplateMarkers: { en: ENDOCRINE_BATCH_FORBIDDEN_EN, fr: ENDOCRINE_BATCH_FORBIDDEN_FR },
  },
  metabolic_dehydration_followup_v1: {
    mustIncludeAny: { en: ["metabolic dehydration", "dehydration"], fr: ["déshydratation", "métabolique"] },
    forbiddenCrossTemplateMarkers: { en: ENDOCRINE_BATCH_FORBIDDEN_EN, fr: ENDOCRINE_BATCH_FORBIDDEN_FR },
  },
  metabolic_nausea_weakness_followup_v1: {
    mustIncludeAny: { en: ["nausea", "weakness"], fr: ["nausées", "faiblesse"] },
    forbiddenCrossTemplateMarkers: { en: ENDOCRINE_BATCH_FORBIDDEN_EN, fr: ENDOCRINE_BATCH_FORBIDDEN_FR },
  },
  metabolic_electrolyte_followup_v1: {
    mustIncludeAny: { en: ["metabolic electrolyte", "endocrinology"], fr: ["électrolytique", "endocrinologie"] },
    forbiddenCrossTemplateMarkers: { en: ENDOCRINE_BATCH_FORBIDDEN_EN, fr: ENDOCRINE_BATCH_FORBIDDEN_FR },
  },
  endocrine_polyuria_polydipsia_followup_v1: {
    mustIncludeAny: { en: ["polyuria", "polydipsia"], fr: ["polyurie", "polydipsie"] },
    forbiddenCrossTemplateMarkers: { en: ENDOCRINE_BATCH_FORBIDDEN_EN, fr: ENDOCRINE_BATCH_FORBIDDEN_FR },
  },
  diabetes_sick_day_precautions_v1: {
    mustIncludeAny: { en: ["sick day", "do not skip insulin"], fr: ["jour de maladie", "ne sautez pas l'insuline"] },
    forbiddenCrossTemplateMarkers: { en: ENDOCRINE_BATCH_FORBIDDEN_EN, fr: ENDOCRINE_BATCH_FORBIDDEN_FR },
  },
  type_2_diabetes_v1: {
    mustIncludeAny: { en: ["type 2 diabetes", "blood sugar"], fr: ["diabète de type 2", "glycémie"] },
    forbiddenCrossTemplateMarkers: { en: ENDOCRINE_BATCH_FORBIDDEN_EN, fr: ENDOCRINE_BATCH_FORBIDDEN_FR },
  },
  vaccination_visit_v1: {
    mustIncludeAny: { en: ["vaccination", "immunization"], fr: ["vaccination", "immunisation"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  wellness_visit_v1: {
    mustIncludeAny: { en: ["wellness", "routine"], fr: ["santé", "routine"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  blast_ear_injury_v1: { mustIncludeAny: { en: ["blast", "ear"], fr: ["explosion", "oreille"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  blast_lung_aftercare_v1: { mustIncludeAny: { en: ["blast", "pressure"], fr: ["explosion", "pression"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  blast_abdominal_observation_v1: { mustIncludeAny: { en: ["blast", "abdominal"], fr: ["explosion", "abdominale"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  blast_mild_tbi_v1: { mustIncludeAny: { en: ["blast", "head"], fr: ["explosion", "crânien"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  blast_fragment_wound_v1: { mustIncludeAny: { en: ["fragment", "shrapnel"], fr: ["fragment", "éclat"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  blast_burn_aftercare_v1: { mustIncludeAny: { en: ["explosion", "burn"], fr: ["explosion", "brûlure"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  blast_crush_aftercare_v1: { mustIncludeAny: { en: ["compression", "entrapment"], fr: ["compression", "ensevelissement"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  post_structural_collapse_v1: { mustIncludeAny: { en: ["compression", "entrapment"], fr: ["compression", "ensevelissement"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  polytrauma_followup_v1: { mustIncludeAny: { en: ["multiple injuries"], fr: ["plusieurs blessures"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  blast_injury_minor_v1: { mustIncludeAny: { en: ["explosion"], fr: ["explosion"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  cervical_strain_v1: { mustIncludeAny: { en: ["cervical", "neck"], fr: ["cervicale", "cou"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  thoracic_strain_v1: { mustIncludeAny: { en: ["thoracic"], fr: ["thoracique"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  lumbar_strain_v1: { mustIncludeAny: { en: ["lumbar"], fr: ["lombaire"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  acute_mechanical_back_pain_v1: { mustIncludeAny: { en: ["mechanical back"], fr: ["dorsale mécanique"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  cervical_radiculopathy_v1: { mustIncludeAny: { en: ["cervical radicular"], fr: ["radiculaires cervicaux"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  lumbar_radiculopathy_sciatica_v1: { mustIncludeAny: { en: ["sciatica", "radiculopathy"], fr: ["sciatique", "radiculopathie"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  disc_herniation_conservative_v1: { mustIncludeAny: { en: ["disc"], fr: ["disque"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  spinal_stenosis_v1: { mustIncludeAny: { en: ["stenosis"], fr: ["sténose"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  vertebral_compression_fracture_v1: { mustIncludeAny: { en: ["vertebral compression"], fr: ["fracture-compression"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  stable_vertebral_fracture_followup_v1: { mustIncludeAny: { en: ["vertebral fracture"], fr: ["fracture vertébrale"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  post_spinal_trauma_evaluation_v1: { mustIncludeAny: { en: ["spinal trauma"], fr: ["traumatisme rachidien"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  post_caudal_red_flag_evaluation_v1: { mustIncludeAny: { en: ["red-flag", "urinary retention"], fr: ["alerte", "rétention urinaire"] }, forbiddenCrossTemplateMarkers: { en: ["safe for discharge"], fr: ["congé sécuritaire"] } },
  spinal_infection_followup_v1: { mustIncludeAny: { en: ["spinal infection", "fever"], fr: ["infection rachidienne", "fièvre"] }, forbiddenCrossTemplateMarkers: { en: ["safe for discharge"], fr: ["congé sécuritaire"] } },
};

function suggestedTextBlob(body: {
  description: string;
  diagnosisInstructions: string;
  medicationTreatment: string;
  treatment?: string;
  returnPrecautions?: string;
  returnWorkSchool?: string;
}): string {
  return [
    body.description,
    body.diagnosisInstructions,
    body.medicationTreatment,
    body.treatment ?? "",
    body.returnPrecautions ?? "",
    body.returnWorkSchool ?? "",
  ]
    .join("\n")
    .toLowerCase();
}

function cardFieldsBlob(card: ProviderDischargeDiagnosisCard): string {
  return [card.description, card.diagnosisInstructions, card.medicationTreatment, card.treatment ?? ""]
    .join("\n")
    .toLowerCase();
}

function markersMissing(blob: string, markers: readonly string[]): string[] {
  if (markers.length === 0) return [];
  const hit = markers.some((marker) => blob.includes(marker.toLowerCase()));
  return hit ? [] : [...markers];
}

function forbiddenPresent(blob: string, markers: readonly string[]): string[] {
  return markers.filter((marker) => blob.includes(marker.toLowerCase()));
}

export function validateProviderDischargeTemplateContentIntegrity(
  template: ProviderDischargeTemplate
): string[] {
  if (template.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) return [];

  const rule = PROVIDER_DISCHARGE_TEMPLATE_CONTENT_INTEGRITY[template.id];
  if (!rule) return [];

  const errors: string[] = [];
  for (const locale of ["en", "fr"] as const) {
    let body;
    try {
      body = getProviderDischargeSuggestedTextBody(template, locale);
    } catch (err) {
      errors.push(`[${template.id}] cannot validate content integrity for ${locale}: ${String(err)}`);
      continue;
    }
    const blob = suggestedTextBlob(body);
    const missing = markersMissing(blob, rule.mustIncludeAny[locale]);
    if (missing.length === rule.mustIncludeAny[locale].length) {
      errors.push(
        `[${template.id}] suggestedText.${locale} missing required content markers (expected one of: ${rule.mustIncludeAny[locale].join(", ")})`
      );
    }
    const forbidden = forbiddenPresent(blob, rule.forbiddenCrossTemplateMarkers[locale]);
    if (forbidden.length > 0) {
      errors.push(
        `[${template.id}] suggestedText.${locale} contains forbidden cross-template markers: ${forbidden.join(", ")}`
      );
    }
  }
  return errors;
}

export function cardTextViolatesExpectedTemplateIntegrity(
  card: ProviderDischargeDiagnosisCard,
  expectedTemplateId: string
): boolean {
  const rule = PROVIDER_DISCHARGE_TEMPLATE_CONTENT_INTEGRITY[expectedTemplateId];
  if (!rule) return false;
  const blob = cardFieldsBlob(card);
  const forbiddenEn = forbiddenPresent(blob, rule.forbiddenCrossTemplateMarkers.en);
  const forbiddenFr = forbiddenPresent(blob, rule.forbiddenCrossTemplateMarkers.fr);
  return forbiddenEn.length > 0 || forbiddenFr.length > 0;
}

/** Synthetic negative test — would a foreign template body fail this template's integrity rule? */
export function foreignTemplateBodyFailsIntegrityRule(
  foreignTemplate: ProviderDischargeTemplate,
  targetTemplateId: string
): boolean {
  const rule = PROVIDER_DISCHARGE_TEMPLATE_CONTENT_INTEGRITY[targetTemplateId];
  if (!rule) return false;
  for (const locale of ["en", "fr"] as const) {
    const body = getProviderDischargeSuggestedTextBody(foreignTemplate, locale);
    const blob = suggestedTextBlob(body);
    const missing = markersMissing(blob, rule.mustIncludeAny[locale]);
    if (missing.length === rule.mustIncludeAny[locale].length) return true;
    const forbidden = forbiddenPresent(blob, rule.forbiddenCrossTemplateMarkers[locale]);
    if (forbidden.length > 0) return true;
  }
  return false;
}
