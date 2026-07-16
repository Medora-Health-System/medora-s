/**
 * Phase 12 — nosebleed / nasal complaint clinical documentation context.
 * Mirrors `eyeComplaintClinicalIntelligence.ts` (Phase 11). Documentation advisory only —
 * never establishes a diagnosis or disposition. Ownership of the actual clinical decision
 * stays with the treating clinician.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { resolveEntEmergencyRedFlags, type EntEmergencyRedFlagInput } from "./entEmergencyRedFlagEngine";

export type EntNoseEpistaxisBranch =
  | "anterior_epistaxis"
  | "posterior_epistaxis_concern"
  | "nasal_foreign_body"
  | "septal_hematoma_overlap"
  | "anticoagulated_epistaxis";

export type EntNoseEpistaxisContext = {
  branches: EntNoseEpistaxisBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveEntEmergencyRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** High-risk branches (posterior source, hemodynamic instability, or airway concern) withhold routine discharge. */
const HIGH_RISK_LOCK: readonly EntNoseEpistaxisBranch[] = ["posterior_epistaxis_concern"];

export const ENT_NOSE_EPISTAXIS_DISCHARGE_FAMILY: Record<EntNoseEpistaxisBranch, string> = {
  anterior_epistaxis: "anterior_epistaxis",
  posterior_epistaxis_concern: "posterior_epistaxis_followup",
  nasal_foreign_body: "nasal_foreign_body_followup",
  septal_hematoma_overlap: "septal_hematoma_followup",
  anticoagulated_epistaxis: "anticoagulated_epistaxis_followup",
};

/** Documentation advisory only. Never establishes a diagnosis or disposition. */
export function resolveEntNoseEpistaxisContext(input: EntEmergencyRedFlagInput): EntNoseEpistaxisContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: EntNoseEpistaxisBranch[] = [];

  const redFlags = resolveEntEmergencyRedFlags(input);
  const hasPosteriorRedFlag = redFlags.categories.includes("posterior_epistaxis");
  if (
    hasPosteriorRedFlag ||
    /posterior epistaxis|posterior nosebleed|bleeding (from )?(both nares|posteriorly)|failed anterior packing|hemodynamic instability with epistaxis/.test(
      text
    )
  ) {
    branches.push("posterior_epistaxis_concern");
  } else if (/anterior epistaxis|nosebleed|epistaxis/.test(text)) {
    branches.push("anterior_epistaxis");
  }

  if (/nasal foreign body|foreign body in (the )?nose|object in (the )?nostril|button battery.*(nose|nasal)/.test(text)) {
    branches.push("nasal_foreign_body");
  }
  if (/septal hematoma|nasal septal hematoma/.test(text)) branches.push("septal_hematoma_overlap");
  if (/anticoagulant|antiplatelet|warfarin|apixaban|rivaroxaban|clopidogrel|on blood thinners/.test(text)) {
    branches.push("anticoagulated_epistaxis");
  }

  const isFollowUpContext = /follow[- ]?up|recheck|known (stable|resolving)|interval exam|post-?operative check/.test(text);
  const hasHemodynamicInstability = /hemodynamic instability|hypotensive|tachycardic with (heavy|large volume) bleeding/.test(text);
  const hasAirwayConcern = /airway (compromise|soiling)/.test(text);
  const isHighRiskLocked =
    branches.some((branch) => HIGH_RISK_LOCK.includes(branch)) || hasHemodynamicInstability || hasAirwayConcern;

  const dischargeFamilyId =
    isHighRiskLocked
      ? isFollowUpContext
        ? ENT_NOSE_EPISTAXIS_DISCHARGE_FAMILY.posterior_epistaxis_concern
        : null
      : branches.includes("septal_hematoma_overlap")
      ? ENT_NOSE_EPISTAXIS_DISCHARGE_FAMILY.septal_hematoma_overlap
      : branches.includes("nasal_foreign_body")
      ? ENT_NOSE_EPISTAXIS_DISCHARGE_FAMILY.nasal_foreign_body
      : branches.includes("anticoagulated_epistaxis")
      ? ENT_NOSE_EPISTAXIS_DISCHARGE_FAMILY.anticoagulated_epistaxis
      : branches.includes("anterior_epistaxis")
      ? ENT_NOSE_EPISTAXIS_DISCHARGE_FAMILY.anterior_epistaxis
      : null;

  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

const BRANCH_PRIORITY: Record<string, number> = {
  posterior_epistaxis: 95,
  posterior_epistaxis_concern: 95,
  button_battery_foreign_body: 90,
  septal_hematoma_overlap: 60,
  nasal_foreign_body: 45,
  anticoagulated_epistaxis: 30,
  anterior_epistaxis: 10,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis or disposition. */
export function adaptEntNoseEpistaxisIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<EntNoseEpistaxisContext, "branches" | "redFlagCategories">
): ProviderDocumentationComplaintIntelligence {
  const weightedHints = [
    ...context.redFlagCategories.map((value) => ({ hint: value.replace(/_/g, " "), weight: BRANCH_PRIORITY[value] ?? 80 })),
    ...context.branches.map((value) => ({ hint: value.replace(/_/g, " "), weight: BRANCH_PRIORITY[value] ?? 40 })),
  ];
  const score = (key: string) => {
    const compactKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    let best = 0;
    for (const { hint, weight } of weightedHints) {
      const compactHint = hint.replace(/[^a-z0-9]/g, "");
      if (compactKey.includes(compactHint)) {
        best = Math.max(best, weight);
      }
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
