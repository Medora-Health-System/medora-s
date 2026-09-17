import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

  it("keeps MEDORA_SUPER_ADMIN on the staff activation API as platform-principal-with-facility-context, not Digital Care workspace membership", () => {
    const source = readFileSync(resolve(__dirname, "./patient-portal-staff-activation.controller.ts"), "utf8");
    expect(source).toContain("@AllowPlatformPrincipalWithFacilityContext()");
    expect(source).toContain("resolveAuthorizedFacilityId");
    expect(Reflect.getMetadata("roles", controller.issue)).toContain(RoleCode.MEDORA_SUPER_ADMIN);
    expect(Reflect.getMetadata("roles", controller.revoke)).toContain(RoleCode.MEDORA_SUPER_ADMIN);
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

  it("returns access for a Facility A patient using the authorized Facility A context", async () => {
    activation.getAccessForStaff.mockResolvedValue({
      patientId: "patient-a",
      facilityId: "facility-a",
      accessStatus: "NOT_LINKED",
      accountStatus: null,
    });
    const req = {
      facilityId: "facility-a",
      user: { userId: "staff-1", facilityId: "stale-jwt-facility" },
      headers: { "x-facility-id": "spoofed" },
    };
    await expect(controller.access("patient-a", req)).resolves.toEqual(
      expect.objectContaining({ patientId: "patient-a", facilityId: "facility-a" }),
    );
    expect(activation.getAccessForStaff).toHaveBeenCalledWith({ patientId: "patient-a", facilityId: "facility-a" });
  });

  it("issues an activation code against the same authorized facility used for access lookup", async () => {
    activation.issueForStaff.mockResolvedValue({
      activationCode: "11111111-1111-4111-8111-111111111111.secret",
      expiresAt: "2026-09-17T12:15:00.000Z",
      patientId: "patient-a",
      facilityId: "facility-a",
    });
    const req = {
      facilityId: "facility-a",
      user: { userId: "admin-1", facilityId: "stale-jwt-facility" },
      headers: { "x-facility-id": "spoofed" },
    };
    await expect(controller.issue("patient-a", req)).resolves.toEqual({
      activationCode: "11111111-1111-4111-8111-111111111111.secret",
      expiresAt: "2026-09-17T12:15:00.000Z",
      patientId: "patient-a",
      facilityId: "facility-a",
    });
    expect(activation.issueForStaff).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: "patient-a",
        facilityId: "facility-a",
        createdByUserId: "admin-1",
      }),
    );
  });
});
