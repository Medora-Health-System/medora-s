/**
 * Phase 13 — abscess / purulent skin infection clinical documentation context. Mirrors
 * `entNoseEpistaxisClinicalIntelligence.ts` (Phase 12). Documentation advisory only — never
 * establishes a diagnosis, disposition, antibiotic order, I&D, admission, transfer, or
 * consult. Ownership of the actual clinical decision stays with the treating clinician.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveSoftTissueWoundInfectionRedFlags,
  type SoftTissueWoundInfectionRedFlagInput,
} from "./softTissueWoundInfectionRedFlagEngine";

export type AbscessPurulentInfectionBranch =
  | "cutaneous_abscess"
  | "furuncle"
  | "carbuncle"
  | "felon"
  | "paronychia"
  | "pilonidal_abscess"
  | "hidradenitis_related_abscess"
  | "postoperative_abscess"
  | "perianal_overlap"
  | "deep_collection_concern"
  | "herpetic_whitlow_concern";

export type AbscessPurulentInfectionContext = {
  branches: AbscessPurulentInfectionBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveSoftTissueWoundInfectionRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** High-risk branches (deep collection concern, systemic toxicity) that withhold routine discharge unless documented as post-acute follow-up. */
const HIGH_RISK_LOCK: readonly AbscessPurulentInfectionBranch[] = ["deep_collection_concern"];

/** Herpetic whitlow is a vesicular viral lesion, not a drainable collection — no I&D-oriented discharge family is ever offered for it. */
export const ABSCESS_PURULENT_INFECTION_DISCHARGE_FAMILY: Record<
  Exclude<AbscessPurulentInfectionBranch, "herpetic_whitlow_concern">,
  string
> = {
  cutaneous_abscess: "cutaneous_abscess_followup",
  furuncle: "furuncle_followup",
  carbuncle: "carbuncle_followup",
  felon: "felon_followup",
  paronychia: "paronychia_followup",
  pilonidal_abscess: "pilonidal_abscess_followup",
  hidradenitis_related_abscess: "hidradenitis_related_abscess_followup",
  postoperative_abscess: "postoperative_abscess_followup",
  perianal_overlap: "perianal_abscess_followup",
  deep_collection_concern: "deep_collection_concern_followup",
};

/** Documentation advisory only. Never establishes a diagnosis, antibiotic order, I&D, or disposition. */
export function resolveAbscessPurulentInfectionContext(
  input: SoftTissueWoundInfectionRedFlagInput
): AbscessPurulentInfectionContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: AbscessPurulentInfectionBranch[] = [];

  const redFlags = resolveSoftTissueWoundInfectionRedFlags(input);
  const hasWhitlowRedFlag = redFlags.categories.includes("herpetic_whitlow_no_drainage");
  if (hasWhitlowRedFlag || /herpetic whitlow|vesicular lesions? (on|involving) the finger(tip)?/.test(text)) {
    branches.push("herpetic_whitlow_concern");
  }

  if (/felon/.test(text)) branches.push("felon");
  if (/paronychia/.test(text)) branches.push("paronychia");
  if (/carbuncle/.test(text)) branches.push("carbuncle");
  else if (/furuncle|boil\b/.test(text)) branches.push("furuncle");
  if (/pilonidal (abscess|cyst|sinus)/.test(text)) branches.push("pilonidal_abscess");
  if (/hidradenitis suppurativa/.test(text)) branches.push("hidradenitis_related_abscess");
  if (/postoperative abscess|surgical site abscess/.test(text)) branches.push("postoperative_abscess");
  if (/perianal (abscess|fistula)|perirectal abscess/.test(text)) branches.push("perianal_overlap");

  const hasNstiOrDeepSpaceRedFlag =
    redFlags.categories.includes("deep_space_hand_infection") ||
    redFlags.categories.includes("necrotizing_soft_tissue_infection") ||
    redFlags.categories.includes("systemic_toxicity_sepsis");
  if (
    hasNstiOrDeepSpaceRedFlag ||
    /deep space (hand )?infection|deep collection|extends? (into|to) (the )?deep (space|tissue)/.test(text)
  ) {
    branches.push("deep_collection_concern");
  }

  if (
    branches.length === 0 &&
    !branches.includes("herpetic_whitlow_concern") &&
    /abscess|fluctuant|purulent (skin )?infection/.test(text)
  ) {
    branches.push("cutaneous_abscess");
  }

  const isFollowUpContext = /follow[- ]?up|recheck|known (stable|resolving)|interval exam|post-?operative check/.test(text);
  const isHighRiskLocked = branches.some((branch) => HIGH_RISK_LOCK.includes(branch));
  const isWhitlow = branches.includes("herpetic_whitlow_concern");

  const dischargeFamilyId = isWhitlow
    ? null
    : isHighRiskLocked
    ? isFollowUpContext
      ? ABSCESS_PURULENT_INFECTION_DISCHARGE_FAMILY.deep_collection_concern
      : null
    : branches.includes("perianal_overlap")
    ? ABSCESS_PURULENT_INFECTION_DISCHARGE_FAMILY.perianal_overlap
    : branches.includes("postoperative_abscess")
    ? ABSCESS_PURULENT_INFECTION_DISCHARGE_FAMILY.postoperative_abscess
    : branches.includes("hidradenitis_related_abscess")
    ? ABSCESS_PURULENT_INFECTION_DISCHARGE_FAMILY.hidradenitis_related_abscess
    : branches.includes("pilonidal_abscess")
    ? ABSCESS_PURULENT_INFECTION_DISCHARGE_FAMILY.pilonidal_abscess
    : branches.includes("felon")
    ? ABSCESS_PURULENT_INFECTION_DISCHARGE_FAMILY.felon
    : branches.includes("paronychia")
    ? ABSCESS_PURULENT_INFECTION_DISCHARGE_FAMILY.paronychia
    : branches.includes("carbuncle")
    ? ABSCESS_PURULENT_INFECTION_DISCHARGE_FAMILY.carbuncle
    : branches.includes("furuncle")
    ? ABSCESS_PURULENT_INFECTION_DISCHARGE_FAMILY.furuncle
    : branches.includes("cutaneous_abscess")
    ? ABSCESS_PURULENT_INFECTION_DISCHARGE_FAMILY.cutaneous_abscess
    : null;

  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

const BRANCH_PRIORITY: Record<string, number> = {
  necrotizing_soft_tissue_infection: 100,
  systemic_toxicity_sepsis: 96,
  deep_space_hand_infection: 90,
  deep_collection_concern: 90,
  herpetic_whitlow_no_drainage: 70,
  herpetic_whitlow_concern: 70,
  perianal_overlap: 55,
  postoperative_abscess: 45,
  hidradenitis_related_abscess: 35,
  pilonidal_abscess: 30,
  felon: 25,
  paronychia: 20,
  carbuncle: 18,
  furuncle: 12,
  cutaneous_abscess: 8,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis, antibiotic order, I&D, or disposition. */
export function adaptAbscessPurulentInfectionIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<AbscessPurulentInfectionContext, "branches" | "redFlagCategories">
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
