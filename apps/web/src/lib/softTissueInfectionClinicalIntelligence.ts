/**
 * Phase 13 — cellulitis / soft tissue infection clinical documentation context. Mirrors
 * `entThroatNeckAirwayClinicalIntelligence.ts` (Phase 12). Documentation advisory only —
 * never establishes a diagnosis, disposition, antibiotic order, I&D, admission, transfer,
 * or consult. Ownership of the actual clinical decision stays with the treating clinician.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveSoftTissueWoundInfectionRedFlags,
  type SoftTissueWoundInfectionRedFlagInput,
} from "./softTissueWoundInfectionRedFlagEngine";

export type SoftTissueInfectionBranch =
  | "nonpurulent_cellulitis"
  | "erysipelas"
  | "lymphangitis"
  | "infected_wound"
  | "infected_ulcer"
  | "postoperative_cellulitis"
  | "diabetic_foot_infection_concern"
  | "pressure_injury_infection_concern"
  | "immunocompromised_infection"
  | "systemic_infection_concern"
  | "necrotizing_infection_concern";

export type SoftTissueInfectionContext = {
  branches: SoftTissueInfectionBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveSoftTissueWoundInfectionRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** High-acuity branches (necrotizing, systemic toxicity, diabetic limb-threat) that withhold routine discharge unless documented as post-acute follow-up. */
const HIGH_ACUITY_LOCK: readonly SoftTissueInfectionBranch[] = [
  "necrotizing_infection_concern",
  "systemic_infection_concern",
  "diabetic_foot_infection_concern",
];

export const SOFT_TISSUE_INFECTION_DISCHARGE_FAMILY: Record<SoftTissueInfectionBranch, string> = {
  nonpurulent_cellulitis: "nonpurulent_cellulitis_followup",
  erysipelas: "erysipelas_followup",
  lymphangitis: "lymphangitis_followup",
  infected_wound: "infected_wound_followup",
  infected_ulcer: "infected_ulcer_followup",
  postoperative_cellulitis: "postoperative_cellulitis_followup",
  diabetic_foot_infection_concern: "diabetic_foot_infection_followup",
  pressure_injury_infection_concern: "pressure_injury_infection_followup",
  immunocompromised_infection: "immunocompromised_infection_followup",
  systemic_infection_concern: "systemic_infection_concern_followup",
  necrotizing_infection_concern: "necrotizing_infection_concern_followup",
};

/** Documentation advisory only. Never establishes a diagnosis, antibiotic order, or disposition. */
export function resolveSoftTissueInfectionContext(
  input: SoftTissueWoundInfectionRedFlagInput
): SoftTissueInfectionContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: SoftTissueInfectionBranch[] = [];

  const redFlags = resolveSoftTissueWoundInfectionRedFlags(input);
  const hasNecrotizingRedFlag =
    redFlags.categories.includes("necrotizing_soft_tissue_infection") ||
    redFlags.categories.includes("gas_gangrene") ||
    redFlags.categories.includes("fournier_gangrene");
  if (
    hasNecrotizingRedFlag ||
    /necrotizing (soft tissue|infection)|pain out of proportion|flesh.eating|rapidly progressive (skin|soft tissue) (necrosis|infection)/.test(
      text
    )
  ) {
    branches.push("necrotizing_infection_concern");
  }

  if (/erysipelas/.test(text)) branches.push("erysipelas");
  else if (/nonpurulent cellulitis|cellulitis(?! .*(abscess|purulent))/.test(text)) branches.push("nonpurulent_cellulitis");

  if (/lymphangitis|red streak(ing)? (toward|extending toward) (the )?(trunk|proximally)/.test(text)) {
    branches.push("lymphangitis");
  }
  if (/infected (wound|laceration)|wound infection/.test(text)) branches.push("infected_wound");
  if (/infected ulcer|ulcer infection|chronic wound infection/.test(text)) branches.push("infected_ulcer");
  if (/postoperative cellulitis|surgical site infection|post.?op(erative)? wound (redness|infection)/.test(text)) {
    branches.push("postoperative_cellulitis");
  }
  if (/diabetic foot (infection|ulcer)/.test(text)) branches.push("diabetic_foot_infection_concern");
  if (/pressure (injury|ulcer|sore) infection|decubitus ulcer infection/.test(text)) {
    branches.push("pressure_injury_infection_concern");
  }
  if (/immunocompromised|on chemotherapy|neutropenic|immunosuppressed/.test(text)) {
    branches.push("immunocompromised_infection");
  }

  const hasSystemicRedFlag = redFlags.categories.includes("systemic_toxicity_sepsis");
  if (
    hasSystemicRedFlag ||
    /systemic toxicity|toxic appearing|sepsis concern|hypotension with (skin|soft tissue|wound) infection/.test(text)
  ) {
    branches.push("systemic_infection_concern");
  }

  const isFollowUpContext = /follow[- ]?up|recheck|known (stable|resolving)|interval exam|post-?operative check/.test(text);
  const isHighAcuityLocked = branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch));

  const dischargeFamilyId = isHighAcuityLocked
    ? isFollowUpContext
      ? highAcuityFollowUpFamily(branches)
      : null
    : branches.includes("immunocompromised_infection")
    ? SOFT_TISSUE_INFECTION_DISCHARGE_FAMILY.immunocompromised_infection
    : branches.includes("pressure_injury_infection_concern")
    ? SOFT_TISSUE_INFECTION_DISCHARGE_FAMILY.pressure_injury_infection_concern
    : branches.includes("postoperative_cellulitis")
    ? SOFT_TISSUE_INFECTION_DISCHARGE_FAMILY.postoperative_cellulitis
    : branches.includes("infected_ulcer")
    ? SOFT_TISSUE_INFECTION_DISCHARGE_FAMILY.infected_ulcer
    : branches.includes("infected_wound")
    ? SOFT_TISSUE_INFECTION_DISCHARGE_FAMILY.infected_wound
    : branches.includes("lymphangitis")
    ? SOFT_TISSUE_INFECTION_DISCHARGE_FAMILY.lymphangitis
    : branches.includes("erysipelas")
    ? SOFT_TISSUE_INFECTION_DISCHARGE_FAMILY.erysipelas
    : branches.includes("nonpurulent_cellulitis")
    ? SOFT_TISSUE_INFECTION_DISCHARGE_FAMILY.nonpurulent_cellulitis
    : null;

  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

function highAcuityFollowUpFamily(branches: readonly SoftTissueInfectionBranch[]): string {
  if (branches.includes("necrotizing_infection_concern")) {
    return SOFT_TISSUE_INFECTION_DISCHARGE_FAMILY.necrotizing_infection_concern;
  }
  if (branches.includes("systemic_infection_concern")) {
    return SOFT_TISSUE_INFECTION_DISCHARGE_FAMILY.systemic_infection_concern;
  }
  if (branches.includes("diabetic_foot_infection_concern")) {
    return SOFT_TISSUE_INFECTION_DISCHARGE_FAMILY.diabetic_foot_infection_concern;
  }
  return "soft_tissue_infection_high_acuity_followup";
}

const BRANCH_PRIORITY: Record<string, number> = {
  necrotizing_soft_tissue_infection: 100,
  necrotizing_infection_concern: 100,
  gas_gangrene: 98,
  fournier_gangrene: 96,
  systemic_toxicity_sepsis: 92,
  systemic_infection_concern: 92,
  diabetic_foot_limb_threat: 88,
  diabetic_foot_infection_concern: 80,
  immunocompromised_infection: 60,
  pressure_injury_infection_concern: 45,
  postoperative_cellulitis: 40,
  lymphangitis: 38,
  infected_ulcer: 35,
  infected_wound: 30,
  erysipelas: 20,
  nonpurulent_cellulitis: 10,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis, antibiotic order, or disposition. */
export function adaptSoftTissueInfectionIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<SoftTissueInfectionContext, "branches" | "redFlagCategories">
): ProviderDocumentationComplaintIntelligence {
  const weightedHints = [
    ...context.redFlagCategories.map((value) => ({ hint: value.replace(/_/g, " "), weight: BRANCH_PRIORITY[value] ?? 85 })),
    ...context.branches.map((value) => ({ hint: value.replace(/_/g, " "), weight: BRANCH_PRIORITY[value] ?? 40 })),
  ];
  const score = (key: string) => {
    const compactKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    let best = 0;
    for (const { hint, weight } of weightedHints) {
      const compactHint = hint.replace(/[^a-z0-9]/g, "");
      if (compactKey.includes(compactHint)) {
        best = Math.max(best, weight);
      }
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
