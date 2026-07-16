/**
 * Phase 12 — ear pain / hearing change / vertigo clinical documentation context.
 * Mirrors `eyeComplaintClinicalIntelligence.ts` (Phase 11). Documentation advisory only —
 * never establishes a diagnosis or disposition. Ownership of the actual clinical decision
 * (treat, refer, admit) stays with the treating clinician; this module only reorders
 * documentation chips and screens whether an advisory discharge family may be offered.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { resolveEntEmergencyRedFlags, type EntEmergencyRedFlagInput } from "./entEmergencyRedFlagEngine";
import { resolveVertigoDifferentiationContext } from "./vertigoDifferentiationEngine";

export type EntEarHearingVertigoBranch =
  | "ear_pain"
  | "otitis_externa"
  | "malignant_otitis_externa"
  | "otitis_media"
  | "mastoiditis"
  | "tm_perforation"
  | "ssnhl"
  | "vertigo"
  | "bppv"
  | "vestibular_neuritis"
  | "labyrinthitis"
  | "meniere_type"
  | "central_vertigo_concern"
  | "facial_nerve"
  | "ramsay_hunt"
  | "ear_foreign_body";

export type EntEarHearingVertigoContext = {
  branches: EntEarHearingVertigoBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveEntEmergencyRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Branches whose presentation must never fall through to a routine discharge family, even on follow-up context. */
const NEVER_AUTOMATIC_DISCHARGE: readonly EntEarHearingVertigoBranch[] = ["central_vertigo_concern"];

/** High-acuity branches that withhold routine discharge unless the documentation is an explicit post-acute follow-up. */
const HIGH_ACUITY_LOCK: readonly EntEarHearingVertigoBranch[] = ["malignant_otitis_externa", "mastoiditis", "ssnhl"];

/** Branch → advisory discharge/follow-up family id (Part 32 family naming; no `_v1` suffix). */
export const ENT_EAR_HEARING_VERTIGO_DISCHARGE_FAMILY: Record<EntEarHearingVertigoBranch, string> = {
  ear_pain: "ear_pain_undifferentiated_followup",
  otitis_externa: "acute_otitis_externa",
  malignant_otitis_externa: "malignant_otitis_externa_followup",
  otitis_media: "acute_otitis_media",
  mastoiditis: "mastoiditis_post_acute",
  tm_perforation: "tm_perforation_followup",
  ssnhl: "sudden_hearing_loss_followup",
  vertigo: "peripheral_vertigo_followup",
  bppv: "bppv_followup",
  vestibular_neuritis: "vestibular_neuritis_followup",
  labyrinthitis: "labyrinthitis_followup",
  meniere_type: "meniere_type_followup",
  central_vertigo_concern: "central_vertigo_concern_followup",
  facial_nerve: "peripheral_facial_palsy_followup",
  ramsay_hunt: "ramsay_hunt_followup",
  ear_foreign_body: "ear_foreign_body_followup",
};

/**
 * Documentation advisory only. Never establishes a diagnosis, disposition, or peripheral
 * vs. central vertigo classification (see `vertigoDifferentiationEngine.ts`).
 */
export function resolveEntEarHearingVertigoContext(input: EntEmergencyRedFlagInput): EntEarHearingVertigoContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: EntEarHearingVertigoBranch[] = [];

  if (/malignant otitis externa|necrotizing otitis externa|skull base osteomyelitis/.test(text)) {
    branches.push("malignant_otitis_externa");
  } else if (/otitis externa|swimmer'?s ear|ear canal (infection|inflammation)/.test(text)) {
    branches.push("otitis_externa");
  }
  if (/mastoiditis|postauricular (swelling|erythema|fluctuance)/.test(text)) branches.push("mastoiditis");
  if (/acute otitis media|middle ear infection|bulging tympanic membrane/.test(text)) branches.push("otitis_media");
  if (/tympanic membrane perforation|perforated (ear ?drum|tympanic membrane)/.test(text)) branches.push("tm_perforation");
  if (/sudden sensorineural hearing loss|\bssnhl\b|sudden hearing loss/.test(text)) branches.push("ssnhl");

  if (/ramsay hunt|herpes zoster oticus|vesicles (in|on) the (ear canal|auricle|pinna)/.test(text)) {
    branches.push("ramsay_hunt");
  } else if (/facial (nerve )?palsy|bell'?s palsy|facial weakness|facial droop/.test(text)) {
    branches.push("facial_nerve");
  }

  const vertigoContext = resolveVertigoDifferentiationContext(input);
  for (const vertigoBranch of vertigoContext.branches) branches.push(vertigoBranch);
  if (
    branches.length === 0 || !branches.some((b) => ["bppv", "vestibular_neuritis", "labyrinthitis", "meniere_type", "central_vertigo_concern"].includes(b))
  ) {
    if (/\bvertigo\b|room is spinning|spinning sensation/.test(text)) branches.push("vertigo");
  }

  if (/foreign body in (the )?ear|ear canal foreign body|object in (the )?ear/.test(text)) branches.push("ear_foreign_body");
  if (!branches.includes("otitis_media") && !branches.includes("otitis_externa") && /ear pain|otalgia/.test(text)) {
    branches.push("ear_pain");
  }

  const isFollowUpContext = /follow[- ]?up|recheck|known (stable|resolving)|interval exam|post-?operative check/.test(text);
  const redFlags = resolveEntEmergencyRedFlags(input);
  const isNeverAutomatic = branches.some((branch) => NEVER_AUTOMATIC_DISCHARGE.includes(branch));
  const isHighAcuityRamsayHunt =
    branches.includes("ramsay_hunt") &&
    (redFlags.categories.includes("facial_nerve_central_concern") || /airway/.test(text));
  const isHighAcuityLocked = branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch)) || isHighAcuityRamsayHunt;

  const dischargeFamilyId =
    isNeverAutomatic ? null
    : isHighAcuityLocked ? (isFollowUpContext ? highAcuityFollowUpFamily(branches, isHighAcuityRamsayHunt) : null)
    : branches.includes("ramsay_hunt") ? ENT_EAR_HEARING_VERTIGO_DISCHARGE_FAMILY.ramsay_hunt
    : branches.includes("facial_nerve") ? ENT_EAR_HEARING_VERTIGO_DISCHARGE_FAMILY.facial_nerve
    : branches.includes("tm_perforation") ? ENT_EAR_HEARING_VERTIGO_DISCHARGE_FAMILY.tm_perforation
    : branches.includes("otitis_media") ? ENT_EAR_HEARING_VERTIGO_DISCHARGE_FAMILY.otitis_media
    : branches.includes("otitis_externa") ? ENT_EAR_HEARING_VERTIGO_DISCHARGE_FAMILY.otitis_externa
    : branches.includes("labyrinthitis") ? ENT_EAR_HEARING_VERTIGO_DISCHARGE_FAMILY.labyrinthitis
    : branches.includes("vestibular_neuritis") ? ENT_EAR_HEARING_VERTIGO_DISCHARGE_FAMILY.vestibular_neuritis
    : branches.includes("meniere_type") ? ENT_EAR_HEARING_VERTIGO_DISCHARGE_FAMILY.meniere_type
    : branches.includes("bppv") ? ENT_EAR_HEARING_VERTIGO_DISCHARGE_FAMILY.bppv
    : branches.includes("vertigo") ? ENT_EAR_HEARING_VERTIGO_DISCHARGE_FAMILY.vertigo
    : branches.includes("ear_foreign_body") ? ENT_EAR_HEARING_VERTIGO_DISCHARGE_FAMILY.ear_foreign_body
    : branches.includes("ear_pain") ? ENT_EAR_HEARING_VERTIGO_DISCHARGE_FAMILY.ear_pain
    : null;

  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

function highAcuityFollowUpFamily(
  branches: readonly EntEarHearingVertigoBranch[],
  isHighAcuityRamsayHunt: boolean
): string {
  if (branches.includes("malignant_otitis_externa")) return ENT_EAR_HEARING_VERTIGO_DISCHARGE_FAMILY.malignant_otitis_externa;
  if (branches.includes("mastoiditis")) return ENT_EAR_HEARING_VERTIGO_DISCHARGE_FAMILY.mastoiditis;
  if (branches.includes("ssnhl")) return ENT_EAR_HEARING_VERTIGO_DISCHARGE_FAMILY.ssnhl;
  if (isHighAcuityRamsayHunt) return ENT_EAR_HEARING_VERTIGO_DISCHARGE_FAMILY.ramsay_hunt;
  return "ent_ear_high_acuity_followup";
}

const BRANCH_PRIORITY: Record<string, number> = {
  central_vertigo: 100,
  central_vertigo_concern: 100,
  malignant_otitis_externa: 96,
  mastoiditis: 94,
  sudden_hearing_loss: 92,
  ssnhl: 92,
  facial_nerve_central_concern: 90,
  ramsay_hunt: 88,
  button_battery_foreign_body: 84,
  facial_nerve: 55,
  labyrinthitis: 50,
  meniere_type: 48,
  vestibular_neuritis: 45,
  tm_perforation: 40,
  otitis_media: 35,
  otitis_externa: 30,
  bppv: 25,
  vertigo: 20,
  ear_foreign_body: 15,
  ear_pain: 5,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis or disposition. */
export function adaptEntEarHearingVertigoIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<EntEarHearingVertigoContext, "branches" | "redFlagCategories">
): ProviderDocumentationComplaintIntelligence {
  const weightedHints = [
    ...context.redFlagCategories.map((value) => ({ hint: value.replace(/_/g, " "), weight: BRANCH_PRIORITY[value] ?? 90 })),
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
