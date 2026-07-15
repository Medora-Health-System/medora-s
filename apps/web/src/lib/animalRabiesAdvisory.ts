/**
 * Shared rabies advisory prompts for animal exposures only.
 * Must never be applied to human bites.
 * Advisory / public-health consultation only — never auto-orders vaccine or RIG.
 */

export type RabiesSpeciesRisk =
  | "dog"
  | "cat"
  | "bat"
  | "raccoon"
  | "skunk"
  | "fox"
  | "other_wild_mammal"
  | "livestock"
  | "rodent"
  | "bird"
  | "reptile"
  | "unknown"
  | "other";

export type RabiesAdvisoryInput = {
  species?: RabiesSpeciesRisk;
  animalAvailable?: boolean;
  provoked?: boolean | "unknown";
  vaccinationStatusKnown?: boolean;
  priorRabiesVaccine?: boolean;
  immunocompromised?: boolean;
  mucosalExposure?: boolean;
  isHumanBite?: boolean;
};

export type RabiesAdvisoryPrompt = {
  id: string;
  text: string;
  autoOrder: false;
};

/** Human bites never receive rabies advisory content. */
export function rabiesAdvisoryApplies(input: RabiesAdvisoryInput): boolean {
  if (input.isHumanBite) return false;
  return true;
}

export function buildRabiesAdvisoryPrompts(input: RabiesAdvisoryInput): RabiesAdvisoryPrompt[] {
  if (!rabiesAdvisoryApplies(input)) return [];
  const prompts: RabiesAdvisoryPrompt[] = [
    {
      id: "species_and_context",
      text: "Document animal species, ownership (owned/stray/wild), availability for observation or testing, and exposure type.",
      autoOrder: false,
    },
    {
      id: "public_health",
      text: "Follow local public-health and animal-control guidance; jurisdiction-specific recommendations may apply.",
      autoOrder: false,
    },
  ];
  if (input.species === "bat" || input.species === "raccoon" || input.species === "skunk" || input.species === "fox") {
    prompts.push({
      id: "high_concern_species",
      text: "Species associated with elevated rabies concern in many jurisdictions; arrange public-health consultation.",
      autoOrder: false,
    });
  }
  if (input.animalAvailable === false) {
    prompts.push({
      id: "unavailable_animal",
      text: "Animal unavailable for observation or testing; escalate public-health review.",
      autoOrder: false,
    });
  }
  if (input.mucosalExposure) {
    prompts.push({
      id: "mucosal",
      text: "Mucosal or high-risk exposure documented; clinician and public-health review required.",
      autoOrder: false,
    });
  }
  prompts.push({
    id: "no_auto_order",
    text: "Do not auto-order rabies vaccine or immunoglobulin; document indication, administration, or decline only when clinician-directed.",
    autoOrder: false,
  });
  return prompts;
}
