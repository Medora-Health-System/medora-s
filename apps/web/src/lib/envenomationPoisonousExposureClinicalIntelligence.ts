/**
 * Phase 16 (Commit 1) — envenomation / poisonous exposure clinical documentation context.
 * Preserves ordinary animal-bite ownership for nonvenomous bites. Never recommends cutting,
 * suction, ice, or tight tourniquets. Antivenom remains MAR-owned if administered.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveToxicologyToxidromeRedFlags,
  type ToxicologyToxidromeRedFlagInput,
} from "./toxicologyToxidromeRedFlagEngine";

export type EnvenomationPoisonousExposureBranch =
  | "snake_envenomation"
  | "spider_envenomation"
  | "scorpion_envenomation"
  | "marine_envenomation"
  | "mushroom_plant"
  | "pesticide_organophosphate"
  | "unknown_venomous"
  | "other";

export type EnvenomationPoisonousExposureContext = {
  branches: EnvenomationPoisonousExposureBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveToxicologyToxidromeRedFlags>["categories"];
  forbidsCuttingSuctionIceTightTourniquet: true;
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const HIGH_ACUITY_LOCK: readonly EnvenomationPoisonousExposureBranch[] = [
  "snake_envenomation",
  "pesticide_organophosphate",
];

export const ENVENOMATION_POISONOUS_DISCHARGE_FAMILY: Record<
  EnvenomationPoisonousExposureBranch,
  string | null
> = {
  snake_envenomation: "snake_envenomation_post_acute_v1",
  spider_envenomation: "spider_envenomation_v1",
  scorpion_envenomation: "scorpion_envenomation_v1",
  marine_envenomation: "marine_envenomation_v1",
  mushroom_plant: "poison_control_followup_v1",
  pesticide_organophosphate: "pesticide_exposure_post_acute_v1",
  unknown_venomous: "poison_control_followup_v1",
  other: "low_risk_toxic_exposure_v1",
};

/** Documentation advisory only. Ordinary nonvenomous animal bites stay bite-owned. */
export function resolveEnvenomationPoisonousExposureContext(
  input: ToxicologyToxidromeRedFlagInput
): EnvenomationPoisonousExposureContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: EnvenomationPoisonousExposureBranch[] = [];
  const redFlags = resolveToxicologyToxidromeRedFlags(input);

  // Do not claim ordinary dog/cat/human bites without venomous language.
  const ordinaryBiteOnly =
    /\b(dog|cat|human) bite\b/.test(text) &&
    !/venom|envenom|snake|spider|scorpion|marine toxin|black widow|brown recluse/.test(text);

  if (!ordinaryBiteOnly) {
    if (
      redFlags.categories.includes("severe_envenomation") ||
      /snake (bite|envenomation)|venomous snake|\bt63\.0/.test(text)
    ) {
      branches.push("snake_envenomation");
    }
    if (/spider (bite|envenomation)|black widow|brown recluse|\bt63\.3/.test(text)) {
      branches.push("spider_envenomation");
    }
    if (/scorpion (sting|envenomation)|\bt63\.2/.test(text)) branches.push("scorpion_envenomation");
    if (/marine (envenomation|toxin)|jellyfish|stingray|lionfish|cone snail|\bt63\.5|\bt63\.6/.test(text)) {
      branches.push("marine_envenomation");
    }
  }

  if (/mushroom (poisoning|ingestion|toxicity)|toxic plant|plant poisoning|\bt62/.test(text)) {
    branches.push("mushroom_plant");
  }
  if (
    redFlags.categories.includes("cholinergic_organophosphate") ||
    /organophosphate|pesticide (poisoning|exposure)|carbamate (poisoning|toxicity)|\bt60/.test(text)
  ) {
    branches.push("pesticide_organophosphate");
  }
  if (/unknown venomous|unknown envenomation|venomous exposure unknown/.test(text)) {
    branches.push("unknown_venomous");
  }

  if (branches.length === 0 && /envenom|venom|poisonous|toxin exposure/.test(text) && !ordinaryBiteOnly) {
    branches.push("other");
  }
  if (branches.length === 0) branches.push("other");

  const systemicSnake =
    branches.includes("snake_envenomation") &&
    /coagulopathy|systemic|hypotension|neurotoxicity|compartment|necrosis|bleeding/.test(text);
  const severeOrganophosphate =
    branches.includes("pesticide_organophosphate") &&
    (/bronchorrhea|seizure|fasciculation|respiratory failure|weakness/.test(text) ||
      redFlags.categories.includes("cholinergic_organophosphate"));
  const isFollowUpContext = /follow[- ]?up|post-?acute|post.?observation|known (stable|resolving)/.test(text);
  const isHighAcuityLocked =
    (branches.includes("snake_envenomation") && systemicSnake) ||
    (branches.includes("pesticide_organophosphate") && severeOrganophosphate) ||
    branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch) && /unstable|shock|coma|respiratory failure/.test(text));

  const pickFamily = (): string | null => {
    if (ordinaryBiteOnly) return null;
    if (isHighAcuityLocked && !isFollowUpContext) return null;
    if (branches.includes("snake_envenomation")) {
      return isFollowUpContext || !systemicSnake
        ? ENVENOMATION_POISONOUS_DISCHARGE_FAMILY.snake_envenomation
        : null;
    }
    if (branches.includes("pesticide_organophosphate")) {
      return isFollowUpContext || !severeOrganophosphate
        ? ENVENOMATION_POISONOUS_DISCHARGE_FAMILY.pesticide_organophosphate
        : null;
    }
    if (branches.includes("spider_envenomation")) return ENVENOMATION_POISONOUS_DISCHARGE_FAMILY.spider_envenomation;
    if (branches.includes("scorpion_envenomation")) {
      return ENVENOMATION_POISONOUS_DISCHARGE_FAMILY.scorpion_envenomation;
    }
    if (branches.includes("marine_envenomation")) return ENVENOMATION_POISONOUS_DISCHARGE_FAMILY.marine_envenomation;
    if (branches.includes("mushroom_plant")) return ENVENOMATION_POISONOUS_DISCHARGE_FAMILY.mushroom_plant;
    if (branches.includes("unknown_venomous")) return ENVENOMATION_POISONOUS_DISCHARGE_FAMILY.unknown_venomous;
    return ENVENOMATION_POISONOUS_DISCHARGE_FAMILY.other;
  };

  return {
    branches: [...new Set(branches)],
    dischargeFamilyId: pickFamily(),
    redFlagCategories: redFlags.categories,
    forbidsCuttingSuctionIceTightTourniquet: true,
  };
}

const BRANCH_PRIORITY: Record<string, number> = {
  severe_envenomation: 100,
  snake_envenomation: 95,
  cholinergic_organophosphate: 92,
  pesticide_organophosphate: 90,
  spider_envenomation: 70,
  scorpion_envenomation: 68,
  marine_envenomation: 65,
  mushroom_plant: 55,
  unknown_venomous: 50,
  other: 0,
};

export function adaptEnvenomationPoisonousExposureIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<EnvenomationPoisonousExposureContext, "branches" | "redFlagCategories">
): ProviderDocumentationComplaintIntelligence {
  const weightedHints = [
    ...context.redFlagCategories.map((value) => ({
      hint: value.replace(/_/g, " "),
      weight: BRANCH_PRIORITY[value] ?? 85,
    })),
    ...context.branches.map((value) => ({
      hint: value.replace(/_/g, " "),
      weight: BRANCH_PRIORITY[value] ?? 40,
    })),
  ];
  const score = (key: string) => {
    const compactKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    let best = 0;
    for (const { hint, weight } of weightedHints) {
      const compactHint = hint.replace(/[^a-z0-9]/g, "");
      if (compactKey.includes(compactHint)) best = Math.max(best, weight);
    }
    return best;
  };
  const prioritize = (keys?: string[]) => keys?.slice().sort((a, b) => score(b) - score(a));
  return {
    ...intel,
    hpi: prioritize(intel.hpi),
    rosRedFlags: prioritize(intel.rosRedFlags),
    mdmPlanSummary: prioritize(intel.mdmPlanSummary),
  };
}
