/** Clinical department taxonomy for workspace authorization (logical, not Prisma enum). */
export type DepartmentCode =
  | "EMERGENCY"
  | "ICU"
  | "MEDSURG"
  | "OBSERVATION"
  | "OBGYN"
  | "PEDIATRICS"
  | "BEHAVIORAL_HEALTH"
  | "TELEMETRY"
  | "LABORATORY"
  | "RADIOLOGY";

export const CLINICAL_DEPARTMENT_CODES: readonly DepartmentCode[] = [
  "EMERGENCY",
  "ICU",
  "MEDSURG",
  "OBSERVATION",
  "OBGYN",
  "PEDIATRICS",
  "BEHAVIORAL_HEALTH",
  "TELEMETRY",
  "LABORATORY",
  "RADIOLOGY",
] as const;

/** Prisma `DepartmentCode` values stored on facility department rows today. */
export type PrismaDepartmentCode = "PRIMARY_CARE" | "LAB" | "RAD" | "PHARM" | "INPATIENT";

export type ResolveDepartmentCodeInput = {
  /** Explicit clinical department when assigned (future admin UI / session enrichment). */
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

export function isClinicalDepartmentCode(value: string): value is DepartmentCode {
  return (CLINICAL_DEPARTMENT_CODES as readonly string[]).includes(value.trim().toUpperCase());
}

/**
 * Map Prisma facility department codes to clinical department taxonomy.
 * Does not require a migration — adapter only.
 */
export function mapPrismaDepartmentCodeToClinical(
  prismaCode: string | null | undefined
): DepartmentCode | null {
  const code = String(prismaCode ?? "")
    .trim()
    .toUpperCase();
  if (!code) return null;
  switch (code) {
    case "LAB":
      return "LABORATORY";
    case "RAD":
      return "RADIOLOGY";
    case "INPATIENT":
      return "MEDSURG";
    case "PRIMARY_CARE":
      return "OBSERVATION";
    default:
      return null;
  }
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
