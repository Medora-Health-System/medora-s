/**
 * MEDUI.D4B.4 — Enterprise Respiratory Therapy Workspace
 *
 * Capability-driven IA + activity registry + D4B.1 projections.
 * Composes EDOC.12, oxygen orders, MAR respiratory response, D4B.3 SpO2.
 * Does NOT introduce a second signature / version / amendment engine.
 * Does NOT replace nursing assessment, provider orders, or MAR.
 */

import type {
  EnterpriseClinicalDocument,
  EnterpriseClinicalDocumentCareSetting,
  EnterpriseClinicalDocumentLifecycleState,
} from "./enterpriseClinicalDocumentContractD4b1.js";
import {
  adaptEdocEntryToEnterpriseClinicalDocument,
  type EdocEntryAdapterInput,
  type EncounterNoteAdapterInput,
} from "./enterpriseClinicalDocumentAdaptersD4b1.js";
import { actorSnapshot } from "./enterpriseClinicalDocumentAuthorshipD4b1.js";
import { ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION } from "./enterpriseClinicalDocumentContractD4b1.js";
import {
  EDOC12_RESPIRATORY_DOCUMENTATION_CARD_IDS,
  type Edoc12RespiratoryDocumentationCardId,
} from "./respiratoryDocumentationPayloads.js";
import type { TechnicianVitalsContributionProjection } from "./enterpriseTechnicianNursingAssistantWorkspaceD4b3.js";

export const ENTERPRISE_RESPIRATORY_THERAPY_WORKSPACE_CERTIFICATION_ID =
  "MEDUI.ENTERPRISE_RESPIRATORY_THERAPY_WORKSPACE.D4B4" as const;

export const ENTERPRISE_RESPIRATORY_THERAPY_WORKSPACE_CONTRACT_VERSION = "D4B.4" as const;

/** Hard prohibitions — never grant via job title / assignment alone. */
export const RESPIRATORY_THERAPY_PROHIBITED_CAPABILITIES = [
  "provider_diagnosis_author",
  "medication_prescribe",
  "provider_documentation_sign",
  "nursing_assessment_overwrite",
  "provider_order_mutate",
  "lab_result_verify",
  "mar_duplicate_administration",
  "ungoverned_ventilator_setting_change",
] as const;

export type RespiratoryTherapyProhibitedCapability =
  (typeof RESPIRATORY_THERAPY_PROHIBITED_CAPABILITIES)[number];

export type EnterpriseRespiratoryTherapyCapabilityId =
  | "rt_assessment"
  | "rt_reassessment"
  | "oxygen_device_management"
  | "aerosol_treatment_workflow"
  | "treatment_response_documentation"
  | "airway_assessment"
  | "artificial_airway_check"
  | "ventilator_check"
  | "niv_check"
  | "high_flow_check"
  | "suctioning_secretion"
  | "airway_clearance"
  | "bedside_measurement"
  | "abg_collection"
  | "respiratory_specimen"
  | "rt_education"
  | "care_plan_contribution"
  | "rt_handoff"
  | "discharge_recommendation"
  | "view_tech_measurements"
  | "view_mar_respiratory_response"
  | "view_active_respiratory_orders";

/**
 * Capability profiles — designations, not Prisma RoleCodes.
 * MVP clinic: RN proxies RESPIRATORY catalog execution (see enterpriseProcedureExecutionProfile).
 */
export type RespiratoryTherapyRoleProfile =
  | "RESPIRATORY_THERAPIST"
  | "NURSE_WITH_RT_PERMISSIONS"
  | "TECHNICIAN_MEASUREMENT_ONLY"
  | "SUPPORT_READ_ONLY";

export type EnterpriseRespiratoryTherapyCapabilityDefinition = {
  id: EnterpriseRespiratoryTherapyCapabilityId;
  titleKey: string;
  defaultRoleProfiles: ReadonlyArray<RespiratoryTherapyRoleProfile>;
  orderDependent: boolean;
  medicationDependent: boolean;
  requiresFacilityPolicy: boolean;
  assignmentGrantsCapability: false;
};

export const ENTERPRISE_RESPIRATORY_THERAPY_CAPABILITY_REGISTRY: ReadonlyArray<EnterpriseRespiratoryTherapyCapabilityDefinition> =
  [
    {
      id: "rt_assessment",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.assessment",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: false,
      medicationDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "rt_reassessment",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.reassessment",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: false,
      medicationDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "oxygen_device_management",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.oxygen",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: true,
      medicationDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "aerosol_treatment_workflow",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.aerosol",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: true,
      medicationDependent: true,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "treatment_response_documentation",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.treatmentResponse",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: false,
      medicationDependent: true,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "airway_assessment",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.airway",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: false,
      medicationDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "artificial_airway_check",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.artificialAirway",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: false,
      medicationDependent: false,
      requiresFacilityPolicy: true,
      assignmentGrantsCapability: false,
    },
    {
      id: "ventilator_check",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.ventilator",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: true,
      medicationDependent: false,
      requiresFacilityPolicy: true,
      assignmentGrantsCapability: false,
    },
    {
      id: "niv_check",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.niv",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: true,
      medicationDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "high_flow_check",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.highFlow",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: true,
      medicationDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "suctioning_secretion",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.suctioning",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: false,
      medicationDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "airway_clearance",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.airwayClearance",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: true,
      medicationDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "bedside_measurement",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.bedsideMeasurement",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: false,
      medicationDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "abg_collection",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.abg",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: true,
      medicationDependent: false,
      requiresFacilityPolicy: true,
      assignmentGrantsCapability: false,
    },
    {
      id: "respiratory_specimen",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.specimen",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: true,
      medicationDependent: false,
      requiresFacilityPolicy: true,
      assignmentGrantsCapability: false,
    },
    {
      id: "rt_education",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.education",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: false,
      medicationDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "care_plan_contribution",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.carePlan",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: false,
      medicationDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "rt_handoff",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.handoff",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: false,
      medicationDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "discharge_recommendation",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.dischargeRecommendation",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS"],
      orderDependent: false,
      medicationDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "view_tech_measurements",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.viewTechMeasurements",
      defaultRoleProfiles: [
        "RESPIRATORY_THERAPIST",
        "NURSE_WITH_RT_PERMISSIONS",
        "TECHNICIAN_MEASUREMENT_ONLY",
        "SUPPORT_READ_ONLY",
      ],
      orderDependent: false,
      medicationDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "view_mar_respiratory_response",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.viewMarResponse",
      defaultRoleProfiles: ["RESPIRATORY_THERAPIST", "NURSE_WITH_RT_PERMISSIONS", "SUPPORT_READ_ONLY"],
      orderDependent: false,
      medicationDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "view_active_respiratory_orders",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.capabilities.viewOrders",
      defaultRoleProfiles: [
        "RESPIRATORY_THERAPIST",
        "NURSE_WITH_RT_PERMISSIONS",
        "SUPPORT_READ_ONLY",
      ],
      orderDependent: false,
      medicationDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
  ];

export type EnterpriseRespiratoryTherapyActivityId =
  | "RT_INITIAL_ASSESSMENT"
  | "RT_REASSESSMENT"
  | "RT_TREATMENT_NOTE"
  | "RT_TREATMENT_RESPONSE"
  | "RT_OXYGEN_DEVICE_ASSESSMENT"
  | "RT_AIRWAY_ASSESSMENT"
  | "RT_ARTIFICIAL_AIRWAY_CHECK"
  | "RT_TRACHEOSTOMY_CARE"
  | "RT_VENTILATOR_CHECK"
  | "RT_NONINVASIVE_VENTILATION_CHECK"
  | "RT_HIGH_FLOW_CHECK"
  | "RT_SUCTIONING_EVENT"
  | "RT_AIRWAY_CLEARANCE_EVENT"
  | "RT_BEDSIDE_MEASUREMENT"
  | "RT_ABG_COLLECTION"
  | "RT_RESPIRATORY_SPECIMEN_COLLECTION"
  | "RT_EDUCATION_NOTE"
  | "RT_CARE_PLAN_UPDATE"
  | "RT_HANDOFF"
  | "RT_DISCHARGE_RECOMMENDATION";

export type EnterpriseRespiratoryTherapyActivityKind =
  | "CLINICAL_DOCUMENT"
  | "TREATMENT_RESPONSE"
  | "ORDER_LINKED_OBSERVATION"
  | "MAR_LINKED_RESPONSE"
  | "MEASUREMENT"
  | "OPERATIONAL_CONTRIBUTION"
  | "RECOMMENDATION"
  | "DEFERRED";

export type EnterpriseRespiratoryTherapyActivityDefinition = {
  activityId: EnterpriseRespiratoryTherapyActivityId;
  titleKey: string;
  kind: EnterpriseRespiratoryTherapyActivityKind;
  allowedCareSettings: ReadonlyArray<"EMERGENCY" | "OBSERVATION" | "INPATIENT">;
  capabilityId: EnterpriseRespiratoryTherapyCapabilityId | null;
  orderDependent: boolean;
  medicationDependent: boolean;
  usesD4b1Lifecycle: boolean;
  d4b1DocumentTypeId: string | null;
  nursingVisible: boolean;
  providerVisible: boolean;
  printExportEligible: boolean;
  selectedInD4b4: boolean;
  edocCardIds?: ReadonlyArray<Edoc12RespiratoryDocumentationCardId>;
  authoritativeSource:
    | "EDOC12"
    | "OXYGEN_ORDER_PARAMS"
    | "MAR_RESPIRATORY_RESPONSE"
    | "PROCEDURE_WORK_QUEUE"
    | "VITALS_ENGINE_D4B3"
    | "CARE_PLAN_TOKEN"
    | "EDUCATION_TOPIC"
    | "NONE_DEFERRED";
  /** Explicit clinical distinctions for hosts/tests. */
  isNursingRespiratoryAssessment: false;
  isProviderOrder: false;
  isMarAdministration: false;
  isDeviceTelemetry: false;
  recommendationIsNotOrder: true;
};

/** Smallest coherent activity registry from D4B.4 audit. */
export const ENTERPRISE_RESPIRATORY_THERAPY_ACTIVITY_REGISTRY: ReadonlyArray<EnterpriseRespiratoryTherapyActivityDefinition> =
  [
    {
      activityId: "RT_INITIAL_ASSESSMENT",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.initialAssessment",
      kind: "CLINICAL_DOCUMENT",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "rt_assessment",
      orderDependent: false,
      medicationDependent: false,
      usesD4b1Lifecycle: true,
      d4b1DocumentTypeId: "rt.initial_assessment",
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: true,
      selectedInD4b4: true,
      edocCardIds: ["resp_assessment"],
      authoritativeSource: "EDOC12",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_REASSESSMENT",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.reassessment",
      kind: "CLINICAL_DOCUMENT",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "rt_reassessment",
      orderDependent: false,
      medicationDependent: false,
      usesD4b1Lifecycle: true,
      d4b1DocumentTypeId: "rt.reassessment",
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: true,
      selectedInD4b4: true,
      edocCardIds: ["respiratory_distress_reassessment", "nebulizer_reassessment"],
      authoritativeSource: "EDOC12",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_TREATMENT_NOTE",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.treatmentNote",
      kind: "ORDER_LINKED_OBSERVATION",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "aerosol_treatment_workflow",
      orderDependent: true,
      medicationDependent: true,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: false,
      selectedInD4b4: true,
      authoritativeSource: "PROCEDURE_WORK_QUEUE",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_TREATMENT_RESPONSE",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.treatmentResponse",
      kind: "MAR_LINKED_RESPONSE",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "treatment_response_documentation",
      orderDependent: false,
      medicationDependent: true,
      usesD4b1Lifecycle: true,
      d4b1DocumentTypeId: "rt.treatment_response",
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: true,
      selectedInD4b4: true,
      authoritativeSource: "MAR_RESPIRATORY_RESPONSE",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_OXYGEN_DEVICE_ASSESSMENT",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.oxygenDevice",
      kind: "ORDER_LINKED_OBSERVATION",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "oxygen_device_management",
      orderDependent: true,
      medicationDependent: false,
      usesD4b1Lifecycle: true,
      d4b1DocumentTypeId: "rt.oxygen_device_assessment",
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: true,
      selectedInD4b4: true,
      edocCardIds: ["oxygen_therapy_initiation", "oxygen_titration"],
      authoritativeSource: "EDOC12",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_AIRWAY_ASSESSMENT",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.airway",
      kind: "CLINICAL_DOCUMENT",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "airway_assessment",
      orderDependent: false,
      medicationDependent: false,
      usesD4b1Lifecycle: true,
      d4b1DocumentTypeId: "rt.airway_assessment",
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: true,
      selectedInD4b4: true,
      edocCardIds: ["resp_assessment", "respiratory_distress_reassessment"],
      authoritativeSource: "EDOC12",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_ARTIFICIAL_AIRWAY_CHECK",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.artificialAirway",
      kind: "DEFERRED",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "artificial_airway_check",
      orderDependent: false,
      medicationDependent: false,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: false,
      selectedInD4b4: false,
      authoritativeSource: "NONE_DEFERRED",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_TRACHEOSTOMY_CARE",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.tracheostomy",
      kind: "DEFERRED",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      capabilityId: "artificial_airway_check",
      orderDependent: false,
      medicationDependent: false,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: false,
      selectedInD4b4: false,
      authoritativeSource: "NONE_DEFERRED",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_VENTILATOR_CHECK",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.ventilator",
      kind: "ORDER_LINKED_OBSERVATION",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "ventilator_check",
      orderDependent: true,
      medicationDependent: false,
      usesD4b1Lifecycle: true,
      d4b1DocumentTypeId: "rt.ventilator_check",
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: true,
      selectedInD4b4: true,
      edocCardIds: ["resp_ventilator"],
      authoritativeSource: "EDOC12",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_NONINVASIVE_VENTILATION_CHECK",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.niv",
      kind: "ORDER_LINKED_OBSERVATION",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "niv_check",
      orderDependent: true,
      medicationDependent: false,
      usesD4b1Lifecycle: true,
      d4b1DocumentTypeId: "rt.niv_check",
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: true,
      selectedInD4b4: true,
      edocCardIds: ["resp_cpap_bipap"],
      authoritativeSource: "EDOC12",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_HIGH_FLOW_CHECK",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.highFlow",
      kind: "DEFERRED",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "high_flow_check",
      orderDependent: true,
      medicationDependent: false,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: false,
      selectedInD4b4: false,
      authoritativeSource: "NONE_DEFERRED",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_SUCTIONING_EVENT",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.suctioning",
      kind: "DEFERRED",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "suctioning_secretion",
      orderDependent: false,
      medicationDependent: false,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: false,
      selectedInD4b4: false,
      authoritativeSource: "NONE_DEFERRED",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_AIRWAY_CLEARANCE_EVENT",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.airwayClearance",
      kind: "DEFERRED",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      capabilityId: "airway_clearance",
      orderDependent: true,
      medicationDependent: false,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: false,
      printExportEligible: false,
      selectedInD4b4: false,
      authoritativeSource: "NONE_DEFERRED",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_BEDSIDE_MEASUREMENT",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.bedsideMeasurement",
      kind: "MEASUREMENT",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "bedside_measurement",
      orderDependent: false,
      medicationDependent: false,
      usesD4b1Lifecycle: true,
      d4b1DocumentTypeId: "rt.bedside_measurement",
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: true,
      selectedInD4b4: true,
      edocCardIds: ["resp_peak_flow"],
      authoritativeSource: "EDOC12",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_ABG_COLLECTION",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.abg",
      kind: "DEFERRED",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "abg_collection",
      orderDependent: true,
      medicationDependent: false,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: false,
      selectedInD4b4: false,
      authoritativeSource: "NONE_DEFERRED",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_RESPIRATORY_SPECIMEN_COLLECTION",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.specimen",
      kind: "DEFERRED",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "respiratory_specimen",
      orderDependent: true,
      medicationDependent: false,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: false,
      selectedInD4b4: false,
      authoritativeSource: "NONE_DEFERRED",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_EDUCATION_NOTE",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.education",
      kind: "OPERATIONAL_CONTRIBUTION",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      capabilityId: "rt_education",
      orderDependent: false,
      medicationDependent: false,
      usesD4b1Lifecycle: true,
      d4b1DocumentTypeId: "rt.education_note",
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: true,
      selectedInD4b4: true,
      authoritativeSource: "EDUCATION_TOPIC",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_CARE_PLAN_UPDATE",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.carePlan",
      kind: "OPERATIONAL_CONTRIBUTION",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      capabilityId: "care_plan_contribution",
      orderDependent: false,
      medicationDependent: false,
      usesD4b1Lifecycle: true,
      d4b1DocumentTypeId: "rt.care_plan_contribution",
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: true,
      selectedInD4b4: true,
      authoritativeSource: "CARE_PLAN_TOKEN",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_HANDOFF",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.handoff",
      kind: "OPERATIONAL_CONTRIBUTION",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "rt_handoff",
      orderDependent: false,
      medicationDependent: false,
      usesD4b1Lifecycle: true,
      d4b1DocumentTypeId: "rt.handoff",
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: true,
      selectedInD4b4: true,
      authoritativeSource: "EDUCATION_TOPIC",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
    {
      activityId: "RT_DISCHARGE_RECOMMENDATION",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.activities.dischargeRecommendation",
      kind: "RECOMMENDATION",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      capabilityId: "discharge_recommendation",
      orderDependent: false,
      medicationDependent: false,
      usesD4b1Lifecycle: true,
      d4b1DocumentTypeId: "rt.discharge_recommendation",
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: true,
      selectedInD4b4: true,
      authoritativeSource: "CARE_PLAN_TOKEN",
      isNursingRespiratoryAssessment: false,
      isProviderOrder: false,
      isMarAdministration: false,
      isDeviceTelemetry: false,
      recommendationIsNotOrder: true,
    },
  ];

export type EnterpriseRespiratoryTherapyWorkspaceSectionId =
  | "overview"
  | "activeRespiratoryOrders"
  | "respiratoryAssessment"
  | "reassessment"
  | "oxygenDeliveryDevices"
  | "aerosolInhaledTreatments"
  | "treatmentResponse"
  | "airway"
  | "artificialAirwayTracheostomy"
  | "mechanicalVentilation"
  | "noninvasiveVentilation"
  | "highFlowTherapy"
  | "suctioningSecretions"
  | "airwayClearanceTherapy"
  | "bedsideMeasurements"
  | "bloodGasCollection"
  | "respiratorySpecimens"
  | "education"
  | "carePlanContributions"
  | "handoff"
  | "dischargeRecommendations"
  | "technicianMeasurements"
  | "documentationHistory";

export type EnterpriseRespiratoryTherapyWorkspaceSectionMode =
  | "EDOC_HUB"
  | "MAR_ADAPTER"
  | "ORDER_PROJECTION"
  | "TECH_MEASUREMENT_PROJECTION"
  | "PROJECTION"
  | "DEFERRED"
  | "OPS_LINK";

export type EnterpriseRespiratoryTherapyWorkspaceSectionDefinition = {
  id: EnterpriseRespiratoryTherapyWorkspaceSectionId;
  titleKey: string;
  visibleIn: ReadonlyArray<"EMERGENCY" | "OBSERVATION" | "INPATIENT">;
  mode: EnterpriseRespiratoryTherapyWorkspaceSectionMode;
  requiredCapability: EnterpriseRespiratoryTherapyCapabilityId | null;
  activityIds: ReadonlyArray<EnterpriseRespiratoryTherapyActivityId>;
  edocCategoryHint?: string | null;
};

export const ENTERPRISE_RESPIRATORY_THERAPY_WORKSPACE_SECTIONS: ReadonlyArray<EnterpriseRespiratoryTherapyWorkspaceSectionDefinition> =
  [
    {
      id: "overview",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.overview",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "PROJECTION",
      requiredCapability: null,
      activityIds: [],
    },
    {
      id: "activeRespiratoryOrders",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.activeOrders",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "ORDER_PROJECTION",
      requiredCapability: "view_active_respiratory_orders",
      activityIds: ["RT_TREATMENT_NOTE"],
    },
    {
      id: "respiratoryAssessment",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.assessment",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "EDOC_HUB",
      requiredCapability: "rt_assessment",
      activityIds: ["RT_INITIAL_ASSESSMENT"],
      edocCategoryHint: "RESPIRATORY_DOCUMENTATION",
    },
    {
      id: "reassessment",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.reassessment",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "EDOC_HUB",
      requiredCapability: "rt_reassessment",
      activityIds: ["RT_REASSESSMENT"],
      edocCategoryHint: "RESPIRATORY_DOCUMENTATION",
    },
    {
      id: "oxygenDeliveryDevices",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.oxygen",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "EDOC_HUB",
      requiredCapability: "oxygen_device_management",
      activityIds: ["RT_OXYGEN_DEVICE_ASSESSMENT"],
      edocCategoryHint: "RESPIRATORY_DOCUMENTATION",
    },
    {
      id: "aerosolInhaledTreatments",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.aerosol",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "OPS_LINK",
      requiredCapability: "aerosol_treatment_workflow",
      activityIds: ["RT_TREATMENT_NOTE"],
    },
    {
      id: "treatmentResponse",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.treatmentResponse",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "MAR_ADAPTER",
      requiredCapability: "treatment_response_documentation",
      activityIds: ["RT_TREATMENT_RESPONSE"],
    },
    {
      id: "airway",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.airway",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "EDOC_HUB",
      requiredCapability: "airway_assessment",
      activityIds: ["RT_AIRWAY_ASSESSMENT"],
      edocCategoryHint: "RESPIRATORY_DOCUMENTATION",
    },
    {
      id: "artificialAirwayTracheostomy",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.artificialAirway",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "DEFERRED",
      requiredCapability: "artificial_airway_check",
      activityIds: ["RT_ARTIFICIAL_AIRWAY_CHECK", "RT_TRACHEOSTOMY_CARE"],
    },
    {
      id: "mechanicalVentilation",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.ventilator",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "EDOC_HUB",
      requiredCapability: "ventilator_check",
      activityIds: ["RT_VENTILATOR_CHECK"],
      edocCategoryHint: "RESPIRATORY_DOCUMENTATION",
    },
    {
      id: "noninvasiveVentilation",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.niv",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "EDOC_HUB",
      requiredCapability: "niv_check",
      activityIds: ["RT_NONINVASIVE_VENTILATION_CHECK"],
      edocCategoryHint: "RESPIRATORY_DOCUMENTATION",
    },
    {
      id: "highFlowTherapy",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.highFlow",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "DEFERRED",
      requiredCapability: "high_flow_check",
      activityIds: ["RT_HIGH_FLOW_CHECK"],
    },
    {
      id: "suctioningSecretions",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.suctioning",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "DEFERRED",
      requiredCapability: "suctioning_secretion",
      activityIds: ["RT_SUCTIONING_EVENT"],
    },
    {
      id: "airwayClearanceTherapy",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.airwayClearance",
      visibleIn: ["OBSERVATION", "INPATIENT"],
      mode: "DEFERRED",
      requiredCapability: "airway_clearance",
      activityIds: ["RT_AIRWAY_CLEARANCE_EVENT"],
    },
    {
      id: "bedsideMeasurements",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.bedsideMeasurements",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "EDOC_HUB",
      requiredCapability: "bedside_measurement",
      activityIds: ["RT_BEDSIDE_MEASUREMENT"],
      edocCategoryHint: "RESPIRATORY_DOCUMENTATION",
    },
    {
      id: "bloodGasCollection",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.bloodGas",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "DEFERRED",
      requiredCapability: "abg_collection",
      activityIds: ["RT_ABG_COLLECTION"],
    },
    {
      id: "respiratorySpecimens",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.specimens",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "DEFERRED",
      requiredCapability: "respiratory_specimen",
      activityIds: ["RT_RESPIRATORY_SPECIMEN_COLLECTION"],
    },
    {
      id: "education",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.education",
      visibleIn: ["OBSERVATION", "INPATIENT"],
      mode: "PROJECTION",
      requiredCapability: "rt_education",
      activityIds: ["RT_EDUCATION_NOTE"],
    },
    {
      id: "carePlanContributions",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.carePlan",
      visibleIn: ["OBSERVATION", "INPATIENT"],
      mode: "PROJECTION",
      requiredCapability: "care_plan_contribution",
      activityIds: ["RT_CARE_PLAN_UPDATE"],
    },
    {
      id: "handoff",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.handoff",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "PROJECTION",
      requiredCapability: "rt_handoff",
      activityIds: ["RT_HANDOFF"],
    },
    {
      id: "dischargeRecommendations",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.dischargeRecommendations",
      visibleIn: ["OBSERVATION", "INPATIENT"],
      mode: "PROJECTION",
      requiredCapability: "discharge_recommendation",
      activityIds: ["RT_DISCHARGE_RECOMMENDATION"],
    },
    {
      id: "technicianMeasurements",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.technicianMeasurements",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "TECH_MEASUREMENT_PROJECTION",
      requiredCapability: "view_tech_measurements",
      activityIds: [],
    },
    {
      id: "documentationHistory",
      titleKey: "enterpriseRespiratoryTherapyWorkspaceD4b4.sections.documentationHistory",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "PROJECTION",
      requiredCapability: "rt_assessment",
      activityIds: ["RT_INITIAL_ASSESSMENT", "RT_REASSESSMENT"],
    },
  ];

const EDOC12_CARD_SET = new Set<string>(EDOC12_RESPIRATORY_DOCUMENTATION_CARD_IDS);

export function isEdoc12RespiratoryCardId(cardId: string): boolean {
  return EDOC12_CARD_SET.has(cardId);
}

export function mapEdoc12CardToRtDocumentTypeId(cardId: string): string | null {
  switch (cardId) {
    case "resp_assessment":
      return "rt.initial_assessment";
    case "respiratory_distress_reassessment":
    case "nebulizer_reassessment":
      return "rt.reassessment";
    case "oxygen_therapy_initiation":
    case "oxygen_titration":
      return "rt.oxygen_device_assessment";
    case "resp_cpap_bipap":
      return "rt.niv_check";
    case "resp_ventilator":
      return "rt.ventilator_check";
    case "resp_peak_flow":
      return "rt.bedside_measurement";
    default:
      return null;
  }
}

/**
 * Resolve RT capability profile from facility role codes.
 * No dedicated RT RoleCode yet — RN receives NURSE_WITH_RT_PERMISSIONS (catalog proxy).
 */
export function resolveRespiratoryTherapyRoleProfile(
  roleCodes: readonly string[]
): RespiratoryTherapyRoleProfile {
  const codes = new Set(roleCodes.map((c) => String(c).trim().toUpperCase()).filter(Boolean));
  // Reserved for future RoleCode; not present in Prisma today.
  if (codes.has("RT") || codes.has("RESPIRATORY") || codes.has("RESPIRATORY_THERAPY")) {
    return "RESPIRATORY_THERAPIST";
  }
  if (codes.has("RN") || codes.has("ADMIN")) return "NURSE_WITH_RT_PERMISSIONS";
  if (codes.has("PATIENT_CARE_TECH") || codes.has("LAB") || codes.has("RADIOLOGY")) {
    return "TECHNICIAN_MEASUREMENT_ONLY";
  }
  return "SUPPORT_READ_ONLY";
}

export function isRespiratoryTherapyCapabilityAllowedForProfile(
  capabilityId: EnterpriseRespiratoryTherapyCapabilityId,
  profile: RespiratoryTherapyRoleProfile
): boolean {
  const def = ENTERPRISE_RESPIRATORY_THERAPY_CAPABILITY_REGISTRY.find((c) => c.id === capabilityId);
  if (!def) return false;
  return def.defaultRoleProfiles.includes(profile);
}

export function isRespiratoryTherapyCapabilityProhibited(
  capabilityId: string
): capabilityId is RespiratoryTherapyProhibitedCapability {
  return (RESPIRATORY_THERAPY_PROHIBITED_CAPABILITIES as readonly string[]).includes(capabilityId);
}

export function respiratoryTherapyActivityEligibility(input: {
  activityId: EnterpriseRespiratoryTherapyActivityId;
  careSetting: EnterpriseClinicalDocumentCareSetting;
  roleProfile: RespiratoryTherapyRoleProfile;
  assignedUserId?: string | null;
  actorUserId?: string | null;
  orderPresent?: boolean;
  medicationOrderPresent?: boolean;
}): {
  activityKnown: boolean;
  selectedInD4b4: boolean;
  careSettingAllowed: boolean;
  capabilityAllowedForProfile: boolean;
  orderSatisfied: boolean;
  medicationSatisfied: boolean;
  assignmentEqualsAuthorization: false;
  sameAssignedUser: boolean;
  doesNotOverwriteNursingAssessment: true;
  recommendationIsNotOrder: true;
  marRemainsAuthoritative: true;
} {
  const activity = ENTERPRISE_RESPIRATORY_THERAPY_ACTIVITY_REGISTRY.find(
    (a) => a.activityId === input.activityId
  );
  const capabilityOk =
    activity?.capabilityId == null
      ? true
      : isRespiratoryTherapyCapabilityAllowedForProfile(activity.capabilityId, input.roleProfile);
  const careOk = activity
    ? activity.allowedCareSettings.includes(
        input.careSetting as "EMERGENCY" | "OBSERVATION" | "INPATIENT"
      )
    : false;
  const orderOk = !activity?.orderDependent || !!input.orderPresent;
  const medOk = !activity?.medicationDependent || !!input.medicationOrderPresent;
  return {
    activityKnown: activity != null,
    selectedInD4b4: !!activity?.selectedInD4b4,
    careSettingAllowed: careOk,
    capabilityAllowedForProfile: capabilityOk,
    orderSatisfied: orderOk,
    medicationSatisfied: medOk,
    assignmentEqualsAuthorization: false,
    sameAssignedUser:
      !!input.assignedUserId &&
      !!input.actorUserId &&
      input.assignedUserId === input.actorUserId,
    doesNotOverwriteNursingAssessment: true,
    recommendationIsNotOrder: true,
    marRemainsAuthoritative: true,
  };
}

export function respiratoryTherapyWorkspaceSectionsForCareSetting(
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT",
  options?: {
    roleProfile?: RespiratoryTherapyRoleProfile;
    includeDeferred?: boolean;
  }
): EnterpriseRespiratoryTherapyWorkspaceSectionDefinition[] {
  const profile = options?.roleProfile ?? "NURSE_WITH_RT_PERMISSIONS";
  const includeDeferred = options?.includeDeferred ?? true;
  return ENTERPRISE_RESPIRATORY_THERAPY_WORKSPACE_SECTIONS.filter((s) => {
    if (!s.visibleIn.includes(careSetting)) return false;
    if (!includeDeferred && s.mode === "DEFERRED") return false;
    if (s.requiredCapability == null) return true;
    return isRespiratoryTherapyCapabilityAllowedForProfile(s.requiredCapability, profile);
  });
}

export function resolveRespiratoryTherapyWorkspaceSection(
  raw: string | null | undefined
): EnterpriseRespiratoryTherapyWorkspaceSectionId | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  const hit = ENTERPRISE_RESPIRATORY_THERAPY_WORKSPACE_SECTIONS.find((s) => s.id === trimmed);
  if (hit) return hit.id;
  const lower = trimmed.toLowerCase().replace(/[_-]/g, "");
  const alias: Record<string, EnterpriseRespiratoryTherapyWorkspaceSectionId> = {
    overview: "overview",
    orders: "activeRespiratoryOrders",
    activerespiratoryorders: "activeRespiratoryOrders",
    assessment: "respiratoryAssessment",
    respiratoryassessment: "respiratoryAssessment",
    reassessment: "reassessment",
    oxygen: "oxygenDeliveryDevices",
    oxygendeliverydevices: "oxygenDeliveryDevices",
    aerosol: "aerosolInhaledTreatments",
    aerosolinhaledtreatments: "aerosolInhaledTreatments",
    response: "treatmentResponse",
    treatmentresponse: "treatmentResponse",
    airway: "airway",
    artificialairway: "artificialAirwayTracheostomy",
    artificialairwaytracheostomy: "artificialAirwayTracheostomy",
    vent: "mechanicalVentilation",
    ventilator: "mechanicalVentilation",
    mechanicalventilation: "mechanicalVentilation",
    niv: "noninvasiveVentilation",
    noninvasiveventilation: "noninvasiveVentilation",
    highflow: "highFlowTherapy",
    highflowtherapy: "highFlowTherapy",
    suction: "suctioningSecretions",
    suctioningsecretions: "suctioningSecretions",
    clearance: "airwayClearanceTherapy",
    airwayclearancetherapy: "airwayClearanceTherapy",
    measurements: "bedsideMeasurements",
    bedsidemeasurements: "bedsideMeasurements",
    abg: "bloodGasCollection",
    bloodgascollection: "bloodGasCollection",
    specimens: "respiratorySpecimens",
    respiratoryspecimens: "respiratorySpecimens",
    education: "education",
    careplan: "carePlanContributions",
    careplancontributions: "carePlanContributions",
    handoff: "handoff",
    discharge: "dischargeRecommendations",
    dischargerecommendations: "dischargeRecommendations",
    tech: "technicianMeasurements",
    technicianmeasurements: "technicianMeasurements",
    history: "documentationHistory",
    documentationhistory: "documentationHistory",
  };
  return alias[lower] ?? null;
}

export function classifyEncounterTypeToRespiratoryTherapyCareSetting(
  encounterType: string | null | undefined
): "EMERGENCY" | "OBSERVATION" | "INPATIENT" {
  const t = String(encounterType ?? "").toUpperCase();
  if (t === "ER" || t === "ED" || t === "EMERGENCY") return "EMERGENCY";
  if (t === "OBSERVATION" || t === "OBS") return "OBSERVATION";
  return "INPATIENT";
}

export function toClinicalDocumentationHubCareSettingFromRespiratoryTherapy(
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT"
): "ED" | "OBSERVATION" | "INPATIENT" {
  if (careSetting === "EMERGENCY") return "ED";
  return careSetting;
}

/** Active respiratory order projection — not an order-creation surface. */
export type RespiratoryActiveOrderProjection = {
  kind: "ACTIVE_RESPIRATORY_ORDER";
  encounterId: string;
  orderId: string;
  procedureCode: string | null;
  displayLabel: string;
  status: string;
  rtInvolvement: string | null;
  isActive: boolean;
  createsProviderOrder: false;
  recommendationIsNotOrder: true;
};

export function projectActiveRespiratoryOrders(input: {
  encounterId: string;
  orders: ReadonlyArray<{
    orderId: string;
    procedureCode?: string | null;
    displayLabel: string;
    status: string;
    rtInvolvement?: string | null;
    discontinued?: boolean;
  }>;
}): RespiratoryActiveOrderProjection[] {
  return input.orders
    .filter((o) => !o.discontinued && String(o.status).toUpperCase() !== "DISCONTINUED")
    .map((o) => ({
      kind: "ACTIVE_RESPIRATORY_ORDER" as const,
      encounterId: input.encounterId,
      orderId: o.orderId,
      procedureCode: o.procedureCode ?? null,
      displayLabel: o.displayLabel,
      status: o.status,
      rtInvolvement: o.rtInvolvement ?? null,
      isActive: true,
      createsProviderOrder: false,
      recommendationIsNotOrder: true,
    }));
}

/** MAR-linked treatment response projection — does not duplicate administration. */
export type RespiratoryMarResponseProjection = {
  kind: "MAR_RESPIRATORY_RESPONSE";
  encounterId: string;
  administrationEventId: string;
  responseCode: string | null;
  documentedAt: string | null;
  administratorUserId: string | null;
  marRemainsAuthoritative: true;
  isDuplicateAdministrationRecord: false;
};

export function projectMarRespiratoryResponseLinks(input: {
  encounterId: string;
  responses: ReadonlyArray<{
    administrationEventId: string;
    responseCode?: string | null;
    documentedAt?: string | null;
    administratorUserId?: string | null;
  }>;
}): RespiratoryMarResponseProjection[] {
  return input.responses.map((r) => ({
    kind: "MAR_RESPIRATORY_RESPONSE" as const,
    encounterId: input.encounterId,
    administrationEventId: r.administrationEventId,
    responseCode: r.responseCode ?? null,
    documentedAt: r.documentedAt ?? null,
    administratorUserId: r.administratorUserId ?? null,
    marRemainsAuthoritative: true,
    isDuplicateAdministrationRecord: false,
  }));
}

/**
 * Adapt EDOC.12 respiratory cards into RT workspace documents via D4B.1.
 * Preserves underlying EDOC identity; overlays RT document type + discipline designation.
 * RN-proxy authorship remains the server author — not rewritten as a fictional RT user.
 */
export function adaptRespiratoryEdocEntryToEnterpriseClinicalDocument(
  entry: EdocEntryAdapterInput & { rnProxyAuthorship?: boolean }
): EnterpriseClinicalDocument {
  const base = adaptEdocEntryToEnterpriseClinicalDocument(entry);
  const rtType = mapEdoc12CardToRtDocumentTypeId(entry.cardId);
  return {
    ...base,
    discipline: "RESPIRATORY_THERAPY",
    documentTypeId: rtType ?? "edoc.structured_entry",
    structured: base.structured
      ? {
          ...base.structured,
          payload: {
            ...(typeof base.structured.payload === "object" && base.structured.payload
              ? (base.structured.payload as Record<string, unknown>)
              : {}),
            _d4b4: {
              rtWorkflowSurface: true,
              rnProxyAuthorship: !!entry.rnProxyAuthorship,
              edocCardId: entry.cardId,
              doesNotOverwriteNursingAssessment: true,
              recommendationIsNotOrder: true,
              isDeviceTelemetry: false,
            },
          },
        }
      : base.structured,
  };
}

export function nursingAssessmentNotOverwrittenByRt(input: {
  nursingAssessmentAuthorUserId: string;
  rtDocumentAuthorUserId: string;
  storedNursingAuthorUserId: string;
}): boolean {
  void input.rtDocumentAuthorUserId;
  return input.storedNursingAuthorUserId === input.nursingAssessmentAuthorUserId;
}

export function rtPerformerPreservedAfterReassignment(input: {
  originalPerformerUserId: string | null | undefined;
  newAssigneeUserId: string | null | undefined;
  recordedPerformerUserId: string | null | undefined;
}): boolean {
  const recorded = String(input.recordedPerformerUserId ?? "").trim();
  const original = String(input.originalPerformerUserId ?? "").trim();
  if (!recorded || !original) return recorded === original;
  return recorded === original;
}

export function technicianMeasurementVisibleWithoutRtAuthorship(input: {
  techPerformerUserId: string;
  rtReviewerUserId: string;
  storedPerformerUserId: string;
}): boolean {
  void input.rtReviewerUserId;
  return input.storedPerformerUserId === input.techPerformerUserId;
}

export function distinguishVentilatorSettingRoles(input: {
  orderedSetting: string | null | undefined;
  observedSetting: string | null | undefined;
  recommendedSetting: string | null | undefined;
}): {
  orderedDistinctFromObserved: boolean;
  recommendationIsNotOrder: true;
  ungovernedChangeForbidden: true;
} {
  const ordered = String(input.orderedSetting ?? "").trim();
  const observed = String(input.observedSetting ?? "").trim();
  return {
    orderedDistinctFromObserved: ordered !== observed || (!ordered && !observed),
    recommendationIsNotOrder: true,
    ungovernedChangeForbidden: true,
  };
}

export type EnterpriseRespiratoryTherapyWorkspaceSummary = {
  certificationId: typeof ENTERPRISE_RESPIRATORY_THERAPY_WORKSPACE_CERTIFICATION_ID;
  contractVersion: typeof ENTERPRISE_RESPIRATORY_THERAPY_WORKSPACE_CONTRACT_VERSION;
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleProfile: RespiratoryTherapyRoleProfile;
  usesD4b1Lifecycle: true;
  independentRespiratoryTherapyLifecycleEngine: false;
  masqueradesAsNursingAssessment: false;
  replacesMar: false;
  createsProviderOrders: false;
  sections: EnterpriseRespiratoryTherapyWorkspaceSectionDefinition[];
  activities: EnterpriseRespiratoryTherapyActivityDefinition[];
  documents: EnterpriseClinicalDocument[];
  activeOrders: RespiratoryActiveOrderProjection[];
  marResponses: RespiratoryMarResponseProjection[];
  techMeasurements: TechnicianVitalsContributionProjection[];
};

export function buildEnterpriseRespiratoryTherapyWorkspaceSummary(input: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleProfile?: RespiratoryTherapyRoleProfile;
  hospitalEpisodeId?: string | null;
  edocEntries?: ReadonlyArray<EdocEntryAdapterInput & { rnProxyAuthorship?: boolean }>;
  notes?: ReadonlyArray<EncounterNoteAdapterInput>;
  activeOrders?: ReadonlyArray<{
    orderId: string;
    procedureCode?: string | null;
    displayLabel: string;
    status: string;
    rtInvolvement?: string | null;
    discontinued?: boolean;
  }>;
  marResponses?: ReadonlyArray<{
    administrationEventId: string;
    responseCode?: string | null;
    documentedAt?: string | null;
    administratorUserId?: string | null;
  }>;
  techMeasurements?: ReadonlyArray<TechnicianVitalsContributionProjection>;
}): EnterpriseRespiratoryTherapyWorkspaceSummary {
  const roleProfile = input.roleProfile ?? "NURSE_WITH_RT_PERMISSIONS";
  const sections = respiratoryTherapyWorkspaceSectionsForCareSetting(input.careSetting, {
    roleProfile,
  });
  const activities = ENTERPRISE_RESPIRATORY_THERAPY_ACTIVITY_REGISTRY.filter(
    (a) =>
      a.selectedInD4b4 &&
      a.allowedCareSettings.includes(input.careSetting) &&
      (a.capabilityId == null ||
        isRespiratoryTherapyCapabilityAllowedForProfile(a.capabilityId, roleProfile))
  );
  const documents: EnterpriseClinicalDocument[] = [];
  for (const entry of input.edocEntries ?? []) {
    if (!isEdoc12RespiratoryCardId(entry.cardId)) continue;
    documents.push(
      adaptRespiratoryEdocEntryToEnterpriseClinicalDocument({
        ...entry,
        careSetting: entry.careSetting ?? input.careSetting,
        hospitalEpisodeId: entry.hospitalEpisodeId ?? input.hospitalEpisodeId,
        rnProxyAuthorship:
          entry.rnProxyAuthorship ?? roleProfile === "NURSE_WITH_RT_PERMISSIONS",
      })
    );
  }
  // Narrative notes: no RESPIRATORY EncounterNoteType yet — do not force OTHER into nursing types.
  void input.notes;

  return {
    certificationId: ENTERPRISE_RESPIRATORY_THERAPY_WORKSPACE_CERTIFICATION_ID,
    contractVersion: ENTERPRISE_RESPIRATORY_THERAPY_WORKSPACE_CONTRACT_VERSION,
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    careSetting: input.careSetting,
    roleProfile,
    usesD4b1Lifecycle: true,
    independentRespiratoryTherapyLifecycleEngine: false,
    masqueradesAsNursingAssessment: false,
    replacesMar: false,
    createsProviderOrders: false,
    sections,
    activities,
    documents,
    activeOrders: projectActiveRespiratoryOrders({
      encounterId: input.encounterId,
      orders: input.activeOrders ?? [],
    }),
    marResponses: projectMarRespiratoryResponseLinks({
      encounterId: input.encounterId,
      responses: input.marResponses ?? [],
    }),
    techMeasurements: [...(input.techMeasurements ?? [])],
  };
}

/** Virtual RT recommendation projection (not a discharge authority). */
export function adaptRespiratoryDischargeRecommendationProjection(input: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  noteId: string;
  body: string;
  authorUserId: string;
  authorDisplayName?: string | null;
  createdAt: string;
  careSetting?: EnterpriseClinicalDocumentCareSetting | "UNKNOWN";
}): EnterpriseClinicalDocument {
  const author = actorSnapshot(input.authorUserId, input.authorDisplayName, "RESPIRATORY_THERAPY");
  const lifecycleState: EnterpriseClinicalDocumentLifecycleState = "SIGNED";
  return {
    contractVersion: ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION,
    documentId: input.noteId,
    sourceArchitecture: "REFERENCE_VIRTUAL",
    patientId: input.patientId,
    encounterId: input.encounterId,
    hospitalEpisodeId: null,
    facilityId: input.facilityId,
    careSetting: input.careSetting ?? "UNKNOWN",
    discipline: "RESPIRATORY_THERAPY",
    documentTypeId: "rt.discharge_recommendation",
    templateVersion: "D4B.4",
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
      schemaId: "rt.discharge_recommendation",
      schemaVersion: "D4B.4",
      payload: {
        recommendationIsNotOrder: true,
        doesNotAuthorizeDischarge: true,
        doesNotPrescribeHomeOxygen: true,
      },
    },
    narrative: {
      sections: [
        {
          key: "body",
          title: "Recommendation",
          text: input.body,
          lateEntry: false,
        },
      ],
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
      currentVersionId: input.noteId,
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
