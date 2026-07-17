/**
 * Phase 18 (Commit 1) — capacity / refusal / safety disposition clinical documentation context.
 * Refusal ≠ incapacity; AMA form ≠ capacity determination. Documentation advisory only — never
 * states has/lacks capacity or medically cleared.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { parseBehavioralHealthFromText } from "./behavioralHealthFoundation";
import {
  resolvePsychiatricBehavioralRedFlags,
  type PsychiatricBehavioralRedFlagInput,
} from "./psychiatricBehavioralRedFlagEngine";

export type CapacityRefusalSafetyDispositionBranch =
  | "refusal"
  | "capacity_concern"
  | "ama"
  | "safety_disposition"
  | "legal_hold"
  | "other";

export type CapacityRefusalSafetyDispositionContext = {
  branches: CapacityRefusalSafetyDispositionBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolvePsychiatricBehavioralRedFlags>["categories"];
  refusalNotIncapacity: true;
  amaNotCapacity: true;
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const CAPACITY_REFUSAL_SAFETY_DISPOSITION_DISCHARGE_FAMILY: Record<
  CapacityRefusalSafetyDispositionBranch,
  string | null
> = {
  refusal: "informed_refusal_v1",
  capacity_concern: null,
  ama: "against_medical_advice_v1",
  safety_disposition: "behavioral_health_safety_plan_v1",
  legal_hold: null,
  other: "crisis_resource_followup_v1",
};

/** Documentation advisory only. Never states has/lacks capacity. */
export function resolveCapacityRefusalSafetyDispositionContext(
  input: PsychiatricBehavioralRedFlagInput
): CapacityRefusalSafetyDispositionContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const behavioral = parseBehavioralHealthFromText(text);
  const branches: CapacityRefusalSafetyDispositionBranch[] = [];
  const redFlags = resolvePsychiatricBehavioralRedFlags(input);

  if (/refusal|refuses (treatment|admission|observation)|declines care|declines psychiatric evaluation/.test(text)) {
    branches.push("refusal");
  }
  if (/capacity concern|decision.?making capacity|capacity assessment|lacks capacity|has capacity/.test(text)) {
    branches.push("capacity_concern");
  }
  if (/against medical advice|ama|leaving ama|signed ama/.test(text)) {
    branches.push("ama");
  }
  if (/safety disposition|disposition planning|safe discharge planning|behavioral health disposition/.test(text)) {
    branches.push("safety_disposition");
  }
  if (behavioral.legalStatusReported || /involuntary hold|5150|302|certification|psychiatric hold/.test(text)) {
    branches.push("legal_hold");
  }

  if (branches.length === 0 && /capacity|refusal|disposition|ama/.test(text)) {
    branches.push("other");
  }
  if (branches.length === 0) branches.push("other");

  const highAcuity =
    redFlags.categories.includes("active_suicidal_intent_with_plan_or_means") ||
    redFlags.categories.includes("active_homicidal_intent") ||
    redFlags.categories.includes("delirium_medical_emergency") ||
    branches.includes("legal_hold");
  const isFollowUpContext =
    /follow[- ]?up|post-?acute|post.?observation|observation complete|known (stable|resolving)|interval exam/.test(
      text
    );

  const pickFamily = (): string | null => {
    if (highAcuity && !isFollowUpContext) return null;
    if (branches.includes("refusal") && isFollowUpContext) {
      return CAPACITY_REFUSAL_SAFETY_DISPOSITION_DISCHARGE_FAMILY.refusal;
    }
    if (branches.includes("ama") && isFollowUpContext) {
      return CAPACITY_REFUSAL_SAFETY_DISPOSITION_DISCHARGE_FAMILY.ama;
    }
    if (branches.includes("refusal") && !isFollowUpContext) return null;
    if (branches.includes("capacity_concern") && !isFollowUpContext) return null;
    if (branches.includes("ama") && !isFollowUpContext) return null;
    if (isFollowUpContext) return CAPACITY_REFUSAL_SAFETY_DISPOSITION_DISCHARGE_FAMILY.safety_disposition;
    return null;
  };

  return {
    branches: [...new Set(branches)],
    dischargeFamilyId: pickFamily(),
    redFlagCategories: redFlags.categories,
    refusalNotIncapacity: true,
    amaNotCapacity: true,
  };
}

const BRANCH_PRIORITY: Record<string, number> = {
  active_suicidal_intent_with_plan_or_means: 100,
  active_homicidal_intent: 98,
  delirium_medical_emergency: 95,
  legal_hold: 90,
  capacity_concern: 70,
  refusal: 65,
  ama: 60,
  safety_disposition: 50,
  other: 0,
};

export function adaptCapacityRefusalSafetyDispositionIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<CapacityRefusalSafetyDispositionContext, "branches" | "redFlagCategories">
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
