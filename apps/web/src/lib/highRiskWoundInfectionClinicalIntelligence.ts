/**
 * Phase 13 — high-risk wound / deep soft tissue infection clinical documentation context.
 * Mirrors `entThroatNeckAirwayClinicalIntelligence.ts` (Phase 12). Documentation advisory
 * only — never establishes a diagnosis, disposition, antibiotic order, I&D, admission,
 * transfer, or consult. Ownership of the actual clinical decision (surgical intervention,
 * consult, admit) stays with the treating clinician.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveSoftTissueWoundInfectionRedFlags,
  type SoftTissueWoundInfectionRedFlagInput,
} from "./softTissueWoundInfectionRedFlagEngine";

export type HighRiskWoundInfectionBranch =
  | "infected_traumatic_wound"
  | "deep_space_hand"
  | "infectious_tenosynovitis"
  | "necrotizing_infection"
  | "pyomyositis"
  | "gas_forming_infection"
  | "postoperative_wound_complication"
  | "wound_dehiscence"
  | "diabetic_ischemic_ulcer_infection"
  | "water_farm_contamination"
  | "foreign_body_associated_infection"
  | "osteomyelitis_septic_joint_concern";

export type HighRiskWoundInfectionContext = {
  branches: HighRiskWoundInfectionBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveSoftTissueWoundInfectionRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Limb-/NSTI-/dehiscence-threatening branches that must never fall through to a routine discharge family without explicit follow-up context. */
const HIGH_RISK_LOCK: readonly HighRiskWoundInfectionBranch[] = [
  "deep_space_hand",
  "infectious_tenosynovitis",
  "necrotizing_infection",
  "pyomyositis",
  "gas_forming_infection",
  "wound_dehiscence",
  "diabetic_ischemic_ulcer_infection",
  "osteomyelitis_septic_joint_concern",
];

export const HIGH_RISK_WOUND_INFECTION_DISCHARGE_FAMILY: Record<HighRiskWoundInfectionBranch, string> = {
  infected_traumatic_wound: "infected_traumatic_wound_followup",
  deep_space_hand: "deep_space_hand_infection_followup",
  infectious_tenosynovitis: "infectious_tenosynovitis_followup",
  necrotizing_infection: "necrotizing_infection_followup",
  pyomyositis: "pyomyositis_followup",
  gas_forming_infection: "gas_forming_infection_followup",
  postoperative_wound_complication: "postoperative_wound_complication_followup",
  wound_dehiscence: "wound_dehiscence_followup",
  diabetic_ischemic_ulcer_infection: "diabetic_ischemic_ulcer_infection_followup",
  water_farm_contamination: "water_farm_contamination_followup",
  foreign_body_associated_infection: "foreign_body_associated_infection_followup",
  osteomyelitis_septic_joint_concern: "osteomyelitis_septic_joint_concern_followup",
};

/** True whenever a documented branch is limb-/life-threatening (NSTI, gas-forming, dehiscence, deep space hand, tenosynovitis, pyomyositis, osteomyelitis/septic joint, ischemic diabetic ulcer). */
function isHighRiskPresentation(
  branches: readonly HighRiskWoundInfectionBranch[],
  hasLimbOrLifeThreateningRedFlag: boolean
): boolean {
  return branches.some((branch) => HIGH_RISK_LOCK.includes(branch)) || hasLimbOrLifeThreateningRedFlag;
}

/** Documentation advisory only. Never establishes a diagnosis, antibiotic order, I&D, or disposition. */
export function resolveHighRiskWoundInfectionContext(
  input: SoftTissueWoundInfectionRedFlagInput
): HighRiskWoundInfectionContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: HighRiskWoundInfectionBranch[] = [];

  const redFlags = resolveSoftTissueWoundInfectionRedFlags(input);

  if (
    redFlags.categories.includes("necrotizing_soft_tissue_infection") ||
    redFlags.categories.includes("fournier_gangrene") ||
    /necrotizing (soft tissue|fasciitis)|flesh.eating|pain out of proportion/.test(text)
  ) {
    branches.push("necrotizing_infection");
  }
  if (redFlags.categories.includes("gas_gangrene") || /gas gangrene|gas.forming infection|crepitus/.test(text)) {
    branches.push("gas_forming_infection");
  }
  if (redFlags.categories.includes("deep_space_hand_infection") || /deep space (hand )?infection|palmar space infection/.test(text)) {
    branches.push("deep_space_hand");
  }
  if (redFlags.categories.includes("flexor_tenosynovitis") || /flexor tenosynovitis|infectious tenosynovitis|kanavel sign/.test(text)) {
    branches.push("infectious_tenosynovitis");
  }
  if (/pyomyositis|infectious myositis|intramuscular abscess/.test(text)) branches.push("pyomyositis");
  if (
    redFlags.categories.includes("fascial_dehiscence_evisceration") ||
    /wound dehiscence|fascial dehiscence|evisceration/.test(text)
  ) {
    branches.push("wound_dehiscence");
  }
  if (/postoperative wound (complication|breakdown)|surgical site (breakdown|complication)/.test(text)) {
    branches.push("postoperative_wound_complication");
  }
  if (
    redFlags.categories.includes("diabetic_foot_limb_threat") ||
    /diabetic (ischemic )?ulcer infection|ischemic diabetic (foot|ulcer)/.test(text)
  ) {
    branches.push("diabetic_ischemic_ulcer_infection");
  }
  if (/freshwater exposure|saltwater exposure|farm exposure|soil contamination|animal exposure with wound/.test(text)) {
    branches.push("water_farm_contamination");
  }
  if (/retained foreign body|foreign body (associated|related) infection|rusty (nail|metal)/.test(text)) {
    branches.push("foreign_body_associated_infection");
  }
  if (
    redFlags.categories.includes("osteomyelitis_concern") ||
    redFlags.categories.includes("septic_arthritis_concern") ||
    /osteomyelitis|septic (arthritis|joint)/.test(text)
  ) {
    branches.push("osteomyelitis_septic_joint_concern");
  }
  if (
    branches.length === 0 &&
    /infected (traumatic )?wound|traumatic wound infection|contaminated wound infection/.test(text)
  ) {
    branches.push("infected_traumatic_wound");
  }

  const isFollowUpContext = /follow[- ]?up|recheck|known (stable|resolving)|interval exam|post-?operative check/.test(text);
  const hasLimbOrLifeThreateningRedFlag =
    redFlags.categories.includes("necrotizing_soft_tissue_infection") ||
    redFlags.categories.includes("gas_gangrene") ||
    redFlags.categories.includes("fournier_gangrene") ||
    redFlags.categories.includes("fascial_dehiscence_evisceration") ||
    redFlags.categories.includes("systemic_toxicity_sepsis") ||
    redFlags.categories.includes("deep_space_hand_infection") ||
    redFlags.categories.includes("flexor_tenosynovitis") ||
    redFlags.categories.includes("diabetic_foot_limb_threat");
  const isHighRiskLocked = isHighRiskPresentation(branches, hasLimbOrLifeThreateningRedFlag);

  const dischargeFamilyId = isHighRiskLocked
    ? isFollowUpContext
      ? highRiskFollowUpFamily(branches)
      : null
    : branches.includes("foreign_body_associated_infection")
    ? HIGH_RISK_WOUND_INFECTION_DISCHARGE_FAMILY.foreign_body_associated_infection
    : branches.includes("water_farm_contamination")
    ? HIGH_RISK_WOUND_INFECTION_DISCHARGE_FAMILY.water_farm_contamination
    : branches.includes("postoperative_wound_complication")
    ? HIGH_RISK_WOUND_INFECTION_DISCHARGE_FAMILY.postoperative_wound_complication
    : branches.includes("infected_traumatic_wound")
    ? HIGH_RISK_WOUND_INFECTION_DISCHARGE_FAMILY.infected_traumatic_wound
    : null;

  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

function highRiskFollowUpFamily(branches: readonly HighRiskWoundInfectionBranch[]): string {
  if (branches.includes("necrotizing_infection")) return HIGH_RISK_WOUND_INFECTION_DISCHARGE_FAMILY.necrotizing_infection;
  if (branches.includes("gas_forming_infection")) return HIGH_RISK_WOUND_INFECTION_DISCHARGE_FAMILY.gas_forming_infection;
  if (branches.includes("wound_dehiscence")) return HIGH_RISK_WOUND_INFECTION_DISCHARGE_FAMILY.wound_dehiscence;
  if (branches.includes("deep_space_hand")) return HIGH_RISK_WOUND_INFECTION_DISCHARGE_FAMILY.deep_space_hand;
  if (branches.includes("infectious_tenosynovitis")) return HIGH_RISK_WOUND_INFECTION_DISCHARGE_FAMILY.infectious_tenosynovitis;
  if (branches.includes("pyomyositis")) return HIGH_RISK_WOUND_INFECTION_DISCHARGE_FAMILY.pyomyositis;
  if (branches.includes("diabetic_ischemic_ulcer_infection")) {
    return HIGH_RISK_WOUND_INFECTION_DISCHARGE_FAMILY.diabetic_ischemic_ulcer_infection;
  }
  if (branches.includes("osteomyelitis_septic_joint_concern")) {
    return HIGH_RISK_WOUND_INFECTION_DISCHARGE_FAMILY.osteomyelitis_septic_joint_concern;
  }
  return "high_risk_wound_infection_high_acuity_followup";
}

const BRANCH_PRIORITY: Record<string, number> = {
  necrotizing_soft_tissue_infection: 100,
  necrotizing_infection: 100,
  gas_gangrene: 98,
  gas_forming_infection: 98,
  fascial_dehiscence_evisceration: 96,
  wound_dehiscence: 96,
  systemic_toxicity_sepsis: 94,
  fournier_gangrene: 92,
  deep_space_hand_infection: 88,
  deep_space_hand: 88,
  flexor_tenosynovitis: 86,
  infectious_tenosynovitis: 86,
  diabetic_foot_limb_threat: 84,
  diabetic_ischemic_ulcer_infection: 78,
  osteomyelitis_concern: 60,
  septic_arthritis_concern: 60,
  osteomyelitis_septic_joint_concern: 60,
  pyomyositis: 55,
  postoperative_wound_complication: 40,
  foreign_body_associated_infection: 30,
  water_farm_contamination: 25,
  infected_traumatic_wound: 10,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis, antibiotic order, I&D, or disposition. */
export function adaptHighRiskWoundInfectionIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<HighRiskWoundInfectionContext, "branches" | "redFlagCategories">
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
