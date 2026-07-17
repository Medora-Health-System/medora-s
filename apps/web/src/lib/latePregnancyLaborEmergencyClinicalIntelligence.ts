/**
 * Phase 17 (Commit 1) — late pregnancy / labor emergency clinical documentation context.
 * Documentation advisory only — never diagnoses labor, never interprets ultrasound, never
 * confirms fetal well-being, and never prompts digital exam when previa unresolved.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveObGynUrologyRedFlags,
  type ObGynUrologyRedFlagInput,
} from "./obGynUrologyRedFlagEngine";
import { parseReproductiveGuFromText } from "./reproductiveGuFoundation";

export type LatePregnancyLaborEmergencyBranch =
  | "preterm_labor"
  | "term_labor"
  | "pprom"
  | "placental_abruption"
  | "placenta_previa"
  | "cord_prolapse"
  | "fetal_distress_concern"
  | "other";

export type LatePregnancyLaborEmergencyContext = {
  branches: LatePregnancyLaborEmergencyBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveObGynUrologyRedFlags>["categories"];
  noDigitalExamWhenPreviaUnresolved: true;
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const HIGH_ACUITY_LOCK: readonly LatePregnancyLaborEmergencyBranch[] = [
  "placental_abruption",
  "placenta_previa",
  "cord_prolapse",
];

export const LATE_PREGNANCY_LABOR_EMERGENCY_DISCHARGE_FAMILY: Record<
  LatePregnancyLaborEmergencyBranch,
  string | null
> = {
  preterm_labor: null,
  term_labor: null,
  pprom: "pprom_post_acute_followup_v1",
  placental_abruption: null,
  placenta_previa: null,
  cord_prolapse: null,
  fetal_distress_concern: null,
  other: null,
};

/** Documentation advisory only. Never confirms fetal well-being or labor diagnosis. */
export function resolveLatePregnancyLaborEmergencyContext(
  input: ObGynUrologyRedFlagInput
): LatePregnancyLaborEmergencyContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const reproductive = parseReproductiveGuFromText(text);
  const branches: LatePregnancyLaborEmergencyBranch[] = [];
  const redFlags = resolveObGynUrologyRedFlags(input);

  if (/preterm labor|premature contractions|preterm birth concern/.test(text)) branches.push("preterm_labor");
  if (/term labor|active labor|regular contractions.*(term|full)/.test(text)) branches.push("term_labor");
  if (/pprom|premature rupture of membranes|rupture of membranes before labor/.test(text)) {
    branches.push("pprom");
  }
  if (
    redFlags.categories.includes("placental_emergency") &&
    /abruption|abruptio/.test(text)
  ) {
    branches.push("placental_abruption");
  }
  if (/placenta previa|previa with bleeding|low.?lying placenta with bleeding/.test(text)) {
    branches.push("placenta_previa");
  }
  if (
    redFlags.categories.includes("cord_prolapse_or_imminent_delivery") ||
    /cord prolapse|prolapsed cord/.test(text)
  ) {
    branches.push("cord_prolapse");
  }
  if (
    /fetal distress|nonreassuring fetal|decreased fetal movement|abnormal fetal heart/.test(text) ||
    (reproductive.fetalHeartRateReported && /abnormal|nonreassuring|decelerations/.test(text))
  ) {
    branches.push("fetal_distress_concern");
  }

  if (branches.length === 0 && /late pregnancy|third trimester|labor|contractions/.test(text)) {
    branches.push("other");
  }
  if (branches.length === 0) branches.push("other");

  const isFollowUpContext =
    /follow[- ]?up|post-?acute|known (stable|resolving)|interval exam|observation complete/.test(text);
  const isHighAcuityLocked = branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch));

  const pickFamily = (): string | null => {
    if (isHighAcuityLocked && !isFollowUpContext) return null;
    if (branches.includes("fetal_distress_concern") && !isFollowUpContext) return null;
    if (branches.includes("preterm_labor") && !isFollowUpContext) return null;
    if (branches.includes("term_labor") && !isFollowUpContext) return null;
    if (branches.includes("pprom") && isFollowUpContext) {
      return LATE_PREGNANCY_LABOR_EMERGENCY_DISCHARGE_FAMILY.pprom;
    }
    if (isFollowUpContext && branches.includes("other")) return "late_pregnancy_followup_v1";
    return null;
  };

  return {
    branches: [...new Set(branches)],
    dischargeFamilyId: pickFamily(),
    redFlagCategories: redFlags.categories,
    noDigitalExamWhenPreviaUnresolved: true,
  };
}

const BRANCH_PRIORITY: Record<string, number> = {
  cord_prolapse_or_imminent_delivery: 100,
  placental_emergency: 98,
  cord_prolapse: 96,
  placental_abruption: 94,
  placenta_previa: 92,
  fetal_distress_concern: 88,
  preterm_labor: 70,
  term_labor: 65,
  pprom: 60,
  other: 0,
};

export function adaptLatePregnancyLaborEmergencyIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<LatePregnancyLaborEmergencyContext, "branches" | "redFlagCategories">
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
