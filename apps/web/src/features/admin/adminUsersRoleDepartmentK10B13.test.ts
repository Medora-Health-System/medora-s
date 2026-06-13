import { describe, expect, it } from "vitest";
import {
  assignmentRowsFromExistingUser,
  buildAssignmentsPayload,
  resolveRowRoleCode,
  workspacePreviewKeyForRow,
} from "./adminUserAssignmentForm";

describe("adminUsersRoleDepartmentK10B13", () => {
  it("builds assignment payload with departmentId", () => {
    const built = buildAssignmentsPayload([
      {
        clientId: "1",
        facilityId: "fac-1",
        profession: "RN",
        technicianType: "",
        departmentId: "dept-ed",
      },
    ]);
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.assignments[0]).toMatchObject({
        facilityId: "fac-1",
        roleCode: "RN",
        departmentId: "dept-ed",
      });
    }
  });

  it("requires technician type for technician profession", () => {
    const built = buildAssignmentsPayload([
      {
        clientId: "1",
        facilityId: "fac-1",
        profession: "TECHNICIAN",
        technicianType: "",
        departmentId: null,
      },
    ]);
    expect(built).toEqual({ ok: false, errorKey: "adminUsers.valTechnicianTypeRequired" });
  });

  it("maps technician + lab type to LAB role code", () => {
    const { roleCode } = resolveRowRoleCode({
      clientId: "1",
      facilityId: "fac-1",
      profession: "TECHNICIAN",
      technicianType: "LAB",
      departmentId: null,
    });
    expect(roleCode).toBe("LAB");
  });

  it("shows ED technician workspace preview when department is unassigned", () => {
    const key = workspacePreviewKeyForRow(
      {
        clientId: "1",
        facilityId: "fac-1",
        profession: "TECHNICIAN",
        technicianType: "LAB",
        departmentId: null,
      },
      []
    );
    expect(key).toBe("adminUsers.workspacePreview.technicianEd");
  });

  it("shows ICU technician workspace preview when ICU department assigned", () => {
    const key = workspacePreviewKeyForRow(
      {
        clientId: "1",
        facilityId: "fac-1",
        profession: "TECHNICIAN",
        technicianType: "LAB",
        departmentId: "dept-icu",
      },
      [{ id: "dept-icu", code: "ICU", name: "Soins intensifs" }]
    );
    expect(key).toBe("adminUsers.workspacePreview.technicianIcu");
  });

  it("shows laboratory workspace preview for clinical LABORATORY department", () => {
    const key = workspacePreviewKeyForRow(
      {
        clientId: "1",
        facilityId: "fac-1",
        profession: "TECHNICIAN",
        technicianType: "LAB",
        departmentId: "dept-lab",
      },
      [{ id: "dept-lab", code: "LABORATORY", name: "Laboratoire" }]
    );
    expect(key).toBe("adminUsers.workspacePreview.technicianLab");
  });

  it("shows provider ED workspace preview", () => {
    const key = workspacePreviewKeyForRow(
      {
        clientId: "1",
        facilityId: "fac-1",
        profession: "PROVIDER",
        technicianType: "",
        departmentId: null,
      },
      []
    );
    expect(key).toBe("adminUsers.workspacePreview.providerEd");
  });

  it("shows admin full dashboard preview", () => {
    const key = workspacePreviewKeyForRow(
      {
        clientId: "1",
        facilityId: "fac-1",
        profession: "ADMINISTRATION",
        technicianType: "",
        departmentId: null,
      },
      []
    );
    expect(key).toBe("adminUsers.workspacePreview.adminFull");
  });

  it("hydrates assignment rows from user assignments", () => {
    const rows = assignmentRowsFromExistingUser({
      facilityId: "fac-1",
      roles: ["RN"],
      assignments: [{ roleCode: "RN", departmentId: "dept-1" }],
    });
    expect(rows[0]?.profession).toBe("RN");
    expect(rows[0]?.departmentId).toBe("dept-1");
  });
});
