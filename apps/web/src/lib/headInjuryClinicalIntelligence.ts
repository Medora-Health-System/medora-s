import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { resolveHeadFacialRedFlags, type HeadFacialRedFlagInput } from "./headFacialRedFlagEngine";

export type HeadInjuryBranch =
  | "minor_head"
  | "concussion_mild_tbi"
  | "moderate_tbi"
  | "severe_tbi"
  | "ich"
  | "contusion"
  | "dai"
  | "skull_fracture"
  | "basilar"
  | "anticoagulated"
  | "pediatric"
  | "geriatric"
  | "nat";

export type HeadInjuryContext = {
  branches: HeadInjuryBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveHeadFacialRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Documentation advisory only. It never establishes a diagnosis, TBI severity, or disposition. */
export function resolveHeadInjuryContext(input: HeadFacialRedFlagInput): HeadInjuryContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: HeadInjuryBranch[] = [];
  if (/minor head injury|closed head injury|head injury nos|s00\.0/.test(text)) branches.push("minor_head");
  if (/concussion|mild tbi|mild traumatic brain injury|s06\.0/.test(text)) branches.push("concussion_mild_tbi");
  if (/moderate tbi|moderate traumatic brain injury/.test(text)) branches.push("moderate_tbi");
  if (/severe tbi|severe traumatic brain injury/.test(text)) branches.push("severe_tbi");
  if (/subdural|epidural|subarachnoid|intraparenchymal|intracranial hemorrhage|s06\.[1-6]/.test(text)) branches.push("ich");
  if (/cerebral contusion|contusion.*brain|brain.*contusion|s06\.3/.test(text)) branches.push("contusion");
  if (/diffuse axonal|\bdai\b/.test(text)) branches.push("dai");
  if (/skull fracture|s02\.0|s02\.1/.test(text)) branches.push("skull_fracture");
  if (/basilar skull|battle sign|raccoon eyes|hemotympanum|csf otorrhea|csf rhinorrhea/.test(text)) branches.push("basilar");
  if (/anticoagul|warfarin|apixaban|rivaroxaban|dabigatran|antiplatelet|aspirin|clopidogrel/.test(text)) branches.push("anticoagulated");
  if (/pediatric|infant|toddler|\bchild\b/.test(text)) branches.push("pediatric");
  if (/geriatric|elderly|older adult/.test(text)) branches.push("geriatric");
  if (/non-?accidental|inflicted injury|child abuse|elder abuse|suspicious injury pattern/.test(text)) branches.push("nat");

  const isFollowUpContext = /follow[- ]?up|recheck|interval (mri|ct)|resolving|known (stable )?bleed/.test(text);
  const redFlags = resolveHeadFacialRedFlags(input);

  const dischargeFamilyId =
    branches.includes("nat") ? null
    : branches.includes("severe_tbi") ? null
    : branches.includes("moderate_tbi") ? null
    : branches.includes("basilar") ? null
    : branches.includes("dai") ? null
    : branches.includes("anticoagulated") ? null
    : branches.includes("ich") ? (isFollowUpContext ? "intracranial_hemorrhage_followup" : null)
    : branches.includes("contusion") ? null
    : branches.includes("skull_fracture") ? "skull_fracture_followup"
    : branches.includes("concussion_mild_tbi") ? "concussion_mild_tbi"
    : branches.includes("minor_head") ? "minor_head_injury"
    : null;

  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

const BRANCH_PRIORITY: Record<string, number> = {
  nat: 100,
  non_accidental_trauma: 100,
  severe_tbi: 98,
  intracranial_emergency: 96,
  ich: 95,
  basilar_skull: 92,
  basilar: 90,
  moderate_tbi: 85,
  dai: 82,
  anticoagulated_head: 78,
  anticoagulated: 75,
  contusion: 65,
  skull_fracture: 60,
  concussion_mild_tbi: 45,
  geriatric: 35,
  pediatric: 35,
  minor_head: 20,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis, TBI grade, or disposition. */
export function adaptHeadInjuryComplaintIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<HeadInjuryContext, "branches" | "redFlagCategories">,
): ProviderDocumentationComplaintIntelligence {
  const weightedHints = [
    ...context.redFlagCategories.map((value) => ({ hint: value.replace(/_/g, " "), weight: BRANCH_PRIORITY[value] ?? 90 })),
    ...context.branches.map((value) => ({ hint: value.replace(/_/g, " "), weight: BRANCH_PRIORITY[value] ?? 50 })),
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
