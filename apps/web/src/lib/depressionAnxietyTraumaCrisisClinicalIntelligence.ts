/**
 * Phase 18 (Commit 1) — depression / anxiety / trauma crisis clinical documentation context.
 * Documentation advisory only — never states low suicide risk or safe for discharge.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { parseBehavioralHealthFromText } from "./behavioralHealthFoundation";
import {
  resolvePsychiatricBehavioralRedFlags,
  type PsychiatricBehavioralRedFlagInput,
} from "./psychiatricBehavioralRedFlagEngine";

export type DepressionAnxietyTraumaCrisisBranch =
  | "depression"
  | "anxiety"
  | "trauma"
  | "grief"
  | "panic"
  | "other";

export type DepressionAnxietyTraumaCrisisContext = {
  branches: DepressionAnxietyTraumaCrisisBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolvePsychiatricBehavioralRedFlags>["categories"];
  noLowSuicideRiskStatement: true;
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const DEPRESSION_ANXIETY_TRAUMA_CRISIS_DISCHARGE_FAMILY: Record<
  DepressionAnxietyTraumaCrisisBranch,
  string | null
> = {
  depression: "depression_crisis_v1",
  anxiety: "anxiety_panic_crisis_v1",
  trauma: "acute_stress_reaction_v1",
  grief: "behavioral_health_grief_adjustment_v1",
  panic: "anxiety_panic_crisis_v1",
  other: "depression_crisis_v1",
};

/** Documentation advisory only. Never states low suicide risk. */
export function resolveDepressionAnxietyTraumaCrisisContext(
  input: PsychiatricBehavioralRedFlagInput
): DepressionAnxietyTraumaCrisisContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  parseBehavioralHealthFromText(text);
  const branches: DepressionAnxietyTraumaCrisisBranch[] = [];
  const redFlags = resolvePsychiatricBehavioralRedFlags(input);

  if (/depression|depressive episode|hopeless|anhedonia|low mood/.test(text)) branches.push("depression");
  if (/anxiety|generalized anxiety|worry|nervousness/.test(text)) branches.push("anxiety");
  if (/trauma|ptsd|flashback|intrusive memories|assault survivor/.test(text)) branches.push("trauma");
  if (/grief|bereavement|recent loss|mourning/.test(text)) branches.push("grief");
  if (/panic attack|panic disorder|palpitations with anxiety|sudden fear/.test(text)) branches.push("panic");

  if (branches.length === 0 && /mental health|behavioral health|emotional crisis/.test(text)) {
    branches.push("other");
  }
  if (branches.length === 0) branches.push("other");

  const activeSi =
    redFlags.categories.includes("active_suicidal_intent_with_plan_or_means") ||
    /active suicidal (ideation|intent)|suicidal ideation with plan/.test(text);
  const isFollowUpContext =
    /follow[- ]?up|post-?acute|post.?observation|observation complete|known (stable|resolving)|interval exam/.test(
      text
    );

  const pickFamily = (): string | null => {
    if (activeSi && !isFollowUpContext) return null;
    if (branches.includes("panic")) return DEPRESSION_ANXIETY_TRAUMA_CRISIS_DISCHARGE_FAMILY.panic;
    if (branches.includes("anxiety")) return DEPRESSION_ANXIETY_TRAUMA_CRISIS_DISCHARGE_FAMILY.anxiety;
    if (branches.includes("depression")) return DEPRESSION_ANXIETY_TRAUMA_CRISIS_DISCHARGE_FAMILY.depression;
    if (branches.includes("trauma") && isFollowUpContext) {
      return DEPRESSION_ANXIETY_TRAUMA_CRISIS_DISCHARGE_FAMILY.trauma;
    }
    if (branches.includes("grief") && isFollowUpContext) {
      return DEPRESSION_ANXIETY_TRAUMA_CRISIS_DISCHARGE_FAMILY.grief;
    }
    if (isFollowUpContext) return DEPRESSION_ANXIETY_TRAUMA_CRISIS_DISCHARGE_FAMILY.other;
    return activeSi ? null : DEPRESSION_ANXIETY_TRAUMA_CRISIS_DISCHARGE_FAMILY.other;
  };

  return {
    branches: [...new Set(branches)],
    dischargeFamilyId: pickFamily(),
    redFlagCategories: redFlags.categories,
    noLowSuicideRiskStatement: true,
  };
}

const BRANCH_PRIORITY: Record<string, number> = {
  active_suicidal_intent_with_plan_or_means: 100,
  depression: 60,
  trauma: 58,
  panic: 55,
  anxiety: 50,
  grief: 45,
  other: 0,
};

export function adaptDepressionAnxietyTraumaCrisisIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<DepressionAnxietyTraumaCrisisContext, "branches" | "redFlagCategories">
): ProviderDocumentationComplaintIntelligence {
  const weightedHints = [
    ...context.redFlagCategories.map((value) => ({
      hint: value.replace(/_/g, " "),
      weight: BRANCH_PRIORITY[value] ?? 85,
    })),
    ...context.branches.map((value) => ({
      hint: value.replace(/_/g, " "),
      weight: BRANCH_PRIORITY[value] ?? 40,
    })),
  ];
  const score = (key: string) => {
    const compactKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    let best = 0;
    for (const { hint, weight } of weightedHints) {
      const compactHint = hint.replace(/[^a-z0-9]/g, "");
      if (compactKey.includes(compactHint)) best = Math.max(best, weight);
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
