import {
  CLINICAL_DEPARTMENT_CODES,
  isClinicalDepartmentCode,
  mapLegacyPrismaDepartmentCodeToClinicalDepartment,
  type ClinicalDepartmentCode,
  type LegacyPrismaDepartmentCode,
} from "./clinicalDepartmentRegistry.js";

/** @deprecated Prefer {@link ClinicalDepartmentCode} from clinicalDepartmentRegistry. */
export type DepartmentCode = ClinicalDepartmentCode;

/** Re-export registry clinical codes for backward-compatible imports. */
export { CLINICAL_DEPARTMENT_CODES };

/** Prisma `DepartmentCode` values stored on facility department rows (legacy + clinical). */
export type PrismaDepartmentCode = LegacyPrismaDepartmentCode | ClinicalDepartmentCode;

export type ResolveDepartmentCodeInput = {
  /** Explicit clinical department when assigned (admin UI / session enrichment). */
  departmentCode?: DepartmentCode | string | null;
  /** Prisma department row code when `departmentId` is resolved server-side. */
  prismaDepartmentCode?: PrismaDepartmentCode | string | null;
  /** Legacy role codes for backward-compatible inference when department is unassigned. */
  roleCodes?: readonly string[];
  /**
   * ED workspace adapter: when no explicit department is assigned, infer EMERGENCY for
   * clinical roles so LAB/RADIOLOGY technicians keep current ED triage visibility (MEDUI.ED.ROLE.1A).
   */
  clinicalWorkspace?: "ED" | "GENERAL";
};

function normalizeRoleCodes(roleCodes: readonly string[] | undefined): string[] {
  return (roleCodes ?? []).map((code) => code.trim().toUpperCase()).filter(Boolean);
}

export { isClinicalDepartmentCode };

/**
 * Map Prisma facility department codes to clinical department taxonomy.
 */
export function mapPrismaDepartmentCodeToClinical(
  prismaCode: string | null | undefined
): DepartmentCode | null {
  return mapLegacyPrismaDepartmentCodeToClinicalDepartment(prismaCode);
}

function inferDepartmentFromLegacyRoles(
  roles: string[],
  clinicalWorkspace: "ED" | "GENERAL"
): DepartmentCode | null {
  if (clinicalWorkspace === "ED") {
    const edClinicalRoles = new Set([
      "ADMIN",
      "MEDORA_SUPER_ADMIN",
      "PROVIDER",
      "RN",
      "LAB",
      "RADIOLOGY",
    ]);
    if (roles.some((code) => edClinicalRoles.has(code))) {
      return "EMERGENCY";
    }
    return null;
  }

  if (roles.includes("LAB")) return "LABORATORY";
  if (roles.includes("RADIOLOGY")) return "RADIOLOGY";
  return null;
}

/**
 * Resolve clinical department from explicit assignment, Prisma department row, or legacy role inference.
 */
export function resolveDepartmentCode(input: ResolveDepartmentCodeInput): DepartmentCode | null {
  const explicit = String(input.departmentCode ?? "")
    .trim()
    .toUpperCase();
  if (explicit && isClinicalDepartmentCode(explicit)) {
    return explicit;
  }

  const fromPrisma = mapPrismaDepartmentCodeToClinical(input.prismaDepartmentCode);
  if (fromPrisma) {
    return fromPrisma;
  }

  const roles = normalizeRoleCodes(input.roleCodes);
  return inferDepartmentFromLegacyRoles(roles, input.clinicalWorkspace ?? "GENERAL");
}
