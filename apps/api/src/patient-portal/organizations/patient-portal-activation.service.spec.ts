import { ForbiddenException, NotFoundException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
import { MailDeliveryError } from "../../common/mail/outbound-mail.service";
import {
  EMAIL_INVITATION_TTL_MS,
  INVITATION_SEND_FAILED_MESSAGE,
  MANUAL_ACTIVATION_TTL_MS,
  PATIENT_EMAIL_REQUIRED_MESSAGE,
  PATIENT_PORTAL_ACTIVATION_CHANNEL,
} from "./patient-portal-activation.constants";
import { PatientPortalActivationService } from "./patient-portal-activation.service";

describe("PatientPortalActivationService staff access", () => {
  const activations = {
    assertPatientBelongsToFacility: jest.fn(),
    getStaffAccess: jest.fn(),
    revokePatientFacilityAccess: jest.fn(),
    createActivation: jest.fn(),
    findUsableActivation: jest.fn(),
    consumeAndLink: jest.fn(),
    getPatientEmail: jest.fn(),
    revokeUnusedActivation: jest.fn(),
  };
  const portalRepo = { findAccountById: jest.fn() };
  const audit = { record: jest.fn() };
  const mail = { isConfigured: jest.fn(), send: jest.fn() };
  const config = { get: jest.fn() };

  const service = new PatientPortalActivationService(
    activations as any,
    portalRepo as any,
    audit as any,
    mail as any,
    config as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mail.isConfigured.mockReturnValue(true);
    config.get.mockImplementation((key: string) => (key === "PATIENT_APP_BASE_URL" ? "https://patient.medoras.com" : undefined));
  });
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
      activationChannel: "MANUAL_CODE",
      patientEmail: "marie@clinic.ht",
    });

    const result = await service.getAccessForStaff({ patientId: "patient-a", facilityId: "facility-a" });

    expect(result).toEqual(expect.objectContaining({
      patientId: "patient-a",
      facilityId: "facility-a",
      accessStatus: "VERIFIED",
      accountStatus: "ACTIVE",
      hasEmail: true,
      maskedEmail: "m***@clinic.ht",
    }));
    expect(result).not.toHaveProperty("portalAccountId");
    expect(JSON.stringify(result)).not.toContain("marie@clinic.ht");
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
      activationChannel: "MANUAL_CODE",
      patientEmail: null,
    });

    const result = await service.getAccessForStaff({ patientId: "patient-a", facilityId: "facility-a" });
    expect(result.accessStatus).toBe("NOT_LINKED");
    expect(result.latestActivation?.state).toBe("PENDING");
    expect(result.hasEmail).toBe(false);
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
      activationChannel: "EMAIL_INVITATION",
      patientEmail: "a@b.c",
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
        channel: PATIENT_PORTAL_ACTIVATION_CHANNEL.MANUAL_CODE,
      }),
    );
    const expiresAt = activations.createActivation.mock.calls[0][0].expiresAt as Date;
    expect(expiresAt.getTime() - Date.now()).toBeLessThan(MANUAL_ACTIVATION_TTL_MS + 2000);
    expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(MANUAL_ACTIVATION_TTL_MS - 5000);
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

  it("sends an email invitation using Patient.email and never returns the secret", async () => {
    activations.assertPatientBelongsToFacility.mockResolvedValue(true);
    activations.getPatientEmail.mockResolvedValue("marie@clinic.ht");
    activations.createActivation.mockResolvedValue({ id: "activation-invite" });
    mail.send.mockResolvedValue(undefined);

    const result = await service.inviteForStaff({
      patientId: "patient-a",
      facilityId: "facility-a",
      createdByUserId: "admin-1",
    });

    expect(result).toEqual({
      status: "SENT",
      delivery: "EMAIL",
      maskedEmail: "m***@clinic.ht",
      expiresAt: expect.any(String),
      patientId: "patient-a",
      facilityId: "facility-a",
    });
    expect(result).not.toHaveProperty("activationCode");
    expect(JSON.stringify(result)).not.toContain("marie@clinic.ht");
    expect(activations.createActivation).toHaveBeenCalledWith(
      expect.objectContaining({ channel: PATIENT_PORTAL_ACTIVATION_CHANNEL.EMAIL_INVITATION }),
    );
    const expiresAt = activations.createActivation.mock.calls[0][0].expiresAt as Date;
    expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(EMAIL_INVITATION_TTL_MS - 5000);
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "marie@clinic.ht",
        subject: "Activate your Medora Patient account",
      }),
    );
    const sentText = mail.send.mock.calls[0][0].text as string;
    expect(sentText).toContain("https://patient.medoras.com/activate?code=");
    expect(sentText).not.toMatch(/marie|mrn|dob/i);
    expect(audit.record).toHaveBeenCalledWith(
      "PATIENT_PORTAL_INVITATION_SENT",
      "PATIENT_PORTAL_ACTIVATION",
      expect.objectContaining({
        facilityId: "facility-a",
        patientId: "patient-a",
        critical: true,
        metadata: expect.objectContaining({ channel: "EMAIL_INVITATION", delivery: "EMAIL" }),
      }),
    );
  });

  it("does not create an invitation when Patient.email is missing", async () => {
    activations.assertPatientBelongsToFacility.mockResolvedValue(true);
    activations.getPatientEmail.mockResolvedValue(null);
    await expect(
      service.inviteForStaff({
        patientId: "patient-a",
        facilityId: "facility-a",
        createdByUserId: "admin-1",
      }),
    ).rejects.toEqual(expect.objectContaining({ message: PATIENT_EMAIL_REQUIRED_MESSAGE }));
    expect(activations.createActivation).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it("fails closed without persisting when outbound mail is not configured", async () => {
    activations.assertPatientBelongsToFacility.mockResolvedValue(true);
    activations.getPatientEmail.mockResolvedValue("marie@clinic.ht");
    mail.isConfigured.mockReturnValue(false);
    await expect(
      service.inviteForStaff({
        patientId: "patient-a",
        facilityId: "facility-a",
        createdByUserId: "admin-1",
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(activations.createActivation).not.toHaveBeenCalled();
  });

  it("revokes the unused invitation when delivery fails", async () => {
    activations.assertPatientBelongsToFacility.mockResolvedValue(true);
    activations.getPatientEmail.mockResolvedValue("marie@clinic.ht");
    activations.createActivation.mockResolvedValue({ id: "activation-invite" });
    mail.send.mockRejectedValue(new MailDeliveryError());

    await expect(
      service.inviteForStaff({
        patientId: "patient-a",
        facilityId: "facility-a",
        createdByUserId: "admin-1",
      }),
    ).rejects.toEqual(expect.objectContaining({ message: INVITATION_SEND_FAILED_MESSAGE }));
    expect(activations.revokeUnusedActivation).toHaveBeenCalled();
  });

  it("rejects localhost invitation URLs in production", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    config.get.mockReturnValue("http://localhost:3000");
    activations.assertPatientBelongsToFacility.mockResolvedValue(true);
    activations.getPatientEmail.mockResolvedValue("marie@clinic.ht");
    try {
      await expect(
        service.inviteForStaff({
          patientId: "patient-a",
          facilityId: "facility-a",
          createdByUserId: "admin-1",
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(activations.createActivation).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = previous;
    }
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
      channel: "MANUAL_CODE",
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
      channel: "MANUAL_CODE",
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

  it("redeems EMAIL_INVITATION when the portal account email matches Patient.email", async () => {
    portalRepo.findAccountById.mockResolvedValue({
      id: "acct-1",
      status: "PENDING_VERIFICATION",
      passwordHash: "hash",
      email: "marie@clinic.ht",
      phone: null,
    });
    jest.spyOn(argon2, "verify").mockResolvedValue(true as never);
    activations.findUsableActivation.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      patientId: "patient-a",
      facilityId: "facility-a",
      secretHash: "hash",
      channel: "EMAIL_INVITATION",
    });
    activations.getPatientEmail.mockResolvedValue("marie@clinic.ht");
    activations.consumeAndLink.mockResolvedValue(true);

    await expect(
      service.activate({
        accountId: "acct-1",
        password: "secret",
        activationCode: "11111111-1111-4111-8111-111111111111.abc",
      }),
    ).resolves.toEqual({ activated: true, accountId: "acct-1", facilityId: "facility-a" });
    expect(activations.getPatientEmail).toHaveBeenCalledWith("patient-a", "facility-a");
    expect(activations.consumeAndLink).toHaveBeenCalled();
  });

  it("redeems EMAIL_INVITATION when emails match after trim and case-insensitive canonicalization", async () => {
    portalRepo.findAccountById.mockResolvedValue({
      id: "acct-1",
      status: "PENDING_VERIFICATION",
      passwordHash: "hash",
      email: "  Marie.Toussaint@Clinic.HT ",
      phone: "+5091111",
    });
    jest.spyOn(argon2, "verify").mockResolvedValue(true as never);
    activations.findUsableActivation.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      patientId: "patient-a",
      facilityId: "facility-a",
      secretHash: "hash",
      channel: "EMAIL_INVITATION",
    });
    activations.getPatientEmail.mockResolvedValue("marie.toussaint@clinic.ht");
    activations.consumeAndLink.mockResolvedValue(true);

    await expect(
      service.activate({
        accountId: "acct-1",
        password: "secret",
        activationCode: "11111111-1111-4111-8111-111111111111.abc",
      }),
    ).resolves.toEqual({ activated: true, accountId: "acct-1", facilityId: "facility-a" });
    expect(activations.consumeAndLink).toHaveBeenCalled();
  });

  it("rejects EMAIL_INVITATION when the portal account email differs and does not consume the invitation", async () => {
    portalRepo.findAccountById.mockResolvedValue({
      id: "acct-1",
      status: "PENDING_VERIFICATION",
      passwordHash: "hash",
      email: "attacker@example.com",
      phone: null,
    });
    jest.spyOn(argon2, "verify").mockResolvedValue(true as never);
    activations.findUsableActivation.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      patientId: "patient-a",
      facilityId: "facility-a",
      secretHash: "hash",
      channel: "EMAIL_INVITATION",
    });
    activations.getPatientEmail.mockResolvedValue("marie@clinic.ht");

    await expect(
      service.activate({
        accountId: "acct-1",
        password: "secret",
        activationCode: "11111111-1111-4111-8111-111111111111.abc",
      }),
    ).rejects.toEqual(expect.objectContaining({ message: "Activation code invalid or expired" }));
    expect(activations.consumeAndLink).not.toHaveBeenCalled();
    expect(JSON.stringify(activations.getPatientEmail.mock.results)).not.toContain("attacker@example.com");
  });

  it("rejects EMAIL_INVITATION for a phone-only portal account without consuming the invitation", async () => {
    portalRepo.findAccountById.mockResolvedValue({
      id: "acct-1",
      status: "PENDING_VERIFICATION",
      passwordHash: "hash",
      email: null,
      phone: "+5095550000",
    });
    jest.spyOn(argon2, "verify").mockResolvedValue(true as never);
    activations.findUsableActivation.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      patientId: "patient-a",
      facilityId: "facility-a",
      secretHash: "hash",
      channel: "EMAIL_INVITATION",
    });
    activations.getPatientEmail.mockResolvedValue("marie@clinic.ht");

    await expect(
      service.activate({
        accountId: "acct-1",
        password: "secret",
        activationCode: "11111111-1111-4111-8111-111111111111.abc",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(activations.consumeAndLink).not.toHaveBeenCalled();
  });

  it("does not reveal the expected Patient.email on EMAIL_INVITATION mismatch", async () => {
    portalRepo.findAccountById.mockResolvedValue({
      id: "acct-1",
      status: "PENDING_VERIFICATION",
      passwordHash: "hash",
      email: "other@example.com",
      phone: null,
    });
    jest.spyOn(argon2, "verify").mockResolvedValue(true as never);
    activations.findUsableActivation.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      patientId: "patient-a",
      facilityId: "facility-a",
      secretHash: "hash",
      channel: "EMAIL_INVITATION",
    });
    activations.getPatientEmail.mockResolvedValue("marie@clinic.ht");

    await expect(
      service.activate({
        accountId: "acct-1",
        password: "secret",
        activationCode: "11111111-1111-4111-8111-111111111111.abc",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.activate({
        accountId: "acct-1",
        password: "secret",
        activationCode: "11111111-1111-4111-8111-111111111111.abc",
      }),
    ).rejects.toEqual(expect.objectContaining({ message: "Activation code invalid or expired" }));
    try {
      await service.activate({
        accountId: "acct-1",
        password: "secret",
        activationCode: "11111111-1111-4111-8111-111111111111.abc",
      });
    } catch (error) {
      const text = `${error} ${JSON.stringify(error)}`;
      expect(text).not.toContain("marie@clinic.ht");
      expect(text).not.toContain("Patient.email");
    }
  });

  it("does not bind MANUAL_CODE to Patient.email and still allows a phone-only account", async () => {
    portalRepo.findAccountById.mockResolvedValue({
      id: "acct-1",
      status: "PENDING_VERIFICATION",
      passwordHash: "hash",
      email: null,
      phone: "+5095550000",
    });
    jest.spyOn(argon2, "verify").mockResolvedValue(true as never);
    activations.findUsableActivation.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      patientId: "patient-a",
      facilityId: "facility-a",
      secretHash: "hash",
      channel: "MANUAL_CODE",
    });
    activations.consumeAndLink.mockResolvedValue(true);

    await expect(
      service.activate({
        accountId: "acct-1",
        password: "secret",
        activationCode: "11111111-1111-4111-8111-111111111111.abc",
      }),
    ).resolves.toEqual({ activated: true, accountId: "acct-1", facilityId: "facility-a" });
    expect(activations.getPatientEmail).not.toHaveBeenCalled();
    expect(activations.consumeAndLink).toHaveBeenCalledWith({
      activationId: "11111111-1111-4111-8111-111111111111",
      portalAccountId: "acct-1",
      patientId: "patient-a",
      facilityId: "facility-a",
    });
  });

  it("looks up EMAIL_INVITATION Patient.email from the activation patient+facility, not a client-supplied facility", async () => {
    portalRepo.findAccountById.mockResolvedValue({
      id: "acct-1",
      status: "PENDING_VERIFICATION",
      passwordHash: "hash",
      email: "marie@clinic.ht",
    });
    jest.spyOn(argon2, "verify").mockResolvedValue(true as never);
    activations.findUsableActivation.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      patientId: "patient-a",
      facilityId: "facility-a",
      secretHash: "hash",
      channel: "EMAIL_INVITATION",
    });
    activations.getPatientEmail.mockResolvedValue("marie@clinic.ht");
    activations.consumeAndLink.mockResolvedValue(true);

    await service.activate({
      accountId: "acct-1",
      password: "secret",
      activationCode: "11111111-1111-4111-8111-111111111111.abc",
    });
    expect(activations.getPatientEmail).toHaveBeenCalledWith("patient-a", "facility-a");
    expect(activations.getPatientEmail).not.toHaveBeenCalledWith("patient-a", "facility-b");
  });
});
