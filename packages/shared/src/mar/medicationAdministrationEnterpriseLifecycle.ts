/** MEDUI.MEDICATION.ENTERPRISE_MEDICATION_ADMINISTRATION_SAFETY.1 */

import type {
  MedicationAdministrationLifecycleState,
  MedicationFollowUpType,
} from "./medicationFollowUpTypes.js";
import type { MarMedicationResponseFollowUpStatus } from "./marMedicationResponseFollowUpGovernance.js";

export type MedicationAdministrationLifecycleInput = {
  orderStatus?: string | null;
  pharmacyVerified?: boolean | null;
  doseStatus?: string | null;
  marAction?: string | null;
  clinicalAction?: string | null;
  followUpType: MedicationFollowUpType;
  followUpStatus?: MarMedicationResponseFollowUpStatus | null;
  responseCompleted?: boolean;
};

/** Map existing MAR/dose state into enterprise lifecycle — no parallel workflows. */
export function resolveMedicationAdministrationLifecycleState(
  input: MedicationAdministrationLifecycleInput
): MedicationAdministrationLifecycleState {
  const doseStatus = input.doseStatus?.trim().toUpperCase() ?? "";
  const marAction = input.marAction?.trim().toLowerCase() ?? "";
  const clinicalAction = input.clinicalAction?.trim().toUpperCase() ?? "";

  if (doseStatus === "COMPLETED" || marAction === "administered") {
    if (input.followUpType === "NONE") return "COMPLETED";
    if (input.responseCompleted || input.followUpStatus === "DOCUMENTED") return "COMPLETED";
    return "FOLLOW_UP_REQUIRED";
  }

  if (clinicalAction === "START_INFUSION" || doseStatus === "IN_PROGRESS") return "PREPARING";
  if (doseStatus === "DUE" || doseStatus === "OVERDUE") return "DUE";
  if (input.pharmacyVerified === false) return "ORDERED";
  if (input.pharmacyVerified === true) return "VERIFIED";
  return "ORDERED";
}

export function resolveMedicationAdministrationLifecycleLabelKey(
  state: MedicationAdministrationLifecycleState
): string {
  return `medicationAdministrationLifecycle.${state}`;
}
