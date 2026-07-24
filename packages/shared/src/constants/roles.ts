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
  /** D4A.3.0-H1 — hospital unit patient-care tech (not LAB/RADIOLOGY). */
  "PATIENT_CARE_TECH",
] as const;

/** Membership codes that authorize hospital board TECHNICIAN / workflow PATIENT_CARE_TECH. */
export const HOSPITAL_PATIENT_CARE_TECH_ROLE_CODES = ["PATIENT_CARE_TECH"] as const;

/** Ancillary department roles — never hospital care-tech assignment. */
export const HOSPITAL_TECH_EXCLUDED_ANCILLARY_ROLE_CODES = ["LAB", "RADIOLOGY"] as const;

export function roleCodesIncludeHospitalPatientCareTech(
  roleCodes: readonly string[]
): boolean {
  return roleCodes.some((code) =>
    (HOSPITAL_PATIENT_CARE_TECH_ROLE_CODES as readonly string[]).includes(code)
  );
}

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

