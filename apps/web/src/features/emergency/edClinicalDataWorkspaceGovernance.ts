import type { ClinicalDocumentationRole } from "@medora/shared";

export type ClinicalDataAccessMode = "editable" | "review";

/** @deprecated Phase 3 — Clinical Data supports role-based edit. Kept for test compatibility. */
export const ED_CLINICAL_DATA_READ_ONLY = false;

export type ClinicalDataFormOwner = ClinicalDocumentationRole;

export type ClinicalDataWorkspaceSource = "clinicalData" | "nursingAssessment";

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

function canEditFormOwner(
  formOwner: ClinicalDataFormOwner,
  userRoles: readonly string[]
): boolean {
  if (formOwner === "PROVIDER") return isProviderRole(userRoles);
  if (formOwner === "RN" || formOwner === "TECHNICIAN" || formOwner === "RT") {
    return isNursingRole(userRoles);
  }
  if (formOwner === "MULTI_ROLE") {
    return isProviderRole(userRoles) || isNursingRole(userRoles);
  }
  return false;
}

/**
 * Whether the user may open a catalog form from the Clinical Data workspace.
 */
export function canOpenClinicalDataFormForRole(input: {
  formOwner: ClinicalDataFormOwner;
  userRoles: readonly string[];
  mode: "review" | "edit";
}): boolean {
  const access = resolveClinicalDataAccessMode({
    formOwner: input.formOwner,
    userRoles: input.userRoles,
    sourceWorkspace: "clinicalData",
  });
  if (input.mode === "edit") return access === "editable";
  return isProviderRole(input.userRoles) || isNursingRole(input.userRoles);
}

/** Resolve per-form access mode for Clinical Data vs Nursing Assessment. */
export function resolveClinicalDataAccessMode(input: {
  formOwner: ClinicalDataFormOwner;
  userRoles: readonly string[];
  sourceWorkspace: ClinicalDataWorkspaceSource;
  /** @deprecated use sourceWorkspace */
  workspace?: ClinicalDataWorkspaceSource;
}): ClinicalDataAccessMode {
  const workspace = input.sourceWorkspace ?? input.workspace ?? "clinicalData";
  const editable = canEditFormOwner(input.formOwner, input.userRoles);
  if (workspace === "nursingAssessment") {
    return editable ? "editable" : "review";
  }
  return editable ? "editable" : "review";
}

/** Required Clinical Documentation categories for provider Clinical Data review. */
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
