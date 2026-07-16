import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { resolveHeadFacialRedFlags, type HeadFacialRedFlagInput } from "./headFacialRedFlagEngine";

export type FacialTraumaBranch =
  | "nasal"
  | "orbital"
  | "zygomatic"
  | "maxillary"
  | "mandibular"
  | "lefort"
  | "dental"
  | "jaw_dislocation"
  | "ear"
  | "septal_hematoma"
  | "facial_laceration"
  | "facial_nerve";

export type FacialTraumaContext = {
  branches: FacialTraumaBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveHeadFacialRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Documentation advisory only. Never establishes a diagnosis or disposition.
 * Ownership of eye/ENT/dental clinical decision-making stays with the treating specialty;
 * this module only reorders which documentation chips are surfaced first.
 */
export function resolveFacialTraumaContext(input: HeadFacialRedFlagInput): FacialTraumaContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: FacialTraumaBranch[] = [];
  if (/septal hematoma|nasal septal hematoma/.test(text)) branches.push("septal_hematoma");
  if (/nasal fracture|broken nose|s02\.2/.test(text)) branches.push("nasal");
  if (/orbital (floor |wall )?fracture|blowout fracture|s02\.3/.test(text)) branches.push("orbital");
  if (/zygomatic fracture|malar fracture/.test(text)) branches.push("zygomatic");
  if (/maxillary fracture|maxilla fracture|s02\.4/.test(text)) branches.push("maxillary");
  if (/mandible fracture|mandibular fracture|s02\.6/.test(text)) branches.push("mandibular");
  if (/le ?fort/.test(text)) branches.push("lefort");
  if (/dental (fracture|avulsion|subluxation)|tooth (fracture|avulsion)|s02\.5/.test(text)) branches.push("dental");
  if (/jaw dislocation|tmj dislocation|mandible dislocation|s03\.0/.test(text)) branches.push("jaw_dislocation");
  if (/auricular hematoma|ear laceration|tympanic membrane perforation|pinna|s01\.3/.test(text)) branches.push("ear");
  if (/facial laceration|face laceration|s01\.[0-9]/.test(text)) branches.push("facial_laceration");
  if (/facial nerve (palsy|injury)|cn ?vii|bell.?s palsy/.test(text)) branches.push("facial_nerve");

  const redFlags = resolveHeadFacialRedFlags(input);

  // Septal hematoma must never fall through to the generic nasal-fracture discharge family.
  const dischargeFamilyId =
    branches.includes("septal_hematoma") ? null
    : branches.includes("lefort") ? null
    : branches.includes("facial_nerve") ? null
    : branches.includes("mandibular") ? null
    : branches.includes("jaw_dislocation") ? "jaw_dislocation_post_reduction"
    : branches.includes("orbital") ? "orbital_fracture_eye_followup"
    : branches.includes("dental") ? "dental_avulsion_fracture_followup"
    : /hematoma/.test(text) && branches.includes("ear") ? null
    : branches.includes("ear") ? "auricular_injury_followup"
    : branches.includes("zygomatic") ? "zygomatic_fracture_followup"
    : branches.includes("maxillary") ? "maxillary_fracture_followup"
    : branches.includes("nasal") ? "nasal_fracture_followup"
    : branches.includes("facial_laceration") ? "facial_laceration_followup"
    : null;

  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

const BRANCH_PRIORITY: Record<string, number> = {
  lefort: 100,
  septal_hematoma_csf: 98,
  septal_hematoma: 96,
  airway_ocular: 94,
  facial_nerve: 90,
  mandibular: 82,
  orbital: 78,
  jaw_dislocation: 70,
  non_accidental_trauma: 68,
  ear: 55,
  zygomatic: 50,
  maxillary: 50,
  dental: 45,
  nasal: 30,
  facial_laceration: 20,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis or disposition. */
export function adaptFacialTraumaComplaintIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<FacialTraumaContext, "branches" | "redFlagCategories">,
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
