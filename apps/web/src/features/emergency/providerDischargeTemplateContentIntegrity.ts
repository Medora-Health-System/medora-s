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
/** Phase 12 — guards high-risk ENT post-acute templates against routine otitis/pharyngitis copy-paste. */
const ENT_ROUTINE_OTITIS_PHARYNGITIS_FORBIDDEN_EN = ["ear pain or sore throat"] as const;
const ENT_ROUTINE_OTITIS_PHARYNGITIS_FORBIDDEN_FR = ["otalgie ou un mal de gorge"] as const;

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
  corneal_abrasion_v1: { mustIncludeAny: { en: ["corneal abrasion"], fr: ["abrasion cornéenne"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  corneal_foreign_body_v1: { mustIncludeAny: { en: ["corneal foreign body"], fr: ["corps étranger cornéen"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  post_ocular_foreign_body_removal_v1: { mustIncludeAny: { en: ["removal of a foreign body", "after removal"], fr: ["retrait d'un corps étranger", "après le retrait"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  photokeratitis_v1: { mustIncludeAny: { en: ["photokeratitis"], fr: ["photokératite"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  corneal_ulcer_followup_v1: { mustIncludeAny: { en: ["corneal ulcer"], fr: ["ulcère cornéen"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  chemical_eye_injury_v1: { mustIncludeAny: { en: ["chemical eye exposure"], fr: ["exposition chimique de l'œil"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  traumatic_iritis_v1: { mustIncludeAny: { en: ["traumatic iritis"], fr: ["iritis traumatique"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  hyphema_followup_v1: { mustIncludeAny: { en: ["hyphema"], fr: ["hyphéma"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  open_globe_post_acute_v1: { mustIncludeAny: { en: ["open globe"], fr: ["globe ouvert"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  acute_glaucoma_followup_v1: { mustIncludeAny: { en: ["angle-closure glaucoma"], fr: ["glaucome aigu"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  retinal_detachment_followup_v1: { mustIncludeAny: { en: ["retinal detachment"], fr: ["décollement de la rétine"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  vitreous_hemorrhage_v1: { mustIncludeAny: { en: ["vitreous hemorrhage"], fr: ["hémorragie du vitré"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  orbital_cellulitis_followup_v1: { mustIncludeAny: { en: ["orbital cellulitis"], fr: ["cellulite orbitaire"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  preseptal_cellulitis_v1: { mustIncludeAny: { en: ["preseptal"], fr: ["préseptale"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  uveitis_iritis_v1: { mustIncludeAny: { en: ["uveitis/iritis", "uveitis"], fr: ["uvéite"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  scleritis_v1: { mustIncludeAny: { en: ["scleritis"], fr: ["sclérite"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  eyelid_laceration_v1: { mustIncludeAny: { en: ["eyelid laceration", "eyelid"], fr: ["paupière"] }, forbiddenCrossTemplateMarkers: { en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN, fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR } },
  canalicular_injury_followup_v1: { mustIncludeAny: { en: ["canalicular"], fr: ["canaliculaire"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  endophthalmitis_post_acute_v1: { mustIncludeAny: { en: ["endophthalmitis"], fr: ["endophtalmie"] }, forbiddenCrossTemplateMarkers: { en: [], fr: [] } },
  crao_crvo_followup_v1: {
    mustIncludeAny: { en: ["retinal artery", "retinal vein"], fr: ["artère", "veine"] },
    forbiddenCrossTemplateMarkers: { en: [], fr: [] },
  },
  acute_otitis_externa_v1: {
    mustIncludeAny: { en: ["otitis externa"], fr: ["otite externe"] },
    forbiddenCrossTemplateMarkers: { en: [], fr: [] },
  },
  malignant_otitis_externa_post_acute_v1: {
    mustIncludeAny: { en: ["malignant"], fr: ["maligne"] },
    forbiddenCrossTemplateMarkers: {
      en: ENT_ROUTINE_OTITIS_PHARYNGITIS_FORBIDDEN_EN,
      fr: ENT_ROUTINE_OTITIS_PHARYNGITIS_FORBIDDEN_FR,
    },
  },
  mastoiditis_post_acute_v1: {
    mustIncludeAny: { en: ["mastoiditis"], fr: ["mastoïdite"] },
    forbiddenCrossTemplateMarkers: {
      en: ENT_ROUTINE_OTITIS_PHARYNGITIS_FORBIDDEN_EN,
      fr: ENT_ROUTINE_OTITIS_PHARYNGITIS_FORBIDDEN_FR,
    },
  },
  tm_perforation_v1: {
    mustIncludeAny: { en: ["tympanic membrane perforation"], fr: ["membrane tympanique"] },
    forbiddenCrossTemplateMarkers: { en: [], fr: [] },
  },
  sudden_hearing_loss_followup_v1: {
    mustIncludeAny: { en: ["sudden sensorineural hearing loss", "ssnhl"], fr: ["surdité brusque"] },
    forbiddenCrossTemplateMarkers: {
      en: ENT_ROUTINE_OTITIS_PHARYNGITIS_FORBIDDEN_EN,
      fr: ENT_ROUTINE_OTITIS_PHARYNGITIS_FORBIDDEN_FR,
    },
  },
  bppv_v1: {
    mustIncludeAny: { en: ["benign paroxysmal positional vertigo", "bppv"], fr: ["vertige positionnel paroxystique", "vppb"] },
    forbiddenCrossTemplateMarkers: { en: [], fr: [] },
  },
  vestibular_neuritis_v1: {
    mustIncludeAny: { en: ["vestibular neuritis"], fr: ["névrite vestibulaire"] },
    forbiddenCrossTemplateMarkers: { en: [], fr: [] },
  },
  labyrinthitis_v1: {
    mustIncludeAny: { en: ["labyrinthitis"], fr: ["labyrinthite"] },
    forbiddenCrossTemplateMarkers: { en: [], fr: [] },
  },
  facial_nerve_palsy_v1: {
    mustIncludeAny: { en: ["facial nerve", "bell's palsy"], fr: ["paralysie du nerf facial", "paralysie faciale"] },
    forbiddenCrossTemplateMarkers: { en: [], fr: [] },
  },
  ramsay_hunt_followup_v1: {
    mustIncludeAny: { en: ["ramsay hunt"], fr: ["ramsay hunt"] },
    forbiddenCrossTemplateMarkers: {
      en: ENT_ROUTINE_OTITIS_PHARYNGITIS_FORBIDDEN_EN,
      fr: ENT_ROUTINE_OTITIS_PHARYNGITIS_FORBIDDEN_FR,
    },
  },
  post_nasal_packing_v1: {
    mustIncludeAny: { en: ["nasal packing"], fr: ["tamponnement nasal"] },
    forbiddenCrossTemplateMarkers: { en: [], fr: [] },
  },
  posterior_epistaxis_post_acute_v1: {
    mustIncludeAny: { en: ["posterior epistaxis"], fr: ["épistaxis postérieure"] },
    forbiddenCrossTemplateMarkers: { en: [], fr: [] },
  },
  nasal_foreign_body_v1: {
    mustIncludeAny: { en: ["foreign body in the nose", "nasal foreign body"], fr: ["corps étranger dans le nez"] },
    forbiddenCrossTemplateMarkers: { en: [], fr: [] },
  },
  peritonsillar_abscess_post_drainage_v1: {
    mustIncludeAny: { en: ["peritonsillar abscess"], fr: ["abcès périamygdalien"] },
    forbiddenCrossTemplateMarkers: {
      en: ENT_ROUTINE_OTITIS_PHARYNGITIS_FORBIDDEN_EN,
      fr: ENT_ROUTINE_OTITIS_PHARYNGITIS_FORBIDDEN_FR,
    },
  },
  deep_neck_infection_post_acute_v1: {
    mustIncludeAny: { en: ["deep neck space infection"], fr: ["infection profonde de l'espace du cou"] },
    forbiddenCrossTemplateMarkers: {
      en: ENT_ROUTINE_OTITIS_PHARYNGITIS_FORBIDDEN_EN,
      fr: ENT_ROUTINE_OTITIS_PHARYNGITIS_FORBIDDEN_FR,
    },
  },
  ludwig_angina_post_acute_v1: {
    mustIncludeAny: { en: ["ludwig's angina", "ludwig angina"], fr: ["angine de ludwig"] },
    forbiddenCrossTemplateMarkers: {
      en: ENT_ROUTINE_OTITIS_PHARYNGITIS_FORBIDDEN_EN,
      fr: ENT_ROUTINE_OTITIS_PHARYNGITIS_FORBIDDEN_FR,
    },
  },
  epiglottitis_post_acute_v1: {
    mustIncludeAny: { en: ["epiglottitis"], fr: ["épiglottite"] },
    forbiddenCrossTemplateMarkers: {
      en: ENT_ROUTINE_OTITIS_PHARYNGITIS_FORBIDDEN_EN,
      fr: ENT_ROUTINE_OTITIS_PHARYNGITIS_FORBIDDEN_FR,
    },
  },
  sialadenitis_v1: {
    mustIncludeAny: { en: ["sialadenitis"], fr: ["sialadénite"] },
    forbiddenCrossTemplateMarkers: { en: [], fr: [] },
  },
  salivary_obstruction_v1: {
    mustIncludeAny: { en: ["salivary duct obstruction", "sialolithiasis"], fr: ["obstruction du canal salivaire", "sialolithiase"] },
    forbiddenCrossTemplateMarkers: { en: [], fr: [] },
  },
  throat_foreign_body_followup_v1: {
    mustIncludeAny: { en: ["throat foreign body"], fr: ["corps étranger dans la gorge"] },
    forbiddenCrossTemplateMarkers: { en: [], fr: [] },
  },
  // Phase 13 — Soft tissue / wound infection
  erysipelas_v1: {
    mustIncludeAny: { en: ["erysipelas"], fr: ["érysipèle"] },
    forbiddenCrossTemplateMarkers: {
      en: ["necrotizing soft tissue infection"],
      fr: ["infection nécrosante des tissus mous"],
    },
  },
  post_abscess_drainage_v1: {
    mustIncludeAny: { en: ["abscess that was drained", "incision and drainage"], fr: ["abcès cutané qui a été drainé", "incision et drainage"] },
    forbiddenCrossTemplateMarkers: {
      en: ["skin infection or cellulitis"],
      fr: ["infection cutanée ou une cellulite"],
    },
  },
  abscess_without_drainage_v1: {
    mustIncludeAny: { en: ["abscess that was treated without incision"], fr: ["abcès cutané traité sans incision"] },
    forbiddenCrossTemplateMarkers: {
      en: ["skin infection or cellulitis"],
      fr: ["infection cutanée ou une cellulite"],
    },
  },
  furuncle_carbuncle_v1: {
    mustIncludeAny: { en: ["furuncle", "carbuncle"], fr: ["furoncle", "anthrax"] },
    forbiddenCrossTemplateMarkers: {
      en: ["necrotizing soft tissue infection"],
      fr: ["infection nécrosante des tissus mous"],
    },
  },
  felon_post_procedure_v1: {
    mustIncludeAny: { en: ["felon"], fr: ["phlegmon pulpaire", "felon"] },
    forbiddenCrossTemplateMarkers: {
      en: ["skin infection or cellulitis"],
      fr: ["infection cutanée ou une cellulite"],
    },
  },
  paronychia_v1: {
    mustIncludeAny: { en: ["paronychia"], fr: ["paronychie"] },
    forbiddenCrossTemplateMarkers: {
      en: ["skin infection or cellulitis"],
      fr: ["infection cutanée ou une cellulite"],
    },
  },
  pilonidal_abscess_v1: {
    mustIncludeAny: { en: ["pilonidal abscess"], fr: ["abcès pilonidal"] },
    forbiddenCrossTemplateMarkers: {
      en: ["skin infection or cellulitis"],
      fr: ["infection cutanée ou une cellulite"],
    },
  },
  hidradenitis_flare_v1: {
    mustIncludeAny: { en: ["hidradenitis"], fr: ["hidrosadénite"] },
    forbiddenCrossTemplateMarkers: {
      en: ["skin infection or cellulitis"],
      fr: ["infection cutanée ou une cellulite"],
    },
  },
  postoperative_wound_infection_v1: {
    mustIncludeAny: { en: ["surgical site infection", "surgical wound"], fr: ["infection du site opératoire", "plaie chirurgicale"] },
    forbiddenCrossTemplateMarkers: {
      en: ["skin infection or cellulitis"],
      fr: ["infection cutanée ou une cellulite"],
    },
  },
  wound_dehiscence_post_acute_v1: {
    mustIncludeAny: { en: ["dehiscence"], fr: ["déhiscence"] },
    forbiddenCrossTemplateMarkers: {
      en: ["skin infection or cellulitis"],
      fr: ["infection cutanée ou une cellulite"],
    },
  },
  diabetic_foot_infection_v1: {
    mustIncludeAny: { en: ["diabetic foot infection"], fr: ["infection du pied diabétique"] },
    forbiddenCrossTemplateMarkers: {
      en: ["skin infection or cellulitis"],
      fr: ["infection cutanée ou une cellulite"],
    },
  },
  infected_ulcer_v1: {
    mustIncludeAny: { en: ["infected chronic wound", "ulcer"], fr: ["ulcère infecté", "plaie chronique"] },
    forbiddenCrossTemplateMarkers: {
      en: ["skin infection or cellulitis"],
      fr: ["infection cutanée ou une cellulite"],
    },
  },
  septic_bursitis_v1: {
    mustIncludeAny: { en: ["septic", "bursitis"], fr: ["bursite septique"] },
    forbiddenCrossTemplateMarkers: {
      en: ["skin infection or cellulitis"],
      fr: ["infection cutanée ou une cellulite"],
    },
  },
  deep_hand_infection_post_acute_v1: {
    mustIncludeAny: { en: ["deep space hand infection"], fr: ["infection profonde"] },
    forbiddenCrossTemplateMarkers: {
      en: ["skin infection or cellulitis"],
      fr: ["infection cutanée ou une cellulite"],
    },
  },
  flexor_tenosynovitis_post_acute_v1: {
    mustIncludeAny: { en: ["flexor tenosynovitis"], fr: ["ténosynovite infectieuse des fléchisseurs"] },
    forbiddenCrossTemplateMarkers: {
      en: ["skin infection or cellulitis"],
      fr: ["infection cutanée ou une cellulite"],
    },
  },
  necrotizing_soft_tissue_infection_post_acute_v1: {
    mustIncludeAny: { en: ["necrotizing soft tissue infection", "necrotizing fasciitis"], fr: ["infection nécrosante", "fasciite nécrosante"] },
    forbiddenCrossTemplateMarkers: {
      en: ["skin infection or cellulitis"],
      fr: ["infection cutanée ou une cellulite"],
    },
  },
  pyomyositis_post_acute_v1: {
    mustIncludeAny: { en: ["pyomyositis"], fr: ["pyomyosite"] },
    forbiddenCrossTemplateMarkers: {
      en: ["skin infection or cellulitis"],
      fr: ["infection cutanée ou une cellulite"],
    },
  },
  water_exposed_wound_infection_v1: {
    mustIncludeAny: { en: ["fresh water", "salt water"], fr: ["eau douce", "eau salée"] },
    forbiddenCrossTemplateMarkers: {
      en: ["skin infection or cellulitis"],
      fr: ["infection cutanée ou une cellulite"],
    },
  },
  foreign_body_associated_infection_v1: {
    mustIncludeAny: { en: ["foreign body"], fr: ["corps étranger"] },
    forbiddenCrossTemplateMarkers: {
      en: ["skin infection or cellulitis"],
      fr: ["infection cutanée ou une cellulite"],
    },
  },
  // Phase 14 — Dermatology content integrity rules (Commit 2).
  allergic_contact_dermatitis_v1: {
    mustIncludeAny: { en: ["allergic contact dermatitis"], fr: ["dermite de contact allergique"] },
    forbiddenCrossTemplateMarkers: { en: ["irritant contact dermatitis"], fr: ["dermite de contact irritative"] },
  },
  irritant_contact_dermatitis_v1: {
    mustIncludeAny: { en: ["irritant contact dermatitis"], fr: ["dermite de contact irritative"] },
    forbiddenCrossTemplateMarkers: { en: ["allergic contact dermatitis"], fr: ["dermite de contact allergique"] },
  },
  atopic_dermatitis_v1: {
    mustIncludeAny: { en: ["atopic dermatitis"], fr: ["dermatite atopique"] },
    forbiddenCrossTemplateMarkers: { en: ["eczema herpeticum"], fr: ["eczéma herpétique"] },
  },
  uncomplicated_urticaria_v1: {
    mustIncludeAny: { en: ["uncomplicated urticaria"], fr: ["urticaire non compliquée"] },
    forbiddenCrossTemplateMarkers: { en: ["epinephrine was administered"], fr: ["l'épinéphrine a été administrée"] },
  },
  psoriasis_flare_v1: {
    mustIncludeAny: { en: ["psoriasis flare"], fr: ["poussée de psoriasis"] },
    forbiddenCrossTemplateMarkers: { en: ["generalized pustular psoriasis"], fr: ["psoriasis pustuleux généralisé"] },
  },
  rosacea_v1: {
    mustIncludeAny: { en: ["rosacea"], fr: ["rosacée"] },
    forbiddenCrossTemplateMarkers: { en: ["allergic contact dermatitis"], fr: ["dermite de contact allergique"] },
  },
  impetigo_v1: {
    mustIncludeAny: { en: ["impetigo"], fr: ["impétigo"] },
    forbiddenCrossTemplateMarkers: { en: ["fungal", "tinea"], fr: ["fongique", "tinea"] },
  },
  folliculitis_v1: {
    mustIncludeAny: { en: ["folliculitis"], fr: ["folliculite"] },
    forbiddenCrossTemplateMarkers: { en: ["hidradenitis"], fr: ["hidradénite"] },
  },
  herpes_simplex_v1: {
    mustIncludeAny: { en: ["herpes simplex"], fr: ["herpès simplex"] },
    forbiddenCrossTemplateMarkers: { en: ["herpes zoster", "shingles"], fr: ["zona"] },
  },
  herpes_zoster_v1: {
    mustIncludeAny: { en: ["herpes zoster", "shingles"], fr: ["zona"] },
    forbiddenCrossTemplateMarkers: { en: ["cold sore"], fr: [] },
  },
  ophthalmic_zoster_post_acute_v1: {
    mustIncludeAny: { en: ["herpes zoster ophthalmicus", "ophthalmic zoster"], fr: ["zona ophtalmique"] },
    forbiddenCrossTemplateMarkers: { en: ["ramsay hunt", "herpes simplex"], fr: ["ramsay hunt", "herpès simplex"] },
  },
  varicella_v1: {
    mustIncludeAny: { en: ["varicella", "chickenpox"], fr: ["varicelle"] },
    forbiddenCrossTemplateMarkers: { en: ["herpes zoster", "shingles"], fr: ["zona"] },
  },
  molluscum_contagiosum_v1: {
    mustIncludeAny: { en: ["molluscum contagiosum"], fr: ["molluscum contagiosum", "molluscum contagieux"] },
    forbiddenCrossTemplateMarkers: { en: ["herpes simplex"], fr: ["herpès simplex"] },
  },
  viral_exanthem_v1: {
    mustIncludeAny: { en: ["viral exanthem"], fr: ["exanthème viral"] },
    forbiddenCrossTemplateMarkers: { en: ["drug eruption", "stevens-johnson"], fr: ["éruption médicamenteuse", "stevens-johnson"] },
  },
  pityriasis_rosea_v1: {
    mustIncludeAny: { en: ["pityriasis rosea"], fr: ["pityriasis rosé"] },
    forbiddenCrossTemplateMarkers: { en: ["tinea corporis", "ringworm"], fr: ["dermatophytose"] },
  },
  tinea_corporis_v1: {
    mustIncludeAny: { en: ["tinea corporis"], fr: ["tinea corporis", "dermatophytose du corps"] },
    forbiddenCrossTemplateMarkers: { en: ["allergic contact dermatitis", "atopic dermatitis"], fr: ["dermite de contact allergique", "dermatite atopique"] },
  },
  tinea_capitis_v1: {
    mustIncludeAny: { en: ["tinea capitis"], fr: ["tinea capitis", "teigne du cuir chevelu"] },
    forbiddenCrossTemplateMarkers: { en: ["allergic contact dermatitis", "atopic dermatitis"], fr: ["dermite de contact allergique", "dermatite atopique"] },
  },
  tinea_cruris_v1: {
    mustIncludeAny: { en: ["tinea cruris"], fr: ["tinea cruris", "dermatophytose de l'aine"] },
    forbiddenCrossTemplateMarkers: { en: ["candidal intertrigo"], fr: ["intertrigo candidosique"] },
  },
  tinea_pedis_v1: {
    mustIncludeAny: { en: ["tinea pedis"], fr: ["tinea pedis", "pied d'athlète"] },
    forbiddenCrossTemplateMarkers: { en: ["allergic contact dermatitis"], fr: ["dermite de contact allergique"] },
  },
  tinea_versicolor_v1: {
    mustIncludeAny: { en: ["tinea", "pityriasis versicolor"], fr: ["pityriasis versicolor"] },
    forbiddenCrossTemplateMarkers: { en: ["candidal intertrigo"], fr: ["intertrigo candidosique"] },
  },
  candidal_intertrigo_v1: {
    mustIncludeAny: { en: ["candidal intertrigo"], fr: ["intertrigo candidosique"] },
    forbiddenCrossTemplateMarkers: { en: ["allergic contact dermatitis", "atopic dermatitis"], fr: ["dermite de contact allergique", "dermatite atopique"] },
  },
  scabies_v1: {
    mustIncludeAny: { en: ["scabies"], fr: ["gale"] },
    forbiddenCrossTemplateMarkers: { en: ["pediculosis", "head lice"], fr: ["pédiculose", "poux"] },
  },
  pediculosis_v1: {
    mustIncludeAny: { en: ["pediculosis", "head or body lice"], fr: ["pédiculose"] },
    forbiddenCrossTemplateMarkers: { en: ["scabies"], fr: ["gale"] },
  },
  erythema_multiforme_v1: {
    mustIncludeAny: { en: ["erythema multiforme"], fr: ["érythème polymorphe"] },
    forbiddenCrossTemplateMarkers: { en: ["stevens-johnson syndrome", "toxic epidermal necrolysis"], fr: ["syndrome de stevens-johnson", "nécrolyse épidermique toxique"] },
  },
  drug_eruption_v1: {
    mustIncludeAny: { en: ["drug eruption"], fr: ["éruption médicamenteuse"] },
    forbiddenCrossTemplateMarkers: { en: ["stevens-johnson", "toxic epidermal necrolysis", "dress syndrome"], fr: ["stevens-johnson", "nécrolyse épidermique toxique", "syndrome dress"] },
  },
  sjs_ten_post_acute_v1: {
    mustIncludeAny: { en: ["stevens-johnson syndrome", "toxic epidermal necrolysis"], fr: ["syndrome de stevens-johnson", "nécrolyse épidermique toxique"] },
    forbiddenCrossTemplateMarkers: { en: ["morbilliform"], fr: ["morbiliforme"] },
  },
  dress_post_acute_v1: {
    mustIncludeAny: { en: ["dress syndrome"], fr: ["syndrome dress"] },
    forbiddenCrossTemplateMarkers: { en: ["morbilliform"], fr: ["morbiliforme"] },
  },
  bullous_disorder_post_acute_v1: {
    mustIncludeAny: { en: ["bullous pemphigoid", "pemphigus vulgaris", "autoimmune bullous disorder"], fr: ["pemphigoïde bulleuse", "pemphigus vulgaire", "maladie bulleuse auto-immune"] },
    forbiddenCrossTemplateMarkers: { en: ["atopic dermatitis"], fr: ["dermatite atopique"] },
  },
  cutaneous_vasculitis_followup_v1: {
    mustIncludeAny: { en: ["cutaneous vasculitis"], fr: ["vasculite cutanée"] },
    forbiddenCrossTemplateMarkers: { en: ["purpura fulminans"], fr: ["purpura fulminans"] },
  },
  suspicious_skin_lesion_v1: {
    mustIncludeAny: { en: ["skin lesion"], fr: ["lésion cutanée"] },
    forbiddenCrossTemplateMarkers: { en: ["benign", "not concerning", "no further evaluation needed"], fr: ["bénigne", "aucune évaluation supplémentaire nécessaire"] },
  },
  // Phase 15 — Environmental / exposure content integrity rules (Commit 2).
  heat_cramps_v1: {
    mustIncludeAny: { en: ["heat cramps"], fr: ["crampes de chaleur"] },
    forbiddenCrossTemplateMarkers: { en: ["heat stroke"], fr: ["coup de chaleur"] },
  },
  heat_syncope_v1: {
    mustIncludeAny: { en: ["heat syncope"], fr: ["syncope de chaleur"] },
    forbiddenCrossTemplateMarkers: { en: ["heat stroke"], fr: ["coup de chaleur"] },
  },
  heat_exhaustion_v1: {
    mustIncludeAny: { en: ["heat exhaustion"], fr: ["épuisement par la chaleur"] },
    forbiddenCrossTemplateMarkers: { en: ["life-threatening heat illness"], fr: ["maladie liée à la chaleur mettant en jeu le pronostic vital"] },
  },
  exertional_heat_illness_v1: {
    mustIncludeAny: { en: ["exertional heat illness"], fr: ["maladie de chaleur liée à l'effort"] },
    forbiddenCrossTemplateMarkers: { en: ["heat stroke"], fr: ["coup de chaleur"] },
  },
  heat_stroke_post_acute_v1: {
    mustIncludeAny: { en: ["heat stroke"], fr: ["coup de chaleur"] },
    forbiddenCrossTemplateMarkers: { en: ["heat exhaustion — a heat-related illness with symptoms such as heavy sweating"], fr: ["épuisement par la chaleur — une maladie liée à la chaleur avec des symptômes comme une transpiration abondante"] },
  },
  mild_hypothermia_v1: {
    mustIncludeAny: { en: ["mild hypothermia"], fr: ["hypothermie légère"] },
    forbiddenCrossTemplateMarkers: { en: ["severe hypothermia"], fr: ["hypothermie sévère"] },
  },
  hypothermia_post_acute_v1: {
    mustIncludeAny: { en: ["hypothermia"], fr: ["hypothermie"] },
    forbiddenCrossTemplateMarkers: { en: ["mild hypothermia — a cold-related illness"], fr: ["hypothermie légère — une maladie liée au froid"] },
  },
  superficial_frostbite_v1: {
    mustIncludeAny: { en: ["superficial frostbite", "frostnip"], fr: ["gelure superficielle"] },
    forbiddenCrossTemplateMarkers: { en: ["tissue necrosis"], fr: ["nécrose tissulaire"] },
  },
  deep_frostbite_post_acute_v1: {
    mustIncludeAny: { en: ["deep frostbite", "frostbite with tissue necrosis"], fr: ["gelure profonde"] },
    forbiddenCrossTemplateMarkers: { en: ["frostnip"], fr: ["engelures"] },
  },
  chilblains_pernio_v1: {
    mustIncludeAny: { en: ["chilblains", "pernio"], fr: ["engelures"] },
    forbiddenCrossTemplateMarkers: { en: ["frostbite with tissue necrosis"], fr: ["gelure avec nécrose"] },
  },
  immersion_foot_v1: {
    mustIncludeAny: { en: ["immersion foot", "trench foot"], fr: ["pied d'immersion", "pied des tranchées"] },
    forbiddenCrossTemplateMarkers: { en: ["dry drowning", "secondary drowning"], fr: ["noyade sèche", "noyade secondaire"] },
  },
  post_submersion_observation_v1: {
    mustIncludeAny: { en: ["submersion"], fr: ["submersion"] },
    forbiddenCrossTemplateMarkers: { en: ["dry drowning", "secondary drowning"], fr: ["noyade sèche", "noyade secondaire"] },
  },
  nonfatal_drowning_post_acute_v1: {
    mustIncludeAny: { en: ["nonfatal drowning", "drowning"], fr: ["noyade non mortelle", "noyade"] },
    forbiddenCrossTemplateMarkers: { en: ["dry drowning", "secondary drowning"], fr: ["noyade sèche", "noyade secondaire"] },
  },
  low_voltage_electrical_injury_v1: {
    mustIncludeAny: { en: ["low-voltage", "low voltage"], fr: ["basse tension"] },
    forbiddenCrossTemplateMarkers: { en: ["high-voltage electrical injury post-acute"], fr: ["haute tension soins post-aigus"] },
  },
  high_voltage_electrical_injury_post_acute_v1: {
    mustIncludeAny: { en: ["high-voltage", "high voltage"], fr: ["haute tension"] },
    forbiddenCrossTemplateMarkers: { en: ["low-voltage electrical injury —"], fr: ["blessure électrique basse tension —"] },
  },
  lightning_injury_post_acute_v1: {
    mustIncludeAny: { en: ["lightning"], fr: ["foudre", "foudroiement"] },
    forbiddenCrossTemplateMarkers: { en: ["ordinary household electrical injury only"], fr: ["blessure électrique domestique ordinaire uniquement"] },
  },
  acute_mountain_sickness_v1: {
    mustIncludeAny: { en: ["acute mountain sickness", "altitude"], fr: ["mal des montagnes", "altitude"] },
    forbiddenCrossTemplateMarkers: { en: ["high-altitude cerebral edema", "high-altitude pulmonary edema"], fr: ["œdème cérébral de haute altitude", "œdème pulmonaire de haute altitude"] },
  },
  hace_post_acute_v1: {
    mustIncludeAny: { en: ["high-altitude cerebral edema", "hace"], fr: ["œdème cérébral de haute altitude"] },
    forbiddenCrossTemplateMarkers: { en: ["routine acute mountain sickness"], fr: ["mal des montagnes non compliqué"] },
  },
  hape_post_acute_v1: {
    mustIncludeAny: { en: ["high-altitude pulmonary edema", "hape"], fr: ["œdème pulmonaire de haute altitude"] },
    forbiddenCrossTemplateMarkers: { en: ["routine acute mountain sickness"], fr: ["mal des montagnes non compliqué"] },
  },
  barotrauma_v1: {
    mustIncludeAny: { en: ["diving barotrauma", "barotrauma"], fr: ["barotraumatisme"] },
    forbiddenCrossTemplateMarkers: { en: ["decompression sickness"], fr: ["maladie de décompression"] },
  },
  decompression_illness_post_acute_v1: {
    mustIncludeAny: { en: ["decompression"], fr: ["décompression"] },
    forbiddenCrossTemplateMarkers: { en: ["generic joint pain only"], fr: ["douleur articulaire générique uniquement"] },
  },
  radiation_exposure_followup_v1: {
    mustIncludeAny: { en: ["radiation exposure"], fr: ["exposition aux radiations", "exposition"] },
    forbiddenCrossTemplateMarkers: { en: ["acute radiation syndrome"], fr: ["syndrome d'irradiation aiguë"] },
  },
  radiation_injury_post_acute_v1: {
    mustIncludeAny: { en: ["radiation injury", "radiation syndrome"], fr: ["lésion par radiation", "irradiation"] },
    forbiddenCrossTemplateMarkers: { en: ["exposure only without injury"], fr: ["exposition seule sans lésion"] },
  },
  // Phase 16 — Toxicology / envenomation content integrity rules (Commit 2).
  low_risk_toxic_exposure_v1: {
    mustIncludeAny: { en: ['low-risk toxic exposure'], fr: ['exposition toxique à faible risque'] },
    forbiddenCrossTemplateMarkers: { en: ['medically cleared'], fr: ['clearance médicale'] },
  },
  accidental_ingestion_v1: {
    mustIncludeAny: { en: ['accidental ingestion'], fr: ['ingestion accidentelle'] },
    forbiddenCrossTemplateMarkers: { en: ['medically cleared'], fr: ['clearance médicale'] },
  },
  acetaminophen_exposure_followup_v1: {
    mustIncludeAny: { en: ['acetaminophen'], fr: ['paracétamol'] },
    forbiddenCrossTemplateMarkers: { en: ['medically cleared'], fr: ['clearance médicale'] },
  },
  salicylate_exposure_followup_v1: {
    mustIncludeAny: { en: ['salicylate'], fr: ['salicylates'] },
    forbiddenCrossTemplateMarkers: { en: ['medically cleared'], fr: ['clearance médicale'] },
  },
  opioid_overdose_post_observation_v1: {
    mustIncludeAny: { en: ['opioid'], fr: ['opioïdes'] },
    forbiddenCrossTemplateMarkers: { en: ['medically cleared'], fr: ['clearance médicale'] },
  },
  sedative_overdose_post_observation_v1: {
    mustIncludeAny: { en: ['sedative', 'benzodiazepine'], fr: ['sédatif', 'benzodiazépine'] },
    forbiddenCrossTemplateMarkers: { en: ['medically cleared'], fr: ['clearance médicale'] },
  },
  alcohol_withdrawal_post_acute_v1: {
    mustIncludeAny: { en: ['alcohol withdrawal'], fr: ['sevrage alcoolique'] },
    forbiddenCrossTemplateMarkers: { en: ['medically cleared'], fr: ['clearance médicale'] },
  },
  stimulant_intoxication_v1: {
    mustIncludeAny: { en: ['stimulant'], fr: ['stimulants'] },
    forbiddenCrossTemplateMarkers: { en: ['excited delirium'], fr: ['délire excité'] },
  },
  cannabis_intoxication_v1: {
    mustIncludeAny: { en: ['cannabis'], fr: ['cannabis'] },
    forbiddenCrossTemplateMarkers: { en: ['medically cleared'], fr: ['clearance médicale'] },
  },
  unknown_ingestion_post_observation_v1: {
    mustIncludeAny: { en: ['unknown', 'mixed'], fr: ['inconnue', 'mixte'] },
    forbiddenCrossTemplateMarkers: { en: ['medically cleared'], fr: ['clearance médicale'] },
  },
  carbon_monoxide_post_acute_v1: {
    mustIncludeAny: { en: ['carbon monoxide'], fr: ['monoxyde de carbone'] },
    forbiddenCrossTemplateMarkers: { en: ['pulse oximetry alone excludes'], fr: ['oxymétrie de pouls seule exclut'] },
  },
  caustic_ingestion_post_acute_v1: {
    mustIncludeAny: { en: ['caustic', 'corrosive'], fr: ['caustique', 'corrosive'] },
    forbiddenCrossTemplateMarkers: { en: ['induce vomiting at home'], fr: ['provoquez des vomissements à domicile'] },
  },
  hydrocarbon_exposure_v1: {
    mustIncludeAny: { en: ['hydrocarbon'], fr: ['hydrocarbures'] },
    forbiddenCrossTemplateMarkers: { en: ['induce vomiting at home'], fr: ['provoquez des vomissements à domicile'] },
  },
  pesticide_exposure_post_acute_v1: {
    mustIncludeAny: { en: ['pesticide', 'organophosphate'], fr: ['pesticides', 'organophosphorés'] },
    forbiddenCrossTemplateMarkers: { en: ['medically cleared'], fr: ['clearance médicale'] },
  },
  methemoglobinemia_post_acute_v1: {
    mustIncludeAny: { en: ['methemoglobinemia'], fr: ['méthémoglobinémie'] },
    forbiddenCrossTemplateMarkers: { en: ['from cyanosis alone without'], fr: ['à partir de la cyanose seule sans'] },
  },
  snake_envenomation_post_acute_v1: {
    mustIncludeAny: { en: ['snake envenomation'], fr: ['envenimation par serpent'] },
    forbiddenCrossTemplateMarkers: { en: ['apply a tight tourniquet', 'cut the wound', 'suck the venom'], fr: ['appliquez un garrot serré', 'incisez la plaie', 'aspirez le venin'] },
  },
  spider_envenomation_v1: {
    mustIncludeAny: { en: ['spider'], fr: ['araignée'] },
    forbiddenCrossTemplateMarkers: { en: ['dog bite discharge'], fr: ['morsure de chien'] },
  },
  scorpion_envenomation_v1: {
    mustIncludeAny: { en: ['scorpion'], fr: ['scorpion'] },
    forbiddenCrossTemplateMarkers: { en: ['dog bite discharge'], fr: ['morsure de chien'] },
  },
  marine_envenomation_v1: {
    mustIncludeAny: { en: ['marine'], fr: ['marine'] },
    forbiddenCrossTemplateMarkers: { en: ['dog bite discharge'], fr: ['morsure de chien'] },
  },
  poison_control_followup_v1: {
    mustIncludeAny: { en: ['poison control', 'poison-control'], fr: ['centre antipoison'] },
    forbiddenCrossTemplateMarkers: { en: ['medically cleared'], fr: ['clearance médicale'] },
  },
  // Phase 17 — OB/GYN / urology content integrity rules (Commit 2).
  early_pregnancy_bleeding_v1: {
    mustIncludeAny: { en: ["early pregnancy bleeding","début de grossesse"], fr: ["early pregnancy bleeding","début de grossesse"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  pregnancy_unknown_location_v1: {
    mustIncludeAny: { en: ["unknown location","localisation inconnue"], fr: ["unknown location","localisation inconnue"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  threatened_abortion_v1: {
    mustIncludeAny: { en: ["threatened abortion","menace d'avortement"], fr: ["threatened abortion","menace d'avortement"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  early_pregnancy_loss_post_acute_v1: {
    mustIncludeAny: { en: ["pregnancy loss","perte de grossesse"], fr: ["pregnancy loss","perte de grossesse"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  ectopic_pregnancy_post_acute_v1: {
    mustIncludeAny: { en: ["ectopic pregnancy","grossesse ectopique"], fr: ["ectopic pregnancy","grossesse ectopique"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  hyperemesis_gravidarum_v1: {
    mustIncludeAny: { en: ["hyperemesis","hyperémèse"], fr: ["hyperemesis","hyperémèse"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  pregnancy_abdominal_pain_v1: {
    mustIncludeAny: { en: ["pregnancy abdominal pain","douleur abdominale grossesse"], fr: ["pregnancy abdominal pain","douleur abdominale grossesse"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  late_pregnancy_bleeding_post_acute_v1: {
    mustIncludeAny: { en: ["late pregnancy bleeding","fin de grossesse"], fr: ["late pregnancy bleeding","fin de grossesse"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  false_labor_v1: {
    mustIncludeAny: { en: ["false labor","fausse couche de travail"], fr: ["false labor","fausse couche de travail"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  preterm_labor_post_acute_v1: {
    mustIncludeAny: { en: ["preterm labor","travail prématuré"], fr: ["preterm labor","travail prématuré"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  rupture_of_membranes_post_acute_v1: {
    mustIncludeAny: { en: ["rupture of membranes","rupture des membranes"], fr: ["rupture of membranes","rupture des membranes"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  hypertensive_pregnancy_post_acute_v1: {
    mustIncludeAny: { en: ["hypertensive pregnancy","hypertension grossesse"], fr: ["hypertensive pregnancy","hypertension grossesse"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  postpartum_bleeding_post_acute_v1: {
    mustIncludeAny: { en: ["postpartum bleeding","saignement post-partum"], fr: ["postpartum bleeding","saignement post-partum"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  postpartum_endometritis_v1: {
    mustIncludeAny: { en: ["postpartum endometritis","endométrite post-partum"], fr: ["postpartum endometritis","endométrite post-partum"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  postpartum_hypertension_v1: {
    mustIncludeAny: { en: ["postpartum hypertension","hypertension post-partum"], fr: ["postpartum hypertension","hypertension post-partum"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  acute_pelvic_pain_v1: {
    mustIncludeAny: { en: ["acute pelvic pain","douleur pelvienne aiguë"], fr: ["acute pelvic pain","douleur pelvienne aiguë"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  ovarian_cyst_v1: {
    mustIncludeAny: { en: ["ovarian cyst","kyste ovarien"], fr: ["ovarian cyst","kyste ovarien"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  ovarian_torsion_post_acute_v1: {
    mustIncludeAny: { en: ["ovarian torsion","torsion ovarienne"], fr: ["ovarian torsion","torsion ovarienne"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  pelvic_inflammatory_disease_v1: {
    mustIncludeAny: { en: ["pelvic inflammatory","pelvienne inflammatoire"], fr: ["pelvic inflammatory","pelvienne inflammatoire"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  tubo_ovarian_abscess_post_acute_v1: {
    mustIncludeAny: { en: ["tubo-ovarian abscess","abcès tubo-ovarien"], fr: ["tubo-ovarian abscess","abcès tubo-ovarien"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  cervicitis_v1: {
    mustIncludeAny: { en: ["cervicitis","cervicite"], fr: ["cervicitis","cervicite"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  vaginitis_v1: {
    mustIncludeAny: { en: ["vaginitis","vaginite"], fr: ["vaginitis","vaginite"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  bartholin_cyst_abscess_v1: {
    mustIncludeAny: { en: ["Bartholin","Bartholin"], fr: ["Bartholin","Bartholin"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  abnormal_uterine_bleeding_v1: {
    mustIncludeAny: { en: ["uterine bleeding","saignements utérins"], fr: ["uterine bleeding","saignements utérins"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  postmenopausal_bleeding_v1: {
    mustIncludeAny: { en: ["postmenopausal bleeding","postménopausique"], fr: ["postmenopausal bleeding","postménopausique"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  vaginal_foreign_body_v1: {
    mustIncludeAny: { en: ["foreign body","corps étranger"], fr: ["foreign body","corps étranger"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  iud_complication_v1: {
    mustIncludeAny: { en: ["IUD","DIU"], fr: ["IUD","DIU"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  uncomplicated_renal_colic_v1: {
    mustIncludeAny: { en: ["renal colic","colique néphrétique"], fr: ["renal colic","colique néphrétique"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  obstructing_ureteral_stone_post_acute_v1: {
    mustIncludeAny: { en: ["obstructing stone","obstructif"], fr: ["obstructing stone","obstructif"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  cystitis_v1: {
    mustIncludeAny: { en: ["cystitis","cystite"], fr: ["cystitis","cystite"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  pyelonephritis_v1: {
    mustIncludeAny: { en: ["pyelonephritis","pyélonéphrite"], fr: ["pyelonephritis","pyélonéphrite"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  infected_obstructed_stone_post_acute_v1: {
    mustIncludeAny: { en: ["infected obstructed","obstructive infect"], fr: ["infected obstructed","obstructive infect"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  hematuria_v1: {
    mustIncludeAny: { en: ["hematuria","hématurie"], fr: ["hematuria","hématurie"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  urinary_retention_v1: {
    mustIncludeAny: { en: ["urinary retention","rétention urinaire"], fr: ["urinary retention","rétention urinaire"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  urinary_catheter_complication_v1: {
    mustIncludeAny: { en: ["catheter complication","sonde urinaire"], fr: ["catheter complication","sonde urinaire"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  epididymitis_v1: {
    mustIncludeAny: { en: ["epididymitis","épididymite"], fr: ["epididymitis","épididymite"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  orchitis_v1: {
    mustIncludeAny: { en: ["orchitis","orchidite"], fr: ["orchitis","orchidite"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  testicular_torsion_post_acute_v1: {
    mustIncludeAny: { en: ["testicular torsion","torsion testiculaire"], fr: ["testicular torsion","torsion testiculaire"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  prostatitis_v1: {
    mustIncludeAny: { en: ["prostatitis","prostatite"], fr: ["prostatitis","prostatite"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  urethritis_v1: {
    mustIncludeAny: { en: ["urethritis","uretrite"], fr: ["urethritis","uretrite"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  priapism_post_acute_v1: {
    mustIncludeAny: { en: ["priapism","priapisme"], fr: ["priapism","priapisme"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  paraphimosis_post_acute_v1: {
    mustIncludeAny: { en: ["paraphimosis","paraphimosis"], fr: ["paraphimosis","paraphimosis"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  penile_fracture_post_acute_v1: {
    mustIncludeAny: { en: ["penile fracture","fracture pénienne"], fr: ["penile fracture","fracture pénienne"] },
    forbiddenCrossTemplateMarkers: {"en":["ectopic excluded","torsion excluded","medically cleared","fetal well-being confirmed"],"fr":["ectopique exclue","torsion exclue","clearance médicale","bien-être fœtal confirmé"]},
  },
  // Phase 18 — psychiatric / behavioral content integrity (Commit 2).
  suicidal_ideation_post_assessment_v1: {
    mustIncludeAny: { en: ["suicidal ideation","crisis resources"], fr: ["idées suicidaires","ressources de crise"] },
    forbiddenCrossTemplateMarkers: { en: ["medically cleared", "safe for discharge", "low risk for suicide"], fr: ["clearance médicale", "safe for discharge"] },
  },
  self_harm_post_assessment_v1: {
    mustIncludeAny: { en: ["self-harm","non-suicidal"], fr: ["automutilation","non suicidaire"] },
    forbiddenCrossTemplateMarkers: { en: ["medically cleared", "safe for discharge"], fr: ["clearance médicale"] },
  },
  suicide_attempt_post_acute_v1: {
    mustIncludeAny: { en: ["suicide attempt","self-inflicted"], fr: ["tentative de suicide","auto-infligée"] },
    forbiddenCrossTemplateMarkers: { en: ["medically cleared", "safe for discharge"], fr: ["clearance médicale"] },
  },
  depression_crisis_v1: {
    mustIncludeAny: { en: ["depression","crisis resources"], fr: ["dépression","ressources de crise"] },
    forbiddenCrossTemplateMarkers: { en: ["medically cleared", "low risk for suicide"], fr: ["clearance médicale"] },
  },
  anxiety_panic_crisis_v1: {
    mustIncludeAny: { en: ["anxiety","panic"], fr: ["anxiété","angoisse"] },
    forbiddenCrossTemplateMarkers: { en: ["medically cleared"], fr: ["clearance médicale"] },
  },
  acute_stress_reaction_v1: {
    mustIncludeAny: { en: ["stress reaction","crisis resources"], fr: ["réaction aiguë au stress","ressources de crise"] },
    forbiddenCrossTemplateMarkers: { en: ["medically cleared"], fr: ["clearance médicale"] },
  },
  psychosis_post_acute_v1: {
    mustIncludeAny: { en: ["psychosis","hallucinations"], fr: ["psychose","hallucinations"] },
    forbiddenCrossTemplateMarkers: { en: ["not psychotic", "medically cleared"], fr: ["clearance médicale"] },
  },
  mania_post_acute_v1: {
    mustIncludeAny: { en: ["mania","behavioral"], fr: ["manie","comportemental"] },
    forbiddenCrossTemplateMarkers: { en: ["medically cleared"], fr: ["clearance médicale"] },
  },
  behavioral_agitation_post_acute_v1: {
    mustIncludeAny: { en: ["agitation","crisis"], fr: ["agitation","crise"] },
    forbiddenCrossTemplateMarkers: { en: ["medically cleared"], fr: ["clearance médicale"] },
  },
  substance_induced_behavioral_crisis_v1: {
    mustIncludeAny: { en: ["substance","behavioral health"], fr: ["substance","santé comportementale"] },
    forbiddenCrossTemplateMarkers: { en: ["intoxication resolved", "clinically sober"], fr: ["clearance médicale"] },
  },
  delirium_post_acute_v1: {
    mustIncludeAny: { en: ["delirium","medical emergency"], fr: ["délirium","urgence médicale"] },
    forbiddenCrossTemplateMarkers: { en: ["medically cleared"], fr: ["clearance médicale"] },
  },
  dementia_behavior_change_v1: {
    mustIncludeAny: { en: ["dementia","behavioral"], fr: ["démence","comportemental"] },
    forbiddenCrossTemplateMarkers: { en: ["medically cleared"], fr: ["clearance médicale"] },
  },
  catatonia_post_acute_v1: {
    mustIncludeAny: { en: ["catatonia","crisis"], fr: ["catatonie","crise"] },
    forbiddenCrossTemplateMarkers: { en: ["medically cleared"], fr: ["clearance médicale"] },
  },
  eating_disorder_medical_followup_v1: {
    mustIncludeAny: { en: ["eating disorder","follow-up"], fr: ["trouble de l'alimentation","suivi"] },
    forbiddenCrossTemplateMarkers: { en: ["medically cleared"], fr: ["clearance médicale"] },
  },
  pediatric_behavioral_crisis_v1: {
    mustIncludeAny: { en: ["pediatric","behavioral"], fr: ["pédiatrique","comportemental"] },
    forbiddenCrossTemplateMarkers: { en: ["medically cleared"], fr: ["clearance médicale"] },
  },
  postpartum_psychiatric_crisis_post_acute_v1: {
    mustIncludeAny: { en: ["postpartum","obstetric"], fr: ["post-partum","obstétrical"] },
    forbiddenCrossTemplateMarkers: { en: ["medically cleared", "routine psychiatric outpatient"], fr: ["clearance médicale"] },
  },
  informed_refusal_v1: {
    mustIncludeAny: { en: ["refusal","capacity"], fr: ["refus","capacité"] },
    forbiddenCrossTemplateMarkers: { en: ["has capacity", "lacks capacity"], fr: ["has capacity", "lacks capacity"] },
  },
  against_medical_advice_v1: {
    mustIncludeAny: { en: ["against medical advice","AMA"], fr: ["contre avis médical"] },
    forbiddenCrossTemplateMarkers: { en: ["has capacity", "lacks capacity"], fr: ["has capacity", "lacks capacity"] },
  },
  behavioral_health_safety_plan_v1: {
    mustIncludeAny: { en: ["safety plan","crisis resources"], fr: ["plan de sécurité","ressources de crise"] },
    forbiddenCrossTemplateMarkers: { en: ["medically cleared"], fr: ["clearance médicale"] },
  },
  crisis_resource_followup_v1: {
    mustIncludeAny: { en: ["crisis resource","crisis line"], fr: ["ressources de crise","ligne de crise"] },
    forbiddenCrossTemplateMarkers: { en: ["medically cleared"], fr: ["clearance médicale"] },
  },
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
