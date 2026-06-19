import type { ClinicalDocumentationRole } from "@medora/shared";

/** Phase 1 — Clinical Data is a read-only provider review workspace. */
export const ED_CLINICAL_DATA_READ_ONLY = true;

export type ClinicalDataAccessMode = "review" | "edit";

export type ClinicalDataFormOwner = ClinicalDocumentationRole;

function normalizeRoleCodes(roleCodes: readonly string[]): string[] {
  return roleCodes.map((code) => code.trim().toUpperCase()).filter(Boolean);
}

function isNursingRole(roleCodes: readonly string[]): boolean {
  const roles = normalizeRoleCodes(roleCodes);
  return roles.includes("RN") || roles.includes("ADMIN");
}

function isProviderRole(roleCodes: readonly string[]): boolean {
  return normalizeRoleCodes(roleCodes).includes("PROVIDER");
}

/**
 * Whether the user may open a catalog form from the Clinical Data workspace.
 * Phase 1: all forms open in review mode only.
 */
export function canOpenClinicalDataFormForRole(input: {
  formOwner: ClinicalDataFormOwner;
  userRoles: readonly string[];
  mode: "review" | "edit";
}): boolean {
  if (input.mode === "edit") {
    if (ED_CLINICAL_DATA_READ_ONLY) return false;
    if (input.formOwner === "RN" || input.formOwner === "TECHNICIAN" || input.formOwner === "RT") {
      return isNursingRole(input.userRoles);
    }
    if (input.formOwner === "PROVIDER") {
      return isProviderRole(input.userRoles);
    }
    return isNursingRole(input.userRoles) || isProviderRole(input.userRoles);
  }
  return isProviderRole(input.userRoles) || isNursingRole(input.userRoles);
}

/** Resolve access mode for a form opened from Clinical Data vs Nursing Assessment. */
export function resolveClinicalDataAccessMode(input: {
  formOwner: ClinicalDataFormOwner;
  userRoles: readonly string[];
  workspace: "clinicalData" | "nursingAssessment";
}): ClinicalDataAccessMode {
  if (input.workspace === "nursingAssessment") {
    if (input.formOwner === "PROVIDER" && isProviderRole(input.userRoles)) return "edit";
    if (
      (input.formOwner === "RN" ||
        input.formOwner === "TECHNICIAN" ||
        input.formOwner === "RT" ||
        input.formOwner === "MULTI_ROLE") &&
      isNursingRole(input.userRoles)
    ) {
      return "edit";
    }
    return "review";
  }
  if (ED_CLINICAL_DATA_READ_ONLY) return "review";
  return resolveClinicalDataAccessMode({ ...input, workspace: "nursingAssessment" });
}

/** Required Clinical Documentation categories for provider Clinical Data review (Phase 1). */
export const ED_CLINICAL_DATA_REQUIRED_CATEGORIES = [
  "FLOWSHEETS",
  "SCORES_AND_SCREENS",
  "INTAKE_OUTPUT",
  "SAFETY_DOCUMENTATION",
  "BEHAVIORAL_HEALTH_DOCUMENTATION",
  "RESPIRATORY_DOCUMENTATION",
  "BLOOD_PRODUCT_DOCUMENTATION",
  "HIGH_ALERT_INFUSION_DOCUMENTATION",
  "STROKE_DOCUMENTATION",
  "CARDIAC_MONITORING_DOCUMENTATION",
] as const;
