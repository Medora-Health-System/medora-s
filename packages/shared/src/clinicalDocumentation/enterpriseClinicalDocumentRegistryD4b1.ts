/**
 * MEDUI.D4B.1 — Document type registry (care setting + discipline governance).
 * Discipline designation does not grant authorization — Nest RBAC remains authoritative.
 */

import type {
  EnterpriseClinicalDocumentCareSetting,
  EnterpriseClinicalDocumentDiscipline,
} from "./enterpriseClinicalDocumentContractD4b1.js";

export type EnterpriseClinicalDocumentTypeDefinition = {
  documentTypeId: string;
  titleKey: string;
  templateVersion: string;
  allowedCareSettings: ReadonlyArray<EnterpriseClinicalDocumentCareSetting>;
  allowedDisciplines: ReadonlyArray<EnterpriseClinicalDocumentDiscipline>;
  requiredSignerDiscipline: EnterpriseClinicalDocumentDiscipline | null;
  cosignOptional: boolean;
  cosignRequiredByDefault: boolean;
  amendmentAllowed: boolean;
  printExportAllowed: boolean;
  supportsDraftEdit: boolean;
  sourceArchitecture:
    | "ENCOUNTER_NOTE"
    | "EDOC_ENTRY"
    | "PROVIDER_DOCUMENTATION_SHELL"
    | "NURSING_ADMISSION"
    | "REFERENCE_VIRTUAL";
};

/** Starter registry — expand in later D4B discipline phases. */
export const ENTERPRISE_CLINICAL_DOCUMENT_TYPE_REGISTRY: ReadonlyArray<EnterpriseClinicalDocumentTypeDefinition> =
  [
    {
      documentTypeId: "encounter_note.provider",
      titleKey: "enterpriseClinicalDocumentD4b1.documentTypes.encounterNoteProvider",
      templateVersion: "MEDNOTE.2",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT", "OUTPATIENT", "URGENT_CARE"],
      allowedDisciplines: ["PROVIDER"],
      requiredSignerDiscipline: "PROVIDER",
      cosignOptional: true,
      cosignRequiredByDefault: false,
      amendmentAllowed: true,
      printExportAllowed: true,
      supportsDraftEdit: false,
      sourceArchitecture: "ENCOUNTER_NOTE",
    },
    {
      documentTypeId: "encounter_note.nursing",
      titleKey: "enterpriseClinicalDocumentD4b1.documentTypes.encounterNoteNursing",
      templateVersion: "MEDNOTE.2",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT", "OUTPATIENT", "URGENT_CARE"],
      allowedDisciplines: ["NURSING"],
      requiredSignerDiscipline: "NURSING",
      cosignOptional: true,
      cosignRequiredByDefault: false,
      amendmentAllowed: true,
      printExportAllowed: true,
      supportsDraftEdit: false,
      sourceArchitecture: "ENCOUNTER_NOTE",
    },
    {
      documentTypeId: "encounter_note.technician",
      titleKey: "enterpriseClinicalDocumentD4b1.documentTypes.encounterNoteTechnician",
      templateVersion: "MEDNOTE.2",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT", "OUTPATIENT", "URGENT_CARE"],
      allowedDisciplines: ["TECHNICIAN"],
      requiredSignerDiscipline: "TECHNICIAN",
      cosignOptional: true,
      cosignRequiredByDefault: false,
      amendmentAllowed: true,
      printExportAllowed: true,
      supportsDraftEdit: false,
      sourceArchitecture: "ENCOUNTER_NOTE",
    },
    {
      documentTypeId: "edoc.structured_entry",
      titleKey: "enterpriseClinicalDocumentD4b1.documentTypes.edocStructuredEntry",
      templateVersion: "EDOC.REGISTRY",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      allowedDisciplines: ["NURSING", "TECHNICIAN", "PROVIDER", "OTHER"],
      requiredSignerDiscipline: null,
      cosignOptional: true,
      cosignRequiredByDefault: false,
      amendmentAllowed: false,
      printExportAllowed: true,
      supportsDraftEdit: false,
      sourceArchitecture: "EDOC_ENTRY",
    },
    {
      documentTypeId: "provider.documentation_shell",
      titleKey: "enterpriseClinicalDocumentD4b1.documentTypes.providerDocumentationShell",
      templateVersion: "PROVIDER_SHELL.1",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      allowedDisciplines: ["PROVIDER"],
      requiredSignerDiscipline: "PROVIDER",
      cosignOptional: false,
      cosignRequiredByDefault: false,
      amendmentAllowed: true,
      printExportAllowed: true,
      supportsDraftEdit: true,
      sourceArchitecture: "PROVIDER_DOCUMENTATION_SHELL",
    },
    {
      documentTypeId: "nursing.admission_assessment",
      titleKey: "enterpriseClinicalDocumentD4b1.documentTypes.nursingAdmission",
      templateVersion: "D4A.1",
      allowedCareSettings: ["INPATIENT", "OBSERVATION"],
      allowedDisciplines: ["NURSING"],
      requiredSignerDiscipline: "NURSING",
      cosignOptional: false,
      cosignRequiredByDefault: false,
      amendmentAllowed: true,
      printExportAllowed: true,
      supportsDraftEdit: true,
      sourceArchitecture: "NURSING_ADMISSION",
    },
  ];

export function getEnterpriseClinicalDocumentType(
  documentTypeId: string
): EnterpriseClinicalDocumentTypeDefinition | null {
  return (
    ENTERPRISE_CLINICAL_DOCUMENT_TYPE_REGISTRY.find((d) => d.documentTypeId === documentTypeId) ??
    null
  );
}

export function isDocumentTypeAllowedForCareSetting(
  documentTypeId: string,
  careSetting: EnterpriseClinicalDocumentCareSetting
): boolean {
  const def = getEnterpriseClinicalDocumentType(documentTypeId);
  if (!def) return false;
  return def.allowedCareSettings.includes(careSetting);
}

export function isDocumentTypeAllowedForDiscipline(
  documentTypeId: string,
  discipline: EnterpriseClinicalDocumentDiscipline
): boolean {
  const def = getEnterpriseClinicalDocumentType(documentTypeId);
  if (!def) return false;
  return def.allowedDisciplines.includes(discipline);
}

/**
 * Assignment does not equal authorization.
 * Registry only answers type/care-setting/discipline eligibility — Nest RBAC decides write rights.
 */
export function documentTypeEligibilitySummary(input: {
  documentTypeId: string;
  careSetting: EnterpriseClinicalDocumentCareSetting;
  discipline: EnterpriseClinicalDocumentDiscipline;
  assignedUserId?: string | null;
  actorUserId?: string | null;
}): {
  typeKnown: boolean;
  careSettingAllowed: boolean;
  disciplineAllowed: boolean;
  assignmentEqualsAuthorization: false;
  sameAssignedUser: boolean;
} {
  const def = getEnterpriseClinicalDocumentType(input.documentTypeId);
  return {
    typeKnown: def != null,
    careSettingAllowed: isDocumentTypeAllowedForCareSetting(
      input.documentTypeId,
      input.careSetting
    ),
    disciplineAllowed: isDocumentTypeAllowedForDiscipline(input.documentTypeId, input.discipline),
    assignmentEqualsAuthorization: false,
    sameAssignedUser:
      !!input.assignedUserId &&
      !!input.actorUserId &&
      input.assignedUserId === input.actorUserId,
  };
}
