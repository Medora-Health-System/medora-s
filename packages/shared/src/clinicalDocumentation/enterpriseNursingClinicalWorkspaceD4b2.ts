/**
 * MEDUI.D4B.2 — Enterprise Nursing Clinical Workspace
 *
 * Care-setting-aware IA + nursing document-type registry + D4B.1 projections.
 * Does NOT introduce a second signature / version / amendment engine.
 */

import type {
  EnterpriseClinicalDocument,
  EnterpriseClinicalDocumentCareSetting,
  EnterpriseClinicalDocumentLifecycleState,
} from "./enterpriseClinicalDocumentContractD4b1.js";
import {
  adaptEdocEntryToEnterpriseClinicalDocument,
  adaptEncounterNoteToEnterpriseClinicalDocument,
  adaptNursingAdmissionToEnterpriseClinicalDocument,
  type EdocEntryAdapterInput,
  type EncounterNoteAdapterInput,
  type NursingAdmissionAdapterInput,
} from "./enterpriseClinicalDocumentAdaptersD4b1.js";
import { actorSnapshot } from "./enterpriseClinicalDocumentAuthorshipD4b1.js";
import { ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION } from "./enterpriseClinicalDocumentContractD4b1.js";
import {
  documentTypeEligibilitySummary,
  getEnterpriseClinicalDocumentType,
  isDocumentTypeAllowedForCareSetting,
} from "./enterpriseClinicalDocumentRegistryD4b1.js";

export const ENTERPRISE_NURSING_CLINICAL_WORKSPACE_CERTIFICATION_ID =
  "MEDUI.ENTERPRISE_NURSING_CLINICAL_WORKSPACE.D4B2" as const;

export const ENTERPRISE_NURSING_CLINICAL_WORKSPACE_CONTRACT_VERSION = "D4B.2" as const;

/** Nursing workspace clinical sections (IA). */
export type EnterpriseNursingWorkspaceSectionId =
  | "overview"
  | "admission"
  | "systems"
  | "reassessment"
  | "pain"
  | "neurological"
  | "respiratory"
  | "cardiovascular"
  | "gastrointestinal"
  | "genitourinary"
  | "skinWounds"
  | "fallMobility"
  | "devices"
  | "safety"
  | "restraints"
  | "intakeOutput"
  | "nutrition"
  | "education"
  | "carePlan"
  | "handoff"
  | "discharge"
  | "documentationHistory";

export type EnterpriseNursingWorkspaceSectionMode =
  | "LIVE_ENGINE"
  | "EDOC_HUB"
  | "PROJECTION"
  | "DEFERRED"
  | "OPS_LINK";

export type EnterpriseNursingWorkspaceSectionDefinition = {
  id: EnterpriseNursingWorkspaceSectionId;
  titleKey: string;
  /** Care settings where the section appears in sticky nav. */
  visibleIn: ReadonlyArray<"EMERGENCY" | "OBSERVATION" | "INPATIENT" | "AMBULATORY">;
  mode: EnterpriseNursingWorkspaceSectionMode;
  /** Logical nursing document type(s) projected into this section. */
  documentTypeIds: ReadonlyArray<string>;
  /** Optional EDOC category hint for hub deep-link. */
  edocCategoryHint?: string | null;
  /** Optional focused EDOC card id hint. */
  focusedEdocCardId?: string | null;
  authoritativeSource:
    | "NURSING_ADMISSION_D4A1"
    | "ED_REASSESSMENT_ENGINE"
    | "INPATIENT_NURSING_ASSESSMENT_V1"
    | "ER_HANDOFF_V1"
    | "EDOC"
    | "ENCOUNTER_NOTE"
    | "DISCHARGE_NURSING_ED"
    | "NONE_DEFERRED";
};

/**
 * Smallest coherent nursing section model from audit.
 * Nutrition deferred (dedicated cards incomplete). Systems/reassessment prefer live engines + EDOC.
 */
export const ENTERPRISE_NURSING_WORKSPACE_SECTIONS: ReadonlyArray<EnterpriseNursingWorkspaceSectionDefinition> =
  [
    {
      id: "overview",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.overview",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT", "AMBULATORY"],
      mode: "PROJECTION",
      documentTypeIds: [],
      authoritativeSource: "NONE_DEFERRED",
    },
    {
      id: "admission",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.admission",
      visibleIn: ["OBSERVATION", "INPATIENT"],
      mode: "LIVE_ENGINE",
      documentTypeIds: ["nursing.admission_assessment"],
      authoritativeSource: "NURSING_ADMISSION_D4A1",
    },
    {
      id: "systems",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.systems",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT", "AMBULATORY"],
      mode: "LIVE_ENGINE",
      documentTypeIds: ["nursing.systems_assessment", "nursing.reassessment"],
      edocCategoryHint: "NURSING_ADMISSION_CARE_PLAN",
      focusedEdocCardId: "systems_assessment",
      authoritativeSource: "ED_REASSESSMENT_ENGINE",
    },
    {
      id: "reassessment",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.reassessment",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "LIVE_ENGINE",
      documentTypeIds: ["nursing.reassessment"],
      authoritativeSource: "ED_REASSESSMENT_ENGINE",
    },
    {
      id: "pain",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.pain",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT", "AMBULATORY"],
      mode: "EDOC_HUB",
      documentTypeIds: ["nursing.pain_assessment"],
      edocCategoryHint: "PAIN_ASSESSMENT",
      authoritativeSource: "EDOC",
    },
    {
      id: "neurological",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.neurological",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT", "AMBULATORY"],
      mode: "EDOC_HUB",
      documentTypeIds: ["nursing.neurological_assessment"],
      edocCategoryHint: "NEUROLOGICAL_ASSESSMENT",
      authoritativeSource: "EDOC",
    },
    {
      id: "respiratory",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.respiratory",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT", "AMBULATORY"],
      mode: "EDOC_HUB",
      documentTypeIds: ["nursing.respiratory_assessment"],
      edocCategoryHint: "RESPIRATORY_ASSESSMENT",
      authoritativeSource: "EDOC",
    },
    {
      id: "cardiovascular",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.cardiovascular",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT", "AMBULATORY"],
      mode: "EDOC_HUB",
      documentTypeIds: ["nursing.cardiovascular_assessment"],
      edocCategoryHint: "CARDIAC_MONITORING",
      authoritativeSource: "EDOC",
    },
    {
      id: "gastrointestinal",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.gastrointestinal",
      visibleIn: ["OBSERVATION", "INPATIENT", "AMBULATORY"],
      mode: "LIVE_ENGINE",
      documentTypeIds: ["nursing.systems_assessment"],
      authoritativeSource: "ED_REASSESSMENT_ENGINE",
    },
    {
      id: "genitourinary",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.genitourinary",
      visibleIn: ["OBSERVATION", "INPATIENT", "AMBULATORY"],
      mode: "LIVE_ENGINE",
      documentTypeIds: ["nursing.systems_assessment"],
      authoritativeSource: "ED_REASSESSMENT_ENGINE",
    },
    {
      id: "skinWounds",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.skinWounds",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT", "AMBULATORY"],
      mode: "EDOC_HUB",
      documentTypeIds: ["nursing.skin_wound_assessment"],
      edocCategoryHint: "SKIN_WOUND_PRESSURE_INJURY",
      authoritativeSource: "EDOC",
    },
    {
      id: "fallMobility",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.fallMobility",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT", "AMBULATORY"],
      mode: "EDOC_HUB",
      documentTypeIds: ["nursing.fall_mobility_assessment"],
      edocCategoryHint: "FALL_RISK_SAFETY",
      authoritativeSource: "EDOC",
    },
    {
      id: "devices",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.devices",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT", "AMBULATORY"],
      mode: "EDOC_HUB",
      documentTypeIds: ["nursing.device_assessment"],
      edocCategoryHint: "DEVICE_LINE_TUBE_DRAIN_MONITORING",
      authoritativeSource: "EDOC",
    },
    {
      id: "safety",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.safety",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT", "AMBULATORY"],
      mode: "EDOC_HUB",
      documentTypeIds: ["nursing.safety_precautions"],
      edocCategoryHint: "SAFETY_DOCUMENTATION",
      authoritativeSource: "EDOC",
    },
    {
      id: "restraints",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.restraints",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "EDOC_HUB",
      documentTypeIds: ["nursing.restraint_assessment"],
      edocCategoryHint: "RESTRAINT_DOCUMENTATION",
      authoritativeSource: "EDOC",
    },
    {
      id: "intakeOutput",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.intakeOutput",
      visibleIn: ["OBSERVATION", "INPATIENT"],
      mode: "EDOC_HUB",
      documentTypeIds: ["nursing.intake_output"],
      edocCategoryHint: "INTAKE_OUTPUT",
      authoritativeSource: "EDOC",
    },
    {
      id: "nutrition",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.nutrition",
      visibleIn: ["INPATIENT"],
      mode: "DEFERRED",
      documentTypeIds: [],
      authoritativeSource: "NONE_DEFERRED",
    },
    {
      id: "education",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.education",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT", "AMBULATORY"],
      mode: "EDOC_HUB",
      documentTypeIds: ["nursing.education_note"],
      edocCategoryHint: "PATIENT_EDUCATION_DISCHARGE_TEACHING",
      authoritativeSource: "EDOC",
    },
    {
      id: "carePlan",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.carePlan",
      visibleIn: ["OBSERVATION", "INPATIENT"],
      mode: "EDOC_HUB",
      documentTypeIds: ["nursing.care_plan_update"],
      edocCategoryHint: "NURSING_ADMISSION_CARE_PLAN",
      focusedEdocCardId: "nursing_care_plan_update",
      authoritativeSource: "EDOC",
    },
    {
      id: "handoff",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.handoff",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      mode: "LIVE_ENGINE",
      documentTypeIds: ["nursing.handoff"],
      authoritativeSource: "ER_HANDOFF_V1",
    },
    {
      id: "discharge",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.discharge",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT", "AMBULATORY"],
      mode: "LIVE_ENGINE",
      documentTypeIds: ["nursing.discharge_note"],
      authoritativeSource: "DISCHARGE_NURSING_ED",
    },
    {
      id: "documentationHistory",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.sections.documentationHistory",
      visibleIn: ["EMERGENCY", "OBSERVATION", "INPATIENT", "AMBULATORY"],
      mode: "PROJECTION",
      documentTypeIds: ["encounter_note.nursing", "edoc.structured_entry"],
      authoritativeSource: "ENCOUNTER_NOTE",
    },
  ];

export type EnterpriseNursingDocumentTypeDefinition = {
  documentTypeId: string;
  titleKey: string;
  templateVersion: string;
  allowedCareSettings: ReadonlyArray<EnterpriseClinicalDocumentCareSetting>;
  /** Maps to D4B.1 registry id when available; else virtual nursing specialization. */
  d4b1DocumentTypeId: string | null;
  sourceArchitecture:
    | "ENCOUNTER_NOTE"
    | "EDOC_ENTRY"
    | "NURSING_ADMISSION"
    | "NURSING_REASSESSMENT_JSON"
    | "NURSING_HANDOFF_JSON"
    | "NURSING_DISCHARGE_JSON"
    | "REFERENCE_VIRTUAL";
  amendmentAllowed: boolean;
  printExportAllowed: boolean;
  supportsDraftEdit: boolean;
  interdisciplinaryVisible: boolean;
  signatureRequired: boolean;
};

/** Smallest coherent nursing document-type registry (audit-driven). */
export const ENTERPRISE_NURSING_DOCUMENT_TYPE_REGISTRY: ReadonlyArray<EnterpriseNursingDocumentTypeDefinition> =
  [
    {
      documentTypeId: "nursing.admission_assessment",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.documentTypes.admission",
      templateVersion: "D4A.1",
      allowedCareSettings: ["INPATIENT", "OBSERVATION"],
      d4b1DocumentTypeId: "nursing.admission_assessment",
      sourceArchitecture: "NURSING_ADMISSION",
      amendmentAllowed: true,
      printExportAllowed: true,
      supportsDraftEdit: true,
      interdisciplinaryVisible: true,
      signatureRequired: true,
    },
    {
      documentTypeId: "nursing.reassessment",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.documentTypes.reassessment",
      templateVersion: "ER_NURSING_REASSESSMENT.V1",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      d4b1DocumentTypeId: null,
      sourceArchitecture: "NURSING_REASSESSMENT_JSON",
      amendmentAllowed: false,
      printExportAllowed: true,
      supportsDraftEdit: true,
      interdisciplinaryVisible: true,
      signatureRequired: false,
    },
    {
      documentTypeId: "nursing.systems_assessment",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.documentTypes.systems",
      templateVersion: "EDOC19/REASSESSMENT",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      d4b1DocumentTypeId: "edoc.structured_entry",
      sourceArchitecture: "EDOC_ENTRY",
      amendmentAllowed: false,
      printExportAllowed: true,
      supportsDraftEdit: false,
      interdisciplinaryVisible: true,
      signatureRequired: true,
    },
    {
      documentTypeId: "nursing.pain_assessment",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.documentTypes.pain",
      templateVersion: "EDOC13",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      d4b1DocumentTypeId: "edoc.structured_entry",
      sourceArchitecture: "EDOC_ENTRY",
      amendmentAllowed: false,
      printExportAllowed: true,
      supportsDraftEdit: false,
      interdisciplinaryVisible: true,
      signatureRequired: true,
    },
    {
      documentTypeId: "nursing.neurological_assessment",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.documentTypes.neurological",
      templateVersion: "EDOC_NEURO",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      d4b1DocumentTypeId: "edoc.structured_entry",
      sourceArchitecture: "EDOC_ENTRY",
      amendmentAllowed: false,
      printExportAllowed: true,
      supportsDraftEdit: false,
      interdisciplinaryVisible: true,
      signatureRequired: true,
    },
    {
      documentTypeId: "nursing.respiratory_assessment",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.documentTypes.respiratory",
      templateVersion: "EDOC_RESP",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      d4b1DocumentTypeId: "edoc.structured_entry",
      sourceArchitecture: "EDOC_ENTRY",
      amendmentAllowed: false,
      printExportAllowed: true,
      supportsDraftEdit: false,
      interdisciplinaryVisible: true,
      signatureRequired: true,
    },
    {
      documentTypeId: "nursing.cardiovascular_assessment",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.documentTypes.cardiovascular",
      templateVersion: "EDOC15",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      d4b1DocumentTypeId: "edoc.structured_entry",
      sourceArchitecture: "EDOC_ENTRY",
      amendmentAllowed: false,
      printExportAllowed: true,
      supportsDraftEdit: false,
      interdisciplinaryVisible: true,
      signatureRequired: true,
    },
    {
      documentTypeId: "nursing.skin_wound_assessment",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.documentTypes.skinWound",
      templateVersion: "EDOC20",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      d4b1DocumentTypeId: "edoc.structured_entry",
      sourceArchitecture: "EDOC_ENTRY",
      amendmentAllowed: false,
      printExportAllowed: true,
      supportsDraftEdit: false,
      interdisciplinaryVisible: true,
      signatureRequired: true,
    },
    {
      documentTypeId: "nursing.fall_mobility_assessment",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.documentTypes.fallMobility",
      templateVersion: "EDOC14",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      d4b1DocumentTypeId: "edoc.structured_entry",
      sourceArchitecture: "EDOC_ENTRY",
      amendmentAllowed: false,
      printExportAllowed: true,
      supportsDraftEdit: false,
      interdisciplinaryVisible: true,
      signatureRequired: true,
    },
    {
      documentTypeId: "nursing.device_assessment",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.documentTypes.device",
      templateVersion: "EDOC17",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      d4b1DocumentTypeId: "edoc.structured_entry",
      sourceArchitecture: "EDOC_ENTRY",
      amendmentAllowed: false,
      printExportAllowed: true,
      supportsDraftEdit: false,
      interdisciplinaryVisible: true,
      signatureRequired: true,
    },
    {
      documentTypeId: "nursing.safety_precautions",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.documentTypes.safety",
      templateVersion: "EDOC_SAFETY",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      d4b1DocumentTypeId: "edoc.structured_entry",
      sourceArchitecture: "EDOC_ENTRY",
      amendmentAllowed: false,
      printExportAllowed: true,
      supportsDraftEdit: false,
      interdisciplinaryVisible: true,
      signatureRequired: true,
    },
    {
      documentTypeId: "nursing.restraint_assessment",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.documentTypes.restraint",
      templateVersion: "EDOC6",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      d4b1DocumentTypeId: "edoc.structured_entry",
      sourceArchitecture: "EDOC_ENTRY",
      amendmentAllowed: false,
      printExportAllowed: true,
      supportsDraftEdit: false,
      interdisciplinaryVisible: true,
      signatureRequired: true,
    },
    {
      documentTypeId: "nursing.intake_output",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.documentTypes.intakeOutput",
      templateVersion: "EDOC5",
      allowedCareSettings: ["OBSERVATION", "INPATIENT", "EMERGENCY"],
      d4b1DocumentTypeId: "edoc.structured_entry",
      sourceArchitecture: "EDOC_ENTRY",
      amendmentAllowed: false,
      printExportAllowed: true,
      supportsDraftEdit: false,
      interdisciplinaryVisible: true,
      signatureRequired: true,
    },
    {
      documentTypeId: "nursing.education_note",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.documentTypes.education",
      templateVersion: "EDOC22",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      d4b1DocumentTypeId: "edoc.structured_entry",
      sourceArchitecture: "EDOC_ENTRY",
      amendmentAllowed: false,
      printExportAllowed: true,
      supportsDraftEdit: false,
      interdisciplinaryVisible: true,
      signatureRequired: true,
    },
    {
      documentTypeId: "nursing.care_plan_update",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.documentTypes.carePlan",
      templateVersion: "EDOC19",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      d4b1DocumentTypeId: "edoc.structured_entry",
      sourceArchitecture: "EDOC_ENTRY",
      amendmentAllowed: false,
      printExportAllowed: true,
      supportsDraftEdit: false,
      interdisciplinaryVisible: true,
      signatureRequired: true,
    },
    {
      documentTypeId: "nursing.handoff",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.documentTypes.handoff",
      templateVersion: "ER_HANDOFF.V1",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      d4b1DocumentTypeId: null,
      sourceArchitecture: "NURSING_HANDOFF_JSON",
      amendmentAllowed: false,
      printExportAllowed: true,
      supportsDraftEdit: true,
      interdisciplinaryVisible: true,
      signatureRequired: true,
    },
    {
      documentTypeId: "nursing.discharge_note",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.documentTypes.discharge",
      templateVersion: "NURSING_DISCHARGE.V1",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      d4b1DocumentTypeId: null,
      sourceArchitecture: "NURSING_DISCHARGE_JSON",
      amendmentAllowed: false,
      printExportAllowed: true,
      supportsDraftEdit: true,
      interdisciplinaryVisible: true,
      signatureRequired: true,
    },
    {
      documentTypeId: "encounter_note.nursing",
      titleKey: "enterpriseNursingClinicalWorkspaceD4b2.documentTypes.encounterNote",
      templateVersion: "MEDNOTE.2",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT", "OUTPATIENT", "URGENT_CARE"],
      d4b1DocumentTypeId: "encounter_note.nursing",
      sourceArchitecture: "ENCOUNTER_NOTE",
      amendmentAllowed: true,
      printExportAllowed: true,
      supportsDraftEdit: false,
      interdisciplinaryVisible: true,
      signatureRequired: true,
    },
  ];

export function getEnterpriseNursingDocumentType(
  documentTypeId: string
): EnterpriseNursingDocumentTypeDefinition | null {
  return (
    ENTERPRISE_NURSING_DOCUMENT_TYPE_REGISTRY.find((d) => d.documentTypeId === documentTypeId) ??
    null
  );
}

export function isNursingDocumentTypeAllowedForCareSetting(
  documentTypeId: string,
  careSetting: EnterpriseClinicalDocumentCareSetting
): boolean {
  const def = getEnterpriseNursingDocumentType(documentTypeId);
  if (!def) return false;
  return def.allowedCareSettings.includes(careSetting);
}

export function nursingWorkspaceSectionsForCareSetting(
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT" | "AMBULATORY"
): EnterpriseNursingWorkspaceSectionDefinition[] {
  return ENTERPRISE_NURSING_WORKSPACE_SECTIONS.filter((s) => s.visibleIn.includes(careSetting)).map(
    (section) => ({
      ...section,
      authoritativeSource: resolveNursingSectionAuthoritativeSource(section, careSetting),
    })
  );
}

/**
 * INP.1B.6 — systems/reassessment/GI/GU for inpatient resolve to INP.1A, not the ED reassessment engine.
 * ED/Observation keep `ED_REASSESSMENT_ENGINE`.
 */
export function resolveNursingSectionAuthoritativeSource(
  section: Pick<EnterpriseNursingWorkspaceSectionDefinition, "id" | "authoritativeSource">,
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT" | "AMBULATORY"
): EnterpriseNursingWorkspaceSectionDefinition["authoritativeSource"] {
  if (
    careSetting === "INPATIENT" &&
    section.authoritativeSource === "ED_REASSESSMENT_ENGINE" &&
    (section.id === "systems" ||
      section.id === "reassessment" ||
      section.id === "gastrointestinal" ||
      section.id === "genitourinary")
  ) {
    return "INPATIENT_NURSING_ASSESSMENT_V1";
  }
  return section.authoritativeSource;
}

export function resolveNursingWorkspaceSection(
  raw: string | null | undefined
): EnterpriseNursingWorkspaceSectionId | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  const hit = ENTERPRISE_NURSING_WORKSPACE_SECTIONS.find((s) => s.id === trimmed);
  if (hit) return hit.id;
  const lower = trimmed.toLowerCase().replace(/[_-]/g, "");
  const alias: Record<string, EnterpriseNursingWorkspaceSectionId> = {
    overview: "overview",
    admission: "admission",
    initial: "admission",
    systems: "systems",
    reassessment: "reassessment",
    pain: "pain",
    neuro: "neurological",
    neurological: "neurological",
    respiratory: "respiratory",
    cardiac: "cardiovascular",
    cardiovascular: "cardiovascular",
    gi: "gastrointestinal",
    gastrointestinal: "gastrointestinal",
    gu: "genitourinary",
    genitourinary: "genitourinary",
    skin: "skinWounds",
    wound: "skinWounds",
    skinwounds: "skinWounds",
    fall: "fallMobility",
    mobility: "fallMobility",
    fallmobility: "fallMobility",
    devices: "devices",
    lines: "devices",
    safety: "safety",
    restraints: "restraints",
    io: "intakeOutput",
    intakeoutput: "intakeOutput",
    nutrition: "nutrition",
    education: "education",
    careplan: "carePlan",
    handoff: "handoff",
    discharge: "discharge",
    history: "documentationHistory",
    documentationhistory: "documentationHistory",
    notes: "documentationHistory",
  };
  return alias[lower] ?? null;
}

/**
 * Care-setting governance helper — assignment never equals authorization.
 */
export function nursingDocumentEligibility(input: {
  documentTypeId: string;
  careSetting: EnterpriseClinicalDocumentCareSetting;
  assignedUserId?: string | null;
  actorUserId?: string | null;
}): {
  typeKnown: boolean;
  careSettingAllowed: boolean;
  assignmentEqualsAuthorization: false;
  sameAssignedUser: boolean;
  d4b1TypeKnown: boolean;
  d4b1CareSettingAllowed: boolean;
} {
  const nursing = getEnterpriseNursingDocumentType(input.documentTypeId);
  const d4b1Id = nursing?.d4b1DocumentTypeId;
  const d4b1 = d4b1Id ? getEnterpriseClinicalDocumentType(d4b1Id) : null;
  const d4b1Eligibility =
    d4b1Id != null
      ? documentTypeEligibilitySummary({
          documentTypeId: d4b1Id,
          careSetting: input.careSetting,
          discipline: "NURSING",
          assignedUserId: input.assignedUserId,
          actorUserId: input.actorUserId,
        })
      : null;
  return {
    typeKnown: nursing != null,
    careSettingAllowed: nursing
      ? nursing.allowedCareSettings.includes(input.careSetting)
      : false,
    assignmentEqualsAuthorization: false,
    sameAssignedUser:
      !!input.assignedUserId &&
      !!input.actorUserId &&
      input.assignedUserId === input.actorUserId,
    d4b1TypeKnown: d4b1 != null,
    d4b1CareSettingAllowed: d4b1Id
      ? isDocumentTypeAllowedForCareSetting(d4b1Id, input.careSetting)
      : false,
  };
}

/** Map hub careSetting prop ↔ enterprise care setting. */
export function toClinicalDocumentationHubCareSetting(
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT" | "AMBULATORY"
): "ED" | "OBSERVATION" | "INPATIENT" | "CLINIC" {
  if (careSetting === "EMERGENCY") return "ED";
  if (careSetting === "AMBULATORY") return "CLINIC";
  return careSetting;
}

/** Map nursing IA care setting → D4B.1 foundation care setting (AMBULATORY → OUTPATIENT). */
export function toEnterpriseClinicalDocumentCareSetting(
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT" | "AMBULATORY"
): EnterpriseClinicalDocumentCareSetting {
  if (careSetting === "AMBULATORY") return "OUTPATIENT";
  return careSetting;
}

export function classifyEncounterTypeToNursingCareSetting(
  encounterType: string | null | undefined
): "EMERGENCY" | "OBSERVATION" | "INPATIENT" | "AMBULATORY" {
  const t = String(encounterType ?? "").toUpperCase();
  if (t === "ER" || t === "ED" || t === "EMERGENCY") return "EMERGENCY";
  if (t === "OBSERVATION" || t === "OBS") return "OBSERVATION";
  if (t === "CLINIC" || t === "AMBULATORY" || t === "OUTPATIENT" || t === "URGENT_CARE") return "AMBULATORY";
  return "INPATIENT";
}

export type NursingReassessmentProjectionInput = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  updatedAt?: string | null;
  authorUserId?: string | null;
  authorDisplayName?: string | null;
  careSetting?: EnterpriseClinicalDocumentCareSetting | "UNKNOWN";
  hospitalEpisodeId?: string | null;
  hasContent: boolean;
  lateEntryLabeled?: boolean;
};

/** Projection adapter — does not invent a new amend/void engine. */
export function adaptNursingReassessmentToEnterpriseClinicalDocument(
  input: NursingReassessmentProjectionInput
): EnterpriseClinicalDocument {
  const author = actorSnapshot(input.authorUserId, input.authorDisplayName, "NURSING");
  const at = input.updatedAt ?? new Date(0).toISOString();
  const lifecycleState: EnterpriseClinicalDocumentLifecycleState = input.hasContent
    ? "IN_PROGRESS"
    : "DRAFT";
  return {
    contractVersion: ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION,
    documentId: `nursing-reassessment:${input.encounterId}`,
    sourceArchitecture: "REFERENCE_VIRTUAL",
    patientId: input.patientId,
    encounterId: input.encounterId,
    hospitalEpisodeId: input.hospitalEpisodeId ?? null,
    facilityId: input.facilityId,
    careSetting: input.careSetting ?? "UNKNOWN",
    discipline: "NURSING",
    documentTypeId: "nursing.reassessment",
    templateVersion: "ER_NURSING_REASSESSMENT.V1",
    creator: author,
    author,
    responsibleSigner: null,
    cosigner: null,
    currentAssignedClinicianUserId: null,
    createdAt: at,
    serviceAt: at,
    lastEditedAt: at,
    signedAt: null,
    amendedAt: null,
    lifecycleState,
    structured: {
      schemaId: "erNursingReassessmentV1",
      schemaVersion: "V1",
      payload: { hasContent: input.hasContent },
    },
    narrative: null,
    validation: { fieldValid: true, issues: [] },
    completeness: {
      clinicallyComplete: input.hasContent,
      signatureReady: false,
      missingIndicators: input.hasContent ? [] : ["reassessment_content"],
      acknowledgedExceptions: [],
    },
    lineage: {
      priorVersionId: null,
      currentVersionId: `nursing-reassessment:${input.encounterId}`,
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

export type NursingHandoffProjectionInput = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  signedAt?: string | null;
  signerUserId?: string | null;
  signerDisplayName?: string | null;
  careSetting?: EnterpriseClinicalDocumentCareSetting | "UNKNOWN";
  hospitalEpisodeId?: string | null;
  historyCount?: number;
};

export function adaptNursingHandoffToEnterpriseClinicalDocument(
  input: NursingHandoffProjectionInput
): EnterpriseClinicalDocument {
  const author = actorSnapshot(input.signerUserId, input.signerDisplayName, "NURSING");
  const signed = !!input.signedAt && !!input.signerUserId;
  const lifecycleState: EnterpriseClinicalDocumentLifecycleState = signed ? "SIGNED" : "DRAFT";
  const at = input.signedAt ?? new Date(0).toISOString();
  return {
    contractVersion: ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION,
    documentId: `nursing-handoff:${input.encounterId}`,
    sourceArchitecture: "REFERENCE_VIRTUAL",
    patientId: input.patientId,
    encounterId: input.encounterId,
    hospitalEpisodeId: input.hospitalEpisodeId ?? null,
    facilityId: input.facilityId,
    careSetting: input.careSetting ?? "UNKNOWN",
    discipline: "NURSING",
    documentTypeId: "nursing.handoff",
    templateVersion: "ER_HANDOFF.V1",
    creator: author,
    author,
    responsibleSigner: signed ? author : null,
    cosigner: null,
    currentAssignedClinicianUserId: null,
    createdAt: at,
    serviceAt: at,
    lastEditedAt: at,
    signedAt: signed ? input.signedAt ?? null : null,
    amendedAt: null,
    lifecycleState,
    structured: {
      schemaId: "erHandoffV1",
      schemaVersion: "V1",
      payload: { historyCount: input.historyCount ?? 0 },
    },
    narrative: null,
    validation: { fieldValid: true, issues: [] },
    completeness: {
      clinicallyComplete: signed,
      signatureReady: !signed,
      missingIndicators: signed ? [] : ["handoff_signature"],
      acknowledgedExceptions: [],
    },
    lineage: {
      priorVersionId: null,
      currentVersionId: `nursing-handoff:${input.encounterId}`,
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

export type EnterpriseNursingWorkspaceSummaryInput = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT" | "AMBULATORY";
  hospitalEpisodeId?: string | null;
  admission?: NursingAdmissionAdapterInput | null;
  reassessment?: NursingReassessmentProjectionInput | null;
  handoff?: NursingHandoffProjectionInput | null;
  notes?: ReadonlyArray<EncounterNoteAdapterInput>;
  edocEntries?: ReadonlyArray<EdocEntryAdapterInput>;
};

export type EnterpriseNursingWorkspaceSummary = {
  contractVersion: typeof ENTERPRISE_NURSING_CLINICAL_WORKSPACE_CONTRACT_VERSION;
  certificationId: typeof ENTERPRISE_NURSING_CLINICAL_WORKSPACE_CERTIFICATION_ID;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT" | "AMBULATORY";
  sections: EnterpriseNursingWorkspaceSectionDefinition[];
  documents: EnterpriseClinicalDocument[];
  nursingDocumentTypeCount: number;
  usesD4b1Lifecycle: true;
  independentNursingLifecycleEngine: false;
};

/**
 * Build a single-pass nursing workspace projection from already-loaded sources.
 * O(n) over notes + EDOC entries — no per-row network.
 */
export function buildEnterpriseNursingWorkspaceSummary(
  input: EnterpriseNursingWorkspaceSummaryInput
): EnterpriseNursingWorkspaceSummary {
  const documents: EnterpriseClinicalDocument[] = [];
  const docCareSetting = toEnterpriseClinicalDocumentCareSetting(input.careSetting);
  if (input.admission) {
    documents.push(
      adaptNursingAdmissionToEnterpriseClinicalDocument({
        ...input.admission,
        careSetting: docCareSetting,
        hospitalEpisodeId: input.hospitalEpisodeId,
      })
    );
  }
  if (input.reassessment) {
    documents.push(
      adaptNursingReassessmentToEnterpriseClinicalDocument({
        ...input.reassessment,
        careSetting: docCareSetting,
        hospitalEpisodeId: input.hospitalEpisodeId,
      })
    );
  }
  if (input.handoff) {
    documents.push(
      adaptNursingHandoffToEnterpriseClinicalDocument({
        ...input.handoff,
        careSetting: docCareSetting,
        hospitalEpisodeId: input.hospitalEpisodeId,
      })
    );
  }
  for (const note of input.notes ?? []) {
    if (String(note.noteType).toUpperCase() !== "NURSING") continue;
    documents.push(
      adaptEncounterNoteToEnterpriseClinicalDocument({
        ...note,
        careSetting: docCareSetting,
        hospitalEpisodeId: input.hospitalEpisodeId,
      })
    );
  }
  for (const entry of input.edocEntries ?? []) {
    documents.push(
      adaptEdocEntryToEnterpriseClinicalDocument({
        ...entry,
        careSetting: docCareSetting,
        hospitalEpisodeId: input.hospitalEpisodeId,
      })
    );
  }

  return {
    contractVersion: ENTERPRISE_NURSING_CLINICAL_WORKSPACE_CONTRACT_VERSION,
    certificationId: ENTERPRISE_NURSING_CLINICAL_WORKSPACE_CERTIFICATION_ID,
    careSetting: input.careSetting,
    sections: nursingWorkspaceSectionsForCareSetting(input.careSetting),
    documents,
    nursingDocumentTypeCount: ENTERPRISE_NURSING_DOCUMENT_TYPE_REGISTRY.length,
    usesD4b1Lifecycle: true,
    independentNursingLifecycleEngine: false,
  };
}

/** Explicit: fake rapid-reassessment panel must not be treated as durable. */
export const NURSING_RAPID_REASSESSMENT_PANEL_IS_DURABLE = false;
