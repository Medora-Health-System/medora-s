import { BadRequestException } from "@nestjs/common";
import { RoleCode } from "@prisma/client";
import { PatientPortalStaffActivationController } from "./patient-portal-staff-activation.controller";

describe("PatientPortalStaffActivationController", () => {
  const activation = {
    getAccessForStaff: jest.fn(),
    issueForStaff: jest.fn(),
    revokeForStaff: jest.fn(),
  };
  const controller = new PatientPortalStaffActivationController(activation as never);

  beforeEach(() => jest.clearAllMocks());

  it("lets FRONT_DESK, ADMIN, MEDORA_SUPER_ADMIN, PROVIDER, and RN read access status", () => {
    expect(Reflect.getMetadata("roles", controller.access)).toEqual([
      RoleCode.FRONT_DESK,
      RoleCode.ADMIN,
      RoleCode.MEDORA_SUPER_ADMIN,
      RoleCode.PROVIDER,
      RoleCode.RN,
    ]);
  });

  it("lets FRONT_DESK, ADMIN, and MEDORA_SUPER_ADMIN issue activation, not PROVIDER/RN", () => {
    const roles = Reflect.getMetadata("roles", controller.issue) as RoleCode[];
    expect(roles).toEqual([RoleCode.FRONT_DESK, RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN]);
    expect(roles).not.toContain(RoleCode.PROVIDER);
    expect(roles).not.toContain(RoleCode.RN);
  });

  it("lets ADMIN and MEDORA_SUPER_ADMIN revoke, not FRONT_DESK, PROVIDER, or RN", () => {
    const roles = Reflect.getMetadata("roles", controller.revoke) as RoleCode[];
    expect(roles).toEqual([RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN]);
    expect(roles).not.toContain(RoleCode.FRONT_DESK);
    expect(roles).not.toContain(RoleCode.PROVIDER);
    expect(roles).not.toContain(RoleCode.RN);
  });

  it("uses the RolesGuard-authorized facility, not a raw x-facility-id header", async () => {
    activation.getAccessForStaff.mockResolvedValue({ patientId: "patient-a", facilityId: "facility-b" });
    const req = {
      facilityId: "facility-b",
      user: { userId: "staff-1", facilityId: "facility-a" },
      headers: { "x-facility-id": "facility-spoofed" },
    };
    await controller.access("patient-a", req);
    expect(activation.getAccessForStaff).toHaveBeenCalledWith({
      patientId: "patient-a",
      facilityId: "facility-b",
    });
  });

  it("rejects a spoofed header when the guard never bound request.facilityId", async () => {
    const req = {
      user: { userId: "staff-1" },
      headers: { "x-facility-id": "facility-b" },
    };
    await expect(controller.access("patient-a", req)).rejects.toBeInstanceOf(BadRequestException);
    expect(activation.getAccessForStaff).not.toHaveBeenCalled();
  });
});
