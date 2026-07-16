/**
 * Phase 15 (Commit 1) — cold exposure / hypothermia / frostbite clinical documentation
 * context. Mirrors `heatEnvironmentalIllnessClinicalIntelligence.ts` (same phase) and
 * `dermatologicRashClinicalIntelligence.ts` (Phase 14). Documentation advisory only —
 * never establishes a diagnosis, disposition, active rewarming order, laboratory order,
 * admission, transfer, or consult. Ownership of the actual clinical decision stays with the
 * treating clinician.
 *
 * A single measured core temperature never, by itself, autonomously stages hypothermia
 * severity, and frostbite depth is never autonomously staged from a single exam mention —
 * both remain documentation echoed back from the treating clinician's own assessment. Body
 * region naming reuses the same plain-language region vocabulary as
 * `burnClinicalIntelligence.ts` (`face`, `hand`, `foot`, `upper_limb`, `lower_limb`, ...)
 * without importing or duplicating that engine's burn-specific logic.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveEnvironmentalExposureRedFlags,
  type EnvironmentalExposureRedFlagInput,
} from "./environmentalExposureRedFlagEngine";

export type ColdEnvironmentalInjuryBranch =
  | "mild_hypothermia"
  | "moderate_severe_hypothermia"
  | "frostnip"
  | "superficial_frostbite"
  | "deep_frostbite"
  | "chilblains_pernio"
  | "immersion_foot"
  | "cold_water_exposure"
  | "other";

export type ColdEnvironmentalInjuryContext = {
  branches: ColdEnvironmentalInjuryBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveEnvironmentalExposureRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** High-acuity branches that withhold routine discharge unless documented as post-acute follow-up. */
const HIGH_ACUITY_LOCK: readonly ColdEnvironmentalInjuryBranch[] = ["moderate_severe_hypothermia", "deep_frostbite"];

/**
 * Phase 15 Commit 2 — wired to real `providerDischargeTemplateRegistry.ts` template IDs.
 * `frostnip` (reversible cold injury without tissue loss) shares `superficial_frostbite_v1`
 * — no dedicated registry template exists for the milder, non-billable frostnip presentation.
 * `cold_water_exposure` and the heterogeneous `other` bucket share `mild_hypothermia_v1`,
 * the closest routine, well-appearing exposure template. `moderate_severe_hypothermia` maps
 * to the post-acute follow-up template only once documented as such (see the high-acuity
 * lock below); it never resolves to a routine mild-exposure template.
 */
export const COLD_ENVIRONMENTAL_INJURY_DISCHARGE_FAMILY: Record<ColdEnvironmentalInjuryBranch, string> = {
  mild_hypothermia: "mild_hypothermia_v1",
  moderate_severe_hypothermia: "hypothermia_post_acute_v1",
  frostnip: "superficial_frostbite_v1",
  superficial_frostbite: "superficial_frostbite_v1",
  deep_frostbite: "deep_frostbite_post_acute_v1",
  chilblains_pernio: "chilblains_pernio_v1",
  immersion_foot: "immersion_foot_v1",
  cold_water_exposure: "mild_hypothermia_v1",
  other: "mild_hypothermia_v1",
};

/** Documentation advisory only. Never establishes a diagnosis, active rewarming order, or disposition. */
export function resolveColdEnvironmentalInjuryContext(
  input: EnvironmentalExposureRedFlagInput
): ColdEnvironmentalInjuryContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: ColdEnvironmentalInjuryBranch[] = [];

  const redFlags = resolveEnvironmentalExposureRedFlags(input);
  const hasSevereHypothermiaRedFlag = redFlags.categories.includes("severe_hypothermia");
  const hasArrhythmiaWithCold = redFlags.categories.includes("malignant_arrhythmia") && /cold|hypothermia/.test(text);

  if (hasSevereHypothermiaRedFlag || hasArrhythmiaWithCold || /moderate to severe hypothermia|severe hypothermia/.test(text)) {
    branches.push("moderate_severe_hypothermia");
  }
  if (/deep frostbite|full.thickness frostbite/.test(text)) {
    branches.push("deep_frostbite");
  }

  if (/mild hypothermia/.test(text)) branches.push("mild_hypothermia");
  if (/frostnip/.test(text)) branches.push("frostnip");
  if (/superficial frostbite/.test(text)) branches.push("superficial_frostbite");
  if (/chilblain|pernio/.test(text)) branches.push("chilblains_pernio");
  if (/immersion foot|trench foot/.test(text)) branches.push("immersion_foot");
  if (/cold water exposure|cold water immersion/.test(text) && !branches.includes("moderate_severe_hypothermia")) {
    branches.push("cold_water_exposure");
  }
  if (/frostbite/.test(text) && !branches.some((branch) => branch === "deep_frostbite" || branch === "superficial_frostbite")) {
    branches.push("superficial_frostbite");
  }

  if (branches.length === 0 && /hypothermia/.test(text)) {
    branches.push("mild_hypothermia");
  }
  if (branches.length === 0 && /cold exposure|cold injury/.test(text)) {
    branches.push("cold_water_exposure");
  }
  if (branches.length === 0) {
    branches.push("other");
  }

  const isFollowUpContext = /follow[- ]?up|post-?acute|recheck|known (stable|resolving)|interval exam/.test(text);
  const isHighAcuityLocked = branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch));

  const dischargeFamilyId = isHighAcuityLocked
    ? isFollowUpContext
      ? branches.includes("deep_frostbite")
        ? COLD_ENVIRONMENTAL_INJURY_DISCHARGE_FAMILY.deep_frostbite
        : COLD_ENVIRONMENTAL_INJURY_DISCHARGE_FAMILY.moderate_severe_hypothermia
      : null
    : branches.includes("immersion_foot")
    ? COLD_ENVIRONMENTAL_INJURY_DISCHARGE_FAMILY.immersion_foot
    : branches.includes("chilblains_pernio")
    ? COLD_ENVIRONMENTAL_INJURY_DISCHARGE_FAMILY.chilblains_pernio
    : branches.includes("superficial_frostbite")
    ? COLD_ENVIRONMENTAL_INJURY_DISCHARGE_FAMILY.superficial_frostbite
    : branches.includes("frostnip")
    ? COLD_ENVIRONMENTAL_INJURY_DISCHARGE_FAMILY.frostnip
    : branches.includes("cold_water_exposure")
    ? COLD_ENVIRONMENTAL_INJURY_DISCHARGE_FAMILY.cold_water_exposure
    : branches.includes("mild_hypothermia")
    ? COLD_ENVIRONMENTAL_INJURY_DISCHARGE_FAMILY.mild_hypothermia
    : COLD_ENVIRONMENTAL_INJURY_DISCHARGE_FAMILY.other;

  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

const BRANCH_PRIORITY: Record<string, number> = {
  severe_hypothermia: 100,
  moderate_severe_hypothermia: 95,
  malignant_arrhythmia: 90,
  deep_frostbite: 88,
  rhabdomyolysis_multiorgan: 70,
  superficial_frostbite: 30,
  immersion_foot: 22,
  chilblains_pernio: 18,
  cold_water_exposure: 15,
  frostnip: 10,
  mild_hypothermia: 8,
  other: 0,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis, active rewarming order, or disposition. */
export function adaptColdEnvironmentalInjuryIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<ColdEnvironmentalInjuryContext, "branches" | "redFlagCategories">
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
