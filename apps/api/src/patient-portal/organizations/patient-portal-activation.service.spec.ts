import { NotFoundException } from "@nestjs/common";
import { PatientPortalActivationService } from "./patient-portal-activation.service";

describe("PatientPortalActivationService staff access", () => {
  const activations = {
    assertPatientBelongsToFacility: jest.fn(),
    getStaffAccess: jest.fn(),
    revokePatientFacilityAccess: jest.fn(),
    createActivation: jest.fn(),
    findUsableActivation: jest.fn(),
    consumeAndLink: jest.fn(),
  };
  const portalRepo = { findAccountById: jest.fn() };
  const audit = { record: jest.fn() };

  const service = new PatientPortalActivationService(
    activations as any,
    portalRepo as any,
    audit as any
  );

  beforeEach(() => jest.clearAllMocks());

  it("rejects staff status lookup when patient is outside the active facility", async () => {
    activations.assertPatientBelongsToFacility.mockResolvedValue(false);

    await expect(
      service.getAccessForStaff({ patientId: "patient-a", facilityId: "facility-b" })
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(activations.getStaffAccess).not.toHaveBeenCalled();
  });

  it("projects verified facility access without exposing portal account identifiers", async () => {
    activations.assertPatientBelongsToFacility.mockResolvedValue(true);
    activations.getStaffAccess.mockResolvedValue({
      linkId: "link-1",
      linkStatus: "VERIFIED",
      verifiedAt: new Date("2026-09-13T12:00:00.000Z"),
      revokedAt: null,
      accountStatus: "ACTIVE",
      latestActivationId: "activation-1",
      activationCreatedAt: new Date("2026-09-13T11:55:00.000Z"),
      activationExpiresAt: new Date("2026-09-13T12:10:00.000Z"),
      activationUsedAt: new Date("2026-09-13T12:00:00.000Z"),
      activationRevokedAt: null,
    });

    const result = await service.getAccessForStaff({ patientId: "patient-a", facilityId: "facility-a" });

    expect(result).toEqual(expect.objectContaining({
      patientId: "patient-a",
      facilityId: "facility-a",
      accessStatus: "VERIFIED",
      accountStatus: "ACTIVE",
    }));
    expect(result).not.toHaveProperty("portalAccountId");
  });

  it("revokes only through the patient+facility scoped repository operation and writes a critical audit", async () => {
    activations.assertPatientBelongsToFacility.mockResolvedValue(true);
    activations.revokePatientFacilityAccess.mockResolvedValue({ revokedLinks: 1, revokedActivations: 1 });

    await service.revokeForStaff({
      patientId: "patient-a",
      facilityId: "facility-a",
      revokedByUserId: "staff-1",
      ip: "127.0.0.1",
      userAgent: "test",
    });

    expect(activations.revokePatientFacilityAccess).toHaveBeenCalledWith("patient-a", "facility-a");
    expect(audit.record).toHaveBeenCalledWith(
      "PATIENT_PORTAL_ACCESS_REVOKED",
      "PATIENT_PORTAL_LINK",
      expect.objectContaining({
        facilityId: "facility-a",
        patientId: "patient-a",
        critical: true,
        metadata: expect.objectContaining({ revokedByUserId: "staff-1" }),
      })
    );
  });
});
