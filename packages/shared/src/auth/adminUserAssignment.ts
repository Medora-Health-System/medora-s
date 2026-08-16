/**
 * MEDUI.AUTH.ROLE.2 / MEDUI.D4C.11 — Admin user assignment helpers.
 * Profession registry lives in enterpriseWorkforceProfessionD4c11 (single authority).
 */

import type { AdminAssignableRoleCode } from "../schemas/adminUsers.js";
import {
  mapPrismaDepartmentCodeToClinical,
  resolveDepartmentCode,
  type DepartmentCode,
} from "./departmentResolver.js";
import { resolveProfessionGroup } from "./professionResolver.js";
import { filterEdWorkspaceTiles, resolveWorkspacePermissions } from "./workspaceAuthorization.js";
import {
  ADMIN_PROFESSION_CODES,
  canonicalizeWorkforceProfession,
  preferredDepartmentCodeForProfession,
  resolveProfessionFromRoleCode,
  resolveRoleCodeFromProfession,
  TECHNICIAN_TYPE_CODES,
  workforceAssignmentConflictKey,
  type AdminProfessionCode,
  type TechnicianTypeCode,
} from "./enterpriseWorkforceProfessionD4c11.js";

export {
  ADMIN_PROFESSION_CODES,
  filterDepartmentsForProfession,
  preferredDepartmentCodeForProfession,
  resolveProfessionFromRoleCode,
  resolveRoleCodeFromProfession,
  showsProviderBillingCredentialFields,
  TECHNICIAN_TYPE_CODES,
  workforceAssignmentConflictKey,
  type AdminProfessionCode,
  type ResolveRoleCodeFromProfessionResult,
  type TechnicianTypeCode,
} from "./enterpriseWorkforceProfessionD4c11.js";

export type AdminUserAssignmentInput = {
  facilityId: string;
  roleCode: AdminAssignableRoleCode;
  departmentId?: string | null;
  /** MEDUI.D4C.11 — first-class profession identity (persisted on UserRole). */
  professionCode?: string | null;
};

export type WorkspacePreviewInput = {
  roleCodes: readonly string[];
  prismaDepartmentCode?: string | null;
  clinicalDepartmentCode?: DepartmentCode | string | null;
  professionCode?: string | null;
};

/** i18n key under `adminUsers.workspacePreview.*` */
export function resolveAdminWorkspacePreviewKey(input: WorkspacePreviewInput): string {
  const professionCode = canonicalizeWorkforceProfession(input.professionCode);
  if (
    professionCode === "DENTIST" ||
    professionCode === "DENTAL_HYGIENIST" ||
    professionCode === "DENTAL_ASSISTANT" ||
    professionCode === "DENTAL_TECHNICIAN"
  ) {
    return "adminUsers.workspacePreview.dental";
  }

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
  if (profession === "PROVIDER" && input.prismaDepartmentCode === "PRIMARY_CARE") {
    return "adminUsers.workspacePreview.clinicProvider";
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

/** Dedupe assignment rows by professionCode + department at a facility. */
export function dedupeAdminUserAssignments<T extends AdminUserAssignmentInput>(
  rows: readonly T[]
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const key = workforceAssignmentConflictKey({
      facilityId: row.facilityId,
      professionCode: row.professionCode,
      departmentId: row.departmentId,
      roleCode: row.roleCode,
    });
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/**
 * Detect duplicate profession+department at one facility.
 * Same profession across different departments is allowed (e.g. MD + CLINIC + MEDSURG).
 */
export function findDuplicateProfessionAssignmentConflict(
  rows: readonly AdminUserAssignmentInput[]
): string | null {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = workforceAssignmentConflictKey({
      facilityId: row.facilityId,
      professionCode: row.professionCode,
      departmentId: row.departmentId,
      roleCode: row.roleCode,
    });
    if (seen.has(key)) {
      return (
        canonicalizeWorkforceProfession(row.professionCode) ??
        row.professionCode ??
        row.roleCode
      );
    }
    seen.add(key);
  }
  return null;
}

/** @deprecated Use findDuplicateProfessionAssignmentConflict — same RoleCode may appear twice with different professions. */
export function findDuplicateRoleCodeDepartmentConflict(
  rows: readonly AdminUserAssignmentInput[]
): string | null {
  return findDuplicateProfessionAssignmentConflict(rows);
}
