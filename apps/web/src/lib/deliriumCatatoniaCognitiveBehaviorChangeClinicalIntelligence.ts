/**
 * Phase 18 (Commit 1) — delirium / catatonia / cognitive-behavioral change clinical documentation context.
 * Delirium is a medical emergency until evaluated — not presumed psychiatric. Documentation advisory
 * only — never states medically cleared or attributes cause without evaluation.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { parseBehavioralHealthFromText } from "./behavioralHealthFoundation";
import {
  resolvePsychiatricBehavioralRedFlags,
  type PsychiatricBehavioralRedFlagInput,
} from "./psychiatricBehavioralRedFlagEngine";

export type DeliriumCatatoniaCognitiveBehaviorChangeBranch =
  | "delirium"
  | "catatonia"
  | "cognitive_change"
  | "behavior_change"
  | "other";

export type DeliriumCatatoniaCognitiveBehaviorChangeContext = {
  branches: DeliriumCatatoniaCognitiveBehaviorChangeBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolvePsychiatricBehavioralRedFlags>["categories"];
  deliriumMedicalEmergencyAdvisory: true;
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const HIGH_ACUITY_LOCK: readonly DeliriumCatatoniaCognitiveBehaviorChangeBranch[] = ["delirium", "catatonia"];

export const DELIRIUM_CATATONIA_COGNITIVE_BEHAVIOR_CHANGE_DISCHARGE_FAMILY: Record<
  DeliriumCatatoniaCognitiveBehaviorChangeBranch,
  string | null
> = {
  delirium: "delirium_post_acute_v1",
  catatonia: "catatonia_post_acute_v1",
  cognitive_change: "dementia_behavior_change_v1",
  behavior_change: "dementia_behavior_change_v1",
  other: null,
};

/** Documentation advisory only. Delirium is a medical emergency until evaluated. */
export function resolveDeliriumCatatoniaCognitiveBehaviorChangeContext(
  input: PsychiatricBehavioralRedFlagInput
): DeliriumCatatoniaCognitiveBehaviorChangeContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  parseBehavioralHealthFromText(text);
  const branches: DeliriumCatatoniaCognitiveBehaviorChangeBranch[] = [];
  const redFlags = resolvePsychiatricBehavioralRedFlags(input);

  if (
    redFlags.categories.includes("delirium_medical_emergency") ||
    /delirium|acute confusional state|acute encephalopathy|fluctuating mental status/.test(text)
  ) {
    branches.push("delirium");
  }
  if (
    redFlags.categories.includes("catatonia_concern") ||
    /catatonia|catatonic|waxy flexibility|mutism with rigidity|posturing/.test(text)
  ) {
    branches.push("catatonia");
  }
  if (/cognitive change|memory change|confusion|disorientation|altered baseline cognition/.test(text)) {
    branches.push("cognitive_change");
  }
  if (/behavior change|personality change|new agitation in elderly|acute behavioral change/.test(text)) {
    branches.push("behavior_change");
  }

  if (branches.length === 0 && /mental status change|ams|altered mental status/.test(text)) {
    branches.push("other");
  }
  if (branches.length === 0) branches.push("other");

  const deliriumConcern =
    branches.includes("delirium") || redFlags.categories.includes("delirium_medical_emergency");
  const isFollowUpContext =
    /follow[- ]?up|post-?acute|post.?observation|observation complete|known (stable|resolving)|interval exam/.test(
      text
    );
  const isHighAcuityLocked = branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch));

  const pickFamily = (): string | null => {
    if (deliriumConcern && !isFollowUpContext) return null;
    if (isHighAcuityLocked && !isFollowUpContext) return null;
    if (branches.includes("delirium") && isFollowUpContext) {
      return DELIRIUM_CATATONIA_COGNITIVE_BEHAVIOR_CHANGE_DISCHARGE_FAMILY.delirium;
    }
    if (branches.includes("catatonia") && isFollowUpContext) {
      return DELIRIUM_CATATONIA_COGNITIVE_BEHAVIOR_CHANGE_DISCHARGE_FAMILY.catatonia;
    }
    if (branches.includes("cognitive_change") && isFollowUpContext) {
      return DELIRIUM_CATATONIA_COGNITIVE_BEHAVIOR_CHANGE_DISCHARGE_FAMILY.cognitive_change;
    }
    if (isFollowUpContext) return DELIRIUM_CATATONIA_COGNITIVE_BEHAVIOR_CHANGE_DISCHARGE_FAMILY.behavior_change;
    return null;
  };

  return {
    branches: [...new Set(branches)],
    dischargeFamilyId: pickFamily(),
    redFlagCategories: redFlags.categories,
    deliriumMedicalEmergencyAdvisory: true,
  };
}

const BRANCH_PRIORITY: Record<string, number> = {
  delirium_medical_emergency: 100,
  delirium: 98,
  catatonia_concern: 95,
  catatonia: 93,
  cognitive_change: 60,
  behavior_change: 55,
  other: 0,
};

export function adaptDeliriumCatatoniaCognitiveBehaviorChangeIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<DeliriumCatatoniaCognitiveBehaviorChangeContext, "branches" | "redFlagCategories">
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
