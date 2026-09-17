import { ForbiddenException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
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
  afterEach(() => jest.restoreAllMocks());

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

  it("projects pending activation without marking the patient active", async () => {
    activations.assertPatientBelongsToFacility.mockResolvedValue(true);
    activations.getStaffAccess.mockResolvedValue({
      linkId: null,
      linkStatus: null,
      verifiedAt: null,
      revokedAt: null,
      accountStatus: null,
      latestActivationId: "activation-pending",
      activationCreatedAt: new Date(),
      activationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      activationUsedAt: null,
      activationRevokedAt: null,
    });

    const result = await service.getAccessForStaff({ patientId: "patient-a", facilityId: "facility-a" });
    expect(result.accessStatus).toBe("NOT_LINKED");
    expect(result.latestActivation?.state).toBe("PENDING");
  });

  it("projects expired unused activation as EXPIRED", async () => {
    activations.assertPatientBelongsToFacility.mockResolvedValue(true);
    activations.getStaffAccess.mockResolvedValue({
      linkId: null,
      linkStatus: null,
      verifiedAt: null,
      revokedAt: null,
      accountStatus: null,
      latestActivationId: "activation-expired",
      activationCreatedAt: new Date(Date.now() - 20 * 60 * 1000),
      activationExpiresAt: new Date(Date.now() - 5 * 60 * 1000),
      activationUsedAt: null,
      activationRevokedAt: null,
    });

    const result = await service.getAccessForStaff({ patientId: "patient-a", facilityId: "facility-a" });
    expect(result.latestActivation?.state).toBe("EXPIRED");
    expect(result.accessStatus).not.toBe("VERIFIED");
  });

  it("ADMIN can issue activation for a facility patient and audits issuance", async () => {
    activations.assertPatientBelongsToFacility.mockResolvedValue(true);
    activations.createActivation.mockResolvedValue({ id: "activation-new" });

    const result = await service.issueForStaff({
      patientId: "patient-a",
      facilityId: "facility-a",
      createdByUserId: "admin-1",
    });

    expect(result.patientId).toBe("patient-a");
    expect(result.facilityId).toBe("facility-a");
    expect(result.activationCode).toMatch(/^[0-9a-f-]{36}\./i);
    expect(result.expiresAt).toBeTruthy();
    expect(activations.createActivation).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: "patient-a",
        facilityId: "facility-a",
        createdByUserId: "admin-1",
        secretHash: expect.any(String),
      }),
    );
    expect(JSON.stringify(activations.createActivation.mock.calls[0])).not.toContain(result.activationCode.split(".")[1]);
    expect(audit.record).toHaveBeenCalledWith(
      "PATIENT_PORTAL_ACTIVATION_ISSUED",
      "PATIENT_PORTAL_ACTIVATION",
      expect.objectContaining({
        facilityId: "facility-a",
        patientId: "patient-a",
        critical: true,
      }),
    );
  });

  it("does not issue activation for a Facility B patient under Facility A", async () => {
    activations.assertPatientBelongsToFacility.mockResolvedValue(false);
    await expect(
      service.issueForStaff({
        patientId: "patient-b",
        facilityId: "facility-a",
        createdByUserId: "admin-1",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(activations.createActivation).not.toHaveBeenCalled();
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

  it("does not activate with a missing usable code (expired, used, or revoked)", async () => {
    portalRepo.findAccountById.mockResolvedValue({ id: "acct-1", status: "PENDING_VERIFICATION", passwordHash: "hash" });
    jest.spyOn(argon2, "verify").mockResolvedValue(true as never);
    activations.findUsableActivation.mockResolvedValue(null);

    await expect(
      service.activate({
        accountId: "acct-1",
        password: "secret",
        activationCode: "11111111-1111-4111-8111-111111111111.abc",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(activations.consumeAndLink).not.toHaveBeenCalled();
  });

  it("does not reuse a code after consumeAndLink fails", async () => {
    portalRepo.findAccountById.mockResolvedValue({ id: "acct-1", status: "ACTIVE", passwordHash: "hash" });
    jest.spyOn(argon2, "verify").mockResolvedValue(true as never);
    activations.findUsableActivation.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      patientId: "patient-a",
      facilityId: "facility-a",
      secretHash: "hash",
    });
    activations.consumeAndLink.mockResolvedValue(false);

    await expect(
      service.activate({
        accountId: "acct-1",
        password: "secret",
        activationCode: "11111111-1111-4111-8111-111111111111.abc",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("links PatientPortalAccount to Patient + Facility on successful activation and audits verification", async () => {
    portalRepo.findAccountById.mockResolvedValue({ id: "acct-1", status: "ACTIVE", passwordHash: "hash" });
    jest.spyOn(argon2, "verify").mockResolvedValue(true as never);
    activations.findUsableActivation.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      patientId: "patient-a",
      facilityId: "facility-a",
      secretHash: "hash",
    });
    activations.consumeAndLink.mockResolvedValue(true);

    const result = await service.activate({
      accountId: "acct-1",
      password: "secret",
      activationCode: "11111111-1111-4111-8111-111111111111.abc",
    });

    expect(activations.consumeAndLink).toHaveBeenCalledWith({
      activationId: "11111111-1111-4111-8111-111111111111",
      portalAccountId: "acct-1",
      patientId: "patient-a",
      facilityId: "facility-a",
    });
    expect(result).toEqual({ activated: true, accountId: "acct-1", facilityId: "facility-a" });
    expect(audit.record).toHaveBeenCalledWith(
      "PATIENT_PORTAL_LINK_VERIFY",
      "PATIENT_PORTAL_LINK",
      expect.objectContaining({
        portalAccountId: "acct-1",
        facilityId: "facility-a",
        patientId: "patient-a",
        critical: true,
      }),
    );
  });

  it("rejects activation when the portal account is missing", async () => {
    portalRepo.findAccountById.mockResolvedValue(null);
    await expect(
      service.activate({
        accountId: "acct-missing",
        password: "secret",
        activationCode: "11111111-1111-4111-8111-111111111111.abc",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
