import { BadRequestException } from "@nestjs/common";

/** Verrou après signature — ordres, triage, dossier clinique, parcours, etc. */
export const SIGNED_ENCOUNTER_MUTATION_BLOCKED_FR =
  "Modification impossible : l'évaluation médicale de cette consultation est signée.";

export function assertEncounterNotSigned(encounter: { providerDocumentationStatus?: string | null }) {
  if (encounter.providerDocumentationStatus === "SIGNED") {
    throw new BadRequestException(SIGNED_ENCOUNTER_MUTATION_BLOCKED_FR);
  }
}
