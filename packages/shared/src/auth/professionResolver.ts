import type { RoleCode } from "../constants/roles.js";

/** Authoritative profession grouping — who the employee is, not where they work. */
export type ProfessionGroup =
  | "ADMIN"
  | "PROVIDER"
  | "RN"
  | "TECHNICIAN"
  | "PHARMACY"
  | "BILLING"
  | "FRONT_DESK"
  | "UNKNOWN";

export type ResolveProfessionGroupInput = {
  /** Existing facility role codes (Prisma `RoleCode`). */
  roleCodes?: readonly string[];
  /** Optional capability mirrors from session (backward compatible with ED workspace helpers). */
  canPrescribe?: boolean;
  canAdministerMedication?: boolean;
};

/** Ancillary + patient-care tech RoleCodes → TECHNICIAN profession group. */
const TECHNICIAN_ROLE_CODES = new Set<string>(["LAB", "RADIOLOGY", "PATIENT_CARE_TECH"]);

function normalizeRoleCodes(roleCodes: readonly string[] | undefined): string[] {
  return (roleCodes ?? []).map((code) => code.trim().toUpperCase()).filter(Boolean);
}

/**
 * Map existing database role codes into profession groups.
 * Does not invent new roles — uses current Prisma `RoleCode` values only.
 */
export function resolveProfessionGroup(input: ResolveProfessionGroupInput): ProfessionGroup {
  const roles = normalizeRoleCodes(input.roleCodes);
  const canPrescribe =
    input.canPrescribe ?? (roles.includes("PROVIDER") || roles.includes("ADMIN"));
  const canAdministerMedication =
    input.canAdministerMedication ??
    (roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN"));

  if (roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN")) {
    return "ADMIN";
  }
  if (roles.includes("PROVIDER") || canPrescribe) {
    return "PROVIDER";
  }
  if (roles.includes("RN") || canAdministerMedication) {
    return "RN";
  }
  if (roles.some((code) => TECHNICIAN_ROLE_CODES.has(code))) {
    return "TECHNICIAN";
  }
  if (roles.includes("PHARMACY")) {
    return "PHARMACY";
  }
  if (roles.includes("BILLING")) {
    return "BILLING";
  }
  if (roles.includes("FRONT_DESK")) {
    return "FRONT_DESK";
  }
  return "UNKNOWN";
}

/** Convenience: map a single legacy role code when only one is known. */
export function resolveProfessionGroupFromRoleCode(
  roleCode: RoleCode | string | null | undefined
): ProfessionGroup {
  if (!roleCode || !String(roleCode).trim()) {
    return "UNKNOWN";
  }
  return resolveProfessionGroup({ roleCodes: [String(roleCode)] });
}
