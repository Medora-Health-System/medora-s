/**
 * Phase 15 (Commit 1) — heat illness / hyperthermia clinical documentation context.
 * Mirrors `dermatologicRashClinicalIntelligence.ts` (Phase 14). Documentation advisory
 * only — never establishes a diagnosis, disposition, active cooling order, laboratory
 * order, admission, transfer, or consult. Ownership of the actual clinical decision stays
 * with the treating clinician.
 *
 * `heat_stroke_concern` requires documented altered mental status, seizure, or coma
 * language — a measured core temperature alone, however elevated, never by itself resolves
 * this branch. This mirrors the Nikolsky-sign / SCORTEN documentation-only guardrail
 * already used in `dermatologicEmergencyClinicalIntelligence.ts`.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveEnvironmentalExposureRedFlags,
  type EnvironmentalExposureRedFlagInput,
} from "./environmentalExposureRedFlagEngine";

export type HeatEnvironmentalIllnessBranch =
  | "heat_cramps"
  | "heat_syncope"
  | "heat_exhaustion"
  | "exertional_heat_illness"
  | "classic_heat_illness"
  | "heat_stroke_concern"
  | "exertional_rhabdomyolysis_overlap"
  | "dehydration_electrolyte_concern"
  | "other";

export type HeatEnvironmentalIllnessContext = {
  branches: HeatEnvironmentalIllnessBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveEnvironmentalExposureRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Documented altered mental status, seizure, or coma language required — temperature alone never forces this branch. */
const ALTERED_MENTAL_STATUS_PATTERN = /altered mental status|confusion|seizure|\bcoma\b|obtunded|unresponsive/;

/** High-acuity branch (heat stroke concern) that withholds routine discharge unless documented as post-acute follow-up. */
const HIGH_ACUITY_LOCK: readonly HeatEnvironmentalIllnessBranch[] = ["heat_stroke_concern"];

/**
 * Phase 15 Commit 2 — wired to real `providerDischargeTemplateRegistry.ts` template IDs.
 * `classic_heat_illness` and `dehydration_electrolyte_concern` share `heat_exhaustion_v1`
 * (no dedicated ICD-10-CM code distinguishes classic/nonexertional heat illness or isolated
 * heat-related dehydration from heat exhaustion). `exertional_rhabdomyolysis_overlap` and the
 * heterogeneous `other` bucket have no matching post-acute template in the registry, so they
 * resolve to `null` below rather than a placeholder string that would not exist in the registry.
 */
export const HEAT_ENVIRONMENTAL_ILLNESS_DISCHARGE_FAMILY: Record<HeatEnvironmentalIllnessBranch, string> = {
  heat_cramps: "heat_cramps_v1",
  heat_syncope: "heat_syncope_v1",
  heat_exhaustion: "heat_exhaustion_v1",
  exertional_heat_illness: "exertional_heat_illness_v1",
  classic_heat_illness: "heat_exhaustion_v1",
  heat_stroke_concern: "heat_stroke_post_acute_v1",
  exertional_rhabdomyolysis_overlap: "heat_exhaustion_v1",
  dehydration_electrolyte_concern: "heat_exhaustion_v1",
  other: "heat_exhaustion_v1",
};

/** Documentation advisory only. Never establishes a diagnosis, active cooling order, or disposition. */
export function resolveHeatEnvironmentalIllnessContext(
  input: EnvironmentalExposureRedFlagInput
): HeatEnvironmentalIllnessContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: HeatEnvironmentalIllnessBranch[] = [];

  const redFlags = resolveEnvironmentalExposureRedFlags(input);
  const hasHeatStrokeRedFlag = redFlags.categories.includes("heat_stroke");
  const hasAlteredMentalStatus = ALTERED_MENTAL_STATUS_PATTERN.test(text);
  const mentionsHeatStroke = /heat stroke|hyperthermia/.test(text);

  if (hasHeatStrokeRedFlag || (mentionsHeatStroke && hasAlteredMentalStatus)) {
    branches.push("heat_stroke_concern");
  }

  if (/heat cramp/.test(text)) branches.push("heat_cramps");
  if (/heat syncope|syncope.*heat|heat.*syncope/.test(text)) branches.push("heat_syncope");
  if (/heat exhaustion/.test(text)) branches.push("heat_exhaustion");
  if (/exertional heat illness|exertional heat/.test(text)) branches.push("exertional_heat_illness");
  if (/classic heat illness|nonexertional heat illness|non.exertional heat/.test(text)) branches.push("classic_heat_illness");
  if (
    redFlags.categories.includes("rhabdomyolysis_multiorgan") ||
    /exertional rhabdomyolysis|rhabdomyolysis.*heat|heat.*rhabdomyolysis/.test(text)
  ) {
    branches.push("exertional_rhabdomyolysis_overlap");
  }
  if (/dehydration|electrolyte (abnormality|imbalance)|hyponatremia|hypernatremia/.test(text)) {
    branches.push("dehydration_electrolyte_concern");
  }

  if (branches.length === 0 && /heat|hyperthermia|hot weather/.test(text)) {
    branches.push("classic_heat_illness");
  }
  if (branches.length === 0) {
    branches.push("other");
  }

  const isFollowUpContext = /follow[- ]?up|post-?acute|recheck|known (stable|resolving)|interval exam/.test(text);
  const isHighAcuityLocked = branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch));

  const dischargeFamilyId = isHighAcuityLocked
    ? isFollowUpContext
      ? HEAT_ENVIRONMENTAL_ILLNESS_DISCHARGE_FAMILY.heat_stroke_concern
      : null
    : branches.includes("exertional_rhabdomyolysis_overlap")
    ? HEAT_ENVIRONMENTAL_ILLNESS_DISCHARGE_FAMILY.exertional_rhabdomyolysis_overlap
    : branches.includes("dehydration_electrolyte_concern")
    ? HEAT_ENVIRONMENTAL_ILLNESS_DISCHARGE_FAMILY.dehydration_electrolyte_concern
    : branches.includes("heat_exhaustion")
    ? HEAT_ENVIRONMENTAL_ILLNESS_DISCHARGE_FAMILY.heat_exhaustion
    : branches.includes("exertional_heat_illness")
    ? HEAT_ENVIRONMENTAL_ILLNESS_DISCHARGE_FAMILY.exertional_heat_illness
    : branches.includes("heat_syncope")
    ? HEAT_ENVIRONMENTAL_ILLNESS_DISCHARGE_FAMILY.heat_syncope
    : branches.includes("heat_cramps")
    ? HEAT_ENVIRONMENTAL_ILLNESS_DISCHARGE_FAMILY.heat_cramps
    : branches.includes("classic_heat_illness")
    ? HEAT_ENVIRONMENTAL_ILLNESS_DISCHARGE_FAMILY.classic_heat_illness
    : HEAT_ENVIRONMENTAL_ILLNESS_DISCHARGE_FAMILY.other;

  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

const BRANCH_PRIORITY: Record<string, number> = {
  heat_stroke: 100,
  heat_stroke_concern: 95,
  rhabdomyolysis_multiorgan: 85,
  malignant_arrhythmia: 85,
  exertional_rhabdomyolysis_overlap: 60,
  dehydration_electrolyte_concern: 35,
  heat_exhaustion: 25,
  exertional_heat_illness: 20,
  classic_heat_illness: 15,
  heat_syncope: 12,
  heat_cramps: 8,
  other: 0,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis, active cooling order, or disposition. */
export function adaptHeatEnvironmentalIllnessIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<HeatEnvironmentalIllnessContext, "branches" | "redFlagCategories">
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
