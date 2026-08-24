/**
 * MEDUI.D4B.6 — Enterprise Interdisciplinary Care Plans
 *
 * ONE enterprise care-plan domain. Reuses D4B.1 lifecycle — no independent
 * signature / amendment engine. Template activation never mutates source
 * templates. Care plan ≠ diagnosis ≠ problem-list mutation ≠ provider order ≠
 * MAR ≠ diet ≠ O2/vent ≠ discharge authorization ≠ DME ≠ precaution activation.
 * Composes nursing (D4B.2/EDOC.19), tech (D4B.3), RT (D4B.4), rehab (D4B.5)
 * contributions without overwrite. No auto-activation from diagnosis/risk alone.
 */

import type {
  EnterpriseClinicalDocument,
  EnterpriseClinicalDocumentCareSetting,
  EnterpriseClinicalDocumentDiscipline,
  EnterpriseClinicalDocumentLifecycleState,
} from "./enterpriseClinicalDocumentContractD4b1.js";
import { actorSnapshot } from "./enterpriseClinicalDocumentAuthorshipD4b1.js";
import { ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION } from "./enterpriseClinicalDocumentContractD4b1.js";

export const ENTERPRISE_INTERDISCIPLINARY_CARE_PLANS_CERTIFICATION_ID =
  "MEDUI.ENTERPRISE_INTERDISCIPLINARY_CARE_PLANS.D4B6" as const;

export const ENTERPRISE_INTERDISCIPLINARY_CARE_PLANS_CONTRACT_VERSION = "D4B.6" as const;

/* -------------------------------------------------------------------------- */
/* Prohibitions                                                               */
/* -------------------------------------------------------------------------- */

export const CARE_PLAN_PROHIBITED_CAPABILITIES = [
  "provider_diagnosis_author",
  "problem_list_mutate",
  "medication_prescribe",
  "medication_administer_via_plan",
  "provider_order_create",
  "provider_order_mutate",
  "mar_alter",
  "diet_order_finalize",
  "oxygen_vent_alter",
  "restraint_authorize",
  "isolation_activate",
  "discharge_authorize",
  "dme_order_procure",
  "home_health_order",
  "nursing_assessment_overwrite",
  "technician_task_overwrite",
  "rt_documentation_overwrite",
  "rehab_documentation_overwrite",
  "signed_document_silent_overwrite",
  "independent_signature_engine",
  "auto_activate_from_diagnosis_alone",
  "template_source_mutate_on_activation",
] as const;

export type CarePlanProhibitedCapability = (typeof CARE_PLAN_PROHIBITED_CAPABILITIES)[number];

export function isCarePlanCapabilityProhibited(capability: string): boolean {
  return (CARE_PLAN_PROHIBITED_CAPABILITIES as readonly string[]).includes(capability);
}

/* -------------------------------------------------------------------------- */
/* Role profiles (designations ≠ Prisma RoleCodes)                            */
/* -------------------------------------------------------------------------- */

export type CarePlanRoleProfile =
  | "NURSE_CARE_PLAN_AUTHOR"
  | "RESPIRATORY_CONTRIBUTOR"
  | "REHAB_CONTRIBUTOR"
  | "TECHNICIAN_PROGRESS_LIMITED"
  | "PROVIDER_REVIEW_ONLY"
  | "SUPPORT_READ_ONLY";

export type EnterpriseCarePlanCapabilityId =
  | "browse_templates"
  | "preview_template"
  | "customize_patient_plan"
  | "activate_plan"
  | "record_progress"
  | "review_plan"
  | "revise_plan"
  | "complete_plan"
  | "discontinue_plan"
  | "enter_in_error"
  | "contribute_nursing"
  | "contribute_rt"
  | "contribute_rehab"
  | "record_intervention_progress"
  | "record_monitoring"
  | "record_education"
  | "document_safety_recommendation"
  | "view_discipline_contributions"
  | "view_legacy_d3e_stub";

export type EnterpriseCarePlanCapabilityDefinition = {
  id: EnterpriseCarePlanCapabilityId;
  titleKey: string;
  defaultRoleProfiles: ReadonlyArray<CarePlanRoleProfile>;
  requiresFacilityPolicy: boolean;
  assignmentGrantsCapability: false;
  activatesOrders: false;
  mutatesProblemList: false;
};

function careCap(
  id: EnterpriseCarePlanCapabilityId,
  titleKey: string,
  defaultRoleProfiles: ReadonlyArray<CarePlanRoleProfile>
): EnterpriseCarePlanCapabilityDefinition {
  return {
    id,
    titleKey,
    defaultRoleProfiles,
    requiresFacilityPolicy: false,
    assignmentGrantsCapability: false,
    activatesOrders: false,
    mutatesProblemList: false,
  };
}

const AUTHOR_PROFILES: CarePlanRoleProfile[] = [
  "NURSE_CARE_PLAN_AUTHOR",
  "RESPIRATORY_CONTRIBUTOR",
  "REHAB_CONTRIBUTOR",
];
const NURSE_PRIMARY: CarePlanRoleProfile[] = ["NURSE_CARE_PLAN_AUTHOR"];
const PROGRESS_PROFILES: CarePlanRoleProfile[] = [
  "NURSE_CARE_PLAN_AUTHOR",
  "RESPIRATORY_CONTRIBUTOR",
  "REHAB_CONTRIBUTOR",
  "TECHNICIAN_PROGRESS_LIMITED",
];
const VIEW_PROFILES: CarePlanRoleProfile[] = [
  "NURSE_CARE_PLAN_AUTHOR",
  "RESPIRATORY_CONTRIBUTOR",
  "REHAB_CONTRIBUTOR",
  "TECHNICIAN_PROGRESS_LIMITED",
  "PROVIDER_REVIEW_ONLY",
  "SUPPORT_READ_ONLY",
];
const REVIEW_PROFILES: CarePlanRoleProfile[] = [
  "NURSE_CARE_PLAN_AUTHOR",
  "PROVIDER_REVIEW_ONLY",
];

export const ENTERPRISE_CARE_PLAN_CAPABILITY_REGISTRY: ReadonlyArray<EnterpriseCarePlanCapabilityDefinition> =
  [
    careCap("browse_templates", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.browseTemplates", VIEW_PROFILES),
    careCap("preview_template", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.previewTemplate", VIEW_PROFILES),
    careCap("customize_patient_plan", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.customize", AUTHOR_PROFILES),
    careCap("activate_plan", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.activate", NURSE_PRIMARY),
    careCap("record_progress", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.progress", PROGRESS_PROFILES),
    careCap("review_plan", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.review", REVIEW_PROFILES),
    careCap("revise_plan", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.revise", NURSE_PRIMARY),
    careCap("complete_plan", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.complete", NURSE_PRIMARY),
    careCap("discontinue_plan", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.discontinue", NURSE_PRIMARY),
    careCap("enter_in_error", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.enterInError", NURSE_PRIMARY),
    careCap("contribute_nursing", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.contributeNursing", NURSE_PRIMARY),
    careCap("contribute_rt", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.contributeRt", ["RESPIRATORY_CONTRIBUTOR", "NURSE_CARE_PLAN_AUTHOR"]),
    careCap("contribute_rehab", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.contributeRehab", ["REHAB_CONTRIBUTOR", "NURSE_CARE_PLAN_AUTHOR"]),
    careCap("record_intervention_progress", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.interventionProgress", PROGRESS_PROFILES),
    careCap("record_monitoring", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.monitoring", PROGRESS_PROFILES),
    careCap("record_education", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.education", AUTHOR_PROFILES),
    careCap("document_safety_recommendation", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.safety", NURSE_PRIMARY),
    careCap("view_discipline_contributions", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.viewContributions", VIEW_PROFILES),
    careCap("view_legacy_d3e_stub", "enterpriseInterdisciplinaryCarePlansD4b6.capabilities.viewLegacy", VIEW_PROFILES),
  ];

export function isCarePlanCapabilityAllowedForProfile(
  capabilityId: EnterpriseCarePlanCapabilityId,
  roleProfile: CarePlanRoleProfile
): boolean {
  const def = ENTERPRISE_CARE_PLAN_CAPABILITY_REGISTRY.find((c) => c.id === capabilityId);
  if (!def) return false;
  return def.defaultRoleProfiles.includes(roleProfile);
}

export function resolveCarePlanRoleProfile(
  roleCodes: readonly string[] | null | undefined
): CarePlanRoleProfile {
  const codes = (roleCodes ?? []).map((c) => String(c).toUpperCase());
  if (codes.some((c) => c === "RT" || c === "RESPIRATORY" || c.includes("RESP"))) {
    return "RESPIRATORY_CONTRIBUTOR";
  }
  if (codes.some((c) => c === "PT" || c === "OT" || c === "SLP" || c === "SPEECH" || c.includes("REHAB"))) {
    return "REHAB_CONTRIBUTOR";
  }
  if (codes.some((c) => c === "TECH" || c === "CNA" || c === "NA" || c.includes("TECH"))) {
    return "TECHNICIAN_PROGRESS_LIMITED";
  }
  if (codes.some((c) => c === "MD" || c === "DO" || c === "NP" || c === "PA" || c === "PROVIDER")) {
    return "PROVIDER_REVIEW_ONLY";
  }
  if (codes.some((c) => c === "RN" || c === "LPN" || c === "NURSE" || c === "ADMIN")) {
    return "NURSE_CARE_PLAN_AUTHOR";
  }
  return "SUPPORT_READ_ONLY";
}

/* -------------------------------------------------------------------------- */
/* Template governance                                                        */
/* -------------------------------------------------------------------------- */

export const CARE_PLAN_TEMPLATE_GOVERNANCE_STATUSES = [
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "ACTIVE",
  "RETIRED",
] as const;

export type CarePlanTemplateGovernanceStatus =
  (typeof CARE_PLAN_TEMPLATE_GOVERNANCE_STATUSES)[number];

/** Bedside may activate ACTIVE templates only. */
export function canBedsideActivateTemplate(
  status: CarePlanTemplateGovernanceStatus
): boolean {
  return status === "ACTIVE";
}

export type CarePlanComponentKind =
  | "FOCUS"
  | "GOAL"
  | "OUTCOME"
  | "INTERVENTION"
  | "MONITORING"
  | "EDUCATION"
  | "SAFETY";

export type CarePlanTemplateComponent = {
  componentId: string;
  kind: CarePlanComponentKind;
  titleKey: string;
  bodyKey: string;
  disciplineHint:
    | "NURSING"
    | "RESPIRATORY_THERAPY"
    | "PHYSICAL_THERAPY"
    | "OCCUPATIONAL_THERAPY"
    | "SPEECH_LANGUAGE_PATHOLOGY"
    | "SHARED"
    | "TECHNICIAN";
  /** Interventions/monitoring are recommendations — never orders. */
  isRecommendationNotOrder: true;
  /** Safety docs recommend; do not authorize restraints/isolation. */
  safetyDoesNotAuthorizePrecaution: boolean;
};

export type CarePlanTemplateDefinition = {
  templateId: string;
  version: string;
  governanceStatus: CarePlanTemplateGovernanceStatus;
  titleKey: string;
  descriptionKey: string;
  searchAliases: readonly string[];
  conditionTags: readonly string[];
  riskTags: readonly string[];
  selectedInD4b6: boolean;
  deferredReasonKey: string | null;
  components: readonly CarePlanTemplateComponent[];
  /** Activation copies into patient plan; never mutates this definition. */
  sourceImmutableOnActivation: true;
  autoActivateFromDiagnosisAlone: false;
};

function tplComponent(
  componentId: string,
  kind: CarePlanComponentKind,
  titleKey: string,
  bodyKey: string,
  disciplineHint: CarePlanTemplateComponent["disciplineHint"],
  safetyDoesNotAuthorizePrecaution = kind === "SAFETY"
): CarePlanTemplateComponent {
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

/** Curated ACTIVE starter catalog — quality over breadth. */
export const ENTERPRISE_CARE_PLAN_TEMPLATE_CATALOG: ReadonlyArray<CarePlanTemplateDefinition> = [
  {
    templateId: "fall_risk",
    version: "D4B.6.1",
    governanceStatus: "ACTIVE",
    titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.title",
    descriptionKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.description",
    searchAliases: ["chute", "fall", "morse", "mobilité"],
    conditionTags: [],
    riskTags: ["fall"],
    selectedInD4b6: true,
    deferredReasonKey: null,
    sourceImmutableOnActivation: true,
    autoActivateFromDiagnosisAlone: false,
    components: [
      tplComponent("fall_focus", "FOCUS", "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.focus", "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.focusBody", "NURSING"),
      tplComponent("fall_goal", "GOAL", "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.goal", "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.goalBody", "NURSING"),
      tplComponent("fall_outcome", "OUTCOME", "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.outcome", "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.outcomeBody", "SHARED"),
      tplComponent("fall_intervention", "INTERVENTION", "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.intervention", "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.interventionBody", "NURSING"),
      tplComponent("fall_monitoring", "MONITORING", "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.monitoring", "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.monitoringBody", "NURSING"),
      tplComponent("fall_education", "EDUCATION", "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.education", "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.educationBody", "NURSING"),
      tplComponent("fall_safety", "SAFETY", "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.safety", "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.safetyBody", "NURSING", true),
    ],
  },
  {
    templateId: "aspiration_risk",
    version: "D4B.6.1",
    governanceStatus: "ACTIVE",
    titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.aspirationRisk.title",
    descriptionKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.aspirationRisk.description",
    searchAliases: ["aspiration", "déglutition", "swallow", "NPO"],
    conditionTags: [],
    riskTags: ["aspiration"],
    selectedInD4b6: true,
    deferredReasonKey: null,
    sourceImmutableOnActivation: true,
    autoActivateFromDiagnosisAlone: false,
    components: [
      tplComponent("asp_focus", "FOCUS", "enterpriseInterdisciplinaryCarePlansD4b6.templates.aspirationRisk.focus", "enterpriseInterdisciplinaryCarePlansD4b6.templates.aspirationRisk.focusBody", "SHARED"),
      tplComponent("asp_goal", "GOAL", "enterpriseInterdisciplinaryCarePlansD4b6.templates.aspirationRisk.goal", "enterpriseInterdisciplinaryCarePlansD4b6.templates.aspirationRisk.goalBody", "SPEECH_LANGUAGE_PATHOLOGY"),
      tplComponent("asp_outcome", "OUTCOME", "enterpriseInterdisciplinaryCarePlansD4b6.templates.aspirationRisk.outcome", "enterpriseInterdisciplinaryCarePlansD4b6.templates.aspirationRisk.outcomeBody", "SHARED"),
      tplComponent("asp_intervention", "INTERVENTION", "enterpriseInterdisciplinaryCarePlansD4b6.templates.aspirationRisk.intervention", "enterpriseInterdisciplinaryCarePlansD4b6.templates.aspirationRisk.interventionBody", "NURSING"),
      tplComponent("asp_monitoring", "MONITORING", "enterpriseInterdisciplinaryCarePlansD4b6.templates.aspirationRisk.monitoring", "enterpriseInterdisciplinaryCarePlansD4b6.templates.aspirationRisk.monitoringBody", "NURSING"),
      tplComponent("asp_education", "EDUCATION", "enterpriseInterdisciplinaryCarePlansD4b6.templates.aspirationRisk.education", "enterpriseInterdisciplinaryCarePlansD4b6.templates.aspirationRisk.educationBody", "SHARED"),
      tplComponent("asp_safety", "SAFETY", "enterpriseInterdisciplinaryCarePlansD4b6.templates.aspirationRisk.safety", "enterpriseInterdisciplinaryCarePlansD4b6.templates.aspirationRisk.safetyBody", "NURSING", true),
    ],
  },
  {
    templateId: "acute_pain",
    version: "D4B.6.1",
    governanceStatus: "ACTIVE",
    titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.acutePain.title",
    descriptionKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.acutePain.description",
    searchAliases: ["douleur", "pain", "analgesia"],
    conditionTags: ["pain"],
    riskTags: [],
    selectedInD4b6: true,
    deferredReasonKey: null,
    sourceImmutableOnActivation: true,
    autoActivateFromDiagnosisAlone: false,
    components: [
      tplComponent("pain_focus", "FOCUS", "enterpriseInterdisciplinaryCarePlansD4b6.templates.acutePain.focus", "enterpriseInterdisciplinaryCarePlansD4b6.templates.acutePain.focusBody", "NURSING"),
      tplComponent("pain_goal", "GOAL", "enterpriseInterdisciplinaryCarePlansD4b6.templates.acutePain.goal", "enterpriseInterdisciplinaryCarePlansD4b6.templates.acutePain.goalBody", "NURSING"),
      tplComponent("pain_outcome", "OUTCOME", "enterpriseInterdisciplinaryCarePlansD4b6.templates.acutePain.outcome", "enterpriseInterdisciplinaryCarePlansD4b6.templates.acutePain.outcomeBody", "NURSING"),
      tplComponent("pain_intervention", "INTERVENTION", "enterpriseInterdisciplinaryCarePlansD4b6.templates.acutePain.intervention", "enterpriseInterdisciplinaryCarePlansD4b6.templates.acutePain.interventionBody", "NURSING"),
      tplComponent("pain_monitoring", "MONITORING", "enterpriseInterdisciplinaryCarePlansD4b6.templates.acutePain.monitoring", "enterpriseInterdisciplinaryCarePlansD4b6.templates.acutePain.monitoringBody", "NURSING"),
      tplComponent("pain_education", "EDUCATION", "enterpriseInterdisciplinaryCarePlansD4b6.templates.acutePain.education", "enterpriseInterdisciplinaryCarePlansD4b6.templates.acutePain.educationBody", "NURSING"),
    ],
  },
  {
    templateId: "pneumonia",
    version: "D4B.6.1",
    governanceStatus: "ACTIVE",
    titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.pneumonia.title",
    descriptionKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.pneumonia.description",
    searchAliases: ["pneumonie", "pneumonia", "respiratoire"],
    conditionTags: ["pneumonia"],
    riskTags: [],
    selectedInD4b6: true,
    deferredReasonKey: null,
    sourceImmutableOnActivation: true,
    autoActivateFromDiagnosisAlone: false,
    components: [
      tplComponent("pna_focus", "FOCUS", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pneumonia.focus", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pneumonia.focusBody", "SHARED"),
      tplComponent("pna_goal", "GOAL", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pneumonia.goal", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pneumonia.goalBody", "SHARED"),
      tplComponent("pna_outcome", "OUTCOME", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pneumonia.outcome", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pneumonia.outcomeBody", "SHARED"),
      tplComponent("pna_intervention", "INTERVENTION", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pneumonia.intervention", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pneumonia.interventionBody", "RESPIRATORY_THERAPY"),
      tplComponent("pna_monitoring", "MONITORING", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pneumonia.monitoring", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pneumonia.monitoringBody", "NURSING"),
      tplComponent("pna_education", "EDUCATION", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pneumonia.education", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pneumonia.educationBody", "SHARED"),
    ],
  },
  {
    templateId: "chf",
    version: "D4B.6.1",
    governanceStatus: "ACTIVE",
    titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.chf.title",
    descriptionKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.chf.description",
    searchAliases: ["insuffisance cardiaque", "CHF", "heart failure", "IC"],
    conditionTags: ["chf", "heart_failure"],
    riskTags: [],
    selectedInD4b6: true,
    deferredReasonKey: null,
    sourceImmutableOnActivation: true,
    autoActivateFromDiagnosisAlone: false,
    components: [
      tplComponent("chf_focus", "FOCUS", "enterpriseInterdisciplinaryCarePlansD4b6.templates.chf.focus", "enterpriseInterdisciplinaryCarePlansD4b6.templates.chf.focusBody", "SHARED"),
      tplComponent("chf_goal", "GOAL", "enterpriseInterdisciplinaryCarePlansD4b6.templates.chf.goal", "enterpriseInterdisciplinaryCarePlansD4b6.templates.chf.goalBody", "NURSING"),
      tplComponent("chf_outcome", "OUTCOME", "enterpriseInterdisciplinaryCarePlansD4b6.templates.chf.outcome", "enterpriseInterdisciplinaryCarePlansD4b6.templates.chf.outcomeBody", "SHARED"),
      tplComponent("chf_intervention", "INTERVENTION", "enterpriseInterdisciplinaryCarePlansD4b6.templates.chf.intervention", "enterpriseInterdisciplinaryCarePlansD4b6.templates.chf.interventionBody", "NURSING"),
      tplComponent("chf_monitoring", "MONITORING", "enterpriseInterdisciplinaryCarePlansD4b6.templates.chf.monitoring", "enterpriseInterdisciplinaryCarePlansD4b6.templates.chf.monitoringBody", "NURSING"),
      tplComponent("chf_education", "EDUCATION", "enterpriseInterdisciplinaryCarePlansD4b6.templates.chf.education", "enterpriseInterdisciplinaryCarePlansD4b6.templates.chf.educationBody", "NURSING"),
    ],
  },
  {
    templateId: "impaired_mobility",
    version: "D4B.6.1",
    governanceStatus: "ACTIVE",
    titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.title",
    descriptionKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.description",
    searchAliases: ["mobilité", "mobility", "ambulation", "transfert"],
    conditionTags: ["mobility"],
    riskTags: ["fall"],
    selectedInD4b6: true,
    deferredReasonKey: null,
    sourceImmutableOnActivation: true,
    autoActivateFromDiagnosisAlone: false,
    components: [
      tplComponent("mob_focus", "FOCUS", "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.focus", "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.focusBody", "SHARED"),
      tplComponent("mob_goal", "GOAL", "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.goal", "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.goalBody", "PHYSICAL_THERAPY"),
      tplComponent("mob_outcome", "OUTCOME", "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.outcome", "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.outcomeBody", "SHARED"),
      tplComponent("mob_intervention", "INTERVENTION", "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.intervention", "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.interventionBody", "PHYSICAL_THERAPY"),
      tplComponent("mob_monitoring", "MONITORING", "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.monitoring", "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.monitoringBody", "TECHNICIAN"),
      tplComponent("mob_education", "EDUCATION", "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.education", "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.educationBody", "OCCUPATIONAL_THERAPY"),
    ],
  },
  {
    templateId: "pressure_injury_risk",
    version: "D4B.6.1",
    governanceStatus: "ACTIVE",
    titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.pressureInjuryRisk.title",
    descriptionKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.pressureInjuryRisk.description",
    searchAliases: ["escarre", "pressure", "ulcère", "peau", "skin"],
    conditionTags: [],
    riskTags: ["pressure_injury"],
    selectedInD4b6: true,
    deferredReasonKey: null,
    sourceImmutableOnActivation: true,
    autoActivateFromDiagnosisAlone: false,
    components: [
      tplComponent("pi_focus", "FOCUS", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pressureInjuryRisk.focus", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pressureInjuryRisk.focusBody", "NURSING"),
      tplComponent("pi_goal", "GOAL", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pressureInjuryRisk.goal", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pressureInjuryRisk.goalBody", "NURSING"),
      tplComponent("pi_outcome", "OUTCOME", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pressureInjuryRisk.outcome", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pressureInjuryRisk.outcomeBody", "NURSING"),
      tplComponent("pi_intervention", "INTERVENTION", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pressureInjuryRisk.intervention", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pressureInjuryRisk.interventionBody", "NURSING"),
      tplComponent("pi_monitoring", "MONITORING", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pressureInjuryRisk.monitoring", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pressureInjuryRisk.monitoringBody", "NURSING"),
      tplComponent("pi_education", "EDUCATION", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pressureInjuryRisk.education", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pressureInjuryRisk.educationBody", "NURSING"),
      tplComponent("pi_safety", "SAFETY", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pressureInjuryRisk.safety", "enterpriseInterdisciplinaryCarePlansD4b6.templates.pressureInjuryRisk.safetyBody", "NURSING", true),
    ],
  },
  {
    templateId: "discharge_readiness",
    version: "D4B.6.1",
    governanceStatus: "ACTIVE",
    titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.dischargeReadiness.title",
    descriptionKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.dischargeReadiness.description",
    searchAliases: ["sortie", "discharge", "readiness", "préparation"],
    conditionTags: ["discharge"],
    riskTags: [],
    selectedInD4b6: true,
    deferredReasonKey: null,
    sourceImmutableOnActivation: true,
    autoActivateFromDiagnosisAlone: false,
    components: [
      tplComponent("dc_focus", "FOCUS", "enterpriseInterdisciplinaryCarePlansD4b6.templates.dischargeReadiness.focus", "enterpriseInterdisciplinaryCarePlansD4b6.templates.dischargeReadiness.focusBody", "SHARED"),
      tplComponent("dc_goal", "GOAL", "enterpriseInterdisciplinaryCarePlansD4b6.templates.dischargeReadiness.goal", "enterpriseInterdisciplinaryCarePlansD4b6.templates.dischargeReadiness.goalBody", "NURSING"),
      tplComponent("dc_outcome", "OUTCOME", "enterpriseInterdisciplinaryCarePlansD4b6.templates.dischargeReadiness.outcome", "enterpriseInterdisciplinaryCarePlansD4b6.templates.dischargeReadiness.outcomeBody", "SHARED"),
      tplComponent("dc_intervention", "INTERVENTION", "enterpriseInterdisciplinaryCarePlansD4b6.templates.dischargeReadiness.intervention", "enterpriseInterdisciplinaryCarePlansD4b6.templates.dischargeReadiness.interventionBody", "NURSING"),
      tplComponent("dc_monitoring", "MONITORING", "enterpriseInterdisciplinaryCarePlansD4b6.templates.dischargeReadiness.monitoring", "enterpriseInterdisciplinaryCarePlansD4b6.templates.dischargeReadiness.monitoringBody", "SHARED"),
      tplComponent("dc_education", "EDUCATION", "enterpriseInterdisciplinaryCarePlansD4b6.templates.dischargeReadiness.education", "enterpriseInterdisciplinaryCarePlansD4b6.templates.dischargeReadiness.educationBody", "NURSING"),
    ],
  },
  /* Explicit deferred catalog placeholders (not selectable / not ACTIVE for bedside). */
  {
    templateId: "copd_exacerbation_full",
    version: "D4B.6.0-deferred",
    governanceStatus: "DRAFT",
    titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.deferred.copd.title",
    descriptionKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.deferred.copd.description",
    searchAliases: ["COPD", "BPCO"],
    conditionTags: ["copd"],
    riskTags: [],
    selectedInD4b6: false,
    deferredReasonKey: "enterpriseInterdisciplinaryCarePlansD4b6.deferrals.copd",
    sourceImmutableOnActivation: true,
    autoActivateFromDiagnosisAlone: false,
    components: [],
  },
  {
    templateId: "sepsis_pathway_full",
    version: "D4B.6.0-deferred",
    governanceStatus: "DRAFT",
    titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.deferred.sepsis.title",
    descriptionKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.deferred.sepsis.description",
    searchAliases: ["sepsis", "septicémie"],
    conditionTags: ["sepsis"],
    riskTags: [],
    selectedInD4b6: false,
    deferredReasonKey: "enterpriseInterdisciplinaryCarePlansD4b6.deferrals.sepsis",
    sourceImmutableOnActivation: true,
    autoActivateFromDiagnosisAlone: false,
    components: [],
  },
  {
    templateId: "diabetes_endocrine_full",
    version: "D4B.6.0-deferred",
    governanceStatus: "DRAFT",
    titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.deferred.diabetes.title",
    descriptionKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.deferred.diabetes.description",
    searchAliases: ["diabète", "diabetes"],
    conditionTags: ["diabetes"],
    riskTags: [],
    selectedInD4b6: false,
    deferredReasonKey: "enterpriseInterdisciplinaryCarePlansD4b6.deferrals.diabetes",
    sourceImmutableOnActivation: true,
    autoActivateFromDiagnosisAlone: false,
    components: [],
  },
  {
    templateId: "stroke_pathway_full",
    version: "D4B.6.0-deferred",
    governanceStatus: "DRAFT",
    titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.deferred.stroke.title",
    descriptionKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.deferred.stroke.description",
    searchAliases: ["AVC", "stroke"],
    conditionTags: ["stroke"],
    riskTags: [],
    selectedInD4b6: false,
    deferredReasonKey: "enterpriseInterdisciplinaryCarePlansD4b6.deferrals.stroke",
    sourceImmutableOnActivation: true,
    autoActivateFromDiagnosisAlone: false,
    components: [],
  },
  {
    templateId: "behavioral_health_full",
    version: "D4B.6.0-deferred",
    governanceStatus: "DRAFT",
    titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.deferred.behavioral.title",
    descriptionKey: "enterpriseInterdisciplinaryCarePlansD4b6.templates.deferred.behavioral.description",
    searchAliases: ["psych", "behavioral"],
    conditionTags: ["behavioral"],
    riskTags: [],
    selectedInD4b6: false,
    deferredReasonKey: "enterpriseInterdisciplinaryCarePlansD4b6.deferrals.behavioral",
    sourceImmutableOnActivation: true,
    autoActivateFromDiagnosisAlone: false,
    components: [],
  },
];

export function listActiveCarePlanTemplates(): CarePlanTemplateDefinition[] {
  return ENTERPRISE_CARE_PLAN_TEMPLATE_CATALOG.filter(
    (t) => t.selectedInD4b6 && t.governanceStatus === "ACTIVE"
  );
}

export function getCarePlanTemplate(templateId: string): CarePlanTemplateDefinition | null {
  return ENTERPRISE_CARE_PLAN_TEMPLATE_CATALOG.find((t) => t.templateId === templateId) ?? null;
}

export function searchCarePlanTemplates(query: string): CarePlanTemplateDefinition[] {
  const q = String(query ?? "").trim().toLowerCase();
  const active = listActiveCarePlanTemplates();
  if (!q) return active;
  return active.filter((t) => {
    const hay = [t.templateId, ...t.searchAliases, ...t.conditionTags, ...t.riskTags]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function previewCarePlanTemplate(templateId: string): {
  found: boolean;
  template: CarePlanTemplateDefinition | null;
  bedsideActivatable: boolean;
  sourceImmutable: true;
  doesNotAutoActivateFromDiagnosis: true;
} {
  const template = getCarePlanTemplate(templateId);
  return {
    found: template != null,
    template,
    bedsideActivatable: template ? canBedsideActivateTemplate(template.governanceStatus) : false,
    sourceImmutable: true,
    doesNotAutoActivateFromDiagnosis: true,
  };
}

/* -------------------------------------------------------------------------- */
/* Patient plan model + lifecycle                                             */
/* -------------------------------------------------------------------------- */

export const CARE_PLAN_PATIENT_LIFECYCLE_STATES = [
  "DRAFT_CUSTOMIZATION",
  "ACTIVE",
  "IN_PROGRESS",
  "IN_REVIEW",
  "REVISED",
  "COMPLETED",
  "DISCONTINUED",
  "ENTERED_IN_ERROR",
] as const;

export type CarePlanPatientLifecycleState =
  (typeof CARE_PLAN_PATIENT_LIFECYCLE_STATES)[number];

export type CarePlanPatientComponent = {
  componentId: string;
  sourceTemplateComponentId: string | null;
  kind: CarePlanComponentKind;
  title: string;
  body: string;
  custom: boolean;
  disciplineHint: CarePlanTemplateComponent["disciplineHint"];
  status: "PENDING" | "IN_PROGRESS" | "MET" | "NOT_MET" | "DISCONTINUED";
  isRecommendationNotOrder: true;
  safetyDoesNotAuthorizePrecaution: boolean;
  authorUserId: string;
  lastUpdatedAt: string;
};

export type CarePlanPatientPlan = {
  planId: string;
  encounterId: string;
  patientId: string;
  facilityId: string;
  sourceTemplateId: string | null;
  sourceTemplateVersion: string | null;
  title: string;
  lifecycleState: CarePlanPatientLifecycleState;
  components: CarePlanPatientComponent[];
  activatedAt: string | null;
  activatedByUserId: string | null;
  completedAt: string | null;
  discontinuedAt: string | null;
  enteredInError: boolean;
  /** Hard invariants */
  isNotDiagnosis: true;
  doesNotMutateProblemList: true;
  doesNotCreateProviderOrders: true;
  doesNotAlterMar: true;
  doesNotFinalizeDiet: true;
  doesNotAlterOxygenVent: true;
  doesNotAuthorizeDischarge: true;
  doesNotProcureDme: true;
  doesNotAuthorizeRestraintsOrIsolation: true;
  sourceTemplateNotMutated: true;
  usesD4b1DocumentLifecycle: true;
};

export type CarePlanActivationResult = {
  accepted: boolean;
  reason:
    | "OK"
    | "TEMPLATE_NOT_FOUND"
    | "TEMPLATE_NOT_ACTIVE"
    | "AUTO_DIAGNOSIS_ACTIVATION_REJECTED"
    | "DUPLICATE_ACTIVE_PLAN"
    | "CARE_SETTING_LIMITED"
    | "CAPABILITY_DENIED";
  plan: CarePlanPatientPlan | null;
  templateSnapshotUnchanged: true;
};

export function activateCarePlanFromTemplate(input: {
  planId: string;
  encounterId: string;
  patientId: string;
  facilityId: string;
  templateId: string;
  activatedByUserId: string;
  activatedAt: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleProfile: CarePlanRoleProfile;
  existingActivePlans?: ReadonlyArray<Pick<CarePlanPatientPlan, "sourceTemplateId" | "lifecycleState">>;
  /** Optional patient-specific customizations applied to the copy only. */
  customizations?: ReadonlyArray<{
    sourceTemplateComponentId: string;
    title?: string;
    body?: string;
  }>;
  customComponents?: ReadonlyArray<{
    componentId: string;
    kind: CarePlanComponentKind;
    title: string;
    body: string;
    disciplineHint?: CarePlanTemplateComponent["disciplineHint"];
  }>;
  /** Must never be true — diagnosis alone cannot activate. */
  autoFromDiagnosisAlone?: boolean;
}): CarePlanActivationResult {
  if (input.autoFromDiagnosisAlone) {
    return {
      accepted: false,
      reason: "AUTO_DIAGNOSIS_ACTIVATION_REJECTED",
      plan: null,
      templateSnapshotUnchanged: true,
    };
  }
  if (input.careSetting === "EMERGENCY") {
    return {
      accepted: false,
      reason: "CARE_SETTING_LIMITED",
      plan: null,
      templateSnapshotUnchanged: true,
    };
  }
  if (!isCarePlanCapabilityAllowedForProfile("activate_plan", input.roleProfile)) {
    return {
      accepted: false,
      reason: "CAPABILITY_DENIED",
      plan: null,
      templateSnapshotUnchanged: true,
    };
  }
  const template = getCarePlanTemplate(input.templateId);
  if (!template) {
    return {
      accepted: false,
      reason: "TEMPLATE_NOT_FOUND",
      plan: null,
      templateSnapshotUnchanged: true,
    };
  }
  if (!canBedsideActivateTemplate(template.governanceStatus) || !template.selectedInD4b6) {
    return {
      accepted: false,
      reason: "TEMPLATE_NOT_ACTIVE",
      plan: null,
      templateSnapshotUnchanged: true,
    };
  }
  const duplicate = (input.existingActivePlans ?? []).some(
    (p) =>
      p.sourceTemplateId === template.templateId &&
      (p.lifecycleState === "ACTIVE" ||
        p.lifecycleState === "IN_PROGRESS" ||
        p.lifecycleState === "IN_REVIEW" ||
        p.lifecycleState === "REVISED" ||
        p.lifecycleState === "DRAFT_CUSTOMIZATION")
  );
  if (duplicate) {
    return {
      accepted: false,
      reason: "DUPLICATE_ACTIVE_PLAN",
      plan: null,
      templateSnapshotUnchanged: true,
    };
  }

  const customMap = new Map(
    (input.customizations ?? []).map((c) => [c.sourceTemplateComponentId, c])
  );
  const components: CarePlanPatientComponent[] = template.components.map((c) => {
    const custom = customMap.get(c.componentId);
    return {
      componentId: `${input.planId}:${c.componentId}`,
      sourceTemplateComponentId: c.componentId,
      kind: c.kind,
      title: custom?.title ?? c.titleKey,
      body: custom?.body ?? c.bodyKey,
      custom: !!custom,
      disciplineHint: c.disciplineHint,
      status: "PENDING",
      isRecommendationNotOrder: true,
      safetyDoesNotAuthorizePrecaution: c.safetyDoesNotAuthorizePrecaution,
      authorUserId: input.activatedByUserId,
      lastUpdatedAt: input.activatedAt,
    };
  });
  for (const extra of input.customComponents ?? []) {
    components.push({
      componentId: extra.componentId,
      sourceTemplateComponentId: null,
      kind: extra.kind,
      title: extra.title,
      body: extra.body,
      custom: true,
      disciplineHint: extra.disciplineHint ?? "SHARED",
      status: "PENDING",
      isRecommendationNotOrder: true,
      safetyDoesNotAuthorizePrecaution: extra.kind === "SAFETY",
      authorUserId: input.activatedByUserId,
      lastUpdatedAt: input.activatedAt,
    });
  }

  const plan: CarePlanPatientPlan = {
    planId: input.planId,
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    sourceTemplateId: template.templateId,
    sourceTemplateVersion: template.version,
    title: template.titleKey,
    lifecycleState: "ACTIVE",
    components,
    activatedAt: input.activatedAt,
    activatedByUserId: input.activatedByUserId,
    completedAt: null,
    discontinuedAt: null,
    enteredInError: false,
    isNotDiagnosis: true,
    doesNotMutateProblemList: true,
    doesNotCreateProviderOrders: true,
    doesNotAlterMar: true,
    doesNotFinalizeDiet: true,
    doesNotAlterOxygenVent: true,
    doesNotAuthorizeDischarge: true,
    doesNotProcureDme: true,
    doesNotAuthorizeRestraintsOrIsolation: true,
    sourceTemplateNotMutated: true,
    usesD4b1DocumentLifecycle: true,
  };

  return {
    accepted: true,
    reason: "OK",
    plan,
    templateSnapshotUnchanged: true,
  };
}

export function assertTemplateUnchangedAfterActivation(
  before: CarePlanTemplateDefinition,
  after: CarePlanTemplateDefinition
): boolean {
  return (
    before.templateId === after.templateId &&
    before.version === after.version &&
    before.governanceStatus === after.governanceStatus &&
    before.components.length === after.components.length &&
    JSON.stringify(before.components) === JSON.stringify(after.components)
  );
}

export function transitionCarePlanLifecycle(input: {
  plan: CarePlanPatientPlan;
  event:
    | "START_PROGRESS"
    | "REQUEST_REVIEW"
    | "REVISE"
    | "COMPLETE"
    | "DISCONTINUE"
    | "ENTER_IN_ERROR";
  at: string;
}): { accepted: boolean; plan: CarePlanPatientPlan } {
  const plan = { ...input.plan, components: [...input.plan.components] };
  const state = plan.lifecycleState;
  if (state === "ENTERED_IN_ERROR" || state === "COMPLETED" || state === "DISCONTINUED") {
    return { accepted: false, plan: input.plan };
  }
  switch (input.event) {
    case "START_PROGRESS":
      if (state === "ACTIVE" || state === "REVISED" || state === "DRAFT_CUSTOMIZATION") {
        plan.lifecycleState = "IN_PROGRESS";
        return { accepted: true, plan };
      }
      break;
    case "REQUEST_REVIEW":
      if (state === "IN_PROGRESS" || state === "ACTIVE" || state === "REVISED") {
        plan.lifecycleState = "IN_REVIEW";
        return { accepted: true, plan };
      }
      break;
    case "REVISE":
      if (state === "IN_REVIEW" || state === "IN_PROGRESS" || state === "ACTIVE") {
        plan.lifecycleState = "REVISED";
        return { accepted: true, plan };
      }
      break;
    case "COMPLETE":
      if (state === "IN_PROGRESS" || state === "IN_REVIEW" || state === "REVISED" || state === "ACTIVE") {
        plan.lifecycleState = "COMPLETED";
        plan.completedAt = input.at;
        return { accepted: true, plan };
      }
      break;
    case "DISCONTINUE":
      plan.lifecycleState = "DISCONTINUED";
      plan.discontinuedAt = input.at;
      return { accepted: true, plan };
    case "ENTER_IN_ERROR":
      plan.lifecycleState = "ENTERED_IN_ERROR";
      plan.enteredInError = true;
      return { accepted: true, plan };
  }
  return { accepted: false, plan: input.plan };
}

export function updateCarePlanComponentProgress(input: {
  plan: CarePlanPatientPlan;
  componentId: string;
  status: CarePlanPatientComponent["status"];
  authorUserId: string;
  at: string;
  /** Must not overwrite another discipline's authorship silently. */
  preserveOtherAuthor?: boolean;
}): { accepted: boolean; plan: CarePlanPatientPlan; authorshipPreserved: boolean } {
  const idx = input.plan.components.findIndex((c) => c.componentId === input.componentId);
  if (idx < 0) return { accepted: false, plan: input.plan, authorshipPreserved: true };
  const existing = input.plan.components[idx]!;
  const preserve =
    input.preserveOtherAuthor !== false &&
    existing.authorUserId !== input.authorUserId &&
    existing.status !== "PENDING";
  const nextAuthor = preserve ? existing.authorUserId : input.authorUserId;
  const components = input.plan.components.map((c, i) =>
    i === idx
      ? {
          ...c,
          status: input.status,
          authorUserId: nextAuthor,
          lastUpdatedAt: input.at,
        }
      : c
  );
  let plan: CarePlanPatientPlan = { ...input.plan, components };
  if (plan.lifecycleState === "ACTIVE") {
    plan = { ...plan, lifecycleState: "IN_PROGRESS" };
  }
  return { accepted: true, plan, authorshipPreserved: nextAuthor === existing.authorUserId || existing.status === "PENDING" };
}

/* -------------------------------------------------------------------------- */
/* Workspace sections                                                         */
/* -------------------------------------------------------------------------- */

export type EnterpriseCarePlanWorkspaceSectionId =
  | "overview"
  | "templateCatalog"
  | "templatePreview"
  | "activePlans"
  | "goalsOutcomes"
  | "interventions"
  | "monitoring"
  | "education"
  | "safety"
  | "progress"
  | "review"
  | "nursingContributions"
  | "rtContributions"
  | "rehabContributions"
  | "techProgress"
  | "legacyD3eStub"
  | "history"
  | "deferredBoundaries";

/** MEDUI.CP.1A — bedside primary navigation (engineering/legacy sections excluded). */
export const CLINICIAN_CARE_PLAN_PRIMARY_SECTION_IDS = [
  "activePlans",
  "goalsOutcomes",
  "interventions",
  "progress",
  "history",
] as const satisfies ReadonlyArray<EnterpriseCarePlanWorkspaceSectionId>;

/** Sections reachable from Add Care Plan / plan detail, not permanent top-level nav. */
export const CLINICIAN_CARE_PLAN_WORKFLOW_SECTION_IDS = [
  "templateCatalog",
  "templatePreview",
  "review",
] as const satisfies ReadonlyArray<EnterpriseCarePlanWorkspaceSectionId>;


export type CarePlanSectionMode =
  | "WORKFLOW"
  | "PROJECTION"
  | "LEGACY"
  | "DEFERRED"
  | "ED_LIMITED";

export type EnterpriseCarePlanWorkspaceSectionDefinition = {
  id: EnterpriseCarePlanWorkspaceSectionId;
  titleKey: string;
  mode: CarePlanSectionMode;
  allowedCareSettings: ReadonlyArray<"EMERGENCY" | "OBSERVATION" | "INPATIENT">;
  requiredCapability: EnterpriseCarePlanCapabilityId | null;
};

export const ENTERPRISE_CARE_PLAN_WORKSPACE_SECTIONS: ReadonlyArray<EnterpriseCarePlanWorkspaceSectionDefinition> =
  [
    { id: "overview", titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.sections.overview", mode: "WORKFLOW", allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"], requiredCapability: null },
    { id: "templateCatalog", titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.sections.templateCatalog", mode: "WORKFLOW", allowedCareSettings: ["OBSERVATION", "INPATIENT"], requiredCapability: "browse_templates" },
    { id: "templatePreview", titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.sections.templatePreview", mode: "WORKFLOW", allowedCareSettings: ["OBSERVATION", "INPATIENT"], requiredCapability: "preview_template" },
    { id: "activePlans", titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.sections.activePlans", mode: "WORKFLOW", allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"], requiredCapability: null },
    { id: "goalsOutcomes", titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.sections.goalsOutcomes", mode: "WORKFLOW", allowedCareSettings: ["OBSERVATION", "INPATIENT"], requiredCapability: "record_progress" },
    { id: "interventions", titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.sections.interventions", mode: "WORKFLOW", allowedCareSettings: ["OBSERVATION", "INPATIENT"], requiredCapability: "record_intervention_progress" },
    { id: "monitoring", titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.sections.monitoring", mode: "WORKFLOW", allowedCareSettings: ["OBSERVATION", "INPATIENT"], requiredCapability: "record_monitoring" },
    { id: "education", titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.sections.education", mode: "WORKFLOW", allowedCareSettings: ["OBSERVATION", "INPATIENT"], requiredCapability: "record_education" },
    { id: "safety", titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.sections.safety", mode: "WORKFLOW", allowedCareSettings: ["OBSERVATION", "INPATIENT"], requiredCapability: "document_safety_recommendation" },
    { id: "progress", titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.sections.progress", mode: "WORKFLOW", allowedCareSettings: ["OBSERVATION", "INPATIENT"], requiredCapability: "record_progress" },
    { id: "review", titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.sections.review", mode: "WORKFLOW", allowedCareSettings: ["OBSERVATION", "INPATIENT"], requiredCapability: "review_plan" },
    { id: "nursingContributions", titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.sections.nursingContributions", mode: "PROJECTION", allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"], requiredCapability: "view_discipline_contributions" },
    { id: "rtContributions", titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.sections.rtContributions", mode: "PROJECTION", allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"], requiredCapability: "view_discipline_contributions" },
    { id: "rehabContributions", titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.sections.rehabContributions", mode: "PROJECTION", allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"], requiredCapability: "view_discipline_contributions" },
    { id: "techProgress", titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.sections.techProgress", mode: "PROJECTION", allowedCareSettings: ["OBSERVATION", "INPATIENT"], requiredCapability: "view_discipline_contributions" },
    { id: "legacyD3eStub", titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.sections.legacyD3eStub", mode: "LEGACY", allowedCareSettings: ["INPATIENT"], requiredCapability: "view_legacy_d3e_stub" },
    { id: "history", titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.sections.history", mode: "WORKFLOW", allowedCareSettings: ["OBSERVATION", "INPATIENT"], requiredCapability: null },
    { id: "deferredBoundaries", titleKey: "enterpriseInterdisciplinaryCarePlansD4b6.sections.deferredBoundaries", mode: "DEFERRED", allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"], requiredCapability: null },
  ];

export function resolveCarePlanWorkspaceSection(
  id: string
): EnterpriseCarePlanWorkspaceSectionId | null {
  const hit = ENTERPRISE_CARE_PLAN_WORKSPACE_SECTIONS.find((s) => s.id === id);
  return hit?.id ?? null;
}

export function carePlanWorkspaceSectionsForCareSetting(
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT",
  opts?: {
    roleProfile?: CarePlanRoleProfile;
    includeDeferred?: boolean;
    /** When true (CP.1A clinician workspace), hide legacy/engineering/discipline-wall tabs. */
    clinicianPrimaryNav?: boolean;
  }
): EnterpriseCarePlanWorkspaceSectionDefinition[] {
  const roleProfile = opts?.roleProfile ?? "NURSE_CARE_PLAN_AUTHOR";
  const includeDeferred = opts?.includeDeferred ?? true;
  const clinicianPrimaryNav = opts?.clinicianPrimaryNav ?? false;
  return ENTERPRISE_CARE_PLAN_WORKSPACE_SECTIONS.filter((s) => {
    if (!s.allowedCareSettings.includes(careSetting)) return false;
    if (s.mode === "DEFERRED" && !includeDeferred) return false;
    if (clinicianPrimaryNav) {
      const primary = CLINICIAN_CARE_PLAN_PRIMARY_SECTION_IDS as ReadonlyArray<string>;
      const workflow = CLINICIAN_CARE_PLAN_WORKFLOW_SECTION_IDS as ReadonlyArray<string>;
      // ED keeps limited overview + activePlans only (existing ED_LIMITED rule below).
      if (careSetting === "EMERGENCY") {
        if (s.id !== "overview" && s.id !== "activePlans") return false;
      } else if (!primary.includes(s.id) && !workflow.includes(s.id)) {
        return false;
      }
    }
    if (careSetting === "EMERGENCY" && s.mode === "WORKFLOW" && s.id !== "overview" && s.id !== "activePlans") {
      return false;
    }
    if (s.requiredCapability && !isCarePlanCapabilityAllowedForProfile(s.requiredCapability, roleProfile)) {
      return roleProfile === "SUPPORT_READ_ONLY" || roleProfile === "PROVIDER_REVIEW_ONLY"
        ? s.mode === "PROJECTION" || s.id === "overview" || s.id === "activePlans"
        : false;
    }
    return true;
  }).map((s) =>
    careSetting === "EMERGENCY" && (s.id === "overview" || s.id === "activePlans")
      ? { ...s, mode: "ED_LIMITED" as const }
      : s
  );
}

export function classifyEncounterTypeToCarePlanCareSetting(
  encounterType: string | null | undefined
): "EMERGENCY" | "OBSERVATION" | "INPATIENT" {
  const t = String(encounterType ?? "").toUpperCase();
  if (t === "ER" || t === "ED" || t === "EMERGENCY") return "EMERGENCY";
  if (t === "OBSERVATION" || t === "OBS") return "OBSERVATION";
  return "INPATIENT";
}

/* -------------------------------------------------------------------------- */
/* Projections from D4B.2–5 / D3E                                             */
/* -------------------------------------------------------------------------- */

export type NursingCarePlanContributionProjection = {
  kind: "NURSING_CARE_PLAN_CONTRIBUTION";
  encounterId: string;
  sourceCardId: string | null;
  authorUserId: string | null;
  authorDisplayName: string | null;
  summaryText: string | null;
  recordedAt: string | null;
  isNursingAuthored: true;
  carePlanMustNotOverwrite: true;
};

export function projectNursingCarePlanContributions(input: {
  encounterId: string;
  entries: ReadonlyArray<{
    cardId?: string | null;
    authorUserId?: string | null;
    authorDisplayName?: string | null;
    summaryText?: string | null;
    recordedAt?: string | null;
  }>;
}): NursingCarePlanContributionProjection[] {
  return input.entries.map((e) => ({
    kind: "NURSING_CARE_PLAN_CONTRIBUTION" as const,
    encounterId: input.encounterId,
    sourceCardId: e.cardId ?? null,
    authorUserId: e.authorUserId ?? null,
    authorDisplayName: e.authorDisplayName ?? null,
    summaryText: e.summaryText ?? null,
    recordedAt: e.recordedAt ?? null,
    isNursingAuthored: true,
    carePlanMustNotOverwrite: true,
  }));
}

export type RtCarePlanContributionProjection = {
  kind: "RT_CARE_PLAN_CONTRIBUTION";
  encounterId: string;
  documentTypeId: string | null;
  authorUserId: string | null;
  summaryText: string | null;
  recordedAt: string | null;
  isRtAuthored: true;
  contributionIsNotFullPlan: true;
  carePlanMustNotOverwrite: true;
  doesNotAlterOxygenVent: true;
};

export function projectRtCarePlanContributions(input: {
  encounterId: string;
  entries: ReadonlyArray<{
    documentTypeId?: string | null;
    authorUserId?: string | null;
    summaryText?: string | null;
    recordedAt?: string | null;
  }>;
}): RtCarePlanContributionProjection[] {
  return input.entries.map((e) => ({
    kind: "RT_CARE_PLAN_CONTRIBUTION" as const,
    encounterId: input.encounterId,
    documentTypeId: e.documentTypeId ?? "rt.care_plan_contribution",
    authorUserId: e.authorUserId ?? null,
    summaryText: e.summaryText ?? null,
    recordedAt: e.recordedAt ?? null,
    isRtAuthored: true,
    contributionIsNotFullPlan: true,
    carePlanMustNotOverwrite: true,
    doesNotAlterOxygenVent: true,
  }));
}

export type RehabCarePlanContributionProjection = {
  kind: "REHAB_CARE_PLAN_CONTRIBUTION";
  encounterId: string;
  discipline: "PHYSICAL_THERAPY" | "OCCUPATIONAL_THERAPY" | "SPEECH_LANGUAGE_PATHOLOGY";
  documentTypeId: string | null;
  authorUserId: string | null;
  summaryText: string | null;
  recordedAt: string | null;
  contributionToCarePlanOnly: true;
  isNotFullInterdisciplinaryCarePlan: true;
  carePlanMustNotOverwrite: true;
  recommendationIsNotOrder: true;
};

export function projectRehabCarePlanContributions(input: {
  encounterId: string;
  entries: ReadonlyArray<{
    discipline: "PHYSICAL_THERAPY" | "OCCUPATIONAL_THERAPY" | "SPEECH_LANGUAGE_PATHOLOGY";
    documentTypeId?: string | null;
    authorUserId?: string | null;
    summaryText?: string | null;
    recordedAt?: string | null;
  }>;
}): RehabCarePlanContributionProjection[] {
  return input.entries.map((e) => ({
    kind: "REHAB_CARE_PLAN_CONTRIBUTION" as const,
    encounterId: input.encounterId,
    discipline: e.discipline,
    documentTypeId: e.documentTypeId ?? null,
    authorUserId: e.authorUserId ?? null,
    summaryText: e.summaryText ?? null,
    recordedAt: e.recordedAt ?? null,
    contributionToCarePlanOnly: true,
    isNotFullInterdisciplinaryCarePlan: true,
    carePlanMustNotOverwrite: true,
    recommendationIsNotOrder: true,
  }));
}

export type TechCarePlanProgressProjection = {
  kind: "TECH_CARE_PLAN_PROGRESS";
  encounterId: string;
  activityId: string | null;
  performerUserId: string | null;
  performerDisplayName: string | null;
  completedAt: string | null;
  isTechnicianAuthored: true;
  carePlanMustNotOverwrite: true;
};

export function projectTechCarePlanProgress(input: {
  encounterId: string;
  tasks: ReadonlyArray<{
    activityId?: string | null;
    performerUserId?: string | null;
    performerDisplayName?: string | null;
    completedAt?: string | null;
  }>;
}): TechCarePlanProgressProjection[] {
  return input.tasks.map((t) => ({
    kind: "TECH_CARE_PLAN_PROGRESS" as const,
    encounterId: input.encounterId,
    activityId: t.activityId ?? null,
    performerUserId: t.performerUserId ?? null,
    performerDisplayName: t.performerDisplayName ?? null,
    completedAt: t.completedAt ?? null,
    isTechnicianAuthored: true,
    carePlanMustNotOverwrite: true,
  }));
}

export type LegacyD3eCarePlanStubProjection = {
  kind: "LEGACY_D3E_CARE_PLAN_STUB";
  encounterId: string;
  itemId: string;
  discipline: string;
  goalText: string;
  status: string;
  isLegacyStub: true;
  isNotAuthoritativeIdcp: true;
};

export function projectLegacyD3eCarePlanStub(input: {
  encounterId: string;
  items: ReadonlyArray<{
    itemId: string;
    discipline: string;
    goalText: string;
    status: string;
  }>;
}): LegacyD3eCarePlanStubProjection[] {
  return input.items.map((i) => ({
    kind: "LEGACY_D3E_CARE_PLAN_STUB" as const,
    encounterId: input.encounterId,
    itemId: i.itemId,
    discipline: i.discipline,
    goalText: i.goalText,
    status: i.status,
    isLegacyStub: true,
    isNotAuthoritativeIdcp: true,
  }));
}

export function nursingAuthorshipNotOverwrittenByCarePlan(input: {
  nursingAuthorUserId: string;
  carePlanEditorUserId: string;
  storedNursingAuthorUserId: string;
}): boolean {
  void input.carePlanEditorUserId;
  return input.storedNursingAuthorUserId === input.nursingAuthorUserId;
}

export function rtAuthorshipNotOverwrittenByCarePlan(input: {
  rtAuthorUserId: string;
  carePlanEditorUserId: string;
  storedRtAuthorUserId: string;
}): boolean {
  void input.carePlanEditorUserId;
  return input.storedRtAuthorUserId === input.rtAuthorUserId;
}

export function rehabAuthorshipNotOverwrittenByCarePlan(input: {
  rehabAuthorUserId: string;
  carePlanEditorUserId: string;
  storedRehabAuthorUserId: string;
}): boolean {
  void input.carePlanEditorUserId;
  return input.storedRehabAuthorUserId === input.rehabAuthorUserId;
}

export function techPerformerPreservedAfterCarePlanProgress(input: {
  techPerformerUserId: string;
  carePlanEditorUserId: string;
  storedPerformerUserId: string;
}): boolean {
  void input.carePlanEditorUserId;
  return input.storedPerformerUserId === input.techPerformerUserId;
}

export function distinguishCarePlanInterventionFromProviderOrder(input: {
  interventionText?: string | null;
  relatedOrderId?: string | null;
}): {
  interventionIsNotOrder: true;
  doesNotCreateProviderOrder: true;
  hasLinkedOrderProjection: boolean;
} {
  return {
    interventionIsNotOrder: true,
    doesNotCreateProviderOrder: true,
    hasLinkedOrderProjection: !!String(input.relatedOrderId ?? "").trim(),
  };
}

export function distinguishCarePlanFromDiagnosis(input: {
  planFocusText?: string | null;
  diagnosisCode?: string | null;
}): {
  planIsNotDiagnosis: true;
  doesNotMutateProblemList: true;
  diagnosisPresentSeparately: boolean;
} {
  return {
    planIsNotDiagnosis: true,
    doesNotMutateProblemList: true,
    diagnosisPresentSeparately: !!String(input.diagnosisCode ?? "").trim(),
  };
}

export function distinguishDischargeReadinessFromAuthorization(input: {
  readinessNotes?: string | null;
  dischargeAuthorized?: boolean;
}): {
  readinessIsNotAuthorization: true;
  doesNotAuthorizeDischarge: true;
  dischargeAuthorizedElsewhere: boolean;
} {
  return {
    readinessIsNotAuthorization: true,
    doesNotAuthorizeDischarge: true,
    dischargeAuthorizedElsewhere: !!input.dischargeAuthorized,
  };
}

export function distinguishSafetyRecommendationFromPrecautionActivation(input: {
  safetyRecommendation?: string | null;
  isolationActivated?: boolean;
  restraintAuthorized?: boolean;
}): {
  recommendationIsNotActivation: true;
  doesNotAuthorizeRestraintsOrIsolation: true;
  precautionActivatedElsewhere: boolean;
} {
  return {
    recommendationIsNotActivation: true,
    doesNotAuthorizeRestraintsOrIsolation: true,
    precautionActivatedElsewhere: !!(input.isolationActivated || input.restraintAuthorized),
  };
}

/* -------------------------------------------------------------------------- */
/* D4B.1 virtual document adapters                                            */
/* -------------------------------------------------------------------------- */

export const CARE_PLAN_DOCUMENT_TYPE_IDS = [
  "care_plan.activation",
  "care_plan.progress_evaluation",
  "care_plan.review",
  "care_plan.revision",
  "care_plan.completion",
  "care_plan.discontinuation",
  "care_plan.entered_in_error",
] as const;

export type CarePlanDocumentTypeId = (typeof CARE_PLAN_DOCUMENT_TYPE_IDS)[number];

export function adaptCarePlanVirtualDocument(input: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  documentId: string;
  documentTypeId: CarePlanDocumentTypeId | string;
  body: string;
  authorUserId: string;
  authorDisplayName?: string | null;
  createdAt: string;
  careSetting?: EnterpriseClinicalDocumentCareSetting | "UNKNOWN";
  discipline?: EnterpriseClinicalDocumentDiscipline;
  structuredPayload?: Record<string, unknown>;
}): EnterpriseClinicalDocument {
  const author = actorSnapshot(
    input.authorUserId,
    input.authorDisplayName,
    input.discipline ?? "NURSING"
  );
  const lifecycleState: EnterpriseClinicalDocumentLifecycleState = "SIGNED";
  return {
    contractVersion: ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION,
    documentId: input.documentId,
    sourceArchitecture: "REFERENCE_VIRTUAL",
    patientId: input.patientId,
    encounterId: input.encounterId,
    hospitalEpisodeId: null,
    facilityId: input.facilityId,
    careSetting: input.careSetting ?? "UNKNOWN",
    discipline: input.discipline ?? "NURSING",
    documentTypeId: input.documentTypeId,
    templateVersion: "D4B.6",
    creator: author,
    author,
    responsibleSigner: author,
    cosigner: null,
    currentAssignedClinicianUserId: null,
    createdAt: input.createdAt,
    serviceAt: input.createdAt,
    lastEditedAt: input.createdAt,
    signedAt: input.createdAt,
    amendedAt: null,
    lifecycleState,
    structured: {
      schemaId: input.documentTypeId,
      schemaVersion: "D4B.6",
      payload: {
        isNotDiagnosis: true,
        doesNotMutateProblemList: true,
        doesNotCreateProviderOrders: true,
        doesNotAlterMar: true,
        doesNotFinalizeDiet: true,
        doesNotAlterOxygenVent: true,
        doesNotAuthorizeDischarge: true,
        doesNotProcureDme: true,
        doesNotAuthorizeRestraintsOrIsolation: true,
        sourceTemplateNotMutated: true,
        independentCarePlanLifecycleEngine: false,
        usesD4b1Lifecycle: true,
        ...(input.structuredPayload ?? {}),
      },
    },
    narrative: {
      sections: [{ key: "body", title: "Note", text: input.body, lateEntry: false }],
    },
    validation: { fieldValid: true, issues: [] },
    completeness: {
      clinicallyComplete: true,
      signatureReady: true,
      missingIndicators: [],
      acknowledgedExceptions: [],
    },
    lineage: {
      priorVersionId: null,
      currentVersionId: input.documentId,
      supersedesId: null,
      amendedFromId: null,
      amendmentReason: null,
      correctionReason: null,
      lateEntryLabeled: false,
    },
    legalRecordVisible: true,
    printExportEligible: true,
    enteredInError: input.documentTypeId === "care_plan.entered_in_error",
    voided: false,
  };
}

/* -------------------------------------------------------------------------- */
/* Workspace summary                                                          */
/* -------------------------------------------------------------------------- */

export type EnterpriseInterdisciplinaryCarePlansSummary = {
  certificationId: typeof ENTERPRISE_INTERDISCIPLINARY_CARE_PLANS_CERTIFICATION_ID;
  contractVersion: typeof ENTERPRISE_INTERDISCIPLINARY_CARE_PLANS_CONTRACT_VERSION;
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleProfile: CarePlanRoleProfile;
  usesD4b1Lifecycle: true;
  independentCarePlanLifecycleEngine: false;
  isNotDiagnosisEngine: true;
  doesNotMutateProblemList: true;
  createsProviderOrders: false;
  altersMar: false;
  finalizesDietOrders: false;
  altersOxygenVent: false;
  authorizesDischarge: false;
  procuresDme: false;
  authorizesRestraintsOrIsolation: false;
  autoActivatesFromDiagnosisAlone: false;
  mutatesSourceTemplatesOnActivation: false;
  overwritesNursing: false;
  overwritesTech: false;
  overwritesRt: false;
  overwritesRehab: false;
  assignmentEqualsAuthorization: false;
  sections: EnterpriseCarePlanWorkspaceSectionDefinition[];
  activeTemplates: CarePlanTemplateDefinition[];
  plans: CarePlanPatientPlan[];
  documents: EnterpriseClinicalDocument[];
  nursingContributions: NursingCarePlanContributionProjection[];
  rtContributions: RtCarePlanContributionProjection[];
  rehabContributions: RehabCarePlanContributionProjection[];
  techProgress: TechCarePlanProgressProjection[];
  legacyD3eStub: LegacyD3eCarePlanStubProjection[];
};

export function buildEnterpriseInterdisciplinaryCarePlansSummary(input: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleProfile?: CarePlanRoleProfile;
  plans?: ReadonlyArray<CarePlanPatientPlan>;
  documents?: ReadonlyArray<EnterpriseClinicalDocument>;
  nursingContributions?: ReadonlyArray<{
    cardId?: string | null;
    authorUserId?: string | null;
    authorDisplayName?: string | null;
    summaryText?: string | null;
    recordedAt?: string | null;
  }>;
  rtContributions?: ReadonlyArray<{
    documentTypeId?: string | null;
    authorUserId?: string | null;
    summaryText?: string | null;
    recordedAt?: string | null;
  }>;
  rehabContributions?: ReadonlyArray<{
    discipline: "PHYSICAL_THERAPY" | "OCCUPATIONAL_THERAPY" | "SPEECH_LANGUAGE_PATHOLOGY";
    documentTypeId?: string | null;
    authorUserId?: string | null;
    summaryText?: string | null;
    recordedAt?: string | null;
  }>;
  techProgress?: ReadonlyArray<{
    activityId?: string | null;
    performerUserId?: string | null;
    performerDisplayName?: string | null;
    completedAt?: string | null;
  }>;
  legacyD3eStub?: ReadonlyArray<{
    itemId: string;
    discipline: string;
    goalText: string;
    status: string;
  }>;
}): EnterpriseInterdisciplinaryCarePlansSummary {
  const roleProfile = input.roleProfile ?? "NURSE_CARE_PLAN_AUTHOR";
  const sections = carePlanWorkspaceSectionsForCareSetting(input.careSetting, { roleProfile });
  return {
    certificationId: ENTERPRISE_INTERDISCIPLINARY_CARE_PLANS_CERTIFICATION_ID,
    contractVersion: ENTERPRISE_INTERDISCIPLINARY_CARE_PLANS_CONTRACT_VERSION,
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    careSetting: input.careSetting,
    roleProfile,
    usesD4b1Lifecycle: true,
    independentCarePlanLifecycleEngine: false,
    isNotDiagnosisEngine: true,
    doesNotMutateProblemList: true,
    createsProviderOrders: false,
    altersMar: false,
    finalizesDietOrders: false,
    altersOxygenVent: false,
    authorizesDischarge: false,
    procuresDme: false,
    authorizesRestraintsOrIsolation: false,
    autoActivatesFromDiagnosisAlone: false,
    mutatesSourceTemplatesOnActivation: false,
    overwritesNursing: false,
    overwritesTech: false,
    overwritesRt: false,
    overwritesRehab: false,
    assignmentEqualsAuthorization: false,
    sections,
    activeTemplates: listActiveCarePlanTemplates(),
    plans: [...(input.plans ?? [])],
    documents: [...(input.documents ?? [])],
    nursingContributions: projectNursingCarePlanContributions({
      encounterId: input.encounterId,
      entries: input.nursingContributions ?? [],
    }),
    rtContributions: projectRtCarePlanContributions({
      encounterId: input.encounterId,
      entries: input.rtContributions ?? [],
    }),
    rehabContributions: projectRehabCarePlanContributions({
      encounterId: input.encounterId,
      entries: input.rehabContributions ?? [],
    }),
    techProgress: projectTechCarePlanProgress({
      encounterId: input.encounterId,
      tasks: input.techProgress ?? [],
    }),
    legacyD3eStub: projectLegacyD3eCarePlanStub({
      encounterId: input.encounterId,
      items: input.legacyD3eStub ?? [],
    }),
  };
}
