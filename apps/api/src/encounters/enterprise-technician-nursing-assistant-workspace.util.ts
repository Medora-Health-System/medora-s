/**
 * MEDUI.D4B.3 — Thin Nest-facing technician / nursing-assistant workspace projection helpers.
 * Reuses D4B.1 adapters; does not expose unrestricted mutation.
 */

import {
  buildEnterpriseTechnicianWorkspaceSummary,
  classifyEncounterTypeToTechnicianCareSetting,
  resolveTechnicianRoleProfile,
  type EnterpriseTechnicianWorkspaceSummary,
  type EncounterNoteAdapterInput,
  type EdocEntryAdapterInput,
  type TechnicianTaskV1,
  type TechnicianVitalsContributionProjection,
  type TechnicianRoleProfile,
} from "@medora/shared";

export type TechnicianWorkspaceProjectionInput = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  encounterType?: string | null;
  careSetting?: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleCodes?: readonly string[];
  roleProfile?: TechnicianRoleProfile;
  hospitalEpisodeId?: string | null;
  notes?: ReadonlyArray<EncounterNoteAdapterInput>;
  edocEntries?: ReadonlyArray<EdocEntryAdapterInput>;
  tasks?: ReadonlyArray<TechnicianTaskV1>;
  vitalsContributions?: ReadonlyArray<TechnicianVitalsContributionProjection>;
};

export function projectEnterpriseTechnicianNursingAssistantWorkspace(
  input: TechnicianWorkspaceProjectionInput
): EnterpriseTechnicianWorkspaceSummary {
  const careSetting =
    input.careSetting ?? classifyEncounterTypeToTechnicianCareSetting(input.encounterType);
  const roleProfile =
    input.roleProfile ?? resolveTechnicianRoleProfile(input.roleCodes ?? ["PATIENT_CARE_TECH"]);
  return buildEnterpriseTechnicianWorkspaceSummary({
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    careSetting,
    roleProfile,
    hospitalEpisodeId: input.hospitalEpisodeId,
    notes: input.notes,
    edocEntries: input.edocEntries,
    tasks: input.tasks,
    vitalsContributions: input.vitalsContributions,
  });
}
