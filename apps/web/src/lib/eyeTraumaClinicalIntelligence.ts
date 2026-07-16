import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { resolveEyeEmergencyRedFlags, type EyeEmergencyRedFlagInput } from "./eyeEmergencyRedFlagEngine";

export type EyeTraumaBranch =
  | "corneal_fb"
  | "conjunctival_fb"
  | "chemical"
  | "thermal_uv"
  | "open_globe"
  | "hyphema"
  | "traumatic_iritis"
  | "eyelid_laceration"
  | "canalicular"
  | "retrobulbar"
  | "orbital_compartment"
  | "abrasion_from_trauma";

export type EyeTraumaContext = {
  branches: EyeTraumaBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveEyeEmergencyRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Branches that must never resolve to an automatic discharge family. Clinician selection only. */
const NEVER_AUTOMATIC_DISCHARGE: readonly EyeTraumaBranch[] = ["open_globe", "retrobulbar", "orbital_compartment"];

/**
 * Documentation advisory only. Never establishes a diagnosis, disposition, or IOP requirement.
 * Ownership of the actual clinical decision stays with the treating clinician.
 */
export function resolveEyeTraumaContext(input: EyeEmergencyRedFlagInput): EyeTraumaContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: EyeTraumaBranch[] = [];
  if (/open globe|globe rupture|ruptured globe|penetrating (eye|ocular|globe) injury|teardrop pupil/.test(text)) branches.push("open_globe");
  if (/foreign body in (the )?cornea|corneal foreign body/.test(text)) branches.push("corneal_fb");
  else if (/foreign body in (the )?conjunctiv|conjunctival foreign body|foreign body in (the )?conjunctival sac/.test(text)) branches.push("conjunctival_fb");
  if (/chemical (splash|exposure|burn|eye injury|injury)|alkali (exposure|burn)|acid (exposure|burn)|corrosion of (the )?(cornea|eye|eyelid)/.test(text)) branches.push("chemical");
  if (/thermal (burn|injury) (to the )?eye|welder'?s flash|uv keratitis|photokeratitis|arc eye|snow blindness/.test(text)) branches.push("thermal_uv");
  if (/hyphema/.test(text)) branches.push("hyphema");
  if (/traumatic iritis|traumatic iridocyclitis/.test(text)) branches.push("traumatic_iritis");
  if (/eyelid laceration|lid laceration/.test(text)) branches.push("eyelid_laceration");
  if (/canalicular (injury|laceration)|lacrimal (canaliculus|duct) (injury|laceration)/.test(text)) branches.push("canalicular");
  if (/retrobulbar hemorrhage|retrobulbar hematoma/.test(text)) branches.push("retrobulbar");
  if (/orbital compartment syndrome|tense (proptotic |proptosis )?orbit/.test(text)) branches.push("orbital_compartment");
  if (!branches.includes("open_globe") && /(traumatic )?corneal abrasion|scratched (cornea|eye)/.test(text)) branches.push("abrasion_from_trauma");

  const isFollowUpContext = /follow[- ]?up|recheck|known (stable|resolving)|interval exam|post-?operative check/.test(text);
  const redFlags = resolveEyeEmergencyRedFlags(input);
  const isNeverAutomatic = branches.some((branch) => NEVER_AUTOMATIC_DISCHARGE.includes(branch));

  const dischargeFamilyId =
    isNeverAutomatic ? null
    : branches.includes("canalicular") ? (isFollowUpContext ? "canalicular_injury_followup" : null)
    : branches.includes("chemical") ? (isFollowUpContext ? "chemical_eye_injury_followup" : null)
    : branches.includes("hyphema") ? "hyphema_followup"
    : branches.includes("traumatic_iritis") ? "traumatic_iritis_followup"
    : branches.includes("eyelid_laceration") ? "eyelid_laceration_followup"
    : branches.includes("thermal_uv") ? "photokeratitis_followup"
    : branches.includes("corneal_fb") ? "corneal_foreign_body_followup"
    : branches.includes("conjunctival_fb") ? "corneal_foreign_body_followup"
    : branches.includes("abrasion_from_trauma") ? "corneal_abrasion_followup"
    : null;

  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

/** Safety gate: IOP documentation is never required when open globe is a resolved branch. */
export function isIopDocumentationRequired(branches: readonly EyeTraumaBranch[]): boolean {
  return !branches.includes("open_globe");
}

const BRANCH_PRIORITY: Record<string, number> = {
  open_globe: 100,
  orbital_compartment: 96,
  retrobulbar: 95,
  chemical: 92,
  hyphema: 85,
  thermal_uv: 60,
  traumatic_iritis: 55,
  canalicular: 50,
  eyelid_laceration: 45,
  corneal_fb: 40,
  conjunctival_fb: 35,
  abrasion_from_trauma: 20,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis, IOP policy, or disposition. */
export function adaptEyeTraumaComplaintIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<EyeTraumaContext, "branches" | "redFlagCategories">,
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
