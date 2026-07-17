/**
 * Phase 18 (Commit 2) — psychiatric / behavioral discharge template registry entries.
 */
import { newDefaultFollowUpRow } from "./providerDischargeDocumentationModel";
import {
  ACUTE_STRESS_REACTION_V1_SUGGESTED_TEXT,
  AGAINST_MEDICAL_ADVICE_V1_SUGGESTED_TEXT,
  ANXIETY_PANIC_CRISIS_V1_SUGGESTED_TEXT,
  BEHAVIORAL_AGITATION_POST_ACUTE_V1_SUGGESTED_TEXT,
  BEHAVIORAL_HEALTH_SAFETY_PLAN_V1_SUGGESTED_TEXT,
  CATATONIA_POST_ACUTE_V1_SUGGESTED_TEXT,
  CRISIS_RESOURCE_FOLLOWUP_V1_SUGGESTED_TEXT,
  DELIRIUM_POST_ACUTE_V1_SUGGESTED_TEXT,
  DEMENTIA_BEHAVIOR_CHANGE_V1_SUGGESTED_TEXT,
  DEPRESSION_CRISIS_V1_SUGGESTED_TEXT,
  EATING_DISORDER_MEDICAL_FOLLOWUP_V1_SUGGESTED_TEXT,
  INFORMED_REFUSAL_V1_SUGGESTED_TEXT,
  MANIA_POST_ACUTE_V1_SUGGESTED_TEXT,
  PEDIATRIC_BEHAVIORAL_CRISIS_V1_SUGGESTED_TEXT,
  POSTPARTUM_PSYCHIATRIC_CRISIS_POST_ACUTE_V1_SUGGESTED_TEXT,
  PSYCHOSIS_POST_ACUTE_V1_SUGGESTED_TEXT,
  SELF_HARM_POST_ASSESSMENT_V1_SUGGESTED_TEXT,
  SUBSTANCE_INDUCED_BEHAVIORAL_CRISIS_V1_SUGGESTED_TEXT,
  SUICIDAL_IDEATION_POST_ASSESSMENT_V1_SUGGESTED_TEXT,
  SUICIDE_ATTEMPT_POST_ACUTE_V1_SUGGESTED_TEXT,
} from "./psychiatricBehavioralDischargeSuggestedTextCatalog";

const ACCESSED_AT = "2026-05-18";
const GOVERNANCE_EFFECTIVE_FROM = "2026-05-18";

const PHASE18_BH_GOVERNANCE = {
  clinicalReviewStatus: "draft" as const,
  effectiveFrom: GOVERNANCE_EFFECTIVE_FROM,
  specialtyCategory: "behavioral_health",
  riskCategory: "high" as const,
};

const CRISIS_SAFETY = {
  requiresCrisisResources: true,
  requiresSelfHarmEscalation: true,
  requiresBehavioralHealthFollowUp: true,
} as const;

const MEDICAL_CRISIS_SAFETY = {
  requiresCrisisResources: true,
  requiresSelfHarmEscalation: true,
} as const;

const CRISIS_PRIVACY_SAFETY = {
  ...CRISIS_SAFETY,
  requiresSafetyPlan: true,
  requiresPrivacySensitiveWording: true,
} as const;

const PEDIATRIC_PHASE18_GOVERNANCE = {
  ...PHASE18_BH_GOVERNANCE,
  ageRange: { label: "pediatric" as const, minAgeDays: 0, maxAgeDays: 17 * 365 },
  requiresCaregiverAcknowledgement: true as const,
  escalationSeverity: "urgent" as const,
  minimumEscalationLevel: "urgent" as const,
};

const SUBSTANCE_CRISIS_SAFETY = {
  ...CRISIS_SAFETY,
  requiresSubstanceUseResources: true,
  requiresWithdrawalPrecautions: true,
} as const;

const CAPACITY_SAFETY = {
  requiresCapacityCaution: true,
  requiresCrisisResources: true,
  requiresSelfHarmEscalation: true,
} as const;

const MEDLINE_BH = {
  label: "MedlinePlus — Mental Health",
  url: "https://medlineplus.gov/mentalhealth.html",
  publisher: "U.S. National Library of Medicine (MedlinePlus)",
  accessedAt: ACCESSED_AT,
};

function fu(id: string, specialty: string, timing: string) {
  return { ...newDefaultFollowUpRow(), id, specialty, timing, comments: "" };
}

/** Phase 18 — distinct psychiatric / behavioral discharge families (Part 33). */
export const PHASE_18_PSYCHIATRIC_BEHAVIORAL_ED_DISCHARGE_TEMPLATE_IDS = [
  "suicidal_ideation_post_assessment_v1",
  "self_harm_post_assessment_v1",
  "suicide_attempt_post_acute_v1",
  "depression_crisis_v1",
  "anxiety_panic_crisis_v1",
  "acute_stress_reaction_v1",
  "psychosis_post_acute_v1",
  "mania_post_acute_v1",
  "behavioral_agitation_post_acute_v1",
  "substance_induced_behavioral_crisis_v1",
  "delirium_post_acute_v1",
  "dementia_behavior_change_v1",
  "catatonia_post_acute_v1",
  "eating_disorder_medical_followup_v1",
  "pediatric_behavioral_crisis_v1",
  "postpartum_psychiatric_crisis_post_acute_v1",
  "informed_refusal_v1",
  "against_medical_advice_v1",
  "behavioral_health_safety_plan_v1",
  "crisis_resource_followup_v1",
] as const;

export function buildPhase18PsychiatricBehavioralDischargeTemplates() {
  return [
    {
      id: "suicidal_ideation_post_assessment_v1",
      version: "1.0.0",
      title: "Suicidal ideation post-assessment discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: CRISIS_PRIVACY_SAFETY,
      diagnosisMappings: {
        icdExact: ["R45.851"],
        keyword: ["suicidal ideation post-assessment", "passive suicidal ideation", "idées suicidaires post-évaluation"],
      },
      sourceReferences: [{ ...MEDLINE_BH, label: "MedlinePlus — Suicide" }],
      defaultFollowUps: [
        fu("p18-si-crisis", "CRISIS_CLINIC", "within 24–72 hours or as directed"),
        fu("p18-si-bh", "BEHAVIORAL_HEALTH", "as directed"),
      ],
      suggestedText: SUICIDAL_IDEATION_POST_ASSESSMENT_V1_SUGGESTED_TEXT,
    },
    {
      id: "self_harm_post_assessment_v1",
      version: "1.0.0",
      title: "Self-harm post-assessment discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: CRISIS_PRIVACY_SAFETY,
      diagnosisMappings: {
        icdExact: ["Z91.51", "Z91.52"],
        icdFamily: ["Z91.51", "Z91.52"],
        keyword: ["non-suicidal self-injury", "NSSI", "intentional self-harm post-assessment", "automutilation non suicidaire"],
      },
      sourceReferences: [MEDLINE_BH],
      defaultFollowUps: [fu("p18-sh-bh", "BEHAVIORAL_HEALTH", "within 1–3 days or as directed")],
      suggestedText: SELF_HARM_POST_ASSESSMENT_V1_SUGGESTED_TEXT,
    },
    {
      id: "suicide_attempt_post_acute_v1",
      version: "1.0.0",
      title: "Suicide attempt post-acute discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: CRISIS_PRIVACY_SAFETY,
      diagnosisMappings: {
        icdExact: ["T14.91", "T14.91XA"],
        icdFamily: ["T14.91"],
        keyword: ["suicide attempt post-acute", "self-inflicted injury attempt", "tentative de suicide post-aigu"],
      },
      sourceReferences: [{ ...MEDLINE_BH, label: "MedlinePlus — Suicide" }],
      defaultFollowUps: [
        fu("p18-sa-crisis", "CRISIS_CLINIC", "within 24–48 hours or as directed"),
        fu("p18-sa-bh", "BEHAVIORAL_HEALTH", "as directed"),
      ],
      suggestedText: SUICIDE_ATTEMPT_POST_ACUTE_V1_SUGGESTED_TEXT,
    },
    {
      id: "depression_crisis_v1",
      version: "1.0.0",
      title: "Depression crisis discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: CRISIS_SAFETY,
      diagnosisMappings: {
        icdExact: ["F32.9", "F33.9", "F39"],
        icdFamily: ["F32", "F33", "F34", "F39"],
        keyword: ["depression crisis", "major depressive disorder crisis", "dépression crise"],
      },
      sourceReferences: [{ ...MEDLINE_BH, label: "MedlinePlus — Depression" }],
      defaultFollowUps: [fu("p18-dep-bh", "BEHAVIORAL_HEALTH", "within 1–2 days or as directed")],
      suggestedText: DEPRESSION_CRISIS_V1_SUGGESTED_TEXT,
    },
    {
      id: "anxiety_panic_crisis_v1",
      version: "1.0.0",
      title: "Anxiety / panic crisis discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: CRISIS_SAFETY,
      diagnosisMappings: {
        icdExact: ["F41.0", "F41.9"],
        keyword: ["anxiety panic crisis", "crise d'angoisse"],
      },
      sourceReferences: [{ ...MEDLINE_BH, label: "MedlinePlus — Anxiety" }],
      defaultFollowUps: [fu("p18-anx-bh", "BEHAVIORAL_HEALTH", "within 1–2 days or as directed")],
      suggestedText: ANXIETY_PANIC_CRISIS_V1_SUGGESTED_TEXT,
    },
    {
      id: "acute_stress_reaction_v1",
      version: "1.0.0",
      title: "Acute stress reaction discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: CRISIS_SAFETY,
      diagnosisMappings: {
        icdExact: ["F43.10", "F43.9"],
        icdFamily: ["F43.1", "F43.2", "F43.8"],
        keyword: ["acute stress reaction", "réaction aiguë au stress"],
      },
      sourceReferences: [MEDLINE_BH],
      defaultFollowUps: [fu("p18-stress-bh", "BEHAVIORAL_HEALTH", "within 1–3 days or as directed")],
      suggestedText: ACUTE_STRESS_REACTION_V1_SUGGESTED_TEXT,
    },
    {
      id: "psychosis_post_acute_v1",
      version: "1.0.0",
      title: "Psychosis post-acute discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: { ...CRISIS_SAFETY, requiresHomicideRiskEscalation: true },
      diagnosisMappings: {
        icdExact: ["F29", "F20.9", "R45.850", "R44.1"],
        icdFamily: ["F20", "F21", "F22", "F23", "F24", "F25", "F28", "F29", "R44"],
        keyword: ["acute psychosis post-acute", "psychose aiguë post-aigu", "hallucinations post-acute", "homicidal ideation"],
      },
      sourceReferences: [MEDLINE_BH],
      defaultFollowUps: [fu("p18-psy-bh", "PSYCHIATRY", "within 24–72 hours or as directed")],
      suggestedText: PSYCHOSIS_POST_ACUTE_V1_SUGGESTED_TEXT,
    },
    {
      id: "mania_post_acute_v1",
      version: "1.0.0",
      title: "Mania post-acute discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: CRISIS_SAFETY,
      diagnosisMappings: {
        icdExact: ["F31.9", "F30.9"],
        icdFamily: ["F30", "F31"],
        keyword: ["mania post-acute", "manic episode post-acute", "manie post-aigu"],
      },
      sourceReferences: [MEDLINE_BH],
      defaultFollowUps: [fu("p18-man-bh", "PSYCHIATRY", "within 24–72 hours or as directed")],
      suggestedText: MANIA_POST_ACUTE_V1_SUGGESTED_TEXT,
    },
    {
      id: "behavioral_agitation_post_acute_v1",
      version: "1.0.0",
      title: "Behavioral agitation post-acute discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: CRISIS_SAFETY,
      diagnosisMappings: {
        icdExact: ["R45.1"],
        icdFamily: ["R45.1"],
        keyword: ["severe agitation post-acute", "agitation sévère post-aigu"],
      },
      sourceReferences: [MEDLINE_BH],
      defaultFollowUps: [fu("p18-agit-bh", "BEHAVIORAL_HEALTH", "within 1–2 days or as directed")],
      suggestedText: BEHAVIORAL_AGITATION_POST_ACUTE_V1_SUGGESTED_TEXT,
    },
    {
      id: "substance_induced_behavioral_crisis_v1",
      version: "1.0.0",
      title: "Substance-induced behavioral crisis discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: SUBSTANCE_CRISIS_SAFETY,
      diagnosisMappings: {
        icdFamily: ["F10.15", "F10.25", "F10.95", "F11.15", "F11.25", "F12.15", "F12.25", "F13.15", "F14.15", "F15.15", "F16.15", "F17.15", "F18.15", "F19.15", "F19.25", "F19.95"],
        keyword: ["substance-induced psychosis", "psychose induite par substance", "stimulant intoxication psychosis"],
      },
      sourceReferences: [{ ...MEDLINE_BH, label: "MedlinePlus — Substance use" }],
      defaultFollowUps: [fu("p18-sub-bh", "SUBSTANCE_USE_TREATMENT", "within 1–2 days or as directed")],
      suggestedText: SUBSTANCE_INDUCED_BEHAVIORAL_CRISIS_V1_SUGGESTED_TEXT,
    },
    {
      id: "delirium_post_acute_v1",
      version: "1.0.0",
      title: "Delirium post-acute discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: MEDICAL_CRISIS_SAFETY,
      diagnosisMappings: {
        icdExact: ["F05", "F05.9"],
        icdFamily: ["F05", "R41.0", "R41.82"],
        keyword: ["delirium post-acute", "acute confusional state", "délirium post-aigu"],
      },
      sourceReferences: [MEDLINE_BH],
      defaultFollowUps: [fu("p18-del-pcp", "PRIMARY_CARE", "within 24–48 hours or as directed")],
      suggestedText: DELIRIUM_POST_ACUTE_V1_SUGGESTED_TEXT,
    },
    {
      id: "dementia_behavior_change_v1",
      version: "1.0.0",
      title: "Dementia with behavioral change discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: MEDICAL_CRISIS_SAFETY,
      diagnosisMappings: {
        icdExact: ["F03.91", "F03.90"],
        icdFamily: ["F01", "F02", "F03", "R41.3"],
        keyword: ["dementia with behavioral disturbance", "démence avec perturbation comportementale"],
      },
      sourceReferences: [MEDLINE_BH],
      defaultFollowUps: [fu("p18-dem-neuro", "NEUROLOGY", "within 1–3 days or as directed")],
      suggestedText: DEMENTIA_BEHAVIOR_CHANGE_V1_SUGGESTED_TEXT,
    },
    {
      id: "catatonia_post_acute_v1",
      version: "1.0.0",
      title: "Catatonia post-acute discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: CRISIS_SAFETY,
      diagnosisMappings: {
        icdExact: ["F06.1", "F20.2"],
        icdFamily: ["F06.1", "F20.2"],
        keyword: ["catatonia post-acute", "catatonie post-aigu"],
      },
      sourceReferences: [MEDLINE_BH],
      defaultFollowUps: [fu("p18-cat-psy", "PSYCHIATRY", "within 24–72 hours or as directed")],
      suggestedText: CATATONIA_POST_ACUTE_V1_SUGGESTED_TEXT,
    },
    {
      id: "eating_disorder_medical_followup_v1",
      version: "1.0.0",
      title: "Eating disorder medical follow-up discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: CRISIS_SAFETY,
      diagnosisMappings: {
        icdExact: ["F50.01", "F50.00", "F50.2"],
        icdFamily: ["F50"],
        keyword: ["anorexia nervosa follow-up", "eating disorder medical instability", "anorexie nervosa"],
      },
      sourceReferences: [MEDLINE_BH],
      defaultFollowUps: [fu("p18-ed-bh", "BEHAVIORAL_HEALTH", "within 24–72 hours or as directed")],
      suggestedText: EATING_DISORDER_MEDICAL_FOLLOWUP_V1_SUGGESTED_TEXT,
    },
    {
      id: "pediatric_behavioral_crisis_v1",
      version: "1.0.0",
      title: "Pediatric behavioral crisis discharge documentation",
      ...PEDIATRIC_PHASE18_GOVERNANCE,
      behavioralHealthSafety: CRISIS_SAFETY,
      diagnosisMappings: {
        icdExact: ["F84.0", "F90.9"],
        icdFamily: ["F84", "F90", "F91", "F98", "F70", "F71", "F72", "F73", "F78", "F79"],
        keyword: ["autism behavioral crisis", "pediatric behavioral crisis", "crise comportementale pédiatrique"],
      },
      sourceReferences: [MEDLINE_BH],
      defaultFollowUps: [fu("p18-ped-bh", "BEHAVIORAL_HEALTH", "within 1–3 days or as directed")],
      suggestedText: PEDIATRIC_BEHAVIORAL_CRISIS_V1_SUGGESTED_TEXT,
    },
    {
      id: "postpartum_psychiatric_crisis_post_acute_v1",
      version: "1.0.0",
      title: "Postpartum psychiatric crisis post-acute discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: { ...CRISIS_SAFETY, requiresHomicideRiskEscalation: true },
      diagnosisMappings: {
        icdExact: ["F53.0", "F53.1"],
        icdFamily: ["F53"],
        keyword: ["postpartum psychosis post-acute", "psychose post-partum post-aigu"],
      },
      sourceReferences: [MEDLINE_BH],
      defaultFollowUps: [
        fu("p18-pp-ob", "OBGYN", "urgent / as directed"),
        fu("p18-pp-psy", "PSYCHIATRY", "urgent / as directed"),
      ],
      suggestedText: POSTPARTUM_PSYCHIATRIC_CRISIS_POST_ACUTE_V1_SUGGESTED_TEXT,
    },
    {
      id: "informed_refusal_v1",
      version: "1.0.0",
      title: "Informed refusal discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: CAPACITY_SAFETY,
      diagnosisMappings: {
        icdExact: ["Z53.20", "Z53.2"],
        icdFamily: ["Z53.2"],
        keyword: ["refusal of treatment", "informed refusal", "refus de traitement"],
      },
      sourceReferences: [MEDLINE_BH],
      defaultFollowUps: [fu("p18-ref-pcp", "PRIMARY_CARE", "as directed")],
      suggestedText: INFORMED_REFUSAL_V1_SUGGESTED_TEXT,
    },
    {
      id: "against_medical_advice_v1",
      version: "1.0.0",
      title: "Against medical advice discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: CAPACITY_SAFETY,
      diagnosisMappings: {
        icdExact: ["Z53.9", "Z91.19"],
        keyword: ["against medical advice", "AMA", "contre avis médical", "elopement risk"],
      },
      sourceReferences: [MEDLINE_BH],
      defaultFollowUps: [fu("p18-ama-pcp", "PRIMARY_CARE", "as directed")],
      suggestedText: AGAINST_MEDICAL_ADVICE_V1_SUGGESTED_TEXT,
    },
    {
      id: "behavioral_health_safety_plan_v1",
      version: "1.0.0",
      title: "Behavioral health safety plan discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: { ...CRISIS_PRIVACY_SAFETY, requiresSafetyPlan: true },
      diagnosisMappings: {
        icdExact: ["Z04.6"],
        keyword: ["behavioral health safety plan", "plan de sécurité santé comportementale"],
      },
      sourceReferences: [MEDLINE_BH],
      defaultFollowUps: [fu("p18-sp-crisis", "CRISIS_CLINIC", "within 24–72 hours or as directed")],
      suggestedText: BEHAVIORAL_HEALTH_SAFETY_PLAN_V1_SUGGESTED_TEXT,
    },
    {
      id: "crisis_resource_followup_v1",
      version: "1.0.0",
      title: "Crisis resource follow-up discharge documentation",
      ...PHASE18_BH_GOVERNANCE,
      behavioralHealthSafety: CRISIS_SAFETY,
      diagnosisMappings: {
        icdExact: ["Z03.89"],
        icdFamily: ["Z75"],
        keyword: ["crisis resource follow-up", "suivi ressources de crise"],
      },
      sourceReferences: [MEDLINE_BH],
      defaultFollowUps: [fu("p18-crf-crisis", "CRISIS_CLINIC", "within 24–72 hours or as directed")],
      suggestedText: CRISIS_RESOURCE_FOLLOWUP_V1_SUGGESTED_TEXT,
    },
  ];
}
