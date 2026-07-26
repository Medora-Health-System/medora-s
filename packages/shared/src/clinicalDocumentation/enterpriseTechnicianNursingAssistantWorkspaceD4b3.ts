/**
 * MEDUI.D4B.3 — Enterprise Technician and Nursing-Assistant Workspace
 *
 * Capability-driven IA + activity registry + D4B.1 projections.
 * Does NOT introduce a second signature / version / amendment engine.
 * Does NOT author nursing assessments or provider judgments.
 */

import type {
  EnterpriseClinicalDocument,
  EnterpriseClinicalDocumentCareSetting,
  EnterpriseClinicalDocumentLifecycleState,
} from "./enterpriseClinicalDocumentContractD4b1.js";
import {
  adaptEdocEntryToEnterpriseClinicalDocument,
  adaptEncounterNoteToEnterpriseClinicalDocument,
  type EdocEntryAdapterInput,
  type EncounterNoteAdapterInput,
} from "./enterpriseClinicalDocumentAdaptersD4b1.js";
import { actorSnapshot } from "./enterpriseClinicalDocumentAuthorshipD4b1.js";
import { ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION } from "./enterpriseClinicalDocumentContractD4b1.js";
import {
  TECHNICIAN_TASK_STATUSES,
  TECHNICIAN_TASK_TYPES,
  type TechnicianTaskStatus,
  type TechnicianTaskType,
  type TechnicianTaskV1,
} from "../encounters/inpatientRapidConvergenceD4a27c.js";

export const ENTERPRISE_TECHNICIAN_NA_WORKSPACE_CERTIFICATION_ID =
  "MEDUI.ENTERPRISE_TECHNICIAN_NURSING_ASSISTANT_WORKSPACE.D4B3" as const;

export const ENTERPRISE_TECHNICIAN_NA_WORKSPACE_CONTRACT_VERSION = "D4B.3" as const;

/** Hard prohibitions — never grant via job title / assignment alone. */
export const TECHNICIAN_PROHIBITED_CAPABILITIES = [
  "nursing_assessment_author",
  "ecg_interpretation",
  "lab_result_verify",
  "mar_admin",
  "provider_documentation_author",
] as const;

export type TechnicianProhibitedCapability = (typeof TECHNICIAN_PROHIBITED_CAPABILITIES)[number];

export type EnterpriseTechnicianCapabilityId =
  | "vitals_acquisition"
  | "measurements_acquisition"
  | "technician_notes"
  | "technician_tasks"
  | "specimen_collection"
  | "ecg_acquisition"
  | "poct_performance"
  | "intake_output_entry"
  | "mobility_assistance"
  | "adl_assistance"
  | "safety_rounds"
  | "repositioning"
  | "sitter_observation"
  | "patient_transport"
  | "task_exception"
  | "escalation_note";

export type TechnicianRoleProfile =
  | "ED_TECHNICIAN"
  | "PATIENT_CARE_TECH"
  | "LAB_TECHNICIAN"
  | "RADIOLOGY_TECHNICIAN"
  | "SUPPORT_GENERIC";

export type EnterpriseTechnicianCapabilityDefinition = {
  id: EnterpriseTechnicianCapabilityId;
  titleKey: string;
  /** Role profiles that may receive this capability when facility/order policy allows. */
  defaultRoleProfiles: ReadonlyArray<TechnicianRoleProfile>;
  orderDependent: boolean;
  requiresFacilityPolicy: boolean;
  assignmentGrantsCapability: false;
};

export const ENTERPRISE_TECHNICIAN_CAPABILITY_REGISTRY: ReadonlyArray<EnterpriseTechnicianCapabilityDefinition> =
  [
    {
      id: "vitals_acquisition",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.capabilities.vitals",
      defaultRoleProfiles: ["ED_TECHNICIAN", "PATIENT_CARE_TECH", "LAB_TECHNICIAN", "RADIOLOGY_TECHNICIAN"],
      orderDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "measurements_acquisition",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.capabilities.measurements",
      defaultRoleProfiles: ["ED_TECHNICIAN", "PATIENT_CARE_TECH"],
      orderDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "technician_notes",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.capabilities.notes",
      defaultRoleProfiles: ["ED_TECHNICIAN", "PATIENT_CARE_TECH", "LAB_TECHNICIAN", "RADIOLOGY_TECHNICIAN"],
      orderDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "technician_tasks",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.capabilities.tasks",
      defaultRoleProfiles: ["PATIENT_CARE_TECH", "LAB_TECHNICIAN", "RADIOLOGY_TECHNICIAN", "ED_TECHNICIAN"],
      orderDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "specimen_collection",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.capabilities.specimen",
      defaultRoleProfiles: ["LAB_TECHNICIAN", "RADIOLOGY_TECHNICIAN", "ED_TECHNICIAN", "PATIENT_CARE_TECH"],
      orderDependent: true,
      requiresFacilityPolicy: true,
      assignmentGrantsCapability: false,
    },
    {
      id: "ecg_acquisition",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.capabilities.ecg",
      defaultRoleProfiles: ["LAB_TECHNICIAN", "RADIOLOGY_TECHNICIAN", "ED_TECHNICIAN", "PATIENT_CARE_TECH"],
      orderDependent: true,
      requiresFacilityPolicy: true,
      assignmentGrantsCapability: false,
    },
    {
      id: "poct_performance",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.capabilities.poct",
      defaultRoleProfiles: ["LAB_TECHNICIAN", "RADIOLOGY_TECHNICIAN", "ED_TECHNICIAN"],
      orderDependent: true,
      requiresFacilityPolicy: true,
      assignmentGrantsCapability: false,
    },
    {
      id: "intake_output_entry",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.capabilities.intakeOutput",
      defaultRoleProfiles: ["PATIENT_CARE_TECH", "ED_TECHNICIAN"],
      orderDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "mobility_assistance",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.capabilities.mobility",
      defaultRoleProfiles: ["PATIENT_CARE_TECH"],
      orderDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "adl_assistance",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.capabilities.adl",
      defaultRoleProfiles: ["PATIENT_CARE_TECH"],
      orderDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "safety_rounds",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.capabilities.safetyRounds",
      defaultRoleProfiles: ["PATIENT_CARE_TECH", "ED_TECHNICIAN"],
      orderDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "repositioning",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.capabilities.repositioning",
      defaultRoleProfiles: ["PATIENT_CARE_TECH"],
      orderDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "sitter_observation",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.capabilities.sitter",
      defaultRoleProfiles: ["PATIENT_CARE_TECH"],
      orderDependent: false,
      requiresFacilityPolicy: true,
      assignmentGrantsCapability: false,
    },
    {
      id: "patient_transport",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.capabilities.transport",
      defaultRoleProfiles: ["PATIENT_CARE_TECH", "ED_TECHNICIAN", "SUPPORT_GENERIC"],
      orderDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "task_exception",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.capabilities.exception",
      defaultRoleProfiles: ["PATIENT_CARE_TECH", "ED_TECHNICIAN", "LAB_TECHNICIAN", "RADIOLOGY_TECHNICIAN"],
      orderDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
    {
      id: "escalation_note",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.capabilities.escalation",
      defaultRoleProfiles: ["PATIENT_CARE_TECH", "ED_TECHNICIAN", "LAB_TECHNICIAN", "RADIOLOGY_TECHNICIAN"],
      orderDependent: false,
      requiresFacilityPolicy: false,
      assignmentGrantsCapability: false,
    },
  ];

export type EnterpriseTechnicianActivityId =
  | "TECH_VITALS_ACQUISITION"
  | "TECH_MEASUREMENT_ACQUISITION"
  | "TECH_SPECIMEN_COLLECTION"
  | "TECH_POCT_PERFORMANCE"
  | "TECH_ECG_ACQUISITION"
  | "TECH_MOBILITY_ASSISTANCE"
  | "TECH_ADL_ASSISTANCE"
  | "TECH_INTAKE_OUTPUT_ENTRY"
  | "TECH_SAFETY_ROUND"
  | "TECH_REPOSITIONING"
  | "TECH_SITTER_OBSERVATION"
  | "TECH_PATIENT_TRANSPORT"
  | "TECH_TASK_EXCEPTION"
  | "TECH_ESCALATION_NOTE"
  | "TECH_HANDOFF"
  | "TECH_ENCOUNTER_NOTE";

export type EnterpriseTechnicianActivityKind =
  | "OPERATIONAL_TASK"
  | "CLINICAL_OBSERVATION"
  | "PROVIDER_ORDERED_ACQUISITION"
  | "NURSING_OWNED_CONTRIBUTION"
  | "DURABLE_DOCUMENT"
  | "DEFERRED";

export type EnterpriseTechnicianActivityDefinition = {
  activityId: EnterpriseTechnicianActivityId;
  titleKey: string;
  kind: EnterpriseTechnicianActivityKind;
  allowedCareSettings: ReadonlyArray<"EMERGENCY" | "OBSERVATION" | "INPATIENT">;
  capabilityId: EnterpriseTechnicianCapabilityId | null;
  orderDependent: boolean;
  usesD4b1Lifecycle: boolean;
  d4b1DocumentTypeId: string | null;
  nursingVisible: boolean;
  providerVisible: boolean;
  printExportEligible: boolean;
  selectedInD4b3: boolean;
  /** Maps to existing technician task type when operational. */
  taskType?: TechnicianTaskType | null;
  authoritativeSource:
    | "VITALS_ENGINE"
    | "TECHNICIAN_TASKS_V1"
    | "PROCEDURE_ALLOWLIST"
    | "ORDERS_COLLECTION"
    | "EDOC"
    | "ENCOUNTER_NOTE"
    | "NONE_DEFERRED";
};

/** Smallest coherent activity registry from D4B.3 audit. */
export const ENTERPRISE_TECHNICIAN_ACTIVITY_REGISTRY: ReadonlyArray<EnterpriseTechnicianActivityDefinition> =
  [
    {
      activityId: "TECH_VITALS_ACQUISITION",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.activities.vitals",
      kind: "CLINICAL_OBSERVATION",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "vitals_acquisition",
      orderDependent: false,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: true,
      selectedInD4b3: true,
      taskType: "VITAL_SIGNS",
      authoritativeSource: "VITALS_ENGINE",
    },
    {
      activityId: "TECH_MEASUREMENT_ACQUISITION",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.activities.measurements",
      kind: "CLINICAL_OBSERVATION",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "measurements_acquisition",
      orderDependent: false,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: true,
      selectedInD4b3: true,
      taskType: "WEIGHT",
      authoritativeSource: "VITALS_ENGINE",
    },
    {
      activityId: "TECH_SPECIMEN_COLLECTION",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.activities.specimen",
      kind: "PROVIDER_ORDERED_ACQUISITION",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "specimen_collection",
      orderDependent: true,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: false,
      selectedInD4b3: true,
      taskType: "SPECIMEN_COLLECTION",
      authoritativeSource: "ORDERS_COLLECTION",
    },
    {
      activityId: "TECH_POCT_PERFORMANCE",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.activities.poct",
      kind: "DEFERRED",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "poct_performance",
      orderDependent: true,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: false,
      selectedInD4b3: false,
      taskType: "GLUCOSE",
      authoritativeSource: "NONE_DEFERRED",
    },
    {
      activityId: "TECH_ECG_ACQUISITION",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.activities.ecg",
      kind: "PROVIDER_ORDERED_ACQUISITION",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "ecg_acquisition",
      orderDependent: true,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: false,
      selectedInD4b3: true,
      taskType: "EKG",
      authoritativeSource: "PROCEDURE_ALLOWLIST",
    },
    {
      activityId: "TECH_MOBILITY_ASSISTANCE",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.activities.mobility",
      kind: "OPERATIONAL_TASK",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "mobility_assistance",
      orderDependent: false,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: false,
      printExportEligible: false,
      selectedInD4b3: true,
      taskType: "AMBULATION",
      authoritativeSource: "TECHNICIAN_TASKS_V1",
    },
    {
      activityId: "TECH_ADL_ASSISTANCE",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.activities.adl",
      kind: "OPERATIONAL_TASK",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      capabilityId: "adl_assistance",
      orderDependent: false,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: false,
      printExportEligible: false,
      selectedInD4b3: true,
      taskType: "HYGIENE",
      authoritativeSource: "TECHNICIAN_TASKS_V1",
    },
    {
      activityId: "TECH_INTAKE_OUTPUT_ENTRY",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.activities.intakeOutput",
      kind: "NURSING_OWNED_CONTRIBUTION",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "intake_output_entry",
      orderDependent: false,
      usesD4b1Lifecycle: true,
      d4b1DocumentTypeId: "edoc.structured_entry",
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: true,
      selectedInD4b3: true,
      taskType: "INTAKE",
      authoritativeSource: "EDOC",
    },
    {
      activityId: "TECH_SAFETY_ROUND",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.activities.safetyRound",
      kind: "OPERATIONAL_TASK",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "safety_rounds",
      orderDependent: false,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: false,
      printExportEligible: false,
      selectedInD4b3: true,
      taskType: "ROUNDING",
      authoritativeSource: "TECHNICIAN_TASKS_V1",
    },
    {
      activityId: "TECH_REPOSITIONING",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.activities.repositioning",
      kind: "OPERATIONAL_TASK",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      capabilityId: "repositioning",
      orderDependent: false,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: false,
      printExportEligible: false,
      selectedInD4b3: true,
      taskType: "REPOSITIONING",
      authoritativeSource: "TECHNICIAN_TASKS_V1",
    },
    {
      activityId: "TECH_SITTER_OBSERVATION",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.activities.sitter",
      kind: "DEFERRED",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "sitter_observation",
      orderDependent: false,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: false,
      selectedInD4b3: false,
      authoritativeSource: "NONE_DEFERRED",
    },
    {
      activityId: "TECH_PATIENT_TRANSPORT",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.activities.transport",
      kind: "OPERATIONAL_TASK",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "patient_transport",
      orderDependent: false,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: false,
      printExportEligible: false,
      selectedInD4b3: true,
      taskType: "TRANSPORT_PREP",
      authoritativeSource: "TECHNICIAN_TASKS_V1",
    },
    {
      activityId: "TECH_TASK_EXCEPTION",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.activities.exception",
      kind: "OPERATIONAL_TASK",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "task_exception",
      orderDependent: false,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: false,
      selectedInD4b3: true,
      authoritativeSource: "TECHNICIAN_TASKS_V1",
    },
    {
      activityId: "TECH_ESCALATION_NOTE",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.activities.escalation",
      kind: "DURABLE_DOCUMENT",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "escalation_note",
      orderDependent: false,
      usesD4b1Lifecycle: true,
      d4b1DocumentTypeId: "encounter_note.technician",
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: true,
      selectedInD4b3: true,
      authoritativeSource: "ENCOUNTER_NOTE",
    },
    {
      activityId: "TECH_HANDOFF",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.activities.handoff",
      kind: "DEFERRED",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: null,
      orderDependent: false,
      usesD4b1Lifecycle: false,
      d4b1DocumentTypeId: null,
      nursingVisible: false,
      providerVisible: false,
      printExportEligible: false,
      selectedInD4b3: false,
      authoritativeSource: "NONE_DEFERRED",
    },
    {
      activityId: "TECH_ENCOUNTER_NOTE",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.activities.encounterNote",
      kind: "DURABLE_DOCUMENT",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      capabilityId: "technician_notes",
      orderDependent: false,
      usesD4b1Lifecycle: true,
      d4b1DocumentTypeId: "encounter_note.technician",
      nursingVisible: true,
      providerVisible: true,
      printExportEligible: true,
      selectedInD4b3: true,
      authoritativeSource: "ENCOUNTER_NOTE",
    },
  ];

export type EnterpriseTechnicianWorkspaceSectionId =
  | "overview"
  | "assignedTasks"
  | "dueOverdue"
  | "vitalSigns"
  | "measurements"
  | "pointOfCareTesting"
  | "specimenCollection"
  | "ecgAcquisition"
  | "mobilityTransfers"
  | "adlAssistance"
  | "intakeOutput"
  | "safetyRounds"
  | "repositioning"
  | "sitterObservation"
  | "patientTransport"
  | "roomEquipment"
  | "escalations"
  | "completedWork"
  | "documentationHistory";

export type EnterpriseTechnicianWorkspaceSectionMode =
  | "LIVE_ENGINE"
  | "TASK_ADAPTER"
  | "EDOC_HUB"
  | "PROJECTION"
  | "DEFERRED"
  | "OPS_LINK";

export type EnterpriseTechnicianWorkspaceSectionDefinition = {
  id: EnterpriseTechnicianWorkspaceSectionId;
  titleKey: string;
  visibleIn: ReadonlyArray<"EMERGENCY" | "OBSERVATION" | "INPATIENT">;
  mode: EnterpriseTechnicianWorkspaceSectionMode;
  requiredCapability: EnterpriseTechnicianCapabilityId | null;
  activityIds: ReadonlyArray<EnterpriseTechnicianActivityId>;
  edocCategoryHint?: string | null;
};

export const ENTERPRISE_TECHNICIAN_WORKSPACE_SECTIONS: ReadonlyArray<EnterpriseTechnicianWorkspaceSectionDefinition> =
  [
    {
      id: "overview",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.overview",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "PROJECTION",
      requiredCapability: null,
      activityIds: [],
    },
    {
      id: "assignedTasks",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.assignedTasks",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "TASK_ADAPTER",
      requiredCapability: "technician_tasks",
      activityIds: ["TECH_TASK_EXCEPTION"],
    },
    {
      id: "dueOverdue",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.dueOverdue",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "TASK_ADAPTER",
      requiredCapability: "technician_tasks",
      activityIds: [],
    },
    {
      id: "vitalSigns",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.vitalSigns",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "LIVE_ENGINE",
      requiredCapability: "vitals_acquisition",
      activityIds: ["TECH_VITALS_ACQUISITION"],
    },
    {
      id: "measurements",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.measurements",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "LIVE_ENGINE",
      requiredCapability: "measurements_acquisition",
      activityIds: ["TECH_MEASUREMENT_ACQUISITION"],
    },
    {
      id: "pointOfCareTesting",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.pointOfCareTesting",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "DEFERRED",
      requiredCapability: "poct_performance",
      activityIds: ["TECH_POCT_PERFORMANCE"],
    },
    {
      id: "specimenCollection",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.specimenCollection",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "OPS_LINK",
      requiredCapability: "specimen_collection",
      activityIds: ["TECH_SPECIMEN_COLLECTION"],
    },
    {
      id: "ecgAcquisition",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.ecgAcquisition",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "OPS_LINK",
      requiredCapability: "ecg_acquisition",
      activityIds: ["TECH_ECG_ACQUISITION"],
    },
    {
      id: "mobilityTransfers",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.mobilityTransfers",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "TASK_ADAPTER",
      requiredCapability: "mobility_assistance",
      activityIds: ["TECH_MOBILITY_ASSISTANCE"],
    },
    {
      id: "adlAssistance",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.adlAssistance",
      visibleIn: ["OBSERVATION", "INPATIENT"],
      mode: "TASK_ADAPTER",
      requiredCapability: "adl_assistance",
      activityIds: ["TECH_ADL_ASSISTANCE"],
    },
    {
      id: "intakeOutput",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.intakeOutput",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "EDOC_HUB",
      requiredCapability: "intake_output_entry",
      activityIds: ["TECH_INTAKE_OUTPUT_ENTRY"],
      edocCategoryHint: "INTAKE_OUTPUT",
    },
    {
      id: "safetyRounds",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.safetyRounds",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "TASK_ADAPTER",
      requiredCapability: "safety_rounds",
      activityIds: ["TECH_SAFETY_ROUND"],
    },
    {
      id: "repositioning",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.repositioning",
      visibleIn: ["OBSERVATION", "INPATIENT"],
      mode: "TASK_ADAPTER",
      requiredCapability: "repositioning",
      activityIds: ["TECH_REPOSITIONING"],
    },
    {
      id: "sitterObservation",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.sitterObservation",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "DEFERRED",
      requiredCapability: "sitter_observation",
      activityIds: ["TECH_SITTER_OBSERVATION"],
    },
    {
      id: "patientTransport",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.patientTransport",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "TASK_ADAPTER",
      requiredCapability: "patient_transport",
      activityIds: ["TECH_PATIENT_TRANSPORT"],
    },
    {
      id: "roomEquipment",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.roomEquipment",
      visibleIn: ["EMERGENCY"],
      mode: "DEFERRED",
      requiredCapability: null,
      activityIds: [],
    },
    {
      id: "escalations",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.escalations",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "TASK_ADAPTER",
      requiredCapability: "task_exception",
      activityIds: ["TECH_TASK_EXCEPTION", "TECH_ESCALATION_NOTE"],
    },
    {
      id: "completedWork",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.completedWork",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "TASK_ADAPTER",
      requiredCapability: "technician_tasks",
      activityIds: [],
    },
    {
      id: "documentationHistory",
      titleKey: "enterpriseTechnicianNursingAssistantWorkspaceD4b3.sections.documentationHistory",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "PROJECTION",
      requiredCapability: "technician_notes",
      activityIds: ["TECH_ENCOUNTER_NOTE"],
    },
  ];

export function resolveTechnicianRoleProfile(roleCodes: readonly string[]): TechnicianRoleProfile {
  const codes = new Set(roleCodes.map((c) => String(c).trim().toUpperCase()).filter(Boolean));
  if (codes.has("PATIENT_CARE_TECH")) return "PATIENT_CARE_TECH";
  if (codes.has("LAB")) return "LAB_TECHNICIAN";
  if (codes.has("RADIOLOGY")) return "RADIOLOGY_TECHNICIAN";
  // Profession TECHNICIAN without specific subtype — treat as ED tech for capability defaults.
  return "ED_TECHNICIAN";
}

export function isTechnicianCapabilityAllowedForProfile(
  capabilityId: EnterpriseTechnicianCapabilityId,
  profile: TechnicianRoleProfile
): boolean {
  const def = ENTERPRISE_TECHNICIAN_CAPABILITY_REGISTRY.find((c) => c.id === capabilityId);
  if (!def) return false;
  return def.defaultRoleProfiles.includes(profile);
}

export function isTechnicianCapabilityProhibited(
  capabilityId: string
): capabilityId is TechnicianProhibitedCapability {
  return (TECHNICIAN_PROHIBITED_CAPABILITIES as readonly string[]).includes(capabilityId);
}

/**
 * Assignment never equals authorization.
 * Nest RBAC + order/policy remain authoritative beyond this matrix.
 */
export function technicianActivityEligibility(input: {
  activityId: EnterpriseTechnicianActivityId;
  careSetting: EnterpriseClinicalDocumentCareSetting;
  roleProfile: TechnicianRoleProfile;
  assignedUserId?: string | null;
  actorUserId?: string | null;
  orderPresent?: boolean;
}): {
  activityKnown: boolean;
  selectedInD4b3: boolean;
  careSettingAllowed: boolean;
  capabilityAllowedForProfile: boolean;
  orderSatisfied: boolean;
  assignmentEqualsAuthorization: false;
  sameAssignedUser: boolean;
  prohibitedAsNursingAssessment: true;
} {
  const activity = ENTERPRISE_TECHNICIAN_ACTIVITY_REGISTRY.find((a) => a.activityId === input.activityId);
  const capabilityOk =
    activity?.capabilityId == null
      ? true
      : isTechnicianCapabilityAllowedForProfile(activity.capabilityId, input.roleProfile);
  const careOk = activity
    ? activity.allowedCareSettings.includes(
        input.careSetting as "EMERGENCY" | "OBSERVATION" | "INPATIENT"
      )
    : false;
  const orderOk = !activity?.orderDependent || !!input.orderPresent;
  return {
    activityKnown: activity != null,
    selectedInD4b3: !!activity?.selectedInD4b3,
    careSettingAllowed: careOk,
    capabilityAllowedForProfile: capabilityOk,
    orderSatisfied: orderOk,
    assignmentEqualsAuthorization: false,
    sameAssignedUser:
      !!input.assignedUserId &&
      !!input.actorUserId &&
      input.assignedUserId === input.actorUserId,
    prohibitedAsNursingAssessment: true,
  };
}

export function technicianWorkspaceSectionsForCareSetting(
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT",
  options?: {
    roleProfile?: TechnicianRoleProfile;
    includeDeferred?: boolean;
  }
): EnterpriseTechnicianWorkspaceSectionDefinition[] {
  const profile = options?.roleProfile ?? "PATIENT_CARE_TECH";
  const includeDeferred = options?.includeDeferred ?? true;
  return ENTERPRISE_TECHNICIAN_WORKSPACE_SECTIONS.filter((s) => {
    if (!s.visibleIn.includes(careSetting)) return false;
    if (!includeDeferred && s.mode === "DEFERRED") return false;
    if (s.requiredCapability == null) return true;
    return isTechnicianCapabilityAllowedForProfile(s.requiredCapability, profile);
  });
}

export function resolveTechnicianWorkspaceSection(
  raw: string | null | undefined
): EnterpriseTechnicianWorkspaceSectionId | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  const hit = ENTERPRISE_TECHNICIAN_WORKSPACE_SECTIONS.find((s) => s.id === trimmed);
  if (hit) return hit.id;
  const lower = trimmed.toLowerCase().replace(/[_-]/g, "");
  const alias: Record<string, EnterpriseTechnicianWorkspaceSectionId> = {
    overview: "overview",
    tasks: "assignedTasks",
    assignedtasks: "assignedTasks",
    due: "dueOverdue",
    dueoverdue: "dueOverdue",
    overdue: "dueOverdue",
    vitals: "vitalSigns",
    vitalsigns: "vitalSigns",
    measurements: "measurements",
    poct: "pointOfCareTesting",
    pointofcaretesting: "pointOfCareTesting",
    specimen: "specimenCollection",
    specimencollection: "specimenCollection",
    ecg: "ecgAcquisition",
    ekg: "ecgAcquisition",
    ecgacquisition: "ecgAcquisition",
    mobility: "mobilityTransfers",
    mobilitytransfers: "mobilityTransfers",
    adl: "adlAssistance",
    adlassistance: "adlAssistance",
    io: "intakeOutput",
    intakeoutput: "intakeOutput",
    safety: "safetyRounds",
    safetyrounds: "safetyRounds",
    repositioning: "repositioning",
    sitter: "sitterObservation",
    sitterobservation: "sitterObservation",
    transport: "patientTransport",
    patienttransport: "patientTransport",
    room: "roomEquipment",
    roomequipment: "roomEquipment",
    escalations: "escalations",
    completed: "completedWork",
    completedwork: "completedWork",
    history: "documentationHistory",
    documentationhistory: "documentationHistory",
    notes: "documentationHistory",
  };
  return alias[lower] ?? null;
}

export function classifyEncounterTypeToTechnicianCareSetting(
  encounterType: string | null | undefined
): "EMERGENCY" | "OBSERVATION" | "INPATIENT" {
  const t = String(encounterType ?? "").toUpperCase();
  if (t === "ER" || t === "ED" || t === "EMERGENCY") return "EMERGENCY";
  if (t === "OBSERVATION" || t === "OBS") return "OBSERVATION";
  return "INPATIENT";
}

export function toClinicalDocumentationHubCareSettingFromTechnician(
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT"
): "ED" | "OBSERVATION" | "INPATIENT" {
  if (careSetting === "EMERGENCY") return "ED";
  return careSetting;
}

export type TechnicianTaskProjectionInput = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting?: EnterpriseClinicalDocumentCareSetting | "UNKNOWN";
  hospitalEpisodeId?: string | null;
  tasks: ReadonlyArray<TechnicianTaskV1>;
};

/**
 * Operational task projection — NOT a clinical document.
 * Preserves performer / validator identity for nursing visibility without rewriting authorship.
 */
export type TechnicianTaskOperationalProjection = {
  kind: "OPERATIONAL_TASK";
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: EnterpriseClinicalDocumentCareSetting | "UNKNOWN";
  hospitalEpisodeId: string | null;
  taskId: string;
  type: TechnicianTaskType;
  title: string;
  status: TechnicianTaskStatus;
  assignedToUserId: string | null;
  performerUserId: string | null;
  completedAt: string | null;
  rnValidationRequired: boolean;
  rnValidatedAt: string | null;
  rnValidatedByUserId: string | null;
  escalationRequired: boolean;
  exceptionNote: string | null;
  /** Explicit: task completion is not a nursing assessment. */
  isNursingAssessment: false;
  /** Explicit: performer ≠ encounter owner. */
  performerIsNotEncounterOwner: true;
};

export function projectTechnicianTasksToOperationalProjections(
  input: TechnicianTaskProjectionInput
): TechnicianTaskOperationalProjection[] {
  return input.tasks.map((task) => ({
    kind: "OPERATIONAL_TASK" as const,
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    careSetting: input.careSetting ?? "UNKNOWN",
    hospitalEpisodeId: input.hospitalEpisodeId ?? null,
    taskId: task.taskId,
    type: task.type,
    title: task.title,
    status: task.status,
    assignedToUserId: task.assignedToUserId ?? null,
    performerUserId: task.performerUserId ?? null,
    completedAt: task.completedAt ?? null,
    rnValidationRequired: task.rnValidationRequired,
    rnValidatedAt: task.rnValidatedAt ?? null,
    rnValidatedByUserId: task.rnValidatedByUserId ?? null,
    escalationRequired: task.escalationRequired,
    exceptionNote: task.exceptionNote ?? null,
    isNursingAssessment: false,
    performerIsNotEncounterOwner: true,
  }));
}

/** Preserve historical performer when assignment changes. */
export function technicianPerformerPreservedAfterReassignment(input: {
  originalPerformerUserId: string | null | undefined;
  newAssigneeUserId: string | null | undefined;
  recordedPerformerUserId: string | null | undefined;
}): boolean {
  const recorded = String(input.recordedPerformerUserId ?? "").trim();
  const original = String(input.originalPerformerUserId ?? "").trim();
  if (!recorded || !original) return recorded === original;
  // Reassignment of assignee must not mutate recorded performer.
  return recorded === original && recorded !== String(input.newAssigneeUserId ?? "").trim()
    ? true
    : recorded === original;
}

export function filterTasksBySection(
  tasks: ReadonlyArray<TechnicianTaskV1>,
  sectionId: EnterpriseTechnicianWorkspaceSectionId,
  nowIso?: string
): TechnicianTaskV1[] {
  const now = nowIso ? Date.parse(nowIso) : Date.now();
  if (sectionId === "dueOverdue") {
    return tasks.filter((t) => {
      if (!t.dueAt) return false;
      if (t.status === "COMPLETED" || t.status === "VALIDATED") return false;
      return Date.parse(t.dueAt) < now;
    });
  }
  if (sectionId === "completedWork") {
    return tasks.filter((t) => t.status === "COMPLETED" || t.status === "VALIDATED");
  }
  if (sectionId === "escalations") {
    return tasks.filter((t) => t.escalationRequired || t.status === "ESCALATED" || t.status === "UNABLE_TO_COMPLETE");
  }
  const section = ENTERPRISE_TECHNICIAN_WORKSPACE_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return [...tasks];
  const types = new Set(
    section.activityIds
      .map((id) => ENTERPRISE_TECHNICIAN_ACTIVITY_REGISTRY.find((a) => a.activityId === id)?.taskType)
      .filter((t): t is TechnicianTaskType => !!t)
  );
  if (types.size === 0) return [...tasks];
  return tasks.filter((t) => types.has(t.type));
}

export type TechnicianVitalsContributionProjection = {
  kind: "CLINICAL_OBSERVATION";
  activityId: "TECH_VITALS_ACQUISITION";
  encounterId: string;
  patientId: string;
  facilityId: string;
  recordedAt: string;
  performerUserId: string | null;
  performerDisplayName: string | null;
  /** Feeds nursing views without becoming nursing authorship. */
  nursingVisible: true;
  isNursingAssessment: false;
  discipline: "TECHNICIAN";
};

export function projectTechnicianVitalsContribution(input: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  recordedAt: string;
  performerUserId?: string | null;
  performerDisplayName?: string | null;
}): TechnicianVitalsContributionProjection {
  return {
    kind: "CLINICAL_OBSERVATION",
    activityId: "TECH_VITALS_ACQUISITION",
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    recordedAt: input.recordedAt,
    performerUserId: input.performerUserId ?? null,
    performerDisplayName: input.performerDisplayName ?? null,
    nursingVisible: true,
    isNursingAssessment: false,
    discipline: "TECHNICIAN",
  };
}

/**
 * Optional durable escalation / observation note projection via D4B.1.
 * Does not invent a technician signature engine.
 */
export function adaptTechnicianEscalationNoteToEnterpriseClinicalDocument(
  note: EncounterNoteAdapterInput
): EnterpriseClinicalDocument {
  const adapted = adaptEncounterNoteToEnterpriseClinicalDocument({
    ...note,
    noteType: "TECHNICIAN",
  });
  return {
    ...adapted,
    discipline: "TECHNICIAN",
    documentTypeId: "encounter_note.technician",
  };
}

export type EnterpriseTechnicianWorkspaceSummary = {
  certificationId: typeof ENTERPRISE_TECHNICIAN_NA_WORKSPACE_CERTIFICATION_ID;
  contractVersion: typeof ENTERPRISE_TECHNICIAN_NA_WORKSPACE_CONTRACT_VERSION;
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleProfile: TechnicianRoleProfile;
  usesD4b1Lifecycle: true;
  independentTechnicianLifecycleEngine: false;
  masqueradesAsNursingAssessment: false;
  sections: EnterpriseTechnicianWorkspaceSectionDefinition[];
  activities: EnterpriseTechnicianActivityDefinition[];
  documents: EnterpriseClinicalDocument[];
  operationalTasks: TechnicianTaskOperationalProjection[];
  vitalsContributions: TechnicianVitalsContributionProjection[];
};

export function buildEnterpriseTechnicianWorkspaceSummary(input: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleProfile?: TechnicianRoleProfile;
  hospitalEpisodeId?: string | null;
  notes?: ReadonlyArray<EncounterNoteAdapterInput>;
  edocEntries?: ReadonlyArray<EdocEntryAdapterInput>;
  tasks?: ReadonlyArray<TechnicianTaskV1>;
  vitalsContributions?: ReadonlyArray<TechnicianVitalsContributionProjection>;
}): EnterpriseTechnicianWorkspaceSummary {
  const roleProfile = input.roleProfile ?? "PATIENT_CARE_TECH";
  const sections = technicianWorkspaceSectionsForCareSetting(input.careSetting, { roleProfile });
  const activities = ENTERPRISE_TECHNICIAN_ACTIVITY_REGISTRY.filter(
    (a) =>
      a.selectedInD4b3 &&
      a.allowedCareSettings.includes(input.careSetting) &&
      (a.capabilityId == null || isTechnicianCapabilityAllowedForProfile(a.capabilityId, roleProfile))
  );
  const documents: EnterpriseClinicalDocument[] = [];
  for (const note of input.notes ?? []) {
    if (String(note.noteType).toUpperCase() !== "TECHNICIAN") continue;
    documents.push(
      adaptEncounterNoteToEnterpriseClinicalDocument({
        ...note,
        careSetting: note.careSetting ?? input.careSetting,
        hospitalEpisodeId: note.hospitalEpisodeId ?? input.hospitalEpisodeId,
      })
    );
  }
  for (const entry of input.edocEntries ?? []) {
    // I&O and other tech-contributed EDOC entries keep original author discipline from adapter.
    documents.push(
      adaptEdocEntryToEnterpriseClinicalDocument({
        ...entry,
        careSetting: entry.careSetting ?? input.careSetting,
        hospitalEpisodeId: entry.hospitalEpisodeId ?? input.hospitalEpisodeId,
      })
    );
  }
  const operationalTasks = projectTechnicianTasksToOperationalProjections({
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    careSetting: input.careSetting,
    hospitalEpisodeId: input.hospitalEpisodeId,
    tasks: input.tasks ?? [],
  });
  return {
    certificationId: ENTERPRISE_TECHNICIAN_NA_WORKSPACE_CERTIFICATION_ID,
    contractVersion: ENTERPRISE_TECHNICIAN_NA_WORKSPACE_CONTRACT_VERSION,
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    careSetting: input.careSetting,
    roleProfile,
    usesD4b1Lifecycle: true,
    independentTechnicianLifecycleEngine: false,
    masqueradesAsNursingAssessment: false,
    sections,
    activities,
    documents,
    operationalTasks,
    vitalsContributions: [...(input.vitalsContributions ?? [])],
  };
}

/** Re-export task constants for UI adapters without inventing a parallel enum. */
export { TECHNICIAN_TASK_TYPES, TECHNICIAN_TASK_STATUSES };

/** Guard used by tests / hosts: nursing review must not rewrite technician performer. */
export function nursingReviewPreservesTechnicianPerformer(input: {
  technicianPerformerUserId: string;
  nurseReviewerUserId: string;
  storedPerformerUserId: string;
}): boolean {
  void input.nurseReviewerUserId;
  return input.storedPerformerUserId === input.technicianPerformerUserId;
}

/** Virtual projection helper for late-entry labeled tech observation notes. */
export function adaptTechnicianObservationNoteProjection(input: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  noteId: string;
  body: string;
  authorUserId: string;
  authorDisplayName?: string | null;
  createdAt: string;
  careSetting?: EnterpriseClinicalDocumentCareSetting | "UNKNOWN";
  lateEntryLabeled?: boolean;
}): EnterpriseClinicalDocument {
  const author = actorSnapshot(input.authorUserId, input.authorDisplayName, "TECHNICIAN");
  const lifecycleState: EnterpriseClinicalDocumentLifecycleState = "SIGNED";
  return {
    contractVersion: ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION,
    documentId: input.noteId,
    sourceArchitecture: "ENCOUNTER_NOTE",
    patientId: input.patientId,
    encounterId: input.encounterId,
    hospitalEpisodeId: null,
    facilityId: input.facilityId,
    careSetting: input.careSetting ?? "UNKNOWN",
    discipline: "TECHNICIAN",
    documentTypeId: "encounter_note.technician",
    templateVersion: "MEDNOTE.2",
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
    structured: null,
    narrative: {
      sections: [
        {
          key: "body",
          title: "Note",
          text: input.body,
          lateEntry: !!input.lateEntryLabeled,
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
      lateEntryLabeled: !!input.lateEntryLabeled,
    },
    legalRecordVisible: true,
    printExportEligible: true,
    enteredInError: false,
    voided: false,
  };
}
