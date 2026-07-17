/**
 * Phase 18 (Commit 1) — psychosis / mania / behavioral crisis clinical documentation context.
 * Documentation advisory only — never states not psychotic unless supported, never autonomously
 * selects medications or disposition.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { parseBehavioralHealthFromText } from "./behavioralHealthFoundation";
import {
  resolvePsychiatricBehavioralRedFlags,
  type PsychiatricBehavioralRedFlagInput,
} from "./psychiatricBehavioralRedFlagEngine";

export type PsychosisManiaBehavioralCrisisBranch =
  | "psychosis"
  | "mania"
  | "behavioral_crisis"
  | "agitation"
  | "other";

export type PsychosisManiaBehavioralCrisisContext = {
  branches: PsychosisManiaBehavioralCrisisBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolvePsychiatricBehavioralRedFlags>["categories"];
  notPsychoticUnlessSupported: true;
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const HIGH_ACUITY_LOCK: readonly PsychosisManiaBehavioralCrisisBranch[] = ["psychosis", "mania"];

export const PSYCHOSIS_MANIA_BEHAVIORAL_CRISIS_DISCHARGE_FAMILY: Record<
  PsychosisManiaBehavioralCrisisBranch,
  string | null
> = {
  psychosis: "psychosis_post_acute_v1",
  mania: "mania_post_acute_v1",
  behavioral_crisis: "behavioral_agitation_post_acute_v1",
  agitation: "behavioral_agitation_post_acute_v1",
  other: "behavioral_agitation_post_acute_v1",
};

/** Documentation advisory only. Never states not psychotic unless supported. */
export function resolvePsychosisManiaBehavioralCrisisContext(
  input: PsychiatricBehavioralRedFlagInput
): PsychosisManiaBehavioralCrisisContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  parseBehavioralHealthFromText(text);
  const branches: PsychosisManiaBehavioralCrisisBranch[] = [];
  const redFlags = resolvePsychiatricBehavioralRedFlags(input);

  if (
    redFlags.categories.includes("severe_psychosis_impairing_safety") ||
    /psychosis|hallucination|delusion|paranoia|disorganized thought|command hallucination/.test(text)
  ) {
    branches.push("psychosis");
  }
  if (
    redFlags.categories.includes("severe_mania_dangerous_behavior") ||
    /mania|manic episode|pressured speech|decreased sleep with elevated mood|grandiosity/.test(text)
  ) {
    branches.push("mania");
  }
  if (/behavioral crisis|psychiatric emergency|acute agitation|behavioral decompensation/.test(text)) {
    branches.push("behavioral_crisis");
  }
  if (/agitation|agitated|restless|escalating behavior/.test(text)) {
    branches.push("agitation");
  }

  if (branches.length === 0 && /psychiatric|behavioral|mental health crisis/.test(text)) {
    branches.push("other");
  }
  if (branches.length === 0) branches.push("other");

  const severePsychosis =
    branches.includes("psychosis") || redFlags.categories.includes("severe_psychosis_impairing_safety");
  const severeMania =
    branches.includes("mania") || redFlags.categories.includes("severe_mania_dangerous_behavior");
  const isFollowUpContext =
    /follow[- ]?up|post-?acute|post.?observation|observation complete|known (stable|resolving)|interval exam/.test(
      text
    );

  const pickFamily = (): string | null => {
    if (severePsychosis && !isFollowUpContext) return null;
    if (severeMania && !isFollowUpContext) return null;
    if (branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch)) && !isFollowUpContext) return null;
    if (branches.includes("psychosis") && isFollowUpContext) {
      return PSYCHOSIS_MANIA_BEHAVIORAL_CRISIS_DISCHARGE_FAMILY.psychosis;
    }
    if (branches.includes("mania") && isFollowUpContext) {
      return PSYCHOSIS_MANIA_BEHAVIORAL_CRISIS_DISCHARGE_FAMILY.mania;
    }
    if (branches.includes("behavioral_crisis") && isFollowUpContext) {
      return PSYCHOSIS_MANIA_BEHAVIORAL_CRISIS_DISCHARGE_FAMILY.behavioral_crisis;
    }
    if (isFollowUpContext) return PSYCHOSIS_MANIA_BEHAVIORAL_CRISIS_DISCHARGE_FAMILY.other;
    return null;
  };

  return {
    branches: [...new Set(branches)],
    dischargeFamilyId: pickFamily(),
    redFlagCategories: redFlags.categories,
    notPsychoticUnlessSupported: true,
  };
}

const BRANCH_PRIORITY: Record<string, number> = {
  severe_psychosis_impairing_safety: 100,
  psychosis: 98,
  severe_mania_dangerous_behavior: 95,
  mania: 93,
  behavioral_crisis: 70,
  agitation: 60,
  other: 0,
};

export function adaptPsychosisManiaBehavioralCrisisIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<PsychosisManiaBehavioralCrisisContext, "branches" | "redFlagCategories">
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
