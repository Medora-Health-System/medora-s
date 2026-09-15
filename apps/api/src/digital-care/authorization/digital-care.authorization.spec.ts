import { DIGITAL_CARE_ROLE_PERMISSIONS } from "./digital-care.policy";
import { DIGITAL_CARE_ROLES } from "./digital-care.roles";

const patientContentPermissions = [
  "communication.self.read",
  "communication.assigned.read",
  "monitoring.self.read",
  "monitoring.assigned.read",
] as const;

describe("Digital Care authorization policy", () => {
  it("defines a permission set for every DC-1D role", () => {
    expect(Object.keys(DIGITAL_CARE_ROLE_PERMISSIONS).sort()).toEqual(
      [...DIGITAL_CARE_ROLES].sort(),
    );
  });

  it("does not grant administrative roles patient-content access by default", () => {
    for (const role of ["FACILITY_ADMIN", "BILLING", "QA", "SUPER_ADMIN"] as const) {
      const permissions = DIGITAL_CARE_ROLE_PERMISSIONS[role] as readonly string[];
      for (const patientPermission of patientContentPermissions) {
        expect(permissions).not.toContain(patientPermission);
      }
    }
  });

  it("limits global cross-scope permission to super admin", () => {
    for (const role of DIGITAL_CARE_ROLES) {
      const permissions = DIGITAL_CARE_ROLE_PERMISSIONS[role] as readonly string[];
      expect(permissions.includes("digital-care.cross-scope")).toBe(
        role === "SUPER_ADMIN",
      );
    }
  });

  it("keeps family proxy access delegation-bound", () => {
    expect(DIGITAL_CARE_ROLE_PERMISSIONS.FAMILY_PROXY).toEqual([
      "proxy.patient.act",
    ]);
  });
});
