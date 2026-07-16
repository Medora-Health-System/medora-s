import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { resolveEyeEmergencyRedFlags, type EyeEmergencyRedFlagInput } from "./eyeEmergencyRedFlagEngine";

export type EyeComplaintBranch =
  | "red_eye"
  | "eye_pain"
  | "acute_visual_loss"
  | "corneal_abrasion"
  | "corneal_ulcer"
  | "acute_glaucoma"
  | "retinal_detachment"
  | "crao_crvo"
  | "optic_neuritis"
  | "uveitis"
  | "scleritis"
  | "orbital_cellulitis"
  | "preseptal_cellulitis"
  | "contact_lens";

export type EyeComplaintContext = {
  branches: EyeComplaintBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveEyeEmergencyRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Branches whose atraumatic presentation must never fall through to a routine discharge family. */
const VISION_THREATENING_LOCK: readonly EyeComplaintBranch[] = [
  "corneal_ulcer",
  "acute_glaucoma",
  "retinal_detachment",
  "crao_crvo",
  "orbital_cellulitis",
];

/**
 * Documentation advisory only. Never establishes a diagnosis or disposition. Ownership of the
 * actual clinical decision (admit, treat, refer) stays with the treating clinician; this module
 * only reorders documentation chips and screens whether an advisory discharge family may be
 * offered at all.
 */
export function resolveEyeComplaintContext(input: EyeEmergencyRedFlagInput): EyeComplaintContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: EyeComplaintBranch[] = [];
  if (/preseptal cellulitis|periorbital cellulitis/.test(text)) branches.push("preseptal_cellulitis");
  else if (/orbital cellulitis/.test(text)) branches.push("orbital_cellulitis");
  if (/corneal ulcer|corneal infiltrate|microbial keratitis|hypopyon/.test(text)) branches.push("corneal_ulcer");
  else if (/corneal abrasion|scratched (cornea|eye)|corneal (defect|epithelial defect)/.test(text)) branches.push("corneal_abrasion");
  if (/angle.?closure glaucoma|acute glaucoma/.test(text)) branches.push("acute_glaucoma");
  if (/retinal detachment|curtain (coming down|over vision)|shower of floaters/.test(text)) branches.push("retinal_detachment");
  if (/\bcrao\b|\bcrvo\b|central retinal (artery|vein) occlusion/.test(text)) branches.push("crao_crvo");
  if (/optic neuritis|retrobulbar neuritis|optic papillitis/.test(text)) branches.push("optic_neuritis");
  if (/uveitis|iritis|iridocyclitis/.test(text)) branches.push("uveitis");
  if (/scleritis|episcleritis/.test(text)) branches.push("scleritis");
  if (/contact lens/.test(text)) branches.push("contact_lens");
  if (/(sudden|acute|new) (vision loss|blindness)|vision loss in one eye|monocular vision loss/.test(text)) branches.push("acute_visual_loss");
  if (/eye pain|ocular pain|periorbital pain/.test(text)) branches.push("eye_pain");
  if (/red eye|conjunctival injection|eye redness/.test(text)) branches.push("red_eye");

  const isFollowUpContext = /follow[- ]?up|recheck|known (stable|resolving)|interval exam|post-?operative check/.test(text);
  const redFlags = resolveEyeEmergencyRedFlags(input);
  const hasOpenGlobeConcern = redFlags.categories.includes("open_globe");
  const hasEndophthalmitisConcern = redFlags.categories.includes("endophthalmitis");
  const isVisionThreatening = branches.some((branch) => VISION_THREATENING_LOCK.includes(branch));

  const dischargeFamilyId =
    hasOpenGlobeConcern ? null
    : hasEndophthalmitisConcern ? (isFollowUpContext ? "endophthalmitis_post_acute" : null)
    : isVisionThreatening ? (isFollowUpContext ? visionThreateningFollowUpFamily(branches) : null)
    : branches.includes("optic_neuritis") ? null
    : branches.includes("preseptal_cellulitis") ? "preseptal_cellulitis_followup"
    : branches.includes("uveitis") ? "uveitis_iritis_followup"
    : branches.includes("scleritis") ? "scleritis_followup"
    : branches.includes("contact_lens") && redFlags.categories.includes("contact_lens_keratitis") ? null
    : branches.includes("contact_lens") ? "contact_lens_followup"
    : branches.includes("corneal_abrasion") ? "corneal_abrasion_followup"
    : null;

  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

function visionThreateningFollowUpFamily(branches: readonly EyeComplaintBranch[]): string {
  if (branches.includes("acute_glaucoma")) return "acute_glaucoma_followup";
  if (branches.includes("retinal_detachment")) return "retinal_detachment_followup";
  if (branches.includes("crao_crvo")) return "crao_crvo_followup";
  if (branches.includes("orbital_cellulitis")) return "orbital_cellulitis_followup";
  if (branches.includes("corneal_ulcer")) return "corneal_ulcer_followup";
  return "eye_vision_threatening_followup";
}

const BRANCH_PRIORITY: Record<string, number> = {
  open_globe: 100,
  acute_glaucoma: 96,
  retinal_detachment: 94,
  retinal_vascular: 93,
  crao_crvo: 92,
  orbital_cellulitis: 90,
  endophthalmitis: 88,
  corneal_ulcer: 85,
  chemical_injury: 84,
  acute_visual_loss: 82,
  vision_loss: 80,
  orbital_compartment: 78,
  optic_neuritis: 75,
  contact_lens_keratitis: 70,
  uveitis: 60,
  scleritis: 55,
  preseptal_cellulitis: 40,
  corneal_abrasion: 30,
  contact_lens: 25,
  eye_pain: 15,
  red_eye: 10,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis or disposition. */
export function adaptEyeComplaintIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<EyeComplaintContext, "branches" | "redFlagCategories">,
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
  return { ...intel, hpi: prioritize(intel.hpi), rosRedFlags: prioritize(intel.rosRedFlags), mdmPlanSummary: prioritize(intel.mdmPlanSummary) };
}
