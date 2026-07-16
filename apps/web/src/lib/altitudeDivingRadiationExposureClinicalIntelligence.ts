/**
 * Phase 15 (Commit 1) — altitude / diving / radiation exposure clinical documentation
 * context. Mirrors `submersionElectricalLightningClinicalIntelligence.ts` (same phase) and
 * `vesicularBullousSkinDisorderClinicalIntelligence.ts` (Phase 14). Documentation advisory
 * only — never establishes a diagnosis, disposition, hyperbaric-therapy order, admission,
 * transfer, or consult. Ownership of the actual clinical decision stays with the treating
 * clinician.
 *
 * `ear_sinus_barotrauma_ent_overlap` explicitly notes that ear/sinus barotrauma evaluation
 * belongs to ENT (otolaryngology), not this module — the same ownership pattern already
 * used for ophthalmic zoster in `vesicularBullousSkinDisorderClinicalIntelligence.ts`.
 * Carbon monoxide/smoke mentions are linked only as an exposure source; this module never
 * establishes a toxicology diagnosis (e.g., carbon monoxide poisoning) on its own.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveEnvironmentalExposureRedFlags,
  type EnvironmentalExposureRedFlagInput,
} from "./environmentalExposureRedFlagEngine";

export type AltitudeDivingRadiationExposureBranch =
  | "acute_mountain_sickness"
  | "hace_concern"
  | "hape_concern"
  | "decompression_illness"
  | "arterial_gas_embolism_concern"
  | "pulmonary_barotrauma"
  | "ear_sinus_barotrauma_ent_overlap"
  | "radiation_exposure_only"
  | "radiation_injury_concern"
  | "occupational_mass_exposure"
  | "other";

export type AltitudeDivingRadiationExposureContext = {
  branches: AltitudeDivingRadiationExposureBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveEnvironmentalExposureRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** High-acuity branches that withhold routine discharge unless documented as post-acute follow-up. */
const HIGH_ACUITY_LOCK: readonly AltitudeDivingRadiationExposureBranch[] = [
  "hace_concern",
  "hape_concern",
  "decompression_illness",
  "arterial_gas_embolism_concern",
  "radiation_injury_concern",
];

/**
 * Phase 15 Commit 2 — wired to real `providerDischargeTemplateRegistry.ts` template IDs.
 * `arterial_gas_embolism_concern` shares `decompression_illness_post_acute_v1` — arterial
 * gas embolism is clinically managed under the same diving-emergency / hyperbaric-referral
 * umbrella as decompression illness, and no separate registry template exists for it.
 * `occupational_mass_exposure` shares `radiation_exposure_followup_v1`, the closest
 * monitoring-oriented template for exposed-but-asymptomatic persons. `ear_sinus_barotrauma_ent_overlap`
 * is intentionally excluded below (resolves to `null`) — ear/sinus barotrauma discharge
 * ownership belongs to ENT, never to this module; the map value here is unused filler.
 */
export const ALTITUDE_DIVING_RADIATION_EXPOSURE_DISCHARGE_FAMILY: Record<AltitudeDivingRadiationExposureBranch, string> = {
  acute_mountain_sickness: "acute_mountain_sickness_v1",
  hace_concern: "hace_post_acute_v1",
  hape_concern: "hape_post_acute_v1",
  decompression_illness: "decompression_illness_post_acute_v1",
  arterial_gas_embolism_concern: "decompression_illness_post_acute_v1",
  pulmonary_barotrauma: "barotrauma_v1",
  ear_sinus_barotrauma_ent_overlap: "barotrauma_v1",
  radiation_exposure_only: "radiation_exposure_followup_v1",
  radiation_injury_concern: "radiation_injury_post_acute_v1",
  occupational_mass_exposure: "radiation_exposure_followup_v1",
  other: "acute_mountain_sickness_v1",
};

/** Documentation advisory only. Never establishes a diagnosis, hyperbaric-therapy order, or disposition. */
export function resolveAltitudeDivingRadiationExposureContext(
  input: EnvironmentalExposureRedFlagInput
): AltitudeDivingRadiationExposureContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: AltitudeDivingRadiationExposureBranch[] = [];

  const redFlags = resolveEnvironmentalExposureRedFlags(input);

  if (redFlags.categories.includes("hace") || /high.altitude cerebral edema|\bhace\b/.test(text)) {
    branches.push("hace_concern");
  }
  if (redFlags.categories.includes("hape") || /high.altitude pulmonary edema|\bhape\b/.test(text)) {
    branches.push("hape_concern");
  }
  if (redFlags.categories.includes("decompression_illness") || /decompression (illness|sickness)|\bdcs\b|the bends/.test(text)) {
    branches.push("decompression_illness");
  }
  if (redFlags.categories.includes("arterial_gas_embolism") || /arterial gas embolism|\bage\b(?! percent)/.test(text)) {
    branches.push("arterial_gas_embolism_concern");
  }
  if (/pulmonary barotrauma|lung overexpansion|pneumothorax.*(ascent|dive)/.test(text)) {
    branches.push("pulmonary_barotrauma");
  }
  if (/ear barotrauma|sinus barotrauma|barotitis|tympanic membrane (rupture|perforation).*(dive|altitude|flight)/.test(text)) {
    branches.push("ear_sinus_barotrauma_ent_overlap");
  }
  if (redFlags.categories.includes("radiation_emergency") || /radiation injury|acute radiation syndrome|radiation emergency/.test(text)) {
    branches.push("radiation_injury_concern");
  }
  if (/occupational (mass )?exposure|multiple (patients|workers) exposed|mass casualty exposure/.test(text)) {
    branches.push("occupational_mass_exposure");
  }
  if (/radiation exposure/.test(text) && !branches.includes("radiation_injury_concern")) {
    branches.push("radiation_exposure_only");
  }
  if (/acute mountain sickness|\bams\b(?! percent)|altitude sickness/.test(text) && !branches.includes("hace_concern") && !branches.includes("hape_concern")) {
    branches.push("acute_mountain_sickness");
  }

  if (branches.length === 0) {
    branches.push("other");
  }

  const isFollowUpContext = /follow[- ]?up|post-?acute|recheck|known (stable|resolving)|interval exam/.test(text);
  const isHighAcuityLocked = branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch));

  const highAcuityFollowUpFamily = (): string => {
    const ordered: AltitudeDivingRadiationExposureBranch[] = [
      "radiation_injury_concern",
      "arterial_gas_embolism_concern",
      "decompression_illness",
      "hace_concern",
      "hape_concern",
    ];
    for (const branch of ordered) {
      if (branches.includes(branch)) return ALTITUDE_DIVING_RADIATION_EXPOSURE_DISCHARGE_FAMILY[branch];
    }
    return "decompression_illness_post_acute_v1";
  };

  const dischargeFamilyId = isHighAcuityLocked
    ? isFollowUpContext
      ? highAcuityFollowUpFamily()
      : null
    : branches.includes("ear_sinus_barotrauma_ent_overlap")
    ? null
    : branches.includes("pulmonary_barotrauma")
    ? ALTITUDE_DIVING_RADIATION_EXPOSURE_DISCHARGE_FAMILY.pulmonary_barotrauma
    : branches.includes("occupational_mass_exposure")
    ? ALTITUDE_DIVING_RADIATION_EXPOSURE_DISCHARGE_FAMILY.occupational_mass_exposure
    : branches.includes("radiation_exposure_only")
    ? ALTITUDE_DIVING_RADIATION_EXPOSURE_DISCHARGE_FAMILY.radiation_exposure_only
    : branches.includes("acute_mountain_sickness")
    ? ALTITUDE_DIVING_RADIATION_EXPOSURE_DISCHARGE_FAMILY.acute_mountain_sickness
    : ALTITUDE_DIVING_RADIATION_EXPOSURE_DISCHARGE_FAMILY.other;

  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

const BRANCH_PRIORITY: Record<string, number> = {
  radiation_emergency: 100,
  radiation_injury_concern: 95,
  arterial_gas_embolism: 92,
  arterial_gas_embolism_concern: 90,
  decompression_illness: 88,
  hace: 86,
  hace_concern: 84,
  hape: 86,
  hape_concern: 84,
  pulmonary_barotrauma: 45,
  ear_sinus_barotrauma_ent_overlap: 30,
  occupational_mass_exposure: 28,
  radiation_exposure_only: 20,
  acute_mountain_sickness: 12,
  other: 0,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis, hyperbaric-therapy order, or disposition. */
export function adaptAltitudeDivingRadiationExposureIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<AltitudeDivingRadiationExposureContext, "branches" | "redFlagCategories">
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
