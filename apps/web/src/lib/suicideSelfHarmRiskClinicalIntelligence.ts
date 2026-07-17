/**
 * Phase 18 (Commit 1) — suicide / self-harm risk clinical documentation context.
 * Documentation advisory only — never classifies suicide risk, never states safe for discharge,
 * and never equates NSSI with suicide attempt unless documented.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { parseBehavioralHealthFromText } from "./behavioralHealthFoundation";
import {
  resolvePsychiatricBehavioralRedFlags,
  type PsychiatricBehavioralRedFlagInput,
} from "./psychiatricBehavioralRedFlagEngine";

export type SuicideSelfHarmRiskBranch =
  | "passive_si"
  | "active_si_with_plan"
  | "nssi"
  | "recent_attempt"
  | "intentional_overdose_linkage"
  | "other";

export type SuicideSelfHarmRiskContext = {
  branches: SuicideSelfHarmRiskBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolvePsychiatricBehavioralRedFlags>["categories"];
  passiveVsActiveSiDistinctionRequired: true;
  nssiNotSuicideAttemptUnlessDocumented: true;
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const HIGH_ACUITY_LOCK: readonly SuicideSelfHarmRiskBranch[] = ["active_si_with_plan", "recent_attempt"];

export const SUICIDE_SELF_HARM_RISK_DISCHARGE_FAMILY: Record<SuicideSelfHarmRiskBranch, string | null> = {
  passive_si: "suicidal_ideation_post_assessment_v1",
  active_si_with_plan: null,
  nssi: "self_harm_post_assessment_v1",
  recent_attempt: null,
  intentional_overdose_linkage: null,
  other: "suicidal_ideation_post_assessment_v1",
};

/** Documentation advisory only. Never classifies suicide risk or states safe for discharge. */
export function resolveSuicideSelfHarmRiskContext(
  input: PsychiatricBehavioralRedFlagInput
): SuicideSelfHarmRiskContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const behavioral = parseBehavioralHealthFromText(text);
  const branches: SuicideSelfHarmRiskBranch[] = [];
  const redFlags = resolvePsychiatricBehavioralRedFlags(input);

  if (
    redFlags.categories.includes("active_suicidal_intent_with_plan_or_means") ||
    /active suicidal (ideation|intent)|suicidal ideation with (plan|intent)|plan to (die|kill self)/.test(text)
  ) {
    branches.push("active_si_with_plan");
  }
  if (/passive suicidal ideation|passive si|wish to die without plan|no plan reported/.test(text)) {
    branches.push("passive_si");
  }
  if (
    behavioral.priorSelfHarmReported ||
    /non.?suicidal self.?injury|nssi|cutting without suicidal intent|self.?harm without intent to die/.test(text)
  ) {
    branches.push("nssi");
  }
  if (
    redFlags.categories.includes("recent_high_lethality_attempt") ||
    behavioral.priorSuicideAttemptReported ||
    /recent suicide attempt|suicide attempt (today|last night)/.test(text)
  ) {
    branches.push("recent_attempt");
  }
  if (/intentional (overdose|ingestion)|suicidal overdose|phase 16 intentional od/.test(text)) {
    branches.push("intentional_overdose_linkage");
  }

  if (branches.length === 0 && /suicidal|self.?harm|suicide/.test(text)) {
    branches.push("other");
  }
  if (branches.length === 0) branches.push("other");

  const activeSiWithPlan =
    branches.includes("active_si_with_plan") ||
    redFlags.categories.includes("active_suicidal_intent_with_plan_or_means");
  const isFollowUpContext =
    /follow[- ]?up|post-?acute|post.?observation|observation complete|known (stable|resolving)|interval exam/.test(
      text
    );
  const isHighAcuityLocked = branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch));

  const pickFamily = (): string | null => {
    if (activeSiWithPlan && !isFollowUpContext) return null;
    if (isHighAcuityLocked && !isFollowUpContext) return null;
    if (branches.includes("intentional_overdose_linkage") && !isFollowUpContext) return null;
    if (branches.includes("passive_si") && isFollowUpContext) {
      return SUICIDE_SELF_HARM_RISK_DISCHARGE_FAMILY.passive_si;
    }
    if (branches.includes("nssi") && isFollowUpContext) {
      return SUICIDE_SELF_HARM_RISK_DISCHARGE_FAMILY.nssi;
    }
    if (isFollowUpContext) return SUICIDE_SELF_HARM_RISK_DISCHARGE_FAMILY.other;
    if (branches.includes("passive_si")) return SUICIDE_SELF_HARM_RISK_DISCHARGE_FAMILY.passive_si;
    return null;
  };

  return {
    branches: [...new Set(branches)],
    dischargeFamilyId: pickFamily(),
    redFlagCategories: redFlags.categories,
    passiveVsActiveSiDistinctionRequired: true,
    nssiNotSuicideAttemptUnlessDocumented: true,
  };
}

const BRANCH_PRIORITY: Record<string, number> = {
  active_suicidal_intent_with_plan_or_means: 100,
  active_si_with_plan: 98,
  recent_high_lethality_attempt: 95,
  recent_attempt: 93,
  intentional_overdose_linkage: 90,
  passive_si: 50,
  nssi: 45,
  other: 0,
};

export function adaptSuicideSelfHarmRiskIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<SuicideSelfHarmRiskContext, "branches" | "redFlagCategories">
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
