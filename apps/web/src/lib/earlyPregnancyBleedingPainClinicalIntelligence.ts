/**
 * Phase 17 (Commit 1) — early pregnancy bleeding / pelvic pain clinical documentation context.
 * Documentation advisory only — never establishes a diagnosis, never dates viability, never
 * excludes ectopic, and never confirms fetal well-being.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveObGynUrologyRedFlags,
  type ObGynUrologyRedFlagInput,
} from "./obGynUrologyRedFlagEngine";
import {
  hasGestationalAgeSource,
  isGestationalAgeInvented,
  parseReproductiveGuFromText,
} from "./reproductiveGuFoundation";

export type EarlyPregnancyBleedingPainBranch =
  | "threatened_miscarriage"
  | "ectopic_concern"
  | "unknown_gestational_age"
  | "antepartum_hemorrhage_early"
  | "molar_pregnancy_concern"
  | "sexual_assault_linkage"
  | "other";

export type EarlyPregnancyBleedingPainContext = {
  branches: EarlyPregnancyBleedingPainBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveObGynUrologyRedFlags>["categories"];
  gestationalAgeInvented: boolean;
  ectopicExclusionForbidden: true;
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const HIGH_ACUITY_LOCK: readonly EarlyPregnancyBleedingPainBranch[] = [
  "ectopic_concern",
  "antepartum_hemorrhage_early",
];

export const EARLY_PREGNANCY_BLEEDING_PAIN_DISCHARGE_FAMILY: Record<
  EarlyPregnancyBleedingPainBranch,
  string | null
> = {
  threatened_miscarriage: "early_pregnancy_bleeding_followup_v1",
  ectopic_concern: null,
  unknown_gestational_age: "early_pregnancy_bleeding_followup_v1",
  antepartum_hemorrhage_early: null,
  molar_pregnancy_concern: "early_pregnancy_bleeding_followup_v1",
  sexual_assault_linkage: null,
  other: "early_pregnancy_bleeding_followup_v1",
};

/** Documentation advisory only. Never excludes ectopic or confirms viability. */
export function resolveEarlyPregnancyBleedingPainContext(
  input: ObGynUrologyRedFlagInput
): EarlyPregnancyBleedingPainContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const reproductive = parseReproductiveGuFromText(text);
  const branches: EarlyPregnancyBleedingPainBranch[] = [];
  const redFlags = resolveObGynUrologyRedFlags(input);

  if (
    redFlags.categories.includes("ruptured_ectopic_concern") ||
    /ectopic|pregnancy of unknown location|tubal pregnancy|adnexal mass with pregnancy/.test(text)
  ) {
    branches.push("ectopic_concern");
  }
  if (/threatened miscarriage|viable intrauterine pregnancy|early pregnancy bleeding/.test(text)) {
    branches.push("threatened_miscarriage");
  }
  if (
    !reproductive.estimatedGestationalAgeReported ||
    reproductive.gestationalAgeSourceReported === "unknown" ||
    isGestationalAgeInvented(reproductive)
  ) {
    branches.push("unknown_gestational_age");
  }
  if (/antepartum hemorrhage|heavy vaginal bleeding in (first|early) trimester/.test(text)) {
    branches.push("antepartum_hemorrhage_early");
  }
  if (/molar pregnancy|gestational trophoblastic|hydatidiform/.test(text)) {
    branches.push("molar_pregnancy_concern");
  }
  if (/sexual assault|rape|non.?consensual/.test(text)) {
    branches.push("sexual_assault_linkage");
  }

  if (branches.length === 0 && /early pregnancy|first trimester (bleeding|pain)|vaginal bleeding.*pregnan/.test(text)) {
    branches.push("other");
  }
  if (branches.length === 0) branches.push("other");

  const rupturedEctopic =
    redFlags.categories.includes("ruptured_ectopic_concern") ||
    /ruptured ectopic|hemodynamically unstable ectopic|shock with ectopic/.test(text);
  const isFollowUpContext =
    /follow[- ]?up|post-?acute|known (stable|resolving)|interval exam|observation complete/.test(text);
  const isHighAcuityLocked =
    rupturedEctopic ||
    branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch) && /unstable|shock|syncope|hypotension/.test(text));

  const pickFamily = (): string | null => {
    if (rupturedEctopic && !isFollowUpContext) return null;
    if (isHighAcuityLocked && !isFollowUpContext) return null;
    if (branches.includes("ectopic_concern") && !isFollowUpContext) return null;
    if (branches.includes("sexual_assault_linkage") && !isFollowUpContext) return null;
    if (branches.includes("threatened_miscarriage")) {
      return EARLY_PREGNANCY_BLEEDING_PAIN_DISCHARGE_FAMILY.threatened_miscarriage;
    }
    if (branches.includes("unknown_gestational_age")) {
      return EARLY_PREGNANCY_BLEEDING_PAIN_DISCHARGE_FAMILY.unknown_gestational_age;
    }
    return EARLY_PREGNANCY_BLEEDING_PAIN_DISCHARGE_FAMILY.other;
  };

  return {
    branches: [...new Set(branches)],
    dischargeFamilyId: pickFamily(),
    redFlagCategories: redFlags.categories,
    gestationalAgeInvented: isGestationalAgeInvented(reproductive) && !hasGestationalAgeSource(reproductive),
    ectopicExclusionForbidden: true,
  };
}

const BRANCH_PRIORITY: Record<string, number> = {
  ruptured_ectopic_concern: 100,
  ectopic_concern: 98,
  antepartum_hemorrhage_early: 90,
  ovarian_torsion_concern: 85,
  unknown_gestational_age: 50,
  threatened_miscarriage: 40,
  other: 0,
};

export function adaptEarlyPregnancyBleedingPainIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<EarlyPregnancyBleedingPainContext, "branches" | "redFlagCategories">
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
