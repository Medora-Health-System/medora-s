import {
  projectEnterpriseEncounterListLifecycle,
  projectEnterprisePatientEncounterIndex,
  patientPageMustNotEmbedClosedClinicalRecord,
  D4C8C_CERTIFICATION_ID,
  type EnterpriseEncounterListLifecycleInput,
  type EnterprisePatientEncounterIndexInput,
} from "@medora/shared";

export type EncounterListLifecycleProjection = EnterpriseEncounterListLifecycleInput;

/** MEDUI.D4C.8.1 / D4C.8A: lifecycle closure projected only from Encounter.status. */
export function projectEncounterListLifecycle(encounter: EncounterListLifecycleProjection) {
  return projectEnterpriseEncounterListLifecycle(encounter);
}

/** MEDUI.D4C.8C / D4C.9: patient encounter index — OPERATE vs HISTORICAL READ for Dental. */
export function projectPatientEncounterIndexRow(
  encounter: EnterprisePatientEncounterIndexInput,
  options?: { dentalCareEnabled?: boolean }
) {
  return projectEnterprisePatientEncounterIndex(encounter, options);
}

export { patientPageMustNotEmbedClosedClinicalRecord, D4C8C_CERTIFICATION_ID };
