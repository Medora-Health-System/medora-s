import type { DepartmentCode } from "@medora/shared";
import { isClinicalDepartmentCode, resolveDepartmentCode } from "@medora/shared";

export type HospitalTechnicianWorkspaceType =
  | "ICU"
  | "MEDSURG"
  | "OBGYN"
  | "PEDIATRICS"
  | "OBSERVATION"
  | "TELEMETRY";

const WORKSPACE_BY_DEPARTMENT: Record<HospitalTechnicianWorkspaceType, HospitalTechnicianWorkspaceType> =
  {
    ICU: "ICU",
    MEDSURG: "MEDSURG",
    OBGYN: "OBGYN",
    PEDIATRICS: "PEDIATRICS",
    OBSERVATION: "OBSERVATION",
    TELEMETRY: "TELEMETRY",
  };

export const HOSPITAL_FLOOR_DEPARTMENT_CODES: readonly DepartmentCode[] = [
  "ICU",
  "MEDSURG",
  "OBGYN",
  "PEDIATRICS",
  "OBSERVATION",
  "TELEMETRY",
] as const;

const HOSPITAL_FLOOR_DEPARTMENT_SET = new Set<string>(HOSPITAL_FLOOR_DEPARTMENT_CODES);

export function isHospitalFloorDepartmentCode(
  departmentCode?: string | null
): departmentCode is HospitalTechnicianWorkspaceType {
  const code = String(departmentCode ?? "")
    .trim()
    .toUpperCase();
  return Boolean(code && HOSPITAL_FLOOR_DEPARTMENT_SET.has(code));
}

/**
 * Maps assigned clinical department to a hospital floor technician workspace label.
 * Fallback: Med-Surg when department is unknown or unassigned on a floor context.
 */
export function resolveHospitalTechnicianWorkspace(
  departmentCode?: string | null
): HospitalTechnicianWorkspaceType {
  const explicit = String(departmentCode ?? "")
    .trim()
    .toUpperCase();
  if (explicit && isClinicalDepartmentCode(explicit) && isHospitalFloorDepartmentCode(explicit)) {
    return WORKSPACE_BY_DEPARTMENT[explicit];
  }
  return "MEDSURG";
}

export type HospitalTechnicianSessionInput = {
  roleCodes: readonly string[];
  departmentCode?: string | null;
  prismaDepartmentCode?: string | null;
};

/** Resolve clinical department for hospital technician session (GENERAL workspace). */
export function resolveHospitalTechnicianDepartment(
  input: HospitalTechnicianSessionInput
): DepartmentCode | null {
  return resolveDepartmentCode({
    departmentCode: input.departmentCode,
    prismaDepartmentCode: input.prismaDepartmentCode,
    roleCodes: input.roleCodes,
    clinicalWorkspace: "GENERAL",
  });
}

export function hospitalTechnicianActiveWorkspacePath(encounterId: string): string {
  return `/app/hospitalisation/active/${encodeURIComponent(encounterId)}`;
}
