/**
 * Phase 17 (Commit 1) — hypertensive / postpartum obstetric emergency clinical documentation context.
 * Documentation advisory only — never establishes a diagnosis, never orders magnesium or
 * antihypertensives, and never confirms fetal well-being.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveObGynUrologyRedFlags,
  type ObGynUrologyRedFlagInput,
} from "./obGynUrologyRedFlagEngine";
import { parseReproductiveGuFromText } from "./reproductiveGuFoundation";

export type HypertensivePostpartumObstetricEmergencyBranch =
  | "preeclampsia"
  | "eclampsia"
  | "hellp"
  | "postpartum_hypertension"
  | "postpartum_hemorrhage"
  | "postpartum_endometritis_concern"
  | "other";

export type HypertensivePostpartumObstetricEmergencyContext = {
  branches: HypertensivePostpartumObstetricEmergencyBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveObGynUrologyRedFlags>["categories"];
  noInventedApgarOrDeliveryDetails: true;
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const HIGH_ACUITY_LOCK: readonly HypertensivePostpartumObstetricEmergencyBranch[] = [
  "eclampsia",
  "hellp",
  "postpartum_hemorrhage",
];

export const HYPERTENSIVE_POSTPARTUM_OBSTETRIC_EMERGENCY_DISCHARGE_FAMILY: Record<
  HypertensivePostpartumObstetricEmergencyBranch,
  string | null
> = {
  preeclampsia: null,
  eclampsia: null,
  hellp: null,
  postpartum_hypertension: "postpartum_hypertension_followup_v1",
  postpartum_hemorrhage: null,
  postpartum_endometritis_concern: "postpartum_infection_followup_v1",
  other: "postpartum_hypertension_followup_v1",
};

/** Documentation advisory only. Never auto-diagnoses HELLP or eclampsia. */
export function resolveHypertensivePostpartumObstetricEmergencyContext(
  input: ObGynUrologyRedFlagInput
): HypertensivePostpartumObstetricEmergencyContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const reproductive = parseReproductiveGuFromText(text);
  const branches: HypertensivePostpartumObstetricEmergencyBranch[] = [];
  const redFlags = resolveObGynUrologyRedFlags(input);

  if (
    redFlags.categories.includes("severe_preeclampsia_eclampsia_hellp") &&
    /eclampsia|seizure in (pregnancy|postpartum)/.test(text)
  ) {
    branches.push("eclampsia");
  }
  if (/hellp|hemolysis.*elevated liver.*low platelet/.test(text)) branches.push("hellp");
  if (
    /preeclampsia|gestational hypertension|hypertension in pregnancy/.test(text) &&
    !branches.includes("eclampsia")
  ) {
    branches.push("preeclampsia");
  }
  if (reproductive.postpartumIntervalReported && /hypertension|elevated blood pressure/.test(text)) {
    branches.push("postpartum_hypertension");
  }
  if (
    redFlags.categories.includes("postpartum_hemorrhage") ||
    /postpartum hemorrhage|heavy bleeding after delivery/.test(text)
  ) {
    branches.push("postpartum_hemorrhage");
  }
  if (/postpartum endometritis|postpartum fever|uterine tenderness postpartum/.test(text)) {
    branches.push("postpartum_endometritis_concern");
  }

  if (branches.length === 0 && /postpartum|hypertensive.*obstetric|obstetric emergency/.test(text)) {
    branches.push("other");
  }
  if (branches.length === 0) branches.push("other");

  const severePreeclampsia =
    redFlags.categories.includes("severe_preeclampsia_eclampsia_hellp") ||
    /severe preeclampsia|hypertensive emergency/.test(text);
  const isFollowUpContext =
    /follow[- ]?up|post-?acute|known (stable|resolving)|interval exam|observation complete/.test(text);
  const isHighAcuityLocked =
    severePreeclampsia ||
    branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch));

  const pickFamily = (): string | null => {
    if (severePreeclampsia && !isFollowUpContext) return null;
    if (isHighAcuityLocked && !isFollowUpContext) return null;
    if (branches.includes("eclampsia") && !isFollowUpContext) return null;
    if (branches.includes("hellp") && !isFollowUpContext) return null;
    if (branches.includes("preeclampsia") && !isFollowUpContext) return null;
    if (branches.includes("postpartum_hemorrhage") && !isFollowUpContext) return null;
    if (branches.includes("postpartum_hypertension") && isFollowUpContext) {
      return HYPERTENSIVE_POSTPARTUM_OBSTETRIC_EMERGENCY_DISCHARGE_FAMILY.postpartum_hypertension;
    }
    if (branches.includes("postpartum_endometritis_concern") && isFollowUpContext) {
      return HYPERTENSIVE_POSTPARTUM_OBSTETRIC_EMERGENCY_DISCHARGE_FAMILY.postpartum_endometritis_concern;
    }
    if (isFollowUpContext) return HYPERTENSIVE_POSTPARTUM_OBSTETRIC_EMERGENCY_DISCHARGE_FAMILY.other;
    return null;
  };

  return {
    branches: [...new Set(branches)],
    dischargeFamilyId: pickFamily(),
    redFlagCategories: redFlags.categories,
    noInventedApgarOrDeliveryDetails: true,
  };
}

const BRANCH_PRIORITY: Record<string, number> = {
  severe_preeclampsia_eclampsia_hellp: 100,
  eclampsia: 98,
  hellp: 96,
  postpartum_hemorrhage: 94,
  preeclampsia: 88,
  postpartum_endometritis_concern: 70,
  postpartum_hypertension: 60,
  other: 0,
};

export function adaptHypertensivePostpartumObstetricEmergencyIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<HypertensivePostpartumObstetricEmergencyContext, "branches" | "redFlagCategories">
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
