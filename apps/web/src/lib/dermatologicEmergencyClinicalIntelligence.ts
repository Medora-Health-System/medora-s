/**
 * Phase 14 — dermatologic emergency / high-risk rash clinical documentation context.
 * Mirrors `highRiskWoundInfectionClinicalIntelligence.ts` (Phase 13). Documentation
 * advisory only — never establishes a diagnosis, disposition, medication order, biopsy,
 * admission, transfer, or consult. Ownership of the actual clinical decision (surgical
 * intervention, ophthalmology, ICU-level care) stays with the treating clinician.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveDermatologicEmergencyRedFlags,
  type DermatologicEmergencyRedFlagInput,
} from "./dermatologicEmergencyRedFlagEngine";

export type DermatologicEmergencyBranch =
  | "sjs_ten"
  | "dress"
  | "agep"
  | "meningococcal_type_rash"
  | "petechiae_purpura_systemic"
  | "purpura_fulminans"
  | "disseminated_infection"
  | "severe_erythroderma"
  | "necrotizing_overlap"
  | "severe_immunocompromised_rash"
  | "ocular_mucosal_involvement"
  | "systemic_toxicity"
  | "other";

export type DermatologicEmergencyContext = {
  branches: DermatologicEmergencyBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveDermatologicEmergencyRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Nearly every branch in this high-acuity module is locked; only "other" is routinely dischargeable without explicit follow-up documentation. */
const HIGH_ACUITY_LOCK: readonly DermatologicEmergencyBranch[] = [
  "sjs_ten",
  "dress",
  "agep",
  "meningococcal_type_rash",
  "petechiae_purpura_systemic",
  "purpura_fulminans",
  "disseminated_infection",
  "severe_erythroderma",
  "necrotizing_overlap",
  "severe_immunocompromised_rash",
  "ocular_mucosal_involvement",
  "systemic_toxicity",
];

/**
 * Phase 14 Commit 2 — wired to real `providerDischargeTemplateRegistry.ts` template IDs
 * where a post-acute template exists (`sjs_ten`, `dress`, and `necrotizing_overlap` — the
 * latter reusing the Phase 13 `necrotizing_soft_tissue_infection_post_acute_v1` template).
 * The remaining life-threatening branches (AGEP, meningococcemia, purpura fulminans,
 * disseminated infection, severe erythroderma, severe immunocompromised rash, ocular/
 * mucosal involvement, systemic toxicity) intentionally have no registry template — per
 * hard constraint, these never resolve to a routine/auto-suggested discharge template,
 * even when documented as follow-up; the placeholder strings below are never returned by
 * `highAcuityFollowUpFamily` unless a future certified template is added for that branch.
 */
export const DERMATOLOGIC_EMERGENCY_DISCHARGE_FAMILY: Record<DermatologicEmergencyBranch, string> = {
  sjs_ten: "sjs_ten_post_acute_v1",
  dress: "dress_post_acute_v1",
  agep: "agep_followup",
  meningococcal_type_rash: "meningococcal_type_rash_followup",
  petechiae_purpura_systemic: "petechiae_purpura_systemic_followup",
  purpura_fulminans: "purpura_fulminans_followup",
  disseminated_infection: "disseminated_infection_followup",
  severe_erythroderma: "severe_erythroderma_followup",
  necrotizing_overlap: "necrotizing_soft_tissue_infection_post_acute_v1",
  severe_immunocompromised_rash: "severe_immunocompromised_rash_followup",
  ocular_mucosal_involvement: "ocular_mucosal_involvement_followup",
  systemic_toxicity: "systemic_toxicity_followup",
  other: "dermatologic_emergency_other_followup",
};

function highAcuityFollowUpFamily(branches: readonly DermatologicEmergencyBranch[]): string {
  const orderedLockedBranches: DermatologicEmergencyBranch[] = [
    "sjs_ten",
    "purpura_fulminans",
    "necrotizing_overlap",
    "dress",
    "agep",
    "meningococcal_type_rash",
    "petechiae_purpura_systemic",
    "disseminated_infection",
    "severe_erythroderma",
    "severe_immunocompromised_rash",
    "ocular_mucosal_involvement",
    "systemic_toxicity",
  ];
  for (const branch of orderedLockedBranches) {
    if (branches.includes(branch)) return DERMATOLOGIC_EMERGENCY_DISCHARGE_FAMILY[branch];
  }
  return "dermatologic_emergency_high_acuity_followup";
}

/** Documentation advisory only. Never establishes a diagnosis, medication order, or disposition. */
export function resolveDermatologicEmergencyContext(
  input: DermatologicEmergencyRedFlagInput
): DermatologicEmergencyContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: DermatologicEmergencyBranch[] = [];

  const redFlags = resolveDermatologicEmergencyRedFlags(input);

  if (redFlags.categories.includes("sjs_ten") || /stevens.johnson|toxic epidermal necrolysis|\bsjs\b|\bten\b(?! percent)/.test(text)) {
    branches.push("sjs_ten");
  }
  if (redFlags.categories.includes("dress") || /dress syndrome|drug reaction with eosinophilia/.test(text)) {
    branches.push("dress");
  }
  if (redFlags.categories.includes("agep") || /acute generalized exanthematous pustulosis|\bagep\b/.test(text)) {
    branches.push("agep");
  }
  if (redFlags.categories.includes("meningococcal_type_rash") || /meningococc(al|emia)|nonblanching rash with fever/.test(text)) {
    branches.push("meningococcal_type_rash");
  }
  if (
    redFlags.categories.includes("petechiae_purpura_systemic") ||
    /petechiae with (fever|systemic symptoms)|purpura with (fever|systemic symptoms)/.test(text)
  ) {
    branches.push("petechiae_purpura_systemic");
  }
  if (redFlags.categories.includes("purpura_fulminans") || /purpura fulminans/.test(text)) {
    branches.push("purpura_fulminans");
  }
  if (redFlags.categories.includes("disseminated_infection") || /disseminated (gonococcal|fungal|infection)/.test(text)) {
    branches.push("disseminated_infection");
  }
  if (redFlags.categories.includes("severe_erythroderma") || /erythroderma/.test(text)) {
    branches.push("severe_erythroderma");
  }
  if (redFlags.categories.includes("necrotizing_overlap") || /necrotizing (soft tissue|fasciitis) .*(skin|rash)/.test(text)) {
    branches.push("necrotizing_overlap");
  }
  if (/immunocompromised.*(severe|widespread|disseminated) (rash|skin)|severe rash.*immunocompromised/.test(text)) {
    branches.push("severe_immunocompromised_rash");
  }
  if (
    redFlags.categories.includes("severe_mucosal_ocular") ||
    /ocular involvement with (blistering|mucosal)|severe mucosal (sloughing|erosions|involvement)/.test(text)
  ) {
    branches.push("ocular_mucosal_involvement");
  }
  if (/systemic toxicity|toxic appearing with (rash|skin)|sepsis concern with (rash|skin)/.test(text)) {
    branches.push("systemic_toxicity");
  }

  if (branches.length === 0) branches.push("other");

  const isFollowUpContext = /follow[- ]?up|post-?acute|recheck|known (stable|resolving)|interval exam/.test(text);
  const isHighAcuityLocked = branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch));

  const dischargeFamilyId = isHighAcuityLocked
    ? isFollowUpContext
      ? highAcuityFollowUpFamily(branches)
      : null
    : DERMATOLOGIC_EMERGENCY_DISCHARGE_FAMILY.other;

  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

const BRANCH_PRIORITY: Record<string, number> = {
  sjs_ten: 100,
  purpura_fulminans: 98,
  necrotizing_overlap: 97,
  dress: 95,
  agep: 94,
  meningococcal_type_rash: 93,
  petechiae_purpura_systemic: 90,
  disseminated_infection: 85,
  severe_erythroderma: 82,
  severe_immunocompromised_rash: 78,
  ocular_mucosal_involvement: 75,
  systemic_toxicity: 90,
  other: 0,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis, medication order, or disposition. */
export function adaptDermatologicEmergencyIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<DermatologicEmergencyContext, "branches" | "redFlagCategories">
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
