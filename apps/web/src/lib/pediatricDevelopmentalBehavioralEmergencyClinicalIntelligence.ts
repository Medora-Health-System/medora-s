/**
 * Phase 18 (Commit 1) — pediatric / developmental behavioral emergency clinical documentation context.
 * Documentation advisory only — never determines capacity or disposition autonomously.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { parseBehavioralHealthFromText } from "./behavioralHealthFoundation";
import {
  resolvePsychiatricBehavioralRedFlags,
  type PsychiatricBehavioralRedFlagInput,
} from "./psychiatricBehavioralRedFlagEngine";

export type PediatricDevelopmentalBehavioralEmergencyBranch =
  | "autism_meltdown"
  | "adhd_agitation"
  | "developmental"
  | "safeguarding"
  | "suicidal_youth"
  | "other";

export type PediatricDevelopmentalBehavioralEmergencyContext = {
  branches: PediatricDevelopmentalBehavioralEmergencyBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolvePsychiatricBehavioralRedFlags>["categories"];
  safeguardingHighAcuity: boolean;
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const PEDIATRIC_DEVELOPMENTAL_BEHAVIORAL_EMERGENCY_DISCHARGE_FAMILY: Record<
  PediatricDevelopmentalBehavioralEmergencyBranch,
  string | null
> = {
  autism_meltdown: "pediatric_behavioral_crisis_v1",
  adhd_agitation: "pediatric_behavioral_crisis_v1",
  developmental: "pediatric_behavioral_crisis_v1",
  safeguarding: null,
  suicidal_youth: null,
  other: "pediatric_behavioral_crisis_v1",
};

/** Documentation advisory only. Never determines capacity or disposition. */
export function resolvePediatricDevelopmentalBehavioralEmergencyContext(
  input: PsychiatricBehavioralRedFlagInput
): PediatricDevelopmentalBehavioralEmergencyContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const behavioral = parseBehavioralHealthFromText(text);
  const branches: PediatricDevelopmentalBehavioralEmergencyBranch[] = [];
  const redFlags = resolvePsychiatricBehavioralRedFlags(input);

  if (/autism|asd|meltdown|sensory overload|neurodivergent/.test(text)) branches.push("autism_meltdown");
  if (/adhd|attention deficit|hyperactivity|impulsivity/.test(text)) branches.push("adhd_agitation");
  if (
    behavioral.developmentalBaselineReported ||
    /developmental (delay|disability)|intellectual disability|baseline function/.test(text)
  ) {
    branches.push("developmental");
  }
  if (
    behavioral.safeguardingConcernReported ||
    /safeguarding|abuse concern|neglect|child protection|unsafe home/.test(text)
  ) {
    branches.push("safeguarding");
  }
  if (
    redFlags.categories.includes("active_suicidal_intent_with_plan_or_means") ||
    /pediatric suicidal|adolescent suicidal|youth suicidal|teen suicide/.test(text)
  ) {
    branches.push("suicidal_youth");
  }

  if (branches.length === 0 && /pediatric behavioral|child behavioral|adolescent behavioral/.test(text)) {
    branches.push("other");
  }
  if (branches.length === 0) branches.push("other");

  const safeguardingHighAcuity = branches.includes("safeguarding");
  const activeSiYouth = branches.includes("suicidal_youth");
  const isFollowUpContext =
    /follow[- ]?up|post-?acute|post.?observation|observation complete|known (stable|resolving)|interval exam/.test(
      text
    );

  const pickFamily = (): string | null => {
    if (safeguardingHighAcuity && !isFollowUpContext) return null;
    if (activeSiYouth && !isFollowUpContext) return null;
    if (isFollowUpContext) return PEDIATRIC_DEVELOPMENTAL_BEHAVIORAL_EMERGENCY_DISCHARGE_FAMILY.other;
    if (activeSiYouth) return null;
    return PEDIATRIC_DEVELOPMENTAL_BEHAVIORAL_EMERGENCY_DISCHARGE_FAMILY.other;
  };

  return {
    branches: [...new Set(branches)],
    dischargeFamilyId: pickFamily(),
    redFlagCategories: redFlags.categories,
    safeguardingHighAcuity,
  };
}

const BRANCH_PRIORITY: Record<string, number> = {
  active_suicidal_intent_with_plan_or_means: 100,
  suicidal_youth: 98,
  safeguarding: 95,
  autism_meltdown: 60,
  adhd_agitation: 55,
  developmental: 50,
  other: 0,
};

export function adaptPediatricDevelopmentalBehavioralEmergencyIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<PediatricDevelopmentalBehavioralEmergencyContext, "branches" | "redFlagCategories">
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
