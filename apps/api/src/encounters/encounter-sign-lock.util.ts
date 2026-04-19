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
