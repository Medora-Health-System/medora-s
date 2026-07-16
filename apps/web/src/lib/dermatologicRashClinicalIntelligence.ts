/**
 * Phase 14 — undifferentiated rash / skin lesion clinical documentation context. Mirrors
 * `softTissueInfectionClinicalIntelligence.ts` (Phase 13). Documentation advisory only —
 * never establishes a diagnosis, disposition, medication order, biopsy, admission,
 * transfer, or consult. Ownership of the actual clinical decision stays with the treating
 * clinician.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveDermatologicEmergencyRedFlags,
  type DermatologicEmergencyRedFlagInput,
} from "./dermatologicEmergencyRedFlagEngine";

export type DermatologicRashBranch =
  | "undifferentiated_rash"
  | "viral_exanthem"
  | "bacterial_eruption_concern"
  | "fungal_infection_concern"
  | "parasitic_infestation_concern"
  | "inflammatory_dermatosis_concern"
  | "suspicious_lesion_concern"
  | "serious_rash_red_flag_concern"
  | "other";

export type DermatologicRashContext = {
  branches: DermatologicRashBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveDermatologicEmergencyRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** High-acuity branch (serious dermatologic emergency red flag) that withholds routine discharge unless documented as post-acute follow-up. */
const HIGH_ACUITY_LOCK: readonly DermatologicRashBranch[] = ["serious_rash_red_flag_concern"];

/**
 * Phase 14 Commit 2 — wired to real `providerDischargeTemplateRegistry.ts` template IDs.
 * `inflammatory_dermatosis_concern` (lichen planus, other dermatosis flares) and the
 * heterogeneous `serious_rash_red_flag_concern` / `other` buckets have no single matching
 * post-acute template in the registry, so they intentionally resolve to `null` below rather
 * than a placeholder string that would not exist in the registry.
 */
export const DERMATOLOGIC_RASH_DISCHARGE_FAMILY: Record<DermatologicRashBranch, string> = {
  undifferentiated_rash: "viral_exanthem_v1",
  viral_exanthem: "viral_exanthem_v1",
  bacterial_eruption_concern: "impetigo_v1",
  fungal_infection_concern: "tinea_corporis_v1",
  parasitic_infestation_concern: "scabies_v1",
  inflammatory_dermatosis_concern: "inflammatory_dermatosis_followup",
  suspicious_lesion_concern: "suspicious_skin_lesion_v1",
  serious_rash_red_flag_concern: "serious_rash_red_flag_followup",
  other: "dermatologic_rash_other_followup",
};

/** Documentation advisory only. Never establishes a diagnosis, medication order, or disposition. */
export function resolveDermatologicRashContext(input: DermatologicEmergencyRedFlagInput): DermatologicRashContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: DermatologicRashBranch[] = [];

  const redFlags = resolveDermatologicEmergencyRedFlags(input);
  const hasSeriousRedFlag =
    redFlags.categories.includes("sjs_ten") ||
    redFlags.categories.includes("dress") ||
    redFlags.categories.includes("agep") ||
    redFlags.categories.includes("meningococcal_type_rash") ||
    redFlags.categories.includes("purpura_fulminans") ||
    redFlags.categories.includes("petechiae_purpura_systemic");
  if (hasSeriousRedFlag || /serious rash red flag|nonblanching rash with fever|widespread blistering/.test(text)) {
    branches.push("serious_rash_red_flag_concern");
  }

  if (/viral exanthem|measles|rubella|roseola|fifth disease|erythema infectiosum|hand.foot.and.mouth/.test(text)) {
    branches.push("viral_exanthem");
  }
  if (/impetigo|folliculitis|bacterial (skin )?infection|scarlet fever/.test(text)) {
    branches.push("bacterial_eruption_concern");
  }
  if (/tinea|ringworm|candidiasis|fungal (skin )?infection/.test(text)) {
    branches.push("fungal_infection_concern");
  }
  if (/scabies|pediculosis|lice infestation|parasitic infestation/.test(text)) {
    branches.push("parasitic_infestation_concern");
  }
  if (/inflammatory dermatosis|lichen planus|dermatosis flare/.test(text)) {
    branches.push("inflammatory_dermatosis_concern");
  }
  if (
    /suspicious (skin )?lesion|irregular border|asymmetric pigmented lesion|changing mole|non.healing (skin )?lesion|concern for melanoma/.test(
      text
    )
  ) {
    branches.push("suspicious_lesion_concern");
  }

  if (branches.length === 0 && /rash|skin lesion|eruption/.test(text)) {
    branches.push("undifferentiated_rash");
  }
  if (branches.length === 0) {
    branches.push("other");
  }

  const isFollowUpContext = /follow[- ]?up|post-?acute|recheck|known (stable|resolving)|interval exam/.test(text);
  const isHighAcuityLocked = branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch));

  const dischargeFamilyId = isHighAcuityLocked
    ? isFollowUpContext
      ? DERMATOLOGIC_RASH_DISCHARGE_FAMILY.serious_rash_red_flag_concern
      : null
    : branches.includes("suspicious_lesion_concern")
    ? DERMATOLOGIC_RASH_DISCHARGE_FAMILY.suspicious_lesion_concern
    : branches.includes("parasitic_infestation_concern")
    ? DERMATOLOGIC_RASH_DISCHARGE_FAMILY.parasitic_infestation_concern
    : branches.includes("fungal_infection_concern")
    ? DERMATOLOGIC_RASH_DISCHARGE_FAMILY.fungal_infection_concern
    : branches.includes("bacterial_eruption_concern")
    ? DERMATOLOGIC_RASH_DISCHARGE_FAMILY.bacterial_eruption_concern
    : branches.includes("inflammatory_dermatosis_concern")
    ? null
    : branches.includes("viral_exanthem")
    ? DERMATOLOGIC_RASH_DISCHARGE_FAMILY.viral_exanthem
    : branches.includes("undifferentiated_rash")
    ? DERMATOLOGIC_RASH_DISCHARGE_FAMILY.undifferentiated_rash
    : DERMATOLOGIC_RASH_DISCHARGE_FAMILY.other;

  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

const BRANCH_PRIORITY: Record<string, number> = {
  sjs_ten: 100,
  dress: 98,
  agep: 96,
  meningococcal_type_rash: 96,
  purpura_fulminans: 96,
  petechiae_purpura_systemic: 92,
  serious_rash_red_flag_concern: 92,
  suspicious_lesion_concern: 55,
  parasitic_infestation_concern: 30,
  bacterial_eruption_concern: 25,
  fungal_infection_concern: 18,
  inflammatory_dermatosis_concern: 15,
  viral_exanthem: 10,
  undifferentiated_rash: 5,
  other: 0,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis, medication order, or disposition. */
export function adaptDermatologicRashIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<DermatologicRashContext, "branches" | "redFlagCategories">
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
