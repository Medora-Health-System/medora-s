import { BadRequestException } from "@nestjs/common";

export function assertEncounterNotSigned(encounter: { providerDocumentationStatus?: string | null }) {
  if (encounter.providerDocumentationStatus === "SIGNED") {
    throw new BadRequestException("Impossible de modifier les ordres : évaluation médicale déjà signée");
  }
}
