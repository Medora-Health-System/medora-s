/**
 * MEDUI.D4B.5 — Enterprise Rehabilitation Workspaces (PT / OT / SLP)
 *
 * Shared shell with THREE distinct discipline modes. Capability-driven IA +
 * D4B.1 projections. Does NOT collapse PT/OT/SLP into one THERAPY note/role.
 * Does NOT introduce an independent signature / version / amendment engine.
 * Does NOT overwrite nursing (D4B.2), tech (D4B.3), or RT (D4B.4) authorship.
 * Diet / equipment / discharge contributions are recommendations ≠ authority.
 */

import type {
  EnterpriseClinicalDocument,
  EnterpriseClinicalDocumentCareSetting,
  EnterpriseClinicalDocumentDiscipline,
  EnterpriseClinicalDocumentLifecycleState,
} from "./enterpriseClinicalDocumentContractD4b1.js";
import { actorSnapshot } from "./enterpriseClinicalDocumentAuthorshipD4b1.js";
import { ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION } from "./enterpriseClinicalDocumentContractD4b1.js";

export const ENTERPRISE_REHABILITATION_WORKSPACES_CERTIFICATION_ID =
  "MEDUI.ENTERPRISE_REHABILITATION_WORKSPACES.D4B5" as const;

export const ENTERPRISE_REHABILITATION_WORKSPACES_CONTRACT_VERSION = "D4B.5" as const;

/** Distinct discipline modes — never collapse into generic THERAPY. */
export const REHABILITATION_DISCIPLINE_MODES = [
  "PHYSICAL_THERAPY",
  "OCCUPATIONAL_THERAPY",
  "SPEECH_LANGUAGE_PATHOLOGY",
] as const;

export type RehabilitationDisciplineMode = (typeof REHABILITATION_DISCIPLINE_MODES)[number];

export const REHABILITATION_PROHIBITED_CAPABILITIES = [
  "provider_diagnosis_author",
  "medication_prescribe",
  "provider_documentation_sign",
  "nursing_assessment_overwrite",
  "technician_task_overwrite",
  "rt_documentation_overwrite",
  "provider_order_mutate",
  "diet_order_finalize",
  "discharge_authorize",
  "dme_procurement",
  "lab_result_verify",
  "imaging_official_interpret",
] as const;

export type RehabilitationProhibitedCapability =
  (typeof REHABILITATION_PROHIBITED_CAPABILITIES)[number];

/**
 * Capability profiles — designations, not Prisma RoleCodes.
 * MVP clinic: RN may proxy rehab documentation surfaces (mirror D4B.4 RT proxy).
 * Assistants do not auto-inherit full evaluator authority.
 */
export type RehabilitationRoleProfile =
  | "PHYSICAL_THERAPIST"
  | "OCCUPATIONAL_THERAPIST"
  | "SPEECH_LANGUAGE_PATHOLOGIST"
  | "NURSE_WITH_REHAB_PERMISSIONS"
  | "REHAB_ASSISTANT_LIMITED"
  | "SUPPORT_READ_ONLY";

export type EnterpriseRehabilitationCapabilityId =
  | "pt_evaluation"
  | "pt_treatment"
  | "pt_mobility_gait"
  | "pt_goals"
  | "pt_education"
  | "pt_equipment_recommendation"
  | "pt_handoff"
  | "pt_discharge_recommendation"
  | "ot_evaluation"
  | "ot_treatment"
  | "ot_adl_iadl"
  | "ot_goals"
  | "ot_education"
  | "ot_equipment_recommendation"
  | "ot_handoff"
  | "ot_discharge_recommendation"
  | "slp_communication_evaluation"
  | "slp_swallowing_evaluation"
  | "slp_treatment"
  | "slp_diet_recommendation"
  | "slp_goals"
  | "slp_education"
  | "slp_handoff"
  | "slp_discharge_recommendation"
  | "view_nursing_mobility_fall"
  | "view_tech_mobility_adl"
  | "view_nursing_swallow_screen"
  | "view_related_care_orders"
  | "view_rt_overlap";

export type EnterpriseRehabilitationCapabilityDefinition = {
  id: EnterpriseRehabilitationCapabilityId;
  titleKey: string;
  disciplineMode: RehabilitationDisciplineMode | "SHARED";
  defaultRoleProfiles: ReadonlyArray<RehabilitationRoleProfile>;
  orderDependent: boolean;
  requiresFacilityPolicy: boolean;
  assignmentGrantsCapability: false;
  assistantInheritsFullEvaluator: false;
};

function cap(
  id: EnterpriseRehabilitationCapabilityId,
  titleKey: string,
  disciplineMode: RehabilitationDisciplineMode | "SHARED",
  defaultRoleProfiles: ReadonlyArray<RehabilitationRoleProfile>,
  orderDependent = false
): EnterpriseRehabilitationCapabilityDefinition {
  return {
    id,
    titleKey,
    disciplineMode,
    defaultRoleProfiles,
    orderDependent,
    requiresFacilityPolicy: false,
    assignmentGrantsCapability: false,
    assistantInheritsFullEvaluator: false,
  };
}

const PT_EVAL_PROFILES: RehabilitationRoleProfile[] = [
  "PHYSICAL_THERAPIST",
  "NURSE_WITH_REHAB_PERMISSIONS",
];
const OT_EVAL_PROFILES: RehabilitationRoleProfile[] = [
  "OCCUPATIONAL_THERAPIST",
  "NURSE_WITH_REHAB_PERMISSIONS",
];
const SLP_EVAL_PROFILES: RehabilitationRoleProfile[] = [
  "SPEECH_LANGUAGE_PATHOLOGIST",
  "NURSE_WITH_REHAB_PERMISSIONS",
];
const PT_ALL: RehabilitationRoleProfile[] = [
  "PHYSICAL_THERAPIST",
  "NURSE_WITH_REHAB_PERMISSIONS",
  "REHAB_ASSISTANT_LIMITED",
];
const OT_ALL: RehabilitationRoleProfile[] = [
  "OCCUPATIONAL_THERAPIST",
  "NURSE_WITH_REHAB_PERMISSIONS",
  "REHAB_ASSISTANT_LIMITED",
];
const SLP_ALL: RehabilitationRoleProfile[] = [
  "SPEECH_LANGUAGE_PATHOLOGIST",
  "NURSE_WITH_REHAB_PERMISSIONS",
  "REHAB_ASSISTANT_LIMITED",
];
const VIEW_PROFILES: RehabilitationRoleProfile[] = [
  "PHYSICAL_THERAPIST",
  "OCCUPATIONAL_THERAPIST",
  "SPEECH_LANGUAGE_PATHOLOGIST",
  "NURSE_WITH_REHAB_PERMISSIONS",
  "REHAB_ASSISTANT_LIMITED",
  "SUPPORT_READ_ONLY",
];

export const ENTERPRISE_REHABILITATION_CAPABILITY_REGISTRY: ReadonlyArray<EnterpriseRehabilitationCapabilityDefinition> =
  [
    cap("pt_evaluation", "enterpriseRehabilitationWorkspacesD4b5.capabilities.ptEvaluation", "PHYSICAL_THERAPY", PT_EVAL_PROFILES),
    cap("pt_treatment", "enterpriseRehabilitationWorkspacesD4b5.capabilities.ptTreatment", "PHYSICAL_THERAPY", PT_ALL, true),
    cap("pt_mobility_gait", "enterpriseRehabilitationWorkspacesD4b5.capabilities.ptMobilityGait", "PHYSICAL_THERAPY", PT_EVAL_PROFILES),
    cap("pt_goals", "enterpriseRehabilitationWorkspacesD4b5.capabilities.ptGoals", "PHYSICAL_THERAPY", PT_EVAL_PROFILES),
    cap("pt_education", "enterpriseRehabilitationWorkspacesD4b5.capabilities.ptEducation", "PHYSICAL_THERAPY", PT_ALL),
    cap("pt_equipment_recommendation", "enterpriseRehabilitationWorkspacesD4b5.capabilities.ptEquipment", "PHYSICAL_THERAPY", PT_EVAL_PROFILES),
    cap("pt_handoff", "enterpriseRehabilitationWorkspacesD4b5.capabilities.ptHandoff", "PHYSICAL_THERAPY", PT_ALL),
    cap("pt_discharge_recommendation", "enterpriseRehabilitationWorkspacesD4b5.capabilities.ptDischarge", "PHYSICAL_THERAPY", PT_EVAL_PROFILES),
    cap("ot_evaluation", "enterpriseRehabilitationWorkspacesD4b5.capabilities.otEvaluation", "OCCUPATIONAL_THERAPY", OT_EVAL_PROFILES),
    cap("ot_treatment", "enterpriseRehabilitationWorkspacesD4b5.capabilities.otTreatment", "OCCUPATIONAL_THERAPY", OT_ALL, true),
    cap("ot_adl_iadl", "enterpriseRehabilitationWorkspacesD4b5.capabilities.otAdlIadl", "OCCUPATIONAL_THERAPY", OT_EVAL_PROFILES),
    cap("ot_goals", "enterpriseRehabilitationWorkspacesD4b5.capabilities.otGoals", "OCCUPATIONAL_THERAPY", OT_EVAL_PROFILES),
    cap("ot_education", "enterpriseRehabilitationWorkspacesD4b5.capabilities.otEducation", "OCCUPATIONAL_THERAPY", OT_ALL),
    cap("ot_equipment_recommendation", "enterpriseRehabilitationWorkspacesD4b5.capabilities.otEquipment", "OCCUPATIONAL_THERAPY", OT_EVAL_PROFILES),
    cap("ot_handoff", "enterpriseRehabilitationWorkspacesD4b5.capabilities.otHandoff", "OCCUPATIONAL_THERAPY", OT_ALL),
    cap("ot_discharge_recommendation", "enterpriseRehabilitationWorkspacesD4b5.capabilities.otDischarge", "OCCUPATIONAL_THERAPY", OT_EVAL_PROFILES),
    cap("slp_communication_evaluation", "enterpriseRehabilitationWorkspacesD4b5.capabilities.slpCommunication", "SPEECH_LANGUAGE_PATHOLOGY", SLP_EVAL_PROFILES),
    cap("slp_swallowing_evaluation", "enterpriseRehabilitationWorkspacesD4b5.capabilities.slpSwallowing", "SPEECH_LANGUAGE_PATHOLOGY", SLP_EVAL_PROFILES),
    cap("slp_treatment", "enterpriseRehabilitationWorkspacesD4b5.capabilities.slpTreatment", "SPEECH_LANGUAGE_PATHOLOGY", SLP_ALL, true),
    cap("slp_diet_recommendation", "enterpriseRehabilitationWorkspacesD4b5.capabilities.slpDiet", "SPEECH_LANGUAGE_PATHOLOGY", SLP_EVAL_PROFILES),
    cap("slp_goals", "enterpriseRehabilitationWorkspacesD4b5.capabilities.slpGoals", "SPEECH_LANGUAGE_PATHOLOGY", SLP_EVAL_PROFILES),
    cap("slp_education", "enterpriseRehabilitationWorkspacesD4b5.capabilities.slpEducation", "SPEECH_LANGUAGE_PATHOLOGY", SLP_ALL),
    cap("slp_handoff", "enterpriseRehabilitationWorkspacesD4b5.capabilities.slpHandoff", "SPEECH_LANGUAGE_PATHOLOGY", SLP_ALL),
    cap("slp_discharge_recommendation", "enterpriseRehabilitationWorkspacesD4b5.capabilities.slpDischarge", "SPEECH_LANGUAGE_PATHOLOGY", SLP_EVAL_PROFILES),
    cap("view_nursing_mobility_fall", "enterpriseRehabilitationWorkspacesD4b5.capabilities.viewNursingMobility", "SHARED", VIEW_PROFILES),
    cap("view_tech_mobility_adl", "enterpriseRehabilitationWorkspacesD4b5.capabilities.viewTechAdl", "SHARED", VIEW_PROFILES),
    cap("view_nursing_swallow_screen", "enterpriseRehabilitationWorkspacesD4b5.capabilities.viewSwallowScreen", "SHARED", VIEW_PROFILES),
    cap("view_related_care_orders", "enterpriseRehabilitationWorkspacesD4b5.capabilities.viewOrders", "SHARED", VIEW_PROFILES),
    cap("view_rt_overlap", "enterpriseRehabilitationWorkspacesD4b5.capabilities.viewRt", "SHARED", VIEW_PROFILES),
  ];

export type EnterpriseRehabilitationActivityId =
  | "PT_EVALUATION"
  | "PT_TREATMENT_NOTE"
  | "PT_PROGRESS_NOTE"
  | "PT_GOALS"
  | "PT_EDUCATION"
  | "PT_EQUIPMENT_RECOMMENDATION"
  | "PT_HANDOFF"
  | "PT_DISCHARGE_RECOMMENDATION"
  | "OT_EVALUATION"
  | "OT_TREATMENT_NOTE"
  | "OT_ADL_ASSESSMENT"
  | "OT_GOALS"
  | "OT_EDUCATION"
  | "OT_EQUIPMENT_RECOMMENDATION"
  | "OT_HANDOFF"
  | "OT_DISCHARGE_RECOMMENDATION"
  | "SLP_COMMUNICATION_EVALUATION"
  | "SLP_SWALLOWING_EVALUATION"
  | "SLP_TREATMENT_NOTE"
  | "SLP_DIET_RECOMMENDATION"
  | "SLP_GOALS"
  | "SLP_EDUCATION"
  | "SLP_HANDOFF"
  | "SLP_DISCHARGE_RECOMMENDATION"
  | "SLP_INSTRUMENTAL_SWALLOW" // deferred
  | "PT_PROPRIETARY_SCALE_ENGINE" // deferred
  | "OT_PROPRIETARY_SCALE_ENGINE"; // deferred

export type EnterpriseRehabilitationActivityDefinition = {
  activityId: EnterpriseRehabilitationActivityId;
  titleKey: string;
  documentTypeId: string | null;
  disciplineMode: RehabilitationDisciplineMode;
  capabilityId: EnterpriseRehabilitationCapabilityId;
  allowedCareSettings: ReadonlyArray<"EMERGENCY" | "OBSERVATION" | "INPATIENT">;
  orderDependent: boolean;
  selectedInD4b5: boolean;
  recommendationIsNotOrder: true;
  doesNotAuthorizeDischarge: true;
  doesNotFinalizeDietOrder: true;
  doesNotProcureEquipment: true;
};

function act(
  activityId: EnterpriseRehabilitationActivityId,
  titleKey: string,
  documentTypeId: string | null,
  disciplineMode: RehabilitationDisciplineMode,
  capabilityId: EnterpriseRehabilitationCapabilityId,
  allowedCareSettings: ReadonlyArray<"EMERGENCY" | "OBSERVATION" | "INPATIENT">,
  selectedInD4b5: boolean,
  orderDependent = false
): EnterpriseRehabilitationActivityDefinition {
  return {
    activityId,
    titleKey,
    documentTypeId,
    disciplineMode,
    capabilityId,
    allowedCareSettings,
    orderDependent,
    selectedInD4b5,
    recommendationIsNotOrder: true,
    doesNotAuthorizeDischarge: true,
    doesNotFinalizeDietOrder: true,
    doesNotProcureEquipment: true,
  };
}

const ALL_SETTINGS = ["EMERGENCY", "OBSERVATION", "INPATIENT"] as const;
const OBS_IP = ["OBSERVATION", "INPATIENT"] as const;

export const ENTERPRISE_REHABILITATION_ACTIVITY_REGISTRY: ReadonlyArray<EnterpriseRehabilitationActivityDefinition> =
  [
    act("PT_EVALUATION", "enterpriseRehabilitationWorkspacesD4b5.activities.ptEvaluation", "pt.evaluation", "PHYSICAL_THERAPY", "pt_evaluation", ALL_SETTINGS, true),
    act("PT_TREATMENT_NOTE", "enterpriseRehabilitationWorkspacesD4b5.activities.ptTreatment", "pt.treatment_note", "PHYSICAL_THERAPY", "pt_treatment", ALL_SETTINGS, true, true),
    act("PT_PROGRESS_NOTE", "enterpriseRehabilitationWorkspacesD4b5.activities.ptProgress", "pt.progress_note", "PHYSICAL_THERAPY", "pt_treatment", OBS_IP, true),
    act("PT_GOALS", "enterpriseRehabilitationWorkspacesD4b5.activities.ptGoals", "pt.goals", "PHYSICAL_THERAPY", "pt_goals", OBS_IP, true),
    act("PT_EDUCATION", "enterpriseRehabilitationWorkspacesD4b5.activities.ptEducation", "pt.education", "PHYSICAL_THERAPY", "pt_education", OBS_IP, true),
    act("PT_EQUIPMENT_RECOMMENDATION", "enterpriseRehabilitationWorkspacesD4b5.activities.ptEquipment", "pt.equipment_recommendation", "PHYSICAL_THERAPY", "pt_equipment_recommendation", OBS_IP, true),
    act("PT_HANDOFF", "enterpriseRehabilitationWorkspacesD4b5.activities.ptHandoff", "pt.handoff", "PHYSICAL_THERAPY", "pt_handoff", ALL_SETTINGS, true),
    act("PT_DISCHARGE_RECOMMENDATION", "enterpriseRehabilitationWorkspacesD4b5.activities.ptDischarge", "pt.discharge_recommendation", "PHYSICAL_THERAPY", "pt_discharge_recommendation", OBS_IP, true),
    act("OT_EVALUATION", "enterpriseRehabilitationWorkspacesD4b5.activities.otEvaluation", "ot.evaluation", "OCCUPATIONAL_THERAPY", "ot_evaluation", ALL_SETTINGS, true),
    act("OT_TREATMENT_NOTE", "enterpriseRehabilitationWorkspacesD4b5.activities.otTreatment", "ot.treatment_note", "OCCUPATIONAL_THERAPY", "ot_treatment", ALL_SETTINGS, true, true),
    act("OT_ADL_ASSESSMENT", "enterpriseRehabilitationWorkspacesD4b5.activities.otAdl", "ot.adl_assessment", "OCCUPATIONAL_THERAPY", "ot_adl_iadl", OBS_IP, true),
    act("OT_GOALS", "enterpriseRehabilitationWorkspacesD4b5.activities.otGoals", "ot.goals", "OCCUPATIONAL_THERAPY", "ot_goals", OBS_IP, true),
    act("OT_EDUCATION", "enterpriseRehabilitationWorkspacesD4b5.activities.otEducation", "ot.education", "OCCUPATIONAL_THERAPY", "ot_education", OBS_IP, true),
    act("OT_EQUIPMENT_RECOMMENDATION", "enterpriseRehabilitationWorkspacesD4b5.activities.otEquipment", "ot.equipment_recommendation", "OCCUPATIONAL_THERAPY", "ot_equipment_recommendation", OBS_IP, true),
    act("OT_HANDOFF", "enterpriseRehabilitationWorkspacesD4b5.activities.otHandoff", "ot.handoff", "OCCUPATIONAL_THERAPY", "ot_handoff", ALL_SETTINGS, true),
    act("OT_DISCHARGE_RECOMMENDATION", "enterpriseRehabilitationWorkspacesD4b5.activities.otDischarge", "ot.discharge_recommendation", "OCCUPATIONAL_THERAPY", "ot_discharge_recommendation", OBS_IP, true),
    act("SLP_COMMUNICATION_EVALUATION", "enterpriseRehabilitationWorkspacesD4b5.activities.slpCommunication", "slp.communication_evaluation", "SPEECH_LANGUAGE_PATHOLOGY", "slp_communication_evaluation", ALL_SETTINGS, true),
    act("SLP_SWALLOWING_EVALUATION", "enterpriseRehabilitationWorkspacesD4b5.activities.slpSwallowing", "slp.swallowing_evaluation", "SPEECH_LANGUAGE_PATHOLOGY", "slp_swallowing_evaluation", ALL_SETTINGS, true),
    act("SLP_TREATMENT_NOTE", "enterpriseRehabilitationWorkspacesD4b5.activities.slpTreatment", "slp.treatment_note", "SPEECH_LANGUAGE_PATHOLOGY", "slp_treatment", ALL_SETTINGS, true, true),
    act("SLP_DIET_RECOMMENDATION", "enterpriseRehabilitationWorkspacesD4b5.activities.slpDiet", "slp.diet_recommendation", "SPEECH_LANGUAGE_PATHOLOGY", "slp_diet_recommendation", ALL_SETTINGS, true),
    act("SLP_GOALS", "enterpriseRehabilitationWorkspacesD4b5.activities.slpGoals", "slp.goals", "SPEECH_LANGUAGE_PATHOLOGY", "slp_goals", OBS_IP, true),
    act("SLP_EDUCATION", "enterpriseRehabilitationWorkspacesD4b5.activities.slpEducation", "slp.education", "SPEECH_LANGUAGE_PATHOLOGY", "slp_education", OBS_IP, true),
    act("SLP_HANDOFF", "enterpriseRehabilitationWorkspacesD4b5.activities.slpHandoff", "slp.handoff", "SPEECH_LANGUAGE_PATHOLOGY", "slp_handoff", ALL_SETTINGS, true),
    act("SLP_DISCHARGE_RECOMMENDATION", "enterpriseRehabilitationWorkspacesD4b5.activities.slpDischarge", "slp.discharge_recommendation", "SPEECH_LANGUAGE_PATHOLOGY", "slp_discharge_recommendation", OBS_IP, true),
    act("SLP_INSTRUMENTAL_SWALLOW", "enterpriseRehabilitationWorkspacesD4b5.activities.slpInstrumental", null, "SPEECH_LANGUAGE_PATHOLOGY", "slp_swallowing_evaluation", OBS_IP, false),
    act("PT_PROPRIETARY_SCALE_ENGINE", "enterpriseRehabilitationWorkspacesD4b5.activities.ptScaleDeferred", null, "PHYSICAL_THERAPY", "pt_evaluation", OBS_IP, false),
    act("OT_PROPRIETARY_SCALE_ENGINE", "enterpriseRehabilitationWorkspacesD4b5.activities.otScaleDeferred", null, "OCCUPATIONAL_THERAPY", "ot_evaluation", OBS_IP, false),
  ];

export type EnterpriseRehabilitationWorkspaceSectionId =
  | "overview"
  | "relatedCareOrders"
  | "evaluation"
  | "treatment"
  | "mobilityGait"
  | "adlIadl"
  | "communication"
  | "swallowingAspiration"
  | "dietRecommendation"
  | "goalsOutcomes"
  | "education"
  | "equipmentRecommendation"
  | "nursingMobilityFall"
  | "techMobilityAdl"
  | "nursingSwallowScreen"
  | "rtOverlap"
  | "handoff"
  | "dischargeRecommendations"
  | "documentationHistory";

export type EnterpriseRehabilitationWorkspaceSectionMode =
  | "PROJECTION"
  | "STRUCTURED_CONTRACT"
  | "ORDER_PROJECTION"
  | "NURSING_PROJECTION"
  | "TECH_PROJECTION"
  | "RT_PROJECTION"
  | "DEFERRED"
  | "OPS_LINK";

export type EnterpriseRehabilitationWorkspaceSectionDefinition = {
  id: EnterpriseRehabilitationWorkspaceSectionId;
  titleKey: string;
  disciplineModes: ReadonlyArray<RehabilitationDisciplineMode>;
  visibleIn: ReadonlyArray<"EMERGENCY" | "OBSERVATION" | "INPATIENT">;
  mode: EnterpriseRehabilitationWorkspaceSectionMode;
  requiredCapability: EnterpriseRehabilitationCapabilityId | null;
  activityIds: ReadonlyArray<EnterpriseRehabilitationActivityId>;
};

export const ENTERPRISE_REHABILITATION_WORKSPACE_SECTIONS: ReadonlyArray<EnterpriseRehabilitationWorkspaceSectionDefinition> =
  [
    {
      id: "overview",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.overview",
      disciplineModes: [...REHABILITATION_DISCIPLINE_MODES],
      visibleIn: [...ALL_SETTINGS],
      mode: "PROJECTION",
      requiredCapability: null,
      activityIds: [],
    },
    {
      id: "relatedCareOrders",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.relatedOrders",
      disciplineModes: [...REHABILITATION_DISCIPLINE_MODES],
      visibleIn: [...ALL_SETTINGS],
      mode: "ORDER_PROJECTION",
      requiredCapability: "view_related_care_orders",
      activityIds: [],
    },
    {
      id: "evaluation",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.evaluation",
      disciplineModes: [...REHABILITATION_DISCIPLINE_MODES],
      visibleIn: [...ALL_SETTINGS],
      mode: "STRUCTURED_CONTRACT",
      requiredCapability: null, // resolved per discipline below
      activityIds: ["PT_EVALUATION", "OT_EVALUATION", "SLP_COMMUNICATION_EVALUATION", "SLP_SWALLOWING_EVALUATION"],
    },
    {
      id: "treatment",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.treatment",
      disciplineModes: [...REHABILITATION_DISCIPLINE_MODES],
      visibleIn: [...ALL_SETTINGS],
      mode: "STRUCTURED_CONTRACT",
      requiredCapability: null,
      activityIds: ["PT_TREATMENT_NOTE", "OT_TREATMENT_NOTE", "SLP_TREATMENT_NOTE", "PT_PROGRESS_NOTE"],
    },
    {
      id: "mobilityGait",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.mobilityGait",
      disciplineModes: ["PHYSICAL_THERAPY"],
      visibleIn: [...ALL_SETTINGS],
      mode: "STRUCTURED_CONTRACT",
      requiredCapability: "pt_mobility_gait",
      activityIds: ["PT_EVALUATION", "PT_TREATMENT_NOTE"],
    },
    {
      id: "adlIadl",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.adlIadl",
      disciplineModes: ["OCCUPATIONAL_THERAPY"],
      visibleIn: [...OBS_IP],
      mode: "STRUCTURED_CONTRACT",
      requiredCapability: "ot_adl_iadl",
      activityIds: ["OT_ADL_ASSESSMENT"],
    },
    {
      id: "communication",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.communication",
      disciplineModes: ["SPEECH_LANGUAGE_PATHOLOGY"],
      visibleIn: [...ALL_SETTINGS],
      mode: "STRUCTURED_CONTRACT",
      requiredCapability: "slp_communication_evaluation",
      activityIds: ["SLP_COMMUNICATION_EVALUATION"],
    },
    {
      id: "swallowingAspiration",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.swallowing",
      disciplineModes: ["SPEECH_LANGUAGE_PATHOLOGY"],
      visibleIn: [...ALL_SETTINGS],
      mode: "STRUCTURED_CONTRACT",
      requiredCapability: "slp_swallowing_evaluation",
      activityIds: ["SLP_SWALLOWING_EVALUATION"],
    },
    {
      id: "dietRecommendation",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.dietRecommendation",
      disciplineModes: ["SPEECH_LANGUAGE_PATHOLOGY"],
      visibleIn: [...ALL_SETTINGS],
      mode: "STRUCTURED_CONTRACT",
      requiredCapability: "slp_diet_recommendation",
      activityIds: ["SLP_DIET_RECOMMENDATION"],
    },
    {
      id: "goalsOutcomes",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.goals",
      disciplineModes: [...REHABILITATION_DISCIPLINE_MODES],
      visibleIn: [...OBS_IP],
      mode: "STRUCTURED_CONTRACT",
      requiredCapability: null,
      activityIds: ["PT_GOALS", "OT_GOALS", "SLP_GOALS"],
    },
    {
      id: "education",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.education",
      disciplineModes: [...REHABILITATION_DISCIPLINE_MODES],
      visibleIn: [...OBS_IP],
      mode: "STRUCTURED_CONTRACT",
      requiredCapability: null,
      activityIds: ["PT_EDUCATION", "OT_EDUCATION", "SLP_EDUCATION"],
    },
    {
      id: "equipmentRecommendation",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.equipment",
      disciplineModes: ["PHYSICAL_THERAPY", "OCCUPATIONAL_THERAPY"],
      visibleIn: [...OBS_IP],
      mode: "STRUCTURED_CONTRACT",
      requiredCapability: null,
      activityIds: ["PT_EQUIPMENT_RECOMMENDATION", "OT_EQUIPMENT_RECOMMENDATION"],
    },
    {
      id: "nursingMobilityFall",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.nursingMobility",
      disciplineModes: [...REHABILITATION_DISCIPLINE_MODES],
      visibleIn: [...ALL_SETTINGS],
      mode: "NURSING_PROJECTION",
      requiredCapability: "view_nursing_mobility_fall",
      activityIds: [],
    },
    {
      id: "techMobilityAdl",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.techAdl",
      disciplineModes: [...REHABILITATION_DISCIPLINE_MODES],
      visibleIn: [...ALL_SETTINGS],
      mode: "TECH_PROJECTION",
      requiredCapability: "view_tech_mobility_adl",
      activityIds: [],
    },
    {
      id: "nursingSwallowScreen",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.nursingSwallow",
      disciplineModes: ["SPEECH_LANGUAGE_PATHOLOGY", "OCCUPATIONAL_THERAPY"],
      visibleIn: [...ALL_SETTINGS],
      mode: "NURSING_PROJECTION",
      requiredCapability: "view_nursing_swallow_screen",
      activityIds: [],
    },
    {
      id: "rtOverlap",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.rtOverlap",
      disciplineModes: [...REHABILITATION_DISCIPLINE_MODES],
      visibleIn: [...ALL_SETTINGS],
      mode: "RT_PROJECTION",
      requiredCapability: "view_rt_overlap",
      activityIds: [],
    },
    {
      id: "handoff",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.handoff",
      disciplineModes: [...REHABILITATION_DISCIPLINE_MODES],
      visibleIn: [...ALL_SETTINGS],
      mode: "STRUCTURED_CONTRACT",
      requiredCapability: null,
      activityIds: ["PT_HANDOFF", "OT_HANDOFF", "SLP_HANDOFF"],
    },
    {
      id: "dischargeRecommendations",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.discharge",
      disciplineModes: [...REHABILITATION_DISCIPLINE_MODES],
      visibleIn: [...OBS_IP],
      mode: "STRUCTURED_CONTRACT",
      requiredCapability: null,
      activityIds: ["PT_DISCHARGE_RECOMMENDATION", "OT_DISCHARGE_RECOMMENDATION", "SLP_DISCHARGE_RECOMMENDATION"],
    },
    {
      id: "documentationHistory",
      titleKey: "enterpriseRehabilitationWorkspacesD4b5.sections.history",
      disciplineModes: [...REHABILITATION_DISCIPLINE_MODES],
      visibleIn: [...ALL_SETTINGS],
      mode: "PROJECTION",
      requiredCapability: null,
      activityIds: [],
    },
  ];

/** Structured contracts — MVP-safe fields; no proprietary scale licensing. */
export type PtEvaluationStructuredPayload = {
  schemaId: "pt.evaluation";
  schemaVersion: "D4B.5";
  chiefFunctionalConcern?: string;
  mobilityStatus?: string;
  gaitNotes?: string;
  transferAbility?: string;
  strengthNotes?: string;
  balanceNotes?: string;
  precautions?: string;
  recommendationIsNotOrder: true;
  doesNotOverwriteNursingFallAssessment: true;
};

export type OtEvaluationStructuredPayload = {
  schemaId: "ot.evaluation";
  schemaVersion: "D4B.5";
  adlStatus?: string;
  iadlStatus?: string;
  upperExtremityNotes?: string;
  cognitionFunctionalNotes?: string;
  adaptiveEquipmentConsidered?: string;
  recommendationIsNotOrder: true;
  doesNotOverwriteTechAdlAssistance: true;
};

export type SlpCommunicationEvaluationStructuredPayload = {
  schemaId: "slp.communication_evaluation";
  schemaVersion: "D4B.5";
  communicationStatus?: string;
  languageNotes?: string;
  cognitionCommunicationNotes?: string;
  recommendationIsNotOrder: true;
};

export type SlpSwallowingEvaluationStructuredPayload = {
  schemaId: "slp.swallowing_evaluation";
  schemaVersion: "D4B.5";
  aspirationRiskClinical?: string;
  oralPhaseNotes?: string;
  pharyngealPhaseNotes?: string;
  screeningIsNotEvaluation: true;
  nursingSwallowScreenIsNotSlpEvaluation: true;
  recommendationIsNotOrder: true;
  dietRecommendationIsNotDietOrder: true;
};

export type SlpDietRecommendationStructuredPayload = {
  schemaId: "slp.diet_recommendation";
  schemaVersion: "D4B.5";
  recommendedTexture?: string;
  recommendedLiquidConsistency?: string;
  npoRecommended?: boolean;
  rationale?: string;
  dietRecommendationIsNotDietOrder: true;
  doesNotFinalizeDietOrder: true;
  recommendationIsNotOrder: true;
};

export type RehabilitationGoalsStructuredPayload = {
  schemaId: "pt.goals" | "ot.goals" | "slp.goals";
  schemaVersion: "D4B.5";
  disciplineMode: RehabilitationDisciplineMode;
  goals: ReadonlyArray<{ id: string; text: string; status?: string }>;
  contributionToCarePlanOnly: true;
  isNotFullInterdisciplinaryCarePlan: true;
  recommendationIsNotOrder: true;
};

export type RehabilitationEquipmentRecommendationPayload = {
  schemaId: "pt.equipment_recommendation" | "ot.equipment_recommendation";
  schemaVersion: "D4B.5";
  recommendedItems: ReadonlyArray<{ label: string; notes?: string }>;
  equipmentRecommendationIsNotProcurement: true;
  doesNotProcureEquipment: true;
  recommendationIsNotOrder: true;
};

export function disciplineModeToEnterpriseDiscipline(
  mode: RehabilitationDisciplineMode
): EnterpriseClinicalDocumentDiscipline {
  return mode;
}

export function resolveRehabilitationRoleProfile(
  roleCodes: readonly string[],
  preferredDiscipline?: RehabilitationDisciplineMode | null
): RehabilitationRoleProfile {
  const codes = new Set(roleCodes.map((c) => String(c).trim().toUpperCase()).filter(Boolean));
  if (codes.has("PT") || codes.has("PHYSICAL_THERAPY") || codes.has("PHYSICAL_THERAPIST")) {
    return "PHYSICAL_THERAPIST";
  }
  if (codes.has("OT") || codes.has("OCCUPATIONAL_THERAPY") || codes.has("OCCUPATIONAL_THERAPIST")) {
    return "OCCUPATIONAL_THERAPIST";
  }
  if (
    codes.has("SLP") ||
    codes.has("SPEECH") ||
    codes.has("SPEECH_LANGUAGE_PATHOLOGY") ||
    codes.has("SPEECH_THERAPY")
  ) {
    return "SPEECH_LANGUAGE_PATHOLOGIST";
  }
  if (codes.has("PTA") || codes.has("COTA") || codes.has("SLPA") || codes.has("REHAB_ASSISTANT")) {
    return "REHAB_ASSISTANT_LIMITED";
  }
  if (codes.has("RN") || codes.has("ADMIN")) return "NURSE_WITH_REHAB_PERMISSIONS";
  if (preferredDiscipline === "PHYSICAL_THERAPY" && codes.has("PROVIDER")) {
    return "SUPPORT_READ_ONLY";
  }
  return "SUPPORT_READ_ONLY";
}

export function isRehabilitationCapabilityProhibited(
  capabilityId: string
): capabilityId is RehabilitationProhibitedCapability {
  return (REHABILITATION_PROHIBITED_CAPABILITIES as readonly string[]).includes(capabilityId);
}

export function isRehabilitationCapabilityAllowedForProfile(
  capabilityId: EnterpriseRehabilitationCapabilityId,
  profile: RehabilitationRoleProfile,
  disciplineMode?: RehabilitationDisciplineMode
): boolean {
  const def = ENTERPRISE_REHABILITATION_CAPABILITY_REGISTRY.find((c) => c.id === capabilityId);
  if (!def) return false;
  if (
    disciplineMode &&
    def.disciplineMode !== "SHARED" &&
    def.disciplineMode !== disciplineMode
  ) {
    return false;
  }
  return def.defaultRoleProfiles.includes(profile);
}

function evaluationCapabilityForMode(
  mode: RehabilitationDisciplineMode
): EnterpriseRehabilitationCapabilityId {
  if (mode === "PHYSICAL_THERAPY") return "pt_evaluation";
  if (mode === "OCCUPATIONAL_THERAPY") return "ot_evaluation";
  return "slp_communication_evaluation";
}

function treatmentCapabilityForMode(
  mode: RehabilitationDisciplineMode
): EnterpriseRehabilitationCapabilityId {
  if (mode === "PHYSICAL_THERAPY") return "pt_treatment";
  if (mode === "OCCUPATIONAL_THERAPY") return "ot_treatment";
  return "slp_treatment";
}

function goalsCapabilityForMode(
  mode: RehabilitationDisciplineMode
): EnterpriseRehabilitationCapabilityId {
  if (mode === "PHYSICAL_THERAPY") return "pt_goals";
  if (mode === "OCCUPATIONAL_THERAPY") return "ot_goals";
  return "slp_goals";
}

function educationCapabilityForMode(
  mode: RehabilitationDisciplineMode
): EnterpriseRehabilitationCapabilityId {
  if (mode === "PHYSICAL_THERAPY") return "pt_education";
  if (mode === "OCCUPATIONAL_THERAPY") return "ot_education";
  return "slp_education";
}

function handoffCapabilityForMode(
  mode: RehabilitationDisciplineMode
): EnterpriseRehabilitationCapabilityId {
  if (mode === "PHYSICAL_THERAPY") return "pt_handoff";
  if (mode === "OCCUPATIONAL_THERAPY") return "ot_handoff";
  return "slp_handoff";
}

function dischargeCapabilityForMode(
  mode: RehabilitationDisciplineMode
): EnterpriseRehabilitationCapabilityId {
  if (mode === "PHYSICAL_THERAPY") return "pt_discharge_recommendation";
  if (mode === "OCCUPATIONAL_THERAPY") return "ot_discharge_recommendation";
  return "slp_discharge_recommendation";
}

function equipmentCapabilityForMode(
  mode: RehabilitationDisciplineMode
): EnterpriseRehabilitationCapabilityId | null {
  if (mode === "PHYSICAL_THERAPY") return "pt_equipment_recommendation";
  if (mode === "OCCUPATIONAL_THERAPY") return "ot_equipment_recommendation";
  return null;
}

export function sectionRequiredCapabilityForDiscipline(
  sectionId: EnterpriseRehabilitationWorkspaceSectionId,
  disciplineMode: RehabilitationDisciplineMode
): EnterpriseRehabilitationCapabilityId | null {
  const base = ENTERPRISE_REHABILITATION_WORKSPACE_SECTIONS.find((s) => s.id === sectionId);
  if (!base) return null;
  if (base.requiredCapability) return base.requiredCapability;
  switch (sectionId) {
    case "evaluation":
      return evaluationCapabilityForMode(disciplineMode);
    case "treatment":
      return treatmentCapabilityForMode(disciplineMode);
    case "goalsOutcomes":
      return goalsCapabilityForMode(disciplineMode);
    case "education":
      return educationCapabilityForMode(disciplineMode);
    case "handoff":
      return handoffCapabilityForMode(disciplineMode);
    case "dischargeRecommendations":
      return dischargeCapabilityForMode(disciplineMode);
    case "equipmentRecommendation":
      return equipmentCapabilityForMode(disciplineMode);
    case "documentationHistory":
      return evaluationCapabilityForMode(disciplineMode);
    default:
      return null;
  }
}

export function rehabilitationActivityEligibility(input: {
  activityId: EnterpriseRehabilitationActivityId;
  careSetting: EnterpriseClinicalDocumentCareSetting;
  roleProfile: RehabilitationRoleProfile;
  disciplineMode: RehabilitationDisciplineMode;
  assignedUserId?: string | null;
  actorUserId?: string | null;
  orderPresent?: boolean;
}): {
  activityKnown: boolean;
  selectedInD4b5: boolean;
  careSettingAllowed: boolean;
  disciplineMatches: boolean;
  capabilityAllowedForProfile: boolean;
  orderSatisfied: boolean;
  assignmentEqualsAuthorization: false;
  sameAssignedUser: boolean;
  doesNotOverwriteNursingAssessment: true;
  doesNotOverwriteTechTasks: true;
  doesNotOverwriteRt: true;
  recommendationIsNotOrder: true;
  dietRecommendationIsNotDietOrder: true;
  equipmentRecommendationIsNotProcurement: true;
  doesNotAuthorizeDischarge: true;
  assistantDoesNotInheritFullEvaluator: boolean;
} {
  const activity = ENTERPRISE_REHABILITATION_ACTIVITY_REGISTRY.find(
    (a) => a.activityId === input.activityId
  );
  const capabilityOk =
    activity == null
      ? false
      : isRehabilitationCapabilityAllowedForProfile(
          activity.capabilityId,
          input.roleProfile,
          input.disciplineMode
        );
  const careOk = activity
    ? activity.allowedCareSettings.includes(
        input.careSetting as "EMERGENCY" | "OBSERVATION" | "INPATIENT"
      )
    : false;
  const disciplineOk = activity?.disciplineMode === input.disciplineMode;
  const orderOk = !activity?.orderDependent || !!input.orderPresent;
  const isAssistant = input.roleProfile === "REHAB_ASSISTANT_LIMITED";
  const evaluatorCaps: EnterpriseRehabilitationCapabilityId[] = [
    "pt_evaluation",
    "ot_evaluation",
    "slp_communication_evaluation",
    "slp_swallowing_evaluation",
  ];
  const assistantBlocked =
    isAssistant && activity != null && evaluatorCaps.includes(activity.capabilityId);
  return {
    activityKnown: activity != null,
    selectedInD4b5: !!activity?.selectedInD4b5,
    careSettingAllowed: careOk,
    disciplineMatches: !!disciplineOk,
    capabilityAllowedForProfile: capabilityOk && !assistantBlocked,
    orderSatisfied: orderOk,
    assignmentEqualsAuthorization: false,
    sameAssignedUser:
      !!input.assignedUserId &&
      !!input.actorUserId &&
      input.assignedUserId === input.actorUserId,
    doesNotOverwriteNursingAssessment: true,
    doesNotOverwriteTechTasks: true,
    doesNotOverwriteRt: true,
    recommendationIsNotOrder: true,
    dietRecommendationIsNotDietOrder: true,
    equipmentRecommendationIsNotProcurement: true,
    doesNotAuthorizeDischarge: true,
    assistantDoesNotInheritFullEvaluator: true,
  };
}

export function rehabilitationWorkspaceSectionsForCareSetting(
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT",
  options: {
    disciplineMode: RehabilitationDisciplineMode;
    roleProfile?: RehabilitationRoleProfile;
    includeDeferred?: boolean;
  }
): EnterpriseRehabilitationWorkspaceSectionDefinition[] {
  const profile = options.roleProfile ?? "NURSE_WITH_REHAB_PERMISSIONS";
  const includeDeferred = options.includeDeferred ?? true;
  return ENTERPRISE_REHABILITATION_WORKSPACE_SECTIONS.filter((s) => {
    if (!s.visibleIn.includes(careSetting)) return false;
    if (!s.disciplineModes.includes(options.disciplineMode)) return false;
    if (!includeDeferred && s.mode === "DEFERRED") return false;
    const req = sectionRequiredCapabilityForDiscipline(s.id, options.disciplineMode);
    if (req == null) return true;
    return isRehabilitationCapabilityAllowedForProfile(req, profile, options.disciplineMode);
  });
}

export function resolveRehabilitationWorkspaceSection(
  raw: string | null | undefined
): EnterpriseRehabilitationWorkspaceSectionId | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  const hit = ENTERPRISE_REHABILITATION_WORKSPACE_SECTIONS.find((s) => s.id === trimmed);
  if (hit) return hit.id;
  const lower = trimmed.toLowerCase().replace(/[_-]/g, "");
  const alias: Record<string, EnterpriseRehabilitationWorkspaceSectionId> = {
    overview: "overview",
    orders: "relatedCareOrders",
    relatedcareorders: "relatedCareOrders",
    evaluation: "evaluation",
    eval: "evaluation",
    treatment: "treatment",
    mobility: "mobilityGait",
    mobilitygait: "mobilityGait",
    gait: "mobilityGait",
    adl: "adlIadl",
    adliadl: "adlIadl",
    communication: "communication",
    swallow: "swallowingAspiration",
    swallowing: "swallowingAspiration",
    swallowingaspiration: "swallowingAspiration",
    diet: "dietRecommendation",
    dietrecommendation: "dietRecommendation",
    goals: "goalsOutcomes",
    goalsoutcomes: "goalsOutcomes",
    education: "education",
    equipment: "equipmentRecommendation",
    equipmentrecommendation: "equipmentRecommendation",
    nursingmobility: "nursingMobilityFall",
    nursingmobilityfall: "nursingMobilityFall",
    fall: "nursingMobilityFall",
    tech: "techMobilityAdl",
    techmobilityadl: "techMobilityAdl",
    swallowscreen: "nursingSwallowScreen",
    nursingswallowscreen: "nursingSwallowScreen",
    rt: "rtOverlap",
    rtoverlap: "rtOverlap",
    handoff: "handoff",
    discharge: "dischargeRecommendations",
    dischargerecommendations: "dischargeRecommendations",
    history: "documentationHistory",
    documentationhistory: "documentationHistory",
  };
  return alias[lower] ?? null;
}

export function resolveRehabilitationDisciplineMode(
  raw: string | null | undefined
): RehabilitationDisciplineMode | null {
  const t = String(raw ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!t) return null;
  if (t === "PT" || t === "PHYSICAL_THERAPY" || t === "PHYSICAL") return "PHYSICAL_THERAPY";
  if (t === "OT" || t === "OCCUPATIONAL_THERAPY" || t === "OCCUPATIONAL") return "OCCUPATIONAL_THERAPY";
  if (
    t === "SLP" ||
    t === "SPEECH" ||
    t === "SPEECH_LANGUAGE_PATHOLOGY" ||
    t === "SPEECH_THERAPY"
  ) {
    return "SPEECH_LANGUAGE_PATHOLOGY";
  }
  return null;
}

export function classifyEncounterTypeToRehabilitationCareSetting(
  encounterType: string | null | undefined
): "EMERGENCY" | "OBSERVATION" | "INPATIENT" {
  const t = String(encounterType ?? "").toUpperCase();
  if (t === "ER" || t === "ED" || t === "EMERGENCY") return "EMERGENCY";
  if (t === "OBSERVATION" || t === "OBS") return "OBSERVATION";
  return "INPATIENT";
}

export function toClinicalDocumentationHubCareSettingFromRehabilitation(
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT"
): "ED" | "OBSERVATION" | "INPATIENT" {
  if (careSetting === "EMERGENCY") return "ED";
  return careSetting;
}

/** Related CARE / ops order projection — not an order-creation surface. */
export type RehabilitationRelatedOrderProjection = {
  kind: "RELATED_REHAB_CARE_ORDER";
  encounterId: string;
  orderId: string;
  procedureCode: string | null;
  displayLabel: string;
  status: string;
  isActive: boolean;
  createsProviderOrder: false;
  recommendationIsNotOrder: true;
};

export function projectRelatedRehabilitationCareOrders(input: {
  encounterId: string;
  orders: ReadonlyArray<{
    orderId: string;
    procedureCode?: string | null;
    displayLabel: string;
    status: string;
    discontinued?: boolean;
  }>;
}): RehabilitationRelatedOrderProjection[] {
  const rehabRelated = new Set([
    "npo_status",
    "oral_challenge",
    "ambulation_trial",
    "fall_precautions",
    "swallowing_precautions",
    "swallowing_screen_required_before_first_po",
  ]);
  return input.orders
    .filter((o) => !o.discontinued && String(o.status).toUpperCase() !== "DISCONTINUED")
    .filter((o) => {
      const code = String(o.procedureCode ?? "").trim().toLowerCase();
      return !code || rehabRelated.has(code);
    })
    .map((o) => ({
      kind: "RELATED_REHAB_CARE_ORDER" as const,
      encounterId: input.encounterId,
      orderId: o.orderId,
      procedureCode: o.procedureCode ?? null,
      displayLabel: o.displayLabel,
      status: o.status,
      isActive: true,
      createsProviderOrder: false,
      recommendationIsNotOrder: true,
    }));
}

/** Nursing fall/mobility projection — nursing remains authoritative author. */
export type NursingMobilityFallProjection = {
  kind: "NURSING_MOBILITY_FALL_PROJECTION";
  encounterId: string;
  sourceCardId: string | null;
  authorUserId: string | null;
  authorDisplayName: string | null;
  summaryText: string | null;
  recordedAt: string | null;
  isNursingAuthored: true;
  rehabMustNotOverwrite: true;
};

export function projectNursingMobilityFall(input: {
  encounterId: string;
  entries: ReadonlyArray<{
    cardId?: string | null;
    authorUserId?: string | null;
    authorDisplayName?: string | null;
    summaryText?: string | null;
    recordedAt?: string | null;
  }>;
}): NursingMobilityFallProjection[] {
  return input.entries.map((e) => ({
    kind: "NURSING_MOBILITY_FALL_PROJECTION" as const,
    encounterId: input.encounterId,
    sourceCardId: e.cardId ?? null,
    authorUserId: e.authorUserId ?? null,
    authorDisplayName: e.authorDisplayName ?? null,
    summaryText: e.summaryText ?? null,
    recordedAt: e.recordedAt ?? null,
    isNursingAuthored: true,
    rehabMustNotOverwrite: true,
  }));
}

/** Nursing swallow screen — screening ≠ SLP evaluation. */
export type NursingSwallowScreenProjection = {
  kind: "NURSING_SWALLOW_SCREEN_PROJECTION";
  encounterId: string;
  result: string | null;
  authorUserId: string | null;
  recordedAt: string | null;
  isNursingAuthored: true;
  screeningIsNotSlpEvaluation: true;
  rehabMustNotOverwrite: true;
};

export function projectNursingSwallowScreen(input: {
  encounterId: string;
  entries: ReadonlyArray<{
    result?: string | null;
    authorUserId?: string | null;
    recordedAt?: string | null;
  }>;
}): NursingSwallowScreenProjection[] {
  return input.entries.map((e) => ({
    kind: "NURSING_SWALLOW_SCREEN_PROJECTION" as const,
    encounterId: input.encounterId,
    result: e.result ?? null,
    authorUserId: e.authorUserId ?? null,
    recordedAt: e.recordedAt ?? null,
    isNursingAuthored: true,
    screeningIsNotSlpEvaluation: true,
    rehabMustNotOverwrite: true,
  }));
}

/** Tech mobility/ADL task projection — tech performer preserved. */
export type TechMobilityAdlProjection = {
  kind: "TECH_MOBILITY_ADL_PROJECTION";
  encounterId: string;
  activityId: string | null;
  performerUserId: string | null;
  performerDisplayName: string | null;
  completedAt: string | null;
  isTechnicianAuthored: true;
  isNotOtEvaluation: true;
  rehabMustNotOverwrite: true;
};

export function projectTechMobilityAdl(input: {
  encounterId: string;
  tasks: ReadonlyArray<{
    activityId?: string | null;
    performerUserId?: string | null;
    performerDisplayName?: string | null;
    completedAt?: string | null;
  }>;
}): TechMobilityAdlProjection[] {
  return input.tasks.map((t) => ({
    kind: "TECH_MOBILITY_ADL_PROJECTION" as const,
    encounterId: input.encounterId,
    activityId: t.activityId ?? null,
    performerUserId: t.performerUserId ?? null,
    performerDisplayName: t.performerDisplayName ?? null,
    completedAt: t.completedAt ?? null,
    isTechnicianAuthored: true,
    isNotOtEvaluation: true,
    rehabMustNotOverwrite: true,
  }));
}

export function nursingAssessmentNotOverwrittenByRehab(input: {
  nursingAssessmentAuthorUserId: string;
  rehabDocumentAuthorUserId: string;
  storedNursingAuthorUserId: string;
}): boolean {
  void input.rehabDocumentAuthorUserId;
  return input.storedNursingAuthorUserId === input.nursingAssessmentAuthorUserId;
}

export function techTaskPerformerPreservedAfterRehabReview(input: {
  techPerformerUserId: string;
  rehabReviewerUserId: string;
  storedPerformerUserId: string;
}): boolean {
  void input.rehabReviewerUserId;
  return input.storedPerformerUserId === input.techPerformerUserId;
}

export function rehabPerformerPreservedAfterReassignment(input: {
  originalPerformerUserId: string | null | undefined;
  newAssigneeUserId: string | null | undefined;
  recordedPerformerUserId: string | null | undefined;
}): boolean {
  const recorded = String(input.recordedPerformerUserId ?? "").trim();
  const original = String(input.originalPerformerUserId ?? "").trim();
  if (!recorded || !original) return recorded === original;
  return recorded === original;
}

export function distinguishDietRecommendationFromOrder(input: {
  recommendedTexture?: string | null;
  activeDietOrderTexture?: string | null;
}): {
  recommendationDistinctFromOrder: boolean;
  dietRecommendationIsNotDietOrder: true;
  doesNotFinalizeDietOrder: true;
} {
  const rec = String(input.recommendedTexture ?? "").trim();
  const order = String(input.activeDietOrderTexture ?? "").trim();
  return {
    recommendationDistinctFromOrder: rec !== order || (!rec && !order),
    dietRecommendationIsNotDietOrder: true,
    doesNotFinalizeDietOrder: true,
  };
}

export function distinguishEquipmentRecommendationFromProcurement(input: {
  recommendedItem?: string | null;
  procuredItemId?: string | null;
}): {
  recommendationIsNotProcurement: true;
  doesNotProcureEquipment: true;
  hasProcurementRecord: boolean;
} {
  return {
    recommendationIsNotProcurement: true,
    doesNotProcureEquipment: true,
    hasProcurementRecord: !!String(input.procuredItemId ?? "").trim(),
  };
}

export function adaptRehabVirtualDocument(input: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  documentId: string;
  documentTypeId: string;
  disciplineMode: RehabilitationDisciplineMode;
  body: string;
  authorUserId: string;
  authorDisplayName?: string | null;
  createdAt: string;
  careSetting?: EnterpriseClinicalDocumentCareSetting | "UNKNOWN";
  structuredPayload?: Record<string, unknown>;
}): EnterpriseClinicalDocument {
  const discipline = disciplineModeToEnterpriseDiscipline(input.disciplineMode);
  const author = actorSnapshot(input.authorUserId, input.authorDisplayName, discipline);
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
    discipline,
    documentTypeId: input.documentTypeId,
    templateVersion: "D4B.5",
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
      schemaVersion: "D4B.5",
      payload: {
        recommendationIsNotOrder: true,
        doesNotAuthorizeDischarge: true,
        doesNotFinalizeDietOrder: true,
        doesNotProcureEquipment: true,
        doesNotOverwriteNursingAssessment: true,
        doesNotOverwriteTechTasks: true,
        doesNotOverwriteRt: true,
        screeningIsNotEvaluation: input.documentTypeId === "slp.swallowing_evaluation",
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
    enteredInError: false,
    voided: false,
  };
}

export type EnterpriseRehabilitationWorkspaceSummary = {
  certificationId: typeof ENTERPRISE_REHABILITATION_WORKSPACES_CERTIFICATION_ID;
  contractVersion: typeof ENTERPRISE_REHABILITATION_WORKSPACES_CONTRACT_VERSION;
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  disciplineMode: RehabilitationDisciplineMode;
  roleProfile: RehabilitationRoleProfile;
  usesD4b1Lifecycle: true;
  independentRehabLifecycleEngine: false;
  collapsesPtOtSlp: false;
  masqueradesAsNursingAssessment: false;
  overwritesTechTasks: false;
  overwritesRt: false;
  createsProviderOrders: false;
  finalizesDietOrders: false;
  procuresEquipment: false;
  authorizesDischarge: false;
  sections: EnterpriseRehabilitationWorkspaceSectionDefinition[];
  activities: EnterpriseRehabilitationActivityDefinition[];
  documents: EnterpriseClinicalDocument[];
  relatedOrders: RehabilitationRelatedOrderProjection[];
  nursingMobilityFall: NursingMobilityFallProjection[];
  nursingSwallowScreen: NursingSwallowScreenProjection[];
  techMobilityAdl: TechMobilityAdlProjection[];
};

export function buildEnterpriseRehabilitationWorkspaceSummary(input: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  disciplineMode: RehabilitationDisciplineMode;
  roleProfile?: RehabilitationRoleProfile;
  documents?: ReadonlyArray<EnterpriseClinicalDocument>;
  relatedOrders?: ReadonlyArray<{
    orderId: string;
    procedureCode?: string | null;
    displayLabel: string;
    status: string;
    discontinued?: boolean;
  }>;
  nursingMobilityFall?: ReadonlyArray<{
    cardId?: string | null;
    authorUserId?: string | null;
    authorDisplayName?: string | null;
    summaryText?: string | null;
    recordedAt?: string | null;
  }>;
  nursingSwallowScreen?: ReadonlyArray<{
    result?: string | null;
    authorUserId?: string | null;
    recordedAt?: string | null;
  }>;
  techMobilityAdl?: ReadonlyArray<{
    activityId?: string | null;
    performerUserId?: string | null;
    performerDisplayName?: string | null;
    completedAt?: string | null;
  }>;
}): EnterpriseRehabilitationWorkspaceSummary {
  const roleProfile = input.roleProfile ?? "NURSE_WITH_REHAB_PERMISSIONS";
  const sections = rehabilitationWorkspaceSectionsForCareSetting(input.careSetting, {
    disciplineMode: input.disciplineMode,
    roleProfile,
  });
  const activities = ENTERPRISE_REHABILITATION_ACTIVITY_REGISTRY.filter(
    (a) =>
      a.selectedInD4b5 &&
      a.disciplineMode === input.disciplineMode &&
      a.allowedCareSettings.includes(input.careSetting) &&
      isRehabilitationCapabilityAllowedForProfile(a.capabilityId, roleProfile, input.disciplineMode)
  );
  const documents = (input.documents ?? []).filter(
    (d) => d.discipline === disciplineModeToEnterpriseDiscipline(input.disciplineMode)
  );

  return {
    certificationId: ENTERPRISE_REHABILITATION_WORKSPACES_CERTIFICATION_ID,
    contractVersion: ENTERPRISE_REHABILITATION_WORKSPACES_CONTRACT_VERSION,
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    careSetting: input.careSetting,
    disciplineMode: input.disciplineMode,
    roleProfile,
    usesD4b1Lifecycle: true,
    independentRehabLifecycleEngine: false,
    collapsesPtOtSlp: false,
    masqueradesAsNursingAssessment: false,
    overwritesTechTasks: false,
    overwritesRt: false,
    createsProviderOrders: false,
    finalizesDietOrders: false,
    procuresEquipment: false,
    authorizesDischarge: false,
    sections,
    activities,
    documents,
    relatedOrders: projectRelatedRehabilitationCareOrders({
      encounterId: input.encounterId,
      orders: input.relatedOrders ?? [],
    }),
    nursingMobilityFall: projectNursingMobilityFall({
      encounterId: input.encounterId,
      entries: input.nursingMobilityFall ?? [],
    }),
    nursingSwallowScreen: projectNursingSwallowScreen({
      encounterId: input.encounterId,
      entries: input.nursingSwallowScreen ?? [],
    }),
    techMobilityAdl: projectTechMobilityAdl({
      encounterId: input.encounterId,
      tasks: input.techMobilityAdl ?? [],
    }),
  };
}
