import { BadRequestException } from "@nestjs/common";
import { EncounterWorkflowState } from "@prisma/client";

/**
 * Explicit encounter pathway. `EncounterStatus` (OPEN/CLOSED/CANCELLED) remains the legal lifecycle;
 * this state machine governs safe progression of the visit.
 *
 * Terminal workflow state `CLOSED` must match successful encounter closure (see `EncountersService.close`).
 */
export const ENCOUNTER_WORKFLOW_TRANSITIONS: Record<
  EncounterWorkflowState,
  readonly EncounterWorkflowState[]
> = {
  [EncounterWorkflowState.ARRIVED]: [EncounterWorkflowState.TRIAGE],
  [EncounterWorkflowState.TRIAGE]: [EncounterWorkflowState.IN_TREATMENT],
  [EncounterWorkflowState.IN_TREATMENT]: [
    EncounterWorkflowState.RESULTS_PENDING,
    EncounterWorkflowState.DISPOSITION,
  ],
  [EncounterWorkflowState.RESULTS_PENDING]: [
    EncounterWorkflowState.IN_TREATMENT,
    EncounterWorkflowState.DISPOSITION,
  ],
  [EncounterWorkflowState.DISPOSITION]: [EncounterWorkflowState.DISCHARGE_READY],
  [EncounterWorkflowState.DISCHARGE_READY]: [EncounterWorkflowState.FINALIZED],
  /** Terminal clinically — `CLOSED` is applied only by `EncountersService.close()` with `EncounterStatus.CLOSED`. */
  [EncounterWorkflowState.FINALIZED]: [],
  [EncounterWorkflowState.CLOSED]: [],
};

export function assertValidEncounterWorkflowTransition(
  from: EncounterWorkflowState,
  to: EncounterWorkflowState
): void {
  if (from === to) {
    return;
  }
  const allowed = ENCOUNTER_WORKFLOW_TRANSITIONS[from] ?? [];
  if (!(allowed as EncounterWorkflowState[]).includes(to)) {
    throw new BadRequestException(
      `Transition de parcours interdite : ${from} → ${to}.`
    );
  }
}
