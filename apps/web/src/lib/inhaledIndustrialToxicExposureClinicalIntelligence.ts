/**
 * Phase 16 (Commit 1) — inhaled / industrial toxic exposure clinical documentation context.
 * Toxicology owns confirmed poisoning (e.g. T58 carbon monoxide). Phase 15 environmental
 * exposure context may be reused for setting/fire details; pulse oximetry alone never
 * excludes carbon monoxide poisoning.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveToxicologyToxidromeRedFlags,
  type ToxicologyToxidromeRedFlagInput,
} from "./toxicologyToxidromeRedFlagEngine";

export type InhaledIndustrialToxicExposureBranch =
  | "carbon_monoxide"
  | "cyanide"
  | "hydrogen_sulfide"
  | "smoke_toxic_exposure"
  | "irritant_gas"
  | "methemoglobinemia"
  | "occupational_mass_exposure"
  | "other";

export type InhaledIndustrialToxicExposureContext = {
  branches: InhaledIndustrialToxicExposureBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveToxicologyToxidromeRedFlags>["categories"];
  pulseOxAloneDoesNotExcludeCo: true;
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const HIGH_ACUITY_LOCK: readonly InhaledIndustrialToxicExposureBranch[] = [
  "cyanide",
  "carbon_monoxide",
  "methemoglobinemia",
  "hydrogen_sulfide",
];

export const INHALED_INDUSTRIAL_TOXIC_DISCHARGE_FAMILY: Record<
  InhaledIndustrialToxicExposureBranch,
  string | null
> = {
  carbon_monoxide: "carbon_monoxide_post_acute_v1",
  cyanide: null,
  hydrogen_sulfide: null,
  smoke_toxic_exposure: "carbon_monoxide_post_acute_v1",
  irritant_gas: "low_risk_toxic_exposure_v1",
  methemoglobinemia: "methemoglobinemia_post_acute_v1",
  occupational_mass_exposure: "poison_control_followup_v1",
  other: "low_risk_toxic_exposure_v1",
};

/** Documentation advisory only. Pulse oximetry alone never excludes CO. */
export function resolveInhaledIndustrialToxicExposureContext(
  input: ToxicologyToxidromeRedFlagInput
): InhaledIndustrialToxicExposureContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: InhaledIndustrialToxicExposureBranch[] = [];
  const redFlags = resolveToxicologyToxidromeRedFlags(input);

  if (
    redFlags.categories.includes("carbon_monoxide_poisoning_concern") ||
    /carbon monoxide|co poisoning|carboxyhemoglobin|\bt58/.test(text)
  ) {
    branches.push("carbon_monoxide");
  }
  if (/cyanide|hydrogen cyanide|\bcn poisoning\b/.test(text)) branches.push("cyanide");
  if (/hydrogen sulfide|\bh2s\b|sewer gas/.test(text)) branches.push("hydrogen_sulfide");
  if (/smoke (inhalation|exposure)|fire (smoke|exposure)|enclosed fire/.test(text)) {
    branches.push("smoke_toxic_exposure");
  }
  if (/chlorine|ammonia|irritant gas|phosgene|mustard gas/.test(text)) branches.push("irritant_gas");
  if (
    redFlags.categories.includes("methemoglobinemia_concern") ||
    /methemoglobinemia|methemoglobin|chocolate.?colored blood/.test(text)
  ) {
    branches.push("methemoglobinemia");
  }
  if (/occupational (exposure|toxic)|mass (exposure|casualty)|multiple victims|industrial (exposure|spill)/.test(text)) {
    branches.push("occupational_mass_exposure");
  }

  if (branches.length === 0 && /inhal(ed|ation)|fume|gas exposure|toxic gas/.test(text)) {
    branches.push("other");
  }
  if (branches.length === 0) branches.push("other");

  const severeCo =
    branches.includes("carbon_monoxide") &&
    /altered mental status|confusion|syncope|coma|seizure|chest pain|pregnancy/.test(text);
  const severeMetHb =
    branches.includes("methemoglobinemia") && /severe|altered mental status|hypotension|dyspnea/.test(text);
  const isFollowUpContext = /follow[- ]?up|post-?acute|post.?observation|known (stable|resolving)/.test(text);
  const isHighAcuityLocked =
    branches.includes("cyanide") ||
    branches.includes("hydrogen_sulfide") ||
    (branches.includes("carbon_monoxide") && severeCo) ||
    (branches.includes("methemoglobinemia") && severeMetHb) ||
    branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch) && /unstable|coma|respiratory failure|shock/.test(text));

  const pickFamily = (): string | null => {
    if (branches.includes("cyanide") && !isFollowUpContext) return null;
    if (branches.includes("hydrogen_sulfide") && !isFollowUpContext) return null;
    if (isHighAcuityLocked && !isFollowUpContext) return null;
    if (branches.includes("methemoglobinemia")) {
      return isFollowUpContext || !severeMetHb
        ? INHALED_INDUSTRIAL_TOXIC_DISCHARGE_FAMILY.methemoglobinemia
        : null;
    }
    if (branches.includes("carbon_monoxide") || branches.includes("smoke_toxic_exposure")) {
      return isFollowUpContext || !severeCo
        ? INHALED_INDUSTRIAL_TOXIC_DISCHARGE_FAMILY.carbon_monoxide
        : null;
    }
    if (branches.includes("occupational_mass_exposure")) {
      return INHALED_INDUSTRIAL_TOXIC_DISCHARGE_FAMILY.occupational_mass_exposure;
    }
    if (branches.includes("irritant_gas")) return INHALED_INDUSTRIAL_TOXIC_DISCHARGE_FAMILY.irritant_gas;
    return INHALED_INDUSTRIAL_TOXIC_DISCHARGE_FAMILY.other;
  };

  return {
    branches: [...new Set(branches)],
    dischargeFamilyId: pickFamily(),
    redFlagCategories: redFlags.categories,
    pulseOxAloneDoesNotExcludeCo: true,
  };
}

const BRANCH_PRIORITY: Record<string, number> = {
  cyanide: 100,
  carbon_monoxide_poisoning_concern: 95,
  carbon_monoxide: 92,
  methemoglobinemia_concern: 90,
  methemoglobinemia: 88,
  hydrogen_sulfide: 85,
  smoke_toxic_exposure: 70,
  occupational_mass_exposure: 60,
  irritant_gas: 40,
  other: 0,
};

export function adaptInhaledIndustrialToxicExposureIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<InhaledIndustrialToxicExposureContext, "branches" | "redFlagCategories">
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
