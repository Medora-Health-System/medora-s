/**
 * Phase 14 — vesicular / bullous skin disorder clinical documentation context. Mirrors
 * `highRiskWoundInfectionClinicalIntelligence.ts` (Phase 13). Documentation advisory
 * only — never establishes a diagnosis, disposition, medication order, biopsy, admission,
 * transfer, or consult. Ownership of the actual clinical decision (including ophthalmology
 * evaluation for ocular zoster) stays with the treating clinician.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveDermatologicEmergencyRedFlags,
  type DermatologicEmergencyRedFlagInput,
} from "./dermatologicEmergencyRedFlagEngine";

export type VesicularBullousSkinDisorderBranch =
  | "herpes_simplex"
  | "herpes_zoster"
  | "ophthalmic_zoster_concern"
  | "varicella"
  | "bullous_impetigo"
  | "erythema_multiforme"
  | "sjs_ten_concern"
  | "autoimmune_bullous_disorder"
  | "blistering_medication_reaction"
  | "herpetic_whitlow"
  | "eczema_herpeticum_concern"
  | "other";

export type VesicularBullousSkinDisorderContext = {
  branches: VesicularBullousSkinDisorderBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveDermatologicEmergencyRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Branches that must never fall through to a routine discharge family without explicit follow-up context. Ophthalmic zoster additionally notes that eye exam ownership belongs to ophthalmology. */
const HIGH_ACUITY_LOCK: readonly VesicularBullousSkinDisorderBranch[] = [
  "sjs_ten_concern",
  "eczema_herpeticum_concern",
  "ophthalmic_zoster_concern",
];

/**
 * Phase 14 Commit 2 — wired to real `providerDischargeTemplateRegistry.ts` template IDs.
 * `blistering_medication_reaction` (etiology-unclear, could evolve toward SJS/TEN) and the
 * generic `other` bucket have no single matching template, so they resolve to `null` below.
 */
export const VESICULAR_BULLOUS_SKIN_DISORDER_DISCHARGE_FAMILY: Record<VesicularBullousSkinDisorderBranch, string> = {
  herpes_simplex: "herpes_simplex_v1",
  herpes_zoster: "herpes_zoster_v1",
  ophthalmic_zoster_concern: "ophthalmic_zoster_post_acute_v1",
  varicella: "varicella_v1",
  bullous_impetigo: "impetigo_v1",
  erythema_multiforme: "erythema_multiforme_v1",
  sjs_ten_concern: "sjs_ten_post_acute_v1",
  autoimmune_bullous_disorder: "bullous_disorder_post_acute_v1",
  blistering_medication_reaction: "blistering_medication_reaction_followup",
  herpetic_whitlow: "herpetic_whitlow_followup",
  eczema_herpeticum_concern: "eczema_herpeticum_concern_followup",
  other: "vesicular_bullous_skin_disorder_other_followup",
};

function highAcuityFollowUpFamily(branches: readonly VesicularBullousSkinDisorderBranch[]): string {
  if (branches.includes("sjs_ten_concern")) return VESICULAR_BULLOUS_SKIN_DISORDER_DISCHARGE_FAMILY.sjs_ten_concern;
  if (branches.includes("eczema_herpeticum_concern")) {
    return VESICULAR_BULLOUS_SKIN_DISORDER_DISCHARGE_FAMILY.eczema_herpeticum_concern;
  }
  if (branches.includes("ophthalmic_zoster_concern")) {
    return VESICULAR_BULLOUS_SKIN_DISORDER_DISCHARGE_FAMILY.ophthalmic_zoster_concern;
  }
  return "vesicular_bullous_skin_disorder_high_acuity_followup";
}

/** Documentation advisory only. Never establishes a diagnosis, medication order, or disposition. */
export function resolveVesicularBullousSkinDisorderContext(
  input: DermatologicEmergencyRedFlagInput
): VesicularBullousSkinDisorderContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: VesicularBullousSkinDisorderBranch[] = [];

  const redFlags = resolveDermatologicEmergencyRedFlags(input);

  if (/herpetic whitlow|herpes simplex (of|involving) the finger/.test(text)) {
    branches.push("herpetic_whitlow");
  } else if (/herpes simplex|cold sore|oral herpes|genital herpes/.test(text)) {
    branches.push("herpes_simplex");
  }

  if (/ophthalmic zoster|zoster ophthalmicus|shingles.*(eye|periorbital)|hutchinson.?s? sign/.test(text)) {
    branches.push("ophthalmic_zoster_concern");
  } else if (/herpes zoster|shingles/.test(text)) {
    branches.push("herpes_zoster");
  }

  if (/varicella|chickenpox/.test(text)) branches.push("varicella");
  if (/bullous impetigo/.test(text)) branches.push("bullous_impetigo");
  if (/erythema multiforme/.test(text)) branches.push("erythema_multiforme");

  const hasSjsTenRedFlag = redFlags.categories.includes("sjs_ten");
  if (
    hasSjsTenRedFlag ||
    /stevens.johnson|toxic epidermal necrolysis|\bsjs\b|\bten\b(?! percent)|epidermal detachment|positive nikolsky/.test(text)
  ) {
    branches.push("sjs_ten_concern");
  }

  if (/bullous pemphigoid|pemphigus vulgaris|autoimmune bullous (disorder|disease)/.test(text)) {
    branches.push("autoimmune_bullous_disorder");
  }
  if (/blistering (drug|medication) reaction|drug.induced blistering/.test(text)) {
    branches.push("blistering_medication_reaction");
  }

  const hasEczemaHerpeticumRedFlag = redFlags.categories.includes("eczema_herpeticum");
  if (
    hasEczemaHerpeticumRedFlag ||
    /eczema herpeticum|kaposi.?s? varicelliform eruption|punched.out (vesicles|erosions) (on|in|involving) (eczema|atopic dermatitis)/.test(
      text
    )
  ) {
    branches.push("eczema_herpeticum_concern");
  }

  if (branches.length === 0 && /vesicular|bullous|blister/.test(text)) {
    branches.push("other");
  } else if (branches.length === 0) {
    branches.push("other");
  }

  const isFollowUpContext = /follow[- ]?up|post-?acute|recheck|known (stable|resolving)|interval exam/.test(text);
  const isHighAcuityLocked = branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch));

  const dischargeFamilyId = isHighAcuityLocked
    ? isFollowUpContext
      ? highAcuityFollowUpFamily(branches)
      : null
    : branches.includes("herpetic_whitlow")
    ? null
    : branches.includes("blistering_medication_reaction")
    ? null
    : branches.includes("autoimmune_bullous_disorder")
    ? VESICULAR_BULLOUS_SKIN_DISORDER_DISCHARGE_FAMILY.autoimmune_bullous_disorder
    : branches.includes("erythema_multiforme")
    ? VESICULAR_BULLOUS_SKIN_DISORDER_DISCHARGE_FAMILY.erythema_multiforme
    : branches.includes("bullous_impetigo")
    ? VESICULAR_BULLOUS_SKIN_DISORDER_DISCHARGE_FAMILY.bullous_impetigo
    : branches.includes("varicella")
    ? VESICULAR_BULLOUS_SKIN_DISORDER_DISCHARGE_FAMILY.varicella
    : branches.includes("herpes_zoster")
    ? VESICULAR_BULLOUS_SKIN_DISORDER_DISCHARGE_FAMILY.herpes_zoster
    : branches.includes("herpes_simplex")
    ? VESICULAR_BULLOUS_SKIN_DISORDER_DISCHARGE_FAMILY.herpes_simplex
    : VESICULAR_BULLOUS_SKIN_DISORDER_DISCHARGE_FAMILY.other;

  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

const BRANCH_PRIORITY: Record<string, number> = {
  sjs_ten: 100,
  sjs_ten_concern: 100,
  eczema_herpeticum: 92,
  eczema_herpeticum_concern: 92,
  ophthalmic_zoster_concern: 85,
  autoimmune_bullous_disorder: 55,
  blistering_medication_reaction: 50,
  erythema_multiforme: 40,
  bullous_impetigo: 30,
  varicella: 25,
  herpes_zoster: 20,
  herpetic_whitlow: 15,
  herpes_simplex: 10,
  other: 0,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis, medication order, or disposition. */
export function adaptVesicularBullousSkinDisorderIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<VesicularBullousSkinDisorderContext, "branches" | "redFlagCategories">
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
