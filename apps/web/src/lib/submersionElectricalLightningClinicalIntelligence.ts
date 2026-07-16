/**
 * Phase 15 (Commit 1) — submersion / electrical / lightning injury clinical documentation
 * context. Mirrors `coldEnvironmentalInjuryClinicalIntelligence.ts` (same phase) and
 * `dermatologicEmergencyClinicalIntelligence.ts` (Phase 14). Documentation advisory only —
 * never establishes a diagnosis, disposition, oxygen order, admission, transfer, or
 * consult. Ownership of the actual clinical decision stays with the treating clinician.
 *
 * "Dry drowning" and "secondary drowning" are not medically recognized terms and must never
 * appear in any chip text, key, or value produced by this module — delayed respiratory
 * decompensation after submersion is documented only through serial reassessment language
 * (see `environmentalExposureRedFlagEngine.ts`'s `nonfatal_drowning_respiratory_failure`
 * category), never through either of those labels.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveEnvironmentalExposureRedFlags,
  type EnvironmentalExposureRedFlagInput,
} from "./environmentalExposureRedFlagEngine";

export type SubmersionElectricalLightningBranch =
  | "nonfatal_drowning"
  | "aspiration_after_submersion"
  | "cold_water_submersion"
  | "low_voltage_electrical"
  | "high_voltage_electrical"
  | "electrical_arc"
  | "lightning_injury"
  | "cardiac_neuro_complication_concern"
  | "rhabdomyolysis_concern"
  | "other";

export type SubmersionElectricalLightningContext = {
  branches: SubmersionElectricalLightningBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveEnvironmentalExposureRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const ARREST_OR_AMS_PATTERN = /cardiac arrest|arrhythmia|altered mental status|loss of consciousness|asystole|unresponsive/;
const RESPIRATORY_FAILURE_PATTERN = /respiratory failure|significant respiratory distress|hypoxia/;

/** High-acuity branches that withhold routine discharge unless documented as post-acute follow-up. */
const HIGH_ACUITY_LOCK: readonly SubmersionElectricalLightningBranch[] = [
  "high_voltage_electrical",
  "cardiac_neuro_complication_concern",
];

/**
 * Phase 15 Commit 2 — wired to real `providerDischargeTemplateRegistry.ts` template IDs.
 * `nonfatal_drowning` and `cold_water_submersion` (brief, asymptomatic submersion) map to
 * the routine `post_submersion_observation_v1` template rather than the post-acute drowning
 * template, which is reserved for higher-risk presentations (see `resolveCardiacNeuroFollowUpTemplate`
 * below). `electrical_arc` and `rhabdomyolysis_concern` have no dedicated registry template and
 * share `low_voltage_electrical_injury_v1`, the closest non-locked electrical-injury template.
 * `cardiac_neuro_complication_concern` has no single origin-independent template — its
 * post-acute follow-up ID is resolved contextually below from the co-occurring branch
 * (lightning, high-voltage electrical, or drowning) rather than a single fixed value.
 */
export const SUBMERSION_ELECTRICAL_LIGHTNING_DISCHARGE_FAMILY: Record<SubmersionElectricalLightningBranch, string> = {
  nonfatal_drowning: "post_submersion_observation_v1",
  aspiration_after_submersion: "nonfatal_drowning_post_acute_v1",
  cold_water_submersion: "post_submersion_observation_v1",
  low_voltage_electrical: "low_voltage_electrical_injury_v1",
  high_voltage_electrical: "high_voltage_electrical_injury_post_acute_v1",
  electrical_arc: "low_voltage_electrical_injury_v1",
  lightning_injury: "lightning_injury_post_acute_v1",
  cardiac_neuro_complication_concern: "nonfatal_drowning_post_acute_v1",
  rhabdomyolysis_concern: "low_voltage_electrical_injury_v1",
  other: "post_submersion_observation_v1",
};

/** Documentation advisory only. Never establishes a diagnosis, oxygen order, or disposition. */
export function resolveSubmersionElectricalLightningContext(
  input: EnvironmentalExposureRedFlagInput
): SubmersionElectricalLightningContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: SubmersionElectricalLightningBranch[] = [];

  const redFlags = resolveEnvironmentalExposureRedFlags(input);
  const hasHighVoltageRedFlag = redFlags.categories.includes("high_voltage_electrical");
  const hasLightningArrestRedFlag = redFlags.categories.includes("lightning_cardiac_arrest");
  const hasDrowningRespFailureRedFlag = redFlags.categories.includes("nonfatal_drowning_respiratory_failure");
  const hasMalignantArrhythmiaRedFlag = redFlags.categories.includes("malignant_arrhythmia");
  const hasRhabdoRedFlag = redFlags.categories.includes("rhabdomyolysis_multiorgan");

  const mentionsSubmersion = /submersion|drowning|near.drowning/.test(text);
  const mentionsLightning = /lightning/.test(text);
  const mentionsElectrical = /electrical|electrocution/.test(text);

  if (hasHighVoltageRedFlag || /high.voltage/.test(text)) {
    branches.push("high_voltage_electrical");
  }
  if (/low.voltage/.test(text) && !branches.includes("high_voltage_electrical")) {
    branches.push("low_voltage_electrical");
  }
  if (/electrical arc|arc injury|arc flash/.test(text)) {
    branches.push("electrical_arc");
  }
  if (mentionsElectrical && branches.length === 0) {
    branches.push("low_voltage_electrical");
  }

  if (mentionsLightning) {
    branches.push("lightning_injury");
  }

  if (mentionsSubmersion) {
    branches.push("nonfatal_drowning");
    if (/aspirat/.test(text)) branches.push("aspiration_after_submersion");
    if (/cold water/.test(text)) branches.push("cold_water_submersion");
  }

  if (
    hasLightningArrestRedFlag ||
    hasDrowningRespFailureRedFlag ||
    hasMalignantArrhythmiaRedFlag ||
    (mentionsLightning && ARREST_OR_AMS_PATTERN.test(text)) ||
    (mentionsSubmersion && RESPIRATORY_FAILURE_PATTERN.test(text))
  ) {
    branches.push("cardiac_neuro_complication_concern");
  }

  if (hasRhabdoRedFlag || /rhabdomyolysis|myoglobinuria/.test(text)) {
    branches.push("rhabdomyolysis_concern");
  }

  if (branches.length === 0) {
    branches.push("other");
  }

  const isFollowUpContext = /follow[- ]?up|post-?acute|recheck|known (stable|resolving)|interval exam/.test(text);
  const isHighAcuityLocked = branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch));

  const dischargeFamilyId = isHighAcuityLocked
    ? isFollowUpContext
      ? branches.includes("high_voltage_electrical")
        ? SUBMERSION_ELECTRICAL_LIGHTNING_DISCHARGE_FAMILY.high_voltage_electrical
        : branches.includes("lightning_injury")
        ? SUBMERSION_ELECTRICAL_LIGHTNING_DISCHARGE_FAMILY.lightning_injury
        : SUBMERSION_ELECTRICAL_LIGHTNING_DISCHARGE_FAMILY.cardiac_neuro_complication_concern
      : null
    : branches.includes("rhabdomyolysis_concern")
    ? SUBMERSION_ELECTRICAL_LIGHTNING_DISCHARGE_FAMILY.rhabdomyolysis_concern
    : branches.includes("lightning_injury")
    ? SUBMERSION_ELECTRICAL_LIGHTNING_DISCHARGE_FAMILY.lightning_injury
    : branches.includes("electrical_arc")
    ? SUBMERSION_ELECTRICAL_LIGHTNING_DISCHARGE_FAMILY.electrical_arc
    : branches.includes("low_voltage_electrical")
    ? SUBMERSION_ELECTRICAL_LIGHTNING_DISCHARGE_FAMILY.low_voltage_electrical
    : branches.includes("aspiration_after_submersion")
    ? SUBMERSION_ELECTRICAL_LIGHTNING_DISCHARGE_FAMILY.aspiration_after_submersion
    : branches.includes("cold_water_submersion")
    ? SUBMERSION_ELECTRICAL_LIGHTNING_DISCHARGE_FAMILY.cold_water_submersion
    : branches.includes("nonfatal_drowning")
    ? SUBMERSION_ELECTRICAL_LIGHTNING_DISCHARGE_FAMILY.nonfatal_drowning
    : SUBMERSION_ELECTRICAL_LIGHTNING_DISCHARGE_FAMILY.other;

  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

const BRANCH_PRIORITY: Record<string, number> = {
  high_voltage_electrical: 100,
  lightning_cardiac_arrest: 98,
  nonfatal_drowning_respiratory_failure: 96,
  malignant_arrhythmia: 95,
  cardiac_neuro_complication_concern: 94,
  rhabdomyolysis_multiorgan: 80,
  rhabdomyolysis_concern: 70,
  lightning_injury: 55,
  electrical_arc: 45,
  aspiration_after_submersion: 35,
  low_voltage_electrical: 30,
  cold_water_submersion: 20,
  nonfatal_drowning: 15,
  other: 0,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis, oxygen order, or disposition. */
export function adaptSubmersionElectricalLightningIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<SubmersionElectricalLightningContext, "branches" | "redFlagCategories">
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
