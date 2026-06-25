/** MEDUI.MAR.MEDICATION_RESPONSE_POST_SUBMIT_UX_FINALIZATION.1 */

export type MedicationResponsePanelState =
  | "NEEDS_RESPONSE"
  | "EDITING_RESPONSE"
  | "RESPONSE_SUBMITTED"
  | "ADDING_ADDITIONAL_RESPONSE";

export type MedicationResponsePanelStateInput = {
  responseCount: number;
  expanded: boolean;
  addingAdditional: boolean;
};

export function resolveMedicationResponsePanelState(
  input: MedicationResponsePanelStateInput
): MedicationResponsePanelState {
  if (input.responseCount <= 0) {
    return input.expanded ? "EDITING_RESPONSE" : "NEEDS_RESPONSE";
  }
  if (input.addingAdditional) return "ADDING_ADDITIONAL_RESPONSE";
  return "RESPONSE_SUBMITTED";
}

export function shouldShowMedicationResponseForm(state: MedicationResponsePanelState): boolean {
  return state === "EDITING_RESPONSE" || state === "ADDING_ADDITIONAL_RESPONSE";
}

export function shouldShowMedicationResponseSubmitButton(
  state: MedicationResponsePanelState
): boolean {
  return shouldShowMedicationResponseForm(state);
}

export function shouldShowAddAdditionalResponseButton(
  state: MedicationResponsePanelState,
  canDocument: boolean
): boolean {
  return canDocument && state === "RESPONSE_SUBMITTED";
}

export function shouldDefaultExpandMedicationResponsePanel(input: {
  responseCount: number;
  visibilityRecommended: boolean;
  awaitingReassessment: boolean;
  responseOverdue: boolean;
}): boolean {
  if (input.responseCount > 0) return false;
  return (
    input.visibilityRecommended || input.awaitingReassessment || input.responseOverdue
  );
}
