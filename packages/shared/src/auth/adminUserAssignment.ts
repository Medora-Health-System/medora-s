import type { AdminAssignableRoleCode } from "../schemas/adminUsers.js";
import {
  mapPrismaDepartmentCodeToClinical,
  resolveDepartmentCode,
  type DepartmentCode,
} from "./departmentResolver.js";
import { resolveProfessionGroup } from "./professionResolver.js";
import { filterEdWorkspaceTiles, resolveWorkspacePermissions } from "./workspaceAuthorization.js";

/** Admin UI profession selector — maps to existing RoleCode values. */
export const ADMIN_PROFESSION_CODES = [
  "ADMINISTRATION",
  "PROVIDER",
  "RN",
  "TECHNICIAN",
  "PHARMACY",
  "BILLING",
  "FRONT_DESK",
] as const;

export type AdminProfessionCode = (typeof ADMIN_PROFESSION_CODES)[number];

export type TechnicianTypeCode = "LAB" | "RADIOLOGY";

export const TECHNICIAN_TYPE_CODES = ["LAB", "RADIOLOGY"] as const;

export type AdminUserAssignmentInput = {
  facilityId: string;
  roleCode: AdminAssignableRoleCode;
  departmentId?: string | null;
};

export type ResolveRoleCodeFromProfessionResult =
  | { ok: true; roleCode: AdminAssignableRoleCode }
  | { ok: false; errorKey: "adminUsers.valTechnicianTypeRequired" };

/**
 * Map admin profession (+ technician type) to an existing Prisma RoleCode.
 * Does not invent TECH or other new roles.
 */
export function resolveRoleCodeFromProfession(input: {
  profession: AdminProfessionCode;
  technicianType?: TechnicianTypeCode | null;
}): ResolveRoleCodeFromProfessionResult {
  switch (input.profession) {
    case "ADMINISTRATION":
      return { ok: true, roleCode: "ADMIN" };
    case "PROVIDER":
      return { ok: true, roleCode: "PROVIDER" };
    case "RN":
      return { ok: true, roleCode: "RN" };
    case "PHARMACY":
      return { ok: true, roleCode: "PHARMACY" };
    case "BILLING":
      return { ok: true, roleCode: "BILLING" };
    case "FRONT_DESK":
      return { ok: true, roleCode: "FRONT_DESK" };
    case "TECHNICIAN": {
      const type = input.technicianType;
      if (type === "LAB" || type === "RADIOLOGY") {
        return { ok: true, roleCode: type };
      }
      return { ok: false, errorKey: "adminUsers.valTechnicianTypeRequired" };
    }
    default:
      return { ok: false, errorKey: "adminUsers.valTechnicianTypeRequired" };
  }
}

/** Reverse map RoleCode → profession for edit forms. */
export function resolveProfessionFromRoleCode(roleCode: string): {
  profession: AdminProfessionCode;
  technicianType?: TechnicianTypeCode;
} {
  const code = roleCode.trim().toUpperCase();
  switch (code) {
    case "ADMIN":
    case "MEDORA_SUPER_ADMIN":
      return { profession: "ADMINISTRATION" };
    case "PROVIDER":
      return { profession: "PROVIDER" };
    case "RN":
      return { profession: "RN" };
    case "LAB":
      return { profession: "TECHNICIAN", technicianType: "LAB" };
    case "RADIOLOGY":
      return { profession: "TECHNICIAN", technicianType: "RADIOLOGY" };
    case "PHARMACY":
      return { profession: "PHARMACY" };
    case "BILLING":
      return { profession: "BILLING" };
    case "FRONT_DESK":
      return { profession: "FRONT_DESK" };
    default:
      return { profession: "ADMINISTRATION" };
  }
}

export type WorkspacePreviewInput = {
  roleCodes: readonly string[];
  prismaDepartmentCode?: string | null;
  clinicalDepartmentCode?: DepartmentCode | string | null;
};

/** i18n key under `adminUsers.workspacePreview.*` */
export function resolveAdminWorkspacePreviewKey(input: WorkspacePreviewInput): string {
  const profession = resolveProfessionGroup({ roleCodes: input.roleCodes });
  const clinicalFromPrisma = mapPrismaDepartmentCodeToClinical(input.prismaDepartmentCode);
  const hasExplicitDepartment =
    Boolean(String(input.clinicalDepartmentCode ?? "").trim()) ||
    Boolean(String(input.prismaDepartmentCode ?? "").trim());
  const department = resolveDepartmentCode({
    departmentCode: input.clinicalDepartmentCode ?? clinicalFromPrisma,
    prismaDepartmentCode: input.prismaDepartmentCode,
    roleCodes: input.roleCodes,
    clinicalWorkspace: !hasExplicitDepartment
      ? "ED"
      : input.prismaDepartmentCode === "LAB" || input.prismaDepartmentCode === "RAD"
        ? "GENERAL"
        : "ED",
  });

  if (profession === "ADMIN") {
    return "adminUsers.workspacePreview.adminFull";
  }
  if (profession === "PROVIDER" && (department === "EMERGENCY" || department == null)) {
    return "adminUsers.workspacePreview.providerEd";
  }
  if (profession === "RN" && (department === "EMERGENCY" || department == null)) {
    return "adminUsers.workspacePreview.rnEd";
  }
  if (profession === "TECHNICIAN" && department === "EMERGENCY") {
    return "adminUsers.workspacePreview.technicianEd";
  }
  if (profession === "TECHNICIAN" && department === "ICU") {
    return "adminUsers.workspacePreview.technicianIcu";
  }
  if (profession === "TECHNICIAN" && department === "LABORATORY") {
    return "adminUsers.workspacePreview.technicianLab";
  }
  if (profession === "TECHNICIAN" && department === "RADIOLOGY") {
    return "adminUsers.workspacePreview.technicianRad";
  }
  if (profession === "PHARMACY") {
    return "adminUsers.workspacePreview.pharmacy";
  }
  if (profession === "BILLING") {
    return "adminUsers.workspacePreview.billing";
  }
  if (profession === "FRONT_DESK") {
    return "adminUsers.workspacePreview.frontDesk";
  }
  return "adminUsers.workspacePreview.default";
}

/** Compact tile summary for admin preview (ED tiles only when applicable). */
export function summarizeEdWorkspaceTilesForPreview(input: WorkspacePreviewInput): string {
  const profession = resolveProfessionGroup({ roleCodes: input.roleCodes });
  const department = resolveDepartmentCode({
    departmentCode: input.clinicalDepartmentCode,
    prismaDepartmentCode: input.prismaDepartmentCode,
    roleCodes: input.roleCodes,
    clinicalWorkspace: "ED",
  });
  const perms = resolveWorkspacePermissions({ profession, department, facilityId: null });
  const edTiles = filterEdWorkspaceTiles(perms.visibleTiles);
  if (edTiles.length > 0) {
    return edTiles.join(", ");
  }
  return perms.visibleTiles.join(", ");
}

/** Dedupe assignment rows by roleCode + departmentId (same facility). */
export function dedupeAdminUserAssignments<T extends AdminUserAssignmentInput>(
  rows: readonly T[]
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const key = `${row.facilityId}::${row.roleCode}::${row.departmentId ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/** Detect conflicting same roleCode with different departments at one facility. */
export function findDuplicateRoleCodeDepartmentConflict(
  rows: readonly AdminUserAssignmentInput[]
): string | null {
  const byRole = new Map<string, Set<string>>();
  for (const row of rows) {
    const deptKey = row.departmentId ?? "";
    const key = `${row.facilityId}::${row.roleCode}`;
    const set = byRole.get(key) ?? new Set<string>();
    set.add(deptKey);
    byRole.set(key, set);
    if (set.size > 1) {
      return row.roleCode;
    }
  }
  return null;
}
