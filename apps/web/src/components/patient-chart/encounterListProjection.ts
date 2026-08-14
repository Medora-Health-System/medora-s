import {
  projectEnterpriseEncounterListLifecycle,
  type EnterpriseEncounterListLifecycleInput,
} from "@medora/shared";

export type EncounterListLifecycleProjection = EnterpriseEncounterListLifecycleInput;

/** MEDUI.D4C.8.1 / D4C.8A: lifecycle closure projected only from Encounter.status. */
export function projectEncounterListLifecycle(encounter: EncounterListLifecycleProjection) {
  return projectEnterpriseEncounterListLifecycle(encounter);
}
