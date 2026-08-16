import {
  ADMIN_PROFESSION_CODES,
  DENTAL_WORKFORCE_PROFESSION_CODES,
  filterDepartmentsForProfession,
  findDuplicateProfessionAssignmentConflict,
  preferredDepartmentCodeForProfession,
  resolveAdminWorkspacePreviewKey,
  resolveProfessionFromRoleCode,
  resolveRoleCodeFromProfession,
  showsProviderBillingCredentialFields,
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
    departmentCode?: string | null;
    professionCode?: string | null;
  }[];
}): AssignmentDraftRow[] {
  const source =
    input.assignments && input.assignments.length > 0
      ? input.assignments
      : input.roles.map((roleCode) => ({
          roleCode,
          departmentId: null as string | null,
          departmentCode: null as string | null,
          professionCode: null as string | null,
        }));

  return source.map((row) => {
    const rawCode = row.professionCode
      ? String(row.professionCode).trim().toUpperCase()
      : "";
    const fromStored =
      rawCode && (ADMIN_PROFESSION_CODES as readonly string[]).includes(rawCode)
        ? (rawCode as AdminProfessionCode)
        : rawCode === "PROVIDER" || rawCode === "PROVIDER_UNSPECIFIED"
          ? ("MEDICINE" as AdminProfessionCode)
          : rawCode === "RN"
            ? ("NURSING" as AdminProfessionCode)
            : rawCode === "PHARMACY"
              ? ("PHARMACIST" as AdminProfessionCode)
              : null;
    const mapped = resolveProfessionFromRoleCode(row.roleCode, row.departmentCode);
    return {
      clientId: createAssignmentRowId(),
      facilityId: input.facilityId,
      profession: fromStored ?? mapped.profession,
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
      professionCode: row.profession || null,
    });
  }

  const conflict = findDuplicateProfessionAssignmentConflict(assignments);
  if (conflict) {
    return { ok: false, errorKey: "adminUsers.valDuplicateProfession" };
  }

  return {
    ok: true,
    assignments: assignments.map((a) => ({
      facilityId: a.facilityId,
      roleCode: a.roleCode,
      departmentId: a.departmentId,
      professionCode: a.professionCode ?? null,
    })),
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
    professionCode: row.profession || null,
  });
}

const INPATIENT_ALLIED_PROFESSIONS = new Set([
  "SOCIAL_WORKER",
  "PHYSICAL_THERAPIST",
  "OCCUPATIONAL_THERAPIST",
  "SPEECH_LANGUAGE_PATHOLOGIST",
  "RESPIRATORY_THERAPIST",
  "DIETITIAN",
  "CASE_MANAGER",
  "RESIDENT_PHYSICIAN",
  "LICENSED_PRACTICAL_NURSE",
  "PATIENT_CARE_TECHNICIAN",
]);

/** Professions shown in onboarding for a facility (gated by enabled service lines). */
export function visibleAdminProfessionCodes(input: {
  facilityServiceLines?: readonly string[] | null;
}): AdminProfessionCode[] {
  const lines = new Set(
    (input.facilityServiceLines ?? []).map((l) => String(l).trim().toUpperCase())
  );
  const dentalEnabled = lines.has("DENTAL");
  const hospitalish =
    lines.size === 0 ||
    lines.has("EMERGENCY") ||
    lines.has("OBSERVATION") ||
    lines.has("INPATIENT") ||
    lines.has("HOSPITAL");
  return ADMIN_PROFESSION_CODES.filter((code) => {
    if ((DENTAL_WORKFORCE_PROFESSION_CODES as readonly string[]).includes(code)) {
      return dentalEnabled;
    }
    if (INPATIENT_ALLIED_PROFESSIONS.has(code) && lines.size > 0 && !hospitalish) {
      return false;
    }
    return true;
  });
}

export function departmentsForProfessionRow(input: {
  profession: AdminProfessionCode | "";
  departments: FacilityDepartmentOption[];
  facilityServiceLines?: readonly string[] | null;
}): FacilityDepartmentOption[] {
  if (!input.profession) return [...input.departments];
  return filterDepartmentsForProfession({
    profession: input.profession,
    facilityDepartments: input.departments,
    facilityServiceLines: input.facilityServiceLines,
  });
}

export function defaultDepartmentIdForProfession(input: {
  profession: AdminProfessionCode | "";
  departments: FacilityDepartmentOption[];
  facilityServiceLines?: readonly string[] | null;
}): string | null {
  if (!input.profession) return null;
  const filtered = departmentsForProfessionRow(input);
  const preferred = preferredDepartmentCodeForProfession(input.profession);
  if (preferred) {
    const match = filtered.find((d) => d.code === preferred);
    if (match) return match.id;
  }
  return filtered[0]?.id ?? null;
}

/** Show existing User NPI/taxonomy/name fields when any assignment is provider-credentialed. */
export function assignmentRowsNeedProviderCredentials(
  rows: readonly AssignmentDraftRow[]
): boolean {
  return rows.some((row) => showsProviderBillingCredentialFields(row.profession || null));
}

export { ADMIN_PROFESSION_CODES };
