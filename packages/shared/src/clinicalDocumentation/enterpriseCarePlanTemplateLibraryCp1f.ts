/**
 * MEDUI.CP.1F addendum — curated enterprise Care Plan template library expansion.
 * Projection metadata only (category). Same activation/deep-copy engine as D4B.6.
 * Catalog expansion ≠ CDS expansion. No orders / MAR / diagnosis / discharge side effects.
 */

import type { CarePlanTemplateDefinition } from "./enterpriseInterdisciplinaryCarePlansD4b6.js";

export const CARE_PLAN_TEMPLATE_CATEGORIES = [
  "SAFETY",
  "RESPIRATORY",
  "CARDIOVASCULAR",
  "NEUROLOGIC",
  "GI_NUTRITION",
  "RENAL_GU",
  "ENDOCRINE",
  "MOBILITY",
  "SKIN_WOUND",
  "PAIN_COMFORT",
  "INFECTION",
  "POSTOPERATIVE",
  "PSYCHOSOCIAL",
  "DISCHARGE",
] as const;

export type CarePlanTemplateCategory = (typeof CARE_PLAN_TEMPLATE_CATEGORIES)[number];

export const CARE_PLAN_TEMPLATE_CATEGORY_LABEL_KEYS: Record<CarePlanTemplateCategory, string> = {
  SAFETY: "enterpriseInterdisciplinaryCarePlansD4b6.categories.SAFETY",
  RESPIRATORY: "enterpriseInterdisciplinaryCarePlansD4b6.categories.RESPIRATORY",
  CARDIOVASCULAR: "enterpriseInterdisciplinaryCarePlansD4b6.categories.CARDIOVASCULAR",
  NEUROLOGIC: "enterpriseInterdisciplinaryCarePlansD4b6.categories.NEUROLOGIC",
  GI_NUTRITION: "enterpriseInterdisciplinaryCarePlansD4b6.categories.GI_NUTRITION",
  RENAL_GU: "enterpriseInterdisciplinaryCarePlansD4b6.categories.RENAL_GU",
  ENDOCRINE: "enterpriseInterdisciplinaryCarePlansD4b6.categories.ENDOCRINE",
  MOBILITY: "enterpriseInterdisciplinaryCarePlansD4b6.categories.MOBILITY",
  SKIN_WOUND: "enterpriseInterdisciplinaryCarePlansD4b6.categories.SKIN_WOUND",
  PAIN_COMFORT: "enterpriseInterdisciplinaryCarePlansD4b6.categories.PAIN_COMFORT",
  INFECTION: "enterpriseInterdisciplinaryCarePlansD4b6.categories.INFECTION",
  POSTOPERATIVE: "enterpriseInterdisciplinaryCarePlansD4b6.categories.POSTOPERATIVE",
  PSYCHOSOCIAL: "enterpriseInterdisciplinaryCarePlansD4b6.categories.PSYCHOSOCIAL",
  DISCHARGE: "enterpriseInterdisciplinaryCarePlansD4b6.categories.DISCHARGE",
};

/** Existing D4B.6 starter IDs — must remain ACTIVE and backward compatible. */
export const CARE_PLAN_LEGACY_STARTER_TEMPLATE_IDS = [
  "fall_risk",
  "aspiration_risk",
  "acute_pain",
  "pneumonia",
  "chf",
  "impaired_mobility",
  "pressure_injury_risk",
  "discharge_readiness",
] as const;

export const CARE_PLAN_LEGACY_TEMPLATE_CATEGORIES: Record<(typeof CARE_PLAN_LEGACY_STARTER_TEMPLATE_IDS)[number], CarePlanTemplateCategory> = {
  fall_risk: "SAFETY",
  aspiration_risk: "SAFETY",
  acute_pain: "PAIN_COMFORT",
  pneumonia: "RESPIRATORY",
  chf: "CARDIOVASCULAR",
  impaired_mobility: "MOBILITY",
  pressure_injury_risk: "SKIN_WOUND",
  discharge_readiness: "DISCHARGE",
};

/** Extra search aliases for legacy starters (synonyms only — no duplicate templates). */
export const CARE_PLAN_LEGACY_ALIAS_ENRICHMENT: Record<string, readonly string[]> = {
  fall_risk: ["falls", "chute de lit"],
  aspiration_risk: ["swallow screen", "fausse route"],
  acute_pain: ["douleur aiguë", "acute pain"],
  pneumonia: ["PNA", "CAP"],
  chf: ["HF", "congestive heart failure", "insuffisance cardiaque congestive"],
  impaired_mobility: ["ambulation deficit", "déficit de mobilité"],
  pressure_injury_risk: ["decubitus", "braden", "bedsore", "ulcère de pression"],
  discharge_readiness: ["transition", "préparation à la sortie"],
};

function tplComponent(
  componentId: string,
  kind: CarePlanTemplateDefinition["components"][number]["kind"],
  titleKey: string,
  bodyKey: string,
  disciplineHint: CarePlanTemplateDefinition["components"][number]["disciplineHint"],
  safetyDoesNotAuthorizePrecaution = kind === "SAFETY"
): CarePlanTemplateDefinition["components"][number] {
  return {
    componentId,
    kind,
    titleKey,
    bodyKey,
    disciplineHint,
    isRecommendationNotOrder: true,
    safetyDoesNotAuthorizePrecaution,
  };
}

function buildExpandedTemplate(input: {
  templateId: string;
  key: string;
  category: CarePlanTemplateCategory;
  aliases: readonly string[];
  discipline: CarePlanTemplateDefinition["components"][number]["disciplineHint"];
  hasSafety: boolean;
  conditionTags?: readonly string[];
  riskTags?: readonly string[];
}): CarePlanTemplateDefinition {
  const p = `enterpriseInterdisciplinaryCarePlansD4b6.templates.${input.key}`;
  const id = input.templateId;
  const components: CarePlanTemplateDefinition["components"][number][] = [
    tplComponent(`${id}_focus`, "FOCUS", `${p}.focus`, `${p}.focusBody`, input.discipline),
    tplComponent(`${id}_goal`, "GOAL", `${p}.goal`, `${p}.goalBody`, input.discipline),
    tplComponent(`${id}_outcome`, "OUTCOME", `${p}.outcome`, `${p}.outcomeBody`, "SHARED"),
    tplComponent(`${id}_intervention`, "INTERVENTION", `${p}.intervention`, `${p}.interventionBody`, input.discipline),
    tplComponent(`${id}_monitoring`, "MONITORING", `${p}.monitoring`, `${p}.monitoringBody`, input.discipline),
    tplComponent(`${id}_education`, "EDUCATION", `${p}.education`, `${p}.educationBody`, input.discipline),
  ];
  if (input.hasSafety) {
    components.push(
      tplComponent(`${id}_safety`, "SAFETY", `${p}.safety`, `${p}.safetyBody`, "NURSING", true)
    );
  }
  return {
    templateId: input.templateId,
    version: "CP.1F.1",
    governanceStatus: "ACTIVE",
    titleKey: `${p}.title`,
    descriptionKey: `${p}.description`,
    category: input.category,
    searchAliases: input.aliases,
    conditionTags: input.conditionTags ?? [],
    riskTags: input.riskTags ?? [],
    selectedInD4b6: true,
    deferredReasonKey: null,
    sourceImmutableOnActivation: true,
    autoActivateFromDiagnosisAlone: false,
    components,
  };
}

/** CP.1F curated expansions (ACTIVE). Deferred empty stubs remain in the base catalog. */
export const CARE_PLAN_CP1F_EXPANDED_TEMPLATES: readonly CarePlanTemplateDefinition[] = [
  buildExpandedTemplate({
    templateId: "seizure_precautions",
    key: "seizurePrecautions",
    category: "SAFETY",
    aliases: ["seizure", "convulsion", "épilepsie", "epilepsy", "precautions"],
    discipline: "NURSING",
    hasSafety: true,
  }),
  buildExpandedTemplate({
    templateId: "bleeding_risk",
    key: "bleedingRisk",
    category: "SAFETY",
    aliases: ["bleeding", "hémorragie", "hemorrhage", "bleed", "saignement"],
    discipline: "NURSING",
    hasSafety: true,
  }),
  buildExpandedTemplate({
    templateId: "infection_prevention",
    key: "infectionPrevention",
    category: "SAFETY",
    aliases: ["infection prevention", "prévention infection", "hand hygiene", "hygiène des mains"],
    discipline: "NURSING",
    hasSafety: true,
  }),
  buildExpandedTemplate({
    templateId: "delirium_safety",
    key: "deliriumSafety",
    category: "SAFETY",
    aliases: ["delirium", "délire", "confusion", "AMS safety"],
    discipline: "NURSING",
    hasSafety: true,
  }),
  buildExpandedTemplate({
    templateId: "impaired_gas_exchange",
    key: "impairedGasExchange",
    category: "RESPIRATORY",
    aliases: ["gas exchange", "échanges gazeux", "hypoxemia", "hypoxémie", "SpO2", "oxygenation"],
    discipline: "SHARED",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "ineffective_airway_clearance",
    key: "ineffectiveAirwayClearance",
    category: "RESPIRATORY",
    aliases: ["airway clearance", "sécrétions", "cough", "toux", "expectoration"],
    discipline: "SHARED",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "copd_exacerbation",
    key: "copdExacerbation",
    category: "RESPIRATORY",
    aliases: ["COPD", "BPCO", "exacerbation COPD", "exacerbation BPCO"],
    discipline: "SHARED",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "asthma_exacerbation",
    key: "asthmaExacerbation",
    category: "RESPIRATORY",
    aliases: ["asthma", "asthme", "wheeze", "sibilances"],
    discipline: "SHARED",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "oxygen_therapy_support",
    key: "oxygenTherapySupport",
    category: "RESPIRATORY",
    aliases: ["oxygen", "O2", "oxygène", "oxygénothérapie", "SpO2 target"],
    discipline: "SHARED",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "pulmonary_hygiene",
    key: "pulmonaryHygiene",
    category: "RESPIRATORY",
    aliases: ["incentive spirometry", "IS", "pulmonary hygiene", "hygiène pulmonaire", "toilettage bronchique"],
    discipline: "SHARED",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "decreased_cardiac_output",
    key: "decreasedCardiacOutput",
    category: "CARDIOVASCULAR",
    aliases: ["cardiac output", "débit cardiaque", "perfusion", "low output"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "acs_chest_pain_support",
    key: "acsChestPainSupport",
    category: "CARDIOVASCULAR",
    aliases: ["ACS", "chest pain", "douleur thoracique", "angina", "angor", "STEMI", "NSTEMI"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "hypertension_monitoring",
    key: "hypertensionMonitoring",
    category: "CARDIOVASCULAR",
    aliases: ["hypertension", "HTN", "HTA", "high blood pressure", "tension"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "fluid_volume_excess",
    key: "fluidVolumeExcess",
    category: "CARDIOVASCULAR",
    aliases: ["fluid overload", "surcharge volémique", "edema", "œdème", "anasarca"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "stroke_supportive",
    key: "strokeSupportive",
    category: "NEUROLOGIC",
    aliases: ["stroke", "CVA", "AVC", "cerebral infarction", "hémorragie cérébrale"],
    discipline: "SHARED",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "altered_mental_status",
    key: "alteredMentalStatus",
    category: "NEUROLOGIC",
    aliases: ["AMS", "altered mental status", "état mental altéré", "confusion aiguë"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "neurologic_monitoring",
    key: "neurologicMonitoring",
    category: "NEUROLOGIC",
    aliases: ["neuro checks", "surveillance neurologique", "GCS", "pupils"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "delirium_prevention",
    key: "deliriumPrevention",
    category: "NEUROLOGIC",
    aliases: ["delirium prevention", "prévention délire", "confusion prevention"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "nausea_vomiting",
    key: "nauseaVomiting",
    category: "GI_NUTRITION",
    aliases: ["N/V", "nausea", "vomiting", "nausée", "vomissement", "emesis"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "diarrhea",
    key: "diarrhea",
    category: "GI_NUTRITION",
    aliases: ["diarrhea", "diarrhée", "loose stools"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "constipation",
    key: "constipation",
    category: "GI_NUTRITION",
    aliases: ["constipation", "obstipation", "selles"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "nutrition_deficit",
    key: "nutritionDeficit",
    category: "GI_NUTRITION",
    aliases: ["nutrition", "malnutrition", "apport insuffisant", "inadequate intake", "anorexia"],
    discipline: "SHARED",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "dysphagia",
    key: "dysphagia",
    category: "GI_NUTRITION",
    aliases: ["dysphagia", "dysphagie", "swallowing", "déglutition"],
    discipline: "SHARED",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "aki_support",
    key: "akiSupport",
    category: "RENAL_GU",
    aliases: ["AKI", "acute kidney injury", "IRA", "insuffisance rénale aiguë"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "urinary_retention",
    key: "urinaryRetention",
    category: "RENAL_GU",
    aliases: ["urinary retention", "rétention urinaire", "bladder", "vessie"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "indwelling_catheter_care",
    key: "indwellingCatheterCare",
    category: "RENAL_GU",
    aliases: ["Foley", "catheter", "sonde urinaire", "CU", "indwelling"],
    discipline: "NURSING",
    hasSafety: true,
  }),
  buildExpandedTemplate({
    templateId: "diabetes_support",
    key: "diabetesSupport",
    category: "ENDOCRINE",
    aliases: ["DM", "diabetes", "diabète", "glycémie", "glucose"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "hyperglycemia_monitoring",
    key: "hyperglycemiaMonitoring",
    category: "ENDOCRINE",
    aliases: ["hyperglycemia", "hyperglycémie", "high sugar", "hyperGS"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "hypoglycemia_risk",
    key: "hypoglycemiaRisk",
    category: "ENDOCRINE",
    aliases: ["hypoglycemia", "hypoglycémie", "low sugar", "hypo"],
    discipline: "NURSING",
    hasSafety: true,
  }),
  buildExpandedTemplate({
    templateId: "activity_intolerance",
    key: "activityIntolerance",
    category: "MOBILITY",
    aliases: ["activity intolerance", "intolérance à l’activité", "fatigue effort"],
    discipline: "SHARED",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "deconditioning",
    key: "deconditioning",
    category: "MOBILITY",
    aliases: ["deconditioning", "déconditionnement", "weakness", "faiblesse"],
    discipline: "SHARED",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "transfer_assistance",
    key: "transferAssistance",
    category: "MOBILITY",
    aliases: ["transfer", "transfert", "pivot", "lift"],
    discipline: "SHARED",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "adl_deficit",
    key: "adlDeficit",
    category: "MOBILITY",
    aliases: ["ADL", "AVQ", "self-care", "autonomie", "bathing", "dressing"],
    discipline: "OCCUPATIONAL_THERAPY",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "existing_pressure_injury",
    key: "existingPressureInjury",
    category: "SKIN_WOUND",
    aliases: ["pressure injury", "escarre", "decubitus", "bedsore", "ulcère de pression"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "surgical_wound_care",
    key: "surgicalWoundCare",
    category: "SKIN_WOUND",
    aliases: ["surgical wound", "plaie chirurgicale", "incision", "cicatrice"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "chronic_pain",
    key: "chronicPain",
    category: "PAIN_COMFORT",
    aliases: ["chronic pain", "douleur chronique", "persistent pain"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "postoperative_pain",
    key: "postoperativePain",
    category: "PAIN_COMFORT",
    aliases: ["postop pain", "douleur postopératoire", "surgical pain"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "infection_monitoring",
    key: "infectionMonitoring",
    category: "INFECTION",
    aliases: ["infection", "infection monitoring", "surveillance infection"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "sepsis_supportive",
    key: "sepsisSupportive",
    category: "INFECTION",
    aliases: ["sepsis", "septicémie", "SIRS"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "postoperative_recovery",
    key: "postoperativeRecovery",
    category: "POSTOPERATIVE",
    aliases: ["postoperative", "postop", "récupération chirurgicale", "recovery"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "dvt_prevention_support",
    key: "dvtPreventionSupport",
    category: "POSTOPERATIVE",
    aliases: ["DVT", "VTE", "thrombose", "phlebitis", "phlébite", "SCD"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "anxiety",
    key: "anxiety",
    category: "PSYCHOSOCIAL",
    aliases: ["anxiety", "anxiété", "fear", "peur", "inquiétude"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "knowledge_deficit",
    key: "knowledgeDeficit",
    category: "PSYCHOSOCIAL",
    aliases: ["knowledge deficit", "déficit de connaissances", "teach", "éducation"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "family_caregiver_support",
    key: "familyCaregiverSupport",
    category: "PSYCHOSOCIAL",
    aliases: ["caregiver", "aidant", "family support", "soutien familial"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "patient_education",
    key: "patientEducation",
    category: "DISCHARGE",
    aliases: ["patient education", "éducation patient", "teaching"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "medication_education",
    key: "medicationEducation",
    category: "DISCHARGE",
    aliases: ["medication education", "éducation médicamenteuse", "med teach"],
    discipline: "NURSING",
    hasSafety: false,
  }),
  buildExpandedTemplate({
    templateId: "home_safety_preparation",
    key: "homeSafetyPreparation",
    category: "DISCHARGE",
    aliases: ["home safety", "sécurité à domicile", "fall home"],
    discipline: "NURSING",
    hasSafety: false,
  }),
];

