import { BadRequestException } from "@nestjs/common";

/** Verrou après signature — ordres, triage, dossier clinique, parcours, etc. */
export const SIGNED_ENCOUNTER_MUTATION_BLOCKED_FR =
  "Modification impossible : l'évaluation médicale de cette consultation est signée.";

export function assertEncounterNotSigned(encounter: { providerDocumentationStatus?: string | null }) {
  if (encounter.providerDocumentationStatus === "SIGNED") {
    throw new BadRequestException(SIGNED_ENCOUNTER_MUTATION_BLOCKED_FR);
  }
}

/**
 * Verrou post-clôture — bloque toute mutation clinique sur une consultation terminée.
 *
 * After an encounter is CLOSED (or CANCELLED) it must behave as a terminal medico-legal
 * record: results, orders (lifecycle/cancel), MAR, triage, provider addenda, and any
 * other clinical mutation must be blocked unless the call is part of an explicitly
 * designed append-only post-close amendment workflow (none exists today).
 *
 * `workflowState === "CLOSED"` is checked as a defense-in-depth alias because the close
 * transaction sets both `status` and `workflowState` to CLOSED atomically.
 *
 * Intentionally allowed paths (must NOT use this helper):
 * - billing capture / billing finalization endpoints
 * - close encounter transaction itself
 * - read-only / acknowledgement-only flows that don't mutate clinical content
 */
export const CLOSED_ENCOUNTER_MUTATION_BLOCKED_FR =
  "Modification impossible : la consultation est terminée.";

export function assertEncounterOpenForClinicalMutation(encounter: {
  status?: string | null;
  workflowState?: string | null;
}) {
  if (encounter.status !== "OPEN") {
    throw new BadRequestException(CLOSED_ENCOUNTER_MUTATION_BLOCKED_FR);
  }
  if (encounter.workflowState === "CLOSED") {
    throw new BadRequestException(CLOSED_ENCOUNTER_MUTATION_BLOCKED_FR);
  }
}

/**
 * PATCH `/encounters/:id/operational` — fields: `roomLabel`, `physicianAssignedUserId`, `confirmInpatientTransfer`.
 *
 * When provider documentation is **SIGNED**:
 * - **Allowed** (same idea as PATCH `/encounters` allowlist): room + assigned physician — operational / trackboard only.
 * - **Blocked**: `confirmInpatientTransfer` — promotes EMERGENCY → INPATIENT (disposition / workflow); not permitted without unlock.
 */
export function assertOperationalUpdateAllowedWhenSigned(
  encounter: { providerDocumentationStatus?: string | null },
  data: { confirmInpatientTransfer?: boolean }
): void {
  if (encounter.providerDocumentationStatus !== "SIGNED") return;
  if (data.confirmInpatientTransfer === true) {
    throw new BadRequestException(SIGNED_ENCOUNTER_MUTATION_BLOCKED_FR);
  }
}
