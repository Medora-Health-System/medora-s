/**
 * Phase 14 — allergic / inflammatory skin disorder clinical documentation context. Mirrors
 * `abscessPurulentInfectionClinicalIntelligence.ts` (Phase 13). Documentation advisory
 * only — never establishes a diagnosis, disposition, medication order, biopsy, admission,
 * transfer, or consult. Ownership of the actual clinical decision stays with the treating
 * clinician.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveDermatologicEmergencyRedFlags,
  type DermatologicEmergencyRedFlagInput,
} from "./dermatologicEmergencyRedFlagEngine";

export type AllergicInflammatoryDermatologyBranch =
  | "allergic_contact_dermatitis"
  | "irritant_contact_dermatitis"
  | "atopic_dermatitis"
  | "eczema_flare"
  | "urticaria"
  | "angioedema_overlap"
  | "psoriasis_plaque"
  | "psoriasis_pustular_or_erythrodermic"
  | "rosacea"
  | "seborrheic_dermatitis"
  | "intertrigo"
  | "drug_eruption_uncomplicated"
  | "autoimmune_inflammatory_rash"
  | "other";

export type AllergicInflammatoryDermatologyContext = {
  branches: AllergicInflammatoryDermatologyBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveDermatologicEmergencyRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** High-acuity branches (pustular/erythrodermic psoriasis, angioedema with airway involvement) that withhold routine discharge unless documented as post-acute follow-up. */
const HIGH_ACUITY_LOCK: readonly AllergicInflammatoryDermatologyBranch[] = ["psoriasis_pustular_or_erythrodermic"];

/**
 * Phase 14 Commit 2 — wired to real `providerDischargeTemplateRegistry.ts` template IDs.
 * `seborrheic_dermatitis`, `intertrigo` (etiology-unspecified), `autoimmune_inflammatory_rash`
 * (lupus/dermatomyositis), and `psoriasis_pustular_or_erythrodermic` have no matching
 * post-acute template in the registry, so they resolve to `null` below rather than a
 * placeholder string that would not exist in the registry.
 */
export const ALLERGIC_INFLAMMATORY_DERMATOLOGY_DISCHARGE_FAMILY: Record<AllergicInflammatoryDermatologyBranch, string> =
  {
    allergic_contact_dermatitis: "allergic_contact_dermatitis_v1",
    irritant_contact_dermatitis: "irritant_contact_dermatitis_v1",
    atopic_dermatitis: "atopic_dermatitis_v1",
    eczema_flare: "atopic_dermatitis_v1",
    urticaria: "uncomplicated_urticaria_v1",
    angioedema_overlap: "allergic_reaction_v1",
    psoriasis_plaque: "psoriasis_flare_v1",
    psoriasis_pustular_or_erythrodermic: "psoriasis_pustular_or_erythrodermic_followup",
    rosacea: "rosacea_v1",
    seborrheic_dermatitis: "seborrheic_dermatitis_followup",
    intertrigo: "intertrigo_followup",
    drug_eruption_uncomplicated: "drug_eruption_v1",
    autoimmune_inflammatory_rash: "autoimmune_inflammatory_rash_followup",
    other: "allergic_inflammatory_dermatology_other_followup",
  };

/** Documentation advisory only. Never establishes a diagnosis, medication order, or disposition. */
export function resolveAllergicInflammatoryDermatologyContext(
  input: DermatologicEmergencyRedFlagInput
): AllergicInflammatoryDermatologyContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: AllergicInflammatoryDermatologyBranch[] = [];

  if (/allergic contact dermatitis|poison ivy|poison oak|contact dermatitis.*(allerg|new (soap|detergent|jewelry))/.test(text)) {
    branches.push("allergic_contact_dermatitis");
  } else if (/irritant contact dermatitis|irritant dermatitis/.test(text)) {
    branches.push("irritant_contact_dermatitis");
  }
  if (/atopic dermatitis/.test(text)) branches.push("atopic_dermatitis");
  if (/eczema flare|eczema exacerbation/.test(text)) branches.push("eczema_flare");
  if (/urticaria|hives\b/.test(text)) branches.push("urticaria");

  const hasAirwayConcern = /throat (tightness|swelling)|tongue swelling|stridor|voice change|airway compromise/.test(text);
  if (/angioedema/.test(text)) branches.push("angioedema_overlap");

  const redFlags = resolveDermatologicEmergencyRedFlags(input);
  const hasPustularOrErythrodermicRedFlag =
    redFlags.categories.includes("generalized_pustular_psoriasis") || redFlags.categories.includes("severe_erythroderma");
  if (
    hasPustularOrErythrodermicRedFlag ||
    /generalized pustular psoriasis|von zumbusch|erythrodermic psoriasis|psoriasis.*(erythroderma|pustular)/.test(text)
  ) {
    branches.push("psoriasis_pustular_or_erythrodermic");
  } else if (/psoriasis (plaque|vulgaris)|plaque psoriasis/.test(text)) {
    branches.push("psoriasis_plaque");
  }

  if (/rosacea/.test(text)) branches.push("rosacea");
  if (/seborrheic dermatitis|seborrhea/.test(text)) branches.push("seborrheic_dermatitis");
  if (/intertrigo|skin fold (rash|irritation|infection)/.test(text)) branches.push("intertrigo");
  if (/drug eruption|morbilliform drug rash|exanthematous drug eruption/.test(text) && !hasPustularOrErythrodermicRedFlag) {
    branches.push("drug_eruption_uncomplicated");
  }
  if (/lupus rash|dermatomyositis rash|autoimmune (inflammatory )?rash/.test(text)) {
    branches.push("autoimmune_inflammatory_rash");
  }

  if (branches.length === 0) branches.push("other");

  const isFollowUpContext = /follow[- ]?up|post-?acute|recheck|known (stable|resolving)|interval exam/.test(text);
  const isHighAcuityLocked =
    branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch)) || (branches.includes("angioedema_overlap") && hasAirwayConcern);

  const dischargeFamilyId = isHighAcuityLocked
    ? isFollowUpContext
      ? branches.includes("psoriasis_pustular_or_erythrodermic")
        ? ALLERGIC_INFLAMMATORY_DERMATOLOGY_DISCHARGE_FAMILY.psoriasis_pustular_or_erythrodermic
        : ALLERGIC_INFLAMMATORY_DERMATOLOGY_DISCHARGE_FAMILY.angioedema_overlap
      : null
    : branches.includes("autoimmune_inflammatory_rash")
    ? null
    : branches.includes("angioedema_overlap")
    ? ALLERGIC_INFLAMMATORY_DERMATOLOGY_DISCHARGE_FAMILY.angioedema_overlap
    : branches.includes("psoriasis_plaque")
    ? ALLERGIC_INFLAMMATORY_DERMATOLOGY_DISCHARGE_FAMILY.psoriasis_plaque
    : branches.includes("urticaria")
    ? ALLERGIC_INFLAMMATORY_DERMATOLOGY_DISCHARGE_FAMILY.urticaria
    : branches.includes("intertrigo")
    ? null
    : branches.includes("seborrheic_dermatitis")
    ? null
    : branches.includes("rosacea")
    ? ALLERGIC_INFLAMMATORY_DERMATOLOGY_DISCHARGE_FAMILY.rosacea
    : branches.includes("drug_eruption_uncomplicated")
    ? ALLERGIC_INFLAMMATORY_DERMATOLOGY_DISCHARGE_FAMILY.drug_eruption_uncomplicated
    : branches.includes("eczema_flare")
    ? ALLERGIC_INFLAMMATORY_DERMATOLOGY_DISCHARGE_FAMILY.eczema_flare
    : branches.includes("atopic_dermatitis")
    ? ALLERGIC_INFLAMMATORY_DERMATOLOGY_DISCHARGE_FAMILY.atopic_dermatitis
    : branches.includes("irritant_contact_dermatitis")
    ? ALLERGIC_INFLAMMATORY_DERMATOLOGY_DISCHARGE_FAMILY.irritant_contact_dermatitis
    : branches.includes("allergic_contact_dermatitis")
    ? ALLERGIC_INFLAMMATORY_DERMATOLOGY_DISCHARGE_FAMILY.allergic_contact_dermatitis
    : ALLERGIC_INFLAMMATORY_DERMATOLOGY_DISCHARGE_FAMILY.other;

  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

const BRANCH_PRIORITY: Record<string, number> = {
  generalized_pustular_psoriasis: 96,
  severe_erythroderma: 94,
  psoriasis_pustular_or_erythrodermic: 90,
  angioedema_overlap: 80,
  autoimmune_inflammatory_rash: 45,
  psoriasis_plaque: 30,
  urticaria: 25,
  drug_eruption_uncomplicated: 22,
  intertrigo: 15,
  seborrheic_dermatitis: 12,
  rosacea: 10,
  eczema_flare: 10,
  atopic_dermatitis: 8,
  irritant_contact_dermatitis: 6,
  allergic_contact_dermatitis: 6,
  other: 0,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis, medication order, or disposition. */
export function adaptAllergicInflammatoryDermatologyIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<AllergicInflammatoryDermatologyContext, "branches" | "redFlagCategories">
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
