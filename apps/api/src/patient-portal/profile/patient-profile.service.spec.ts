import { NotFoundException } from "@nestjs/common";
import { PatientProfileService } from "./patient-profile.service";

describe("PatientProfileService", () => {
  const principal = {
    portalAccountId: "portal-account-1",
    sessionId: "portal-session-1",
  };

  const activeAccount = {
    id: "portal-account-1",
    email: "patient@example.com",
    phone: "+12145550123",
    passwordHash: "hash",
    status: "ACTIVE" as const,
    emailVerifiedAt: new Date("2026-09-01T10:00:00.000Z"),
    phoneVerifiedAt: null,
    firstName: "Maria",
    lastName: "Rodriguez",
    dob: new Date("1990-03-05T00:00:00.000Z"),
    preferredLanguage: "en",
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: null,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
  };

  it("returns portal identity without exposing password/session internals", async () => {
    const repo = {
      findAccountById: jest.fn().mockResolvedValue(activeAccount),
      updatePreferredLanguage: jest.fn(),
    } as any;
    const audit = { record: jest.fn() } as any;
    const service = new PatientProfileService(repo, audit);

    const result = await service.getProfile(principal);

    expect(result).toEqual({
      id: "portal-account-1",
      firstName: "Maria",
      lastName: "Rodriguez",
      dateOfBirth: "1990-03-05",
      email: "patient@example.com",
      phone: "+12145550123",
      preferredLanguage: "en",
      emailVerified: true,
      phoneVerified: false,
      contactChangesRequireVerification: true,
    });
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("updates only the supported language preference and audits the change", async () => {
    const repo = {
      findAccountById: jest.fn(),
      updatePreferredLanguage: jest.fn().mockResolvedValue({
        ...activeAccount,
        preferredLanguage: "es",
      }),
    } as any;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new PatientProfileService(repo, audit);

    const result = await service.updateProfile(principal, {
      preferredLanguage: "es",
    });

    expect(repo.updatePreferredLanguage).toHaveBeenCalledWith(
      "portal-account-1",
      "es",
    );
    expect(audit.record).toHaveBeenCalledWith(
      "PATIENT_PORTAL_PROFILE_UPDATE",
      "PatientPortalAccount",
      expect.objectContaining({
        portalAccountId: "portal-account-1",
        sessionId: "portal-session-1",
        entityId: "portal-account-1",
        critical: true,
      }),
    );
    expect(result.preferredLanguage).toBe("es");
  });

  it("does not expose disabled portal accounts", async () => {
    const repo = {
      findAccountById: jest.fn().mockResolvedValue({
        ...activeAccount,
        status: "DISABLED",
      }),
      updatePreferredLanguage: jest.fn(),
    } as any;
    const audit = { record: jest.fn() } as any;
    const service = new PatientProfileService(repo, audit);

    await expect(service.getProfile(principal)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
