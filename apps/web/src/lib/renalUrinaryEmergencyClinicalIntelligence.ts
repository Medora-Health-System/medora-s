/**
 * Phase 17 (Commit 1) — renal / urinary emergency clinical documentation context.
 * Documentation advisory only — never selects antibiotics, never establishes a diagnosis,
 * and never medically clears urosepsis.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveObGynUrologyRedFlags,
  type ObGynUrologyRedFlagInput,
} from "./obGynUrologyRedFlagEngine";
import { parseReproductiveGuFromText } from "./reproductiveGuFoundation";

export type RenalUrinaryEmergencyBranch =
  | "obstructive_uropathy"
  | "infected_stone"
  | "acute_retention"
  | "gross_hematuria_clot"
  | "pyelonephritis"
  | "urinary_sepsis"
  | "other";

export type RenalUrinaryEmergencyContext = {
  branches: RenalUrinaryEmergencyBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveObGynUrologyRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const HIGH_ACUITY_LOCK: readonly RenalUrinaryEmergencyBranch[] = [
  "infected_stone",
  "urinary_sepsis",
];

export const RENAL_URINARY_EMERGENCY_DISCHARGE_FAMILY: Record<RenalUrinaryEmergencyBranch, string | null> = {
  obstructive_uropathy: "obstructive_uropathy_followup_v1",
  infected_stone: null,
  acute_retention: "urinary_retention_followup_v1",
  gross_hematuria_clot: "hematuria_followup_v1",
  pyelonephritis: "pyelonephritis_followup_v1",
  urinary_sepsis: null,
  other: "urinary_symptoms_followup_v1",
};

/** Documentation advisory only. Antibiotics remain MAR-owned if administered. */
export function resolveRenalUrinaryEmergencyContext(
  input: ObGynUrologyRedFlagInput
): RenalUrinaryEmergencyContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  parseReproductiveGuFromText(text);
  const branches: RenalUrinaryEmergencyBranch[] = [];
  const redFlags = resolveObGynUrologyRedFlags(input);

  if (
    redFlags.categories.includes("infected_obstructed_stone") ||
    /infected stone|obstructive pyelonephritis|pyonephrosis/.test(text)
  ) {
    branches.push("infected_stone");
  }
  if (
    redFlags.categories.includes("urinary_sepsis_shock") ||
    /urinary sepsis|urosepsis|septic shock.*(urinary|pyelonephritis)/.test(text)
  ) {
    branches.push("urinary_sepsis");
  }
  if (/obstructive uropathy|hydronephrosis|ureteral stone|nephrolithiasis with obstruction/.test(text)) {
    branches.push("obstructive_uropathy");
  }
  if (/urinary retention|cannot urinate|foley placed for retention|anuria/.test(text)) {
    branches.push("acute_retention");
  }
  if (/gross hematuria|hematuria with clot|clot retention/.test(text)) {
    branches.push("gross_hematuria_clot");
  }
  if (/pyelonephritis|flank pain with fever|kidney infection/.test(text) && !branches.includes("urinary_sepsis")) {
    branches.push("pyelonephritis");
  }

  if (branches.length === 0 && /renal|urinary|flank|dysuria|hematuria/.test(text)) {
    branches.push("other");
  }
  if (branches.length === 0) branches.push("other");

  const isFollowUpContext =
    /follow[- ]?up|post-?acute|known (stable|resolving)|interval exam|observation complete/.test(text);
  const isHighAcuityLocked = branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch));

  const pickFamily = (): string | null => {
    if (isHighAcuityLocked && !isFollowUpContext) return null;
    if (branches.includes("infected_stone") && !isFollowUpContext) return null;
    if (branches.includes("urinary_sepsis") && !isFollowUpContext) return null;
    if (branches.includes("obstructive_uropathy") && isFollowUpContext) {
      return RENAL_URINARY_EMERGENCY_DISCHARGE_FAMILY.obstructive_uropathy;
    }
    if (branches.includes("pyelonephritis") && isFollowUpContext) {
      return RENAL_URINARY_EMERGENCY_DISCHARGE_FAMILY.pyelonephritis;
    }
    if (branches.includes("acute_retention") && isFollowUpContext) {
      return RENAL_URINARY_EMERGENCY_DISCHARGE_FAMILY.acute_retention;
    }
    if (isFollowUpContext) return RENAL_URINARY_EMERGENCY_DISCHARGE_FAMILY.other;
    return null;
  };

  return {
    branches: [...new Set(branches)],
    dischargeFamilyId: pickFamily(),
    redFlagCategories: redFlags.categories,
  };
}

const BRANCH_PRIORITY: Record<string, number> = {
  urinary_sepsis_shock: 100,
  infected_obstructed_stone: 98,
  urinary_sepsis: 96,
  infected_stone: 94,
  obstructive_uropathy: 70,
  pyelonephritis: 65,
  acute_retention: 60,
  gross_hematuria_clot: 55,
  other: 0,
};

export function adaptRenalUrinaryEmergencyIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<RenalUrinaryEmergencyContext, "branches" | "redFlagCategories">
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
