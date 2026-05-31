export const ROLE_CODES = [
  "ADMIN",
  "MEDORA_SUPER_ADMIN",
  "PROVIDER",
  "RN",
  "FRONT_DESK",
  "LAB",
  "RADIOLOGY",
  "PHARMACY",
  "BILLING",
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

/** S22 — platform-only operational APIs and UI (not facility administrators). */
export const PLATFORM_OPERATOR_ROLE_CODE = "MEDORA_SUPER_ADMIN" as const;

export function isPlatformOperatorRoleCode(role: string | undefined | null): boolean {
  return String(role ?? "").trim() === PLATFORM_OPERATOR_ROLE_CODE;
}

/**
 * LAB.ED.4 — acknowledge / start / complete on LAB_TEST and IMAGING_STUDY lines.
 * Backend `assertDepartmentRoleForItem` and web worklist UI must stay aligned.
 * Excludes non-clinical roles (e.g. FRONT_DESK, BILLING, PHARMACY-only).
 */
export const LAB_IMAGING_CLINICAL_WORKFLOW_ROLE_CODES = [
  "ADMIN",
  "PROVIDER",
  "RN",
  "LAB",
  "RADIOLOGY",
] as const;

export type LabImagingClinicalWorkflowRoleCode =
  (typeof LAB_IMAGING_CLINICAL_WORKFLOW_ROLE_CODES)[number];

export function roleCodesIncludeLabImagingClinicalWorkflow(
  roleCodes: readonly string[]
): boolean {
  return roleCodes.some((code) =>
    (LAB_IMAGING_CLINICAL_WORKFLOW_ROLE_CODES as readonly string[]).includes(code)
  );
}

