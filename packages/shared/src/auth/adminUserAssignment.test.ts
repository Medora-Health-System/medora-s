import { describe, expect, it } from "vitest";
import {
  dedupeAdminUserAssignments,
  findDuplicateRoleCodeDepartmentConflict,
  resolveAdminWorkspacePreviewKey,
  resolveProfessionFromRoleCode,
  resolveRoleCodeFromProfession,
} from "./adminUserAssignment.js";

describe("adminUserAssignment (MEDUI.AUTH.ROLE.2)", () => {
  it("maps professions to existing RoleCode values", () => {
    expect(resolveRoleCodeFromProfession({ profession: "PROVIDER" })).toEqual({
      ok: true,
      roleCode: "PROVIDER",
    });
    expect(resolveRoleCodeFromProfession({ profession: "RN" })).toEqual({
      ok: true,
      roleCode: "RN",
    });
    expect(
      resolveRoleCodeFromProfession({ profession: "TECHNICIAN", technicianType: "LAB" })
    ).toEqual({ ok: true, roleCode: "LAB" });
  });

  it("requires technician type for TECHNICIAN profession", () => {
    expect(resolveRoleCodeFromProfession({ profession: "TECHNICIAN" })).toEqual({
      ok: false,
      errorKey: "adminUsers.valTechnicianTypeRequired",
    });
  });

  it("reverse maps LAB/RADIOLOGY to technician profession", () => {
    expect(resolveProfessionFromRoleCode("LAB")).toEqual({
      profession: "TECHNICIAN",
      technicianType: "LAB",
    });
    expect(resolveProfessionFromRoleCode("RADIOLOGY")).toEqual({
      profession: "TECHNICIAN",
      technicianType: "RADIOLOGY",
    });
  });

  it("dedupes identical assignment rows", () => {
    const rows = dedupeAdminUserAssignments([
      { facilityId: "f1", roleCode: "RN", departmentId: "d1" },
      { facilityId: "f1", roleCode: "RN", departmentId: "d1" },
    ]);
    expect(rows).toHaveLength(1);
  });

  it("detects same role with different departments", () => {
    expect(
      findDuplicateRoleCodeDepartmentConflict([
        { facilityId: "f1", roleCode: "LAB", departmentId: "d1" },
        { facilityId: "f1", roleCode: "LAB", departmentId: "d2" },
      ])
    ).toBe("LAB");
  });

  it("resolves workspace preview keys", () => {
    expect(resolveAdminWorkspacePreviewKey({ roleCodes: ["PROVIDER"] })).toBe(
      "adminUsers.workspacePreview.providerEd"
    );
    expect(
      resolveAdminWorkspacePreviewKey({ roleCodes: ["LAB"], prismaDepartmentCode: "LAB" })
    ).toBe("adminUsers.workspacePreview.technicianLab");
    expect(resolveAdminWorkspacePreviewKey({ roleCodes: ["LAB"] })).toBe(
      "adminUsers.workspacePreview.technicianEd"
    );
  });
});
