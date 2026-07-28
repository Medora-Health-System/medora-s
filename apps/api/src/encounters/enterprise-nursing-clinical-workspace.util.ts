/**
 * MEDUI.D4B.2 — Thin Nest-facing nursing workspace projection helpers.
 * Reuses D4B.1 adapters; does not expose unrestricted mutation.
 */

import {
  buildEnterpriseNursingWorkspaceSummary,
  classifyEncounterTypeToNursingCareSetting,
  type EnterpriseNursingWorkspaceSummary,
  type NursingAdmissionAdapterInput,
  type NursingHandoffProjectionInput,
  type NursingReassessmentProjectionInput,
  type EncounterNoteAdapterInput,
  type EdocEntryAdapterInput,
} from "@medora/shared";

export type NursingWorkspaceProjectionInput = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  encounterType?: string | null;
  careSetting?: "EMERGENCY" | "OBSERVATION" | "INPATIENT" | "AMBULATORY";
  hospitalEpisodeId?: string | null;
  admission?: NursingAdmissionAdapterInput | null;
  reassessment?: NursingReassessmentProjectionInput | null;
  handoff?: NursingHandoffProjectionInput | null;
  notes?: ReadonlyArray<EncounterNoteAdapterInput>;
  edocEntries?: ReadonlyArray<EdocEntryAdapterInput>;
};

export function projectEnterpriseNursingClinicalWorkspace(
  input: NursingWorkspaceProjectionInput
): EnterpriseNursingWorkspaceSummary {
  const careSetting =
    input.careSetting ?? classifyEncounterTypeToNursingCareSetting(input.encounterType);
  return buildEnterpriseNursingWorkspaceSummary({
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    careSetting,
    hospitalEpisodeId: input.hospitalEpisodeId,
    admission: input.admission,
    reassessment: input.reassessment,
    handoff: input.handoff,
    notes: input.notes,
    edocEntries: input.edocEntries,
  });
}
