import {
  ADMIN_PROFESSION_CODES,
  findDuplicateRoleCodeDepartmentConflict,
  resolveAdminWorkspacePreviewKey,
  resolveProfessionFromRoleCode,
  resolveRoleCodeFromProfession,
  type AdminProfessionCode,
  type AdminUserAssignmentInput,
  type TechnicianTypeCode,
} from "@medora/shared";
import type { AdminUserAssignmentDto } from "@medora/shared";

export type FacilityDepartmentOption = {
  id: string;
  code: string;
  name: string;
};

export type AssignmentDraftRow = {
  clientId: string;
  facilityId: string;
  profession: AdminProfessionCode | "";
  technicianType: TechnicianTypeCode | "";
  departmentId: string | null;
};

let assignmentRowCounter = 0;

export function createAssignmentRowId(): string {
  assignmentRowCounter += 1;
  return `assignment-row-${assignmentRowCounter}`;
}

export function createEmptyAssignmentRow(facilityId: string): AssignmentDraftRow {
  return {
    clientId: createAssignmentRowId(),
    facilityId,
    profession: "",
    technicianType: "",
    departmentId: null,
  };
}

export function assignmentRowsFromExistingUser(input: {
  facilityId: string;
  roles: string[];
  assignments?: {
    roleCode: string;
    departmentId?: string | null;
  }[];
}): AssignmentDraftRow[] {
  const source =
    input.assignments && input.assignments.length > 0
      ? input.assignments
      : input.roles.map((roleCode) => ({ roleCode, departmentId: null as string | null }));

  return source.map((row) => {
    const mapped = resolveProfessionFromRoleCode(row.roleCode);
    return {
      clientId: createAssignmentRowId(),
      facilityId: input.facilityId,
      profession: mapped.profession,
      technicianType: mapped.technicianType ?? "",
      departmentId: row.departmentId ?? null,
    };
  });
}

export function resolveRowRoleCode(row: AssignmentDraftRow): {
  roleCode: string | null;
  errorKey: string | null;
} {
  if (!row.profession) {
    return { roleCode: null, errorKey: "adminUsers.valProfessionRequired" };
  }
  const resolved = resolveRoleCodeFromProfession({
    profession: row.profession,
    technicianType: row.technicianType || null,
  });
  if (!resolved.ok) {
    return { roleCode: null, errorKey: resolved.errorKey };
  }
  return { roleCode: resolved.roleCode, errorKey: null };
}

export function buildAssignmentsPayload(rows: AssignmentDraftRow[]): {
  ok: true;
  assignments: AdminUserAssignmentDto[];
  roleCodes: string[];
} | {
  ok: false;
  errorKey: string;
} {
  if (rows.length === 0) {
    return { ok: false, errorKey: "adminUsers.valAtLeastOneAssignment" };
  }

  const assignments: AdminUserAssignmentInput[] = [];
  for (const row of rows) {
    if (!row.facilityId.trim()) {
      return { ok: false, errorKey: "adminUsers.valFacilityRequired" };
    }
    const { roleCode, errorKey } = resolveRowRoleCode(row);
    if (!roleCode) {
      return { ok: false, errorKey: errorKey ?? "adminUsers.valProfessionRequired" };
    }
    assignments.push({
      facilityId: row.facilityId,
      roleCode: roleCode as AdminUserAssignmentDto["roleCode"],
      departmentId: row.departmentId,
    });
  }

  const conflict = findDuplicateRoleCodeDepartmentConflict(assignments);
  if (conflict) {
    return { ok: false, errorKey: "adminUsers.valDuplicateRoleDepartment" };
  }

  return {
    ok: true,
    assignments,
    roleCodes: [...new Set(assignments.map((a) => a.roleCode))],
  };
}

export function workspacePreviewKeyForRow(
  row: AssignmentDraftRow,
  departments: FacilityDepartmentOption[]
): string {
  const { roleCode } = resolveRowRoleCode(row);
  if (!roleCode) {
    return "adminUsers.workspacePreview.default";
  }
  const dept = departments.find((d) => d.id === row.departmentId);
  return resolveAdminWorkspacePreviewKey({
    roleCodes: [roleCode],
    prismaDepartmentCode: dept?.code ?? null,
  });
}

export { ADMIN_PROFESSION_CODES };
