import { AuditAction } from "@prisma/client";
import {
  assertSecurityAuditMetadataSafe,
  logSecurityAdminAudit,
} from "./security-admin-audit";

describe("D4SEC.1C.2B security admin audit", () => {
  it.each([
    "password",
    "passwordHash",
    "refreshToken",
    "refreshTokenHash",
    "accessToken",
    "sessionToken",
    "authorization",
    "mfaSecret",
    "mfaSecretEncrypted",
    "mfaRecoveryCodes",
    "mfaRecoveryCodesHash",
    "recoveryCode",
    "apiKey",
    "secret",
  ])("fails closed for forbidden metadata key %s at any depth", (key) => {
    expect(() =>
      assertSecurityAuditMetadataSafe({ safe: { [key]: "do-not-store" } }),
    ).toThrow("SECURITY_AUDIT_FORBIDDEN_METADATA_KEY");
  });

  it.each([
    ["newPassword", { newPassword: "do-not-store" }],
    ["currentPassword nested", { nested: { currentPassword: "do-not-store" } }],
    ["temporaryPassword array", { rows: [{ temporaryPassword: "do-not-store" }] }],
    ["PLAINTEXT_PASSWORD canonicalized", { PLAINTEXT_PASSWORD: "do-not-store" }],
    ["BearerToken mixed case", { BeArErToKeN: "do-not-store" }],
    ["idToken nested array", { nested: [{ ID_TOKEN: "do-not-store" }] }],
    ["clientSecret", { clientSecret: "do-not-store" }],
    ["recoveryCodes", { RECOVERY_CODES: ["do-not-store"] }],
    ["mfaRecoveryCode", { nested: { MfaRecoveryCode: "do-not-store" } }],
  ])("rejects realistic sensitive alias: %s", (_label, metadata) => {
    expect(() => assertSecurityAuditMetadataSafe(metadata)).toThrow(
      "SECURITY_AUDIT_FORBIDDEN_METADATA_KEY",
    );
  });

  it("accepts approved non-secret semantic evidence", () => {
    expect(() =>
      assertSecurityAuditMetadataSafe({
        passwordCredentialChanged: true,
        sessionsRevoked: true,
        nested: [{ mfaReset: true }],
      }),
    ).not.toThrow();
  });

  it("writes exact immutable actor, authoritative facility and normalized semantics once", async () => {
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const tx = {} as never;
    await logSecurityAdminAudit(audit as never, AuditAction.UPDATE, {
      event: "FACILITY_ROLES_CHANGED",
      actorUserId: "authenticated-user-id",
      facilityId: "authoritative-facility-id",
      entityType: "User",
      entityId: "target-id",
      severity: "HIGH",
      outcome: "SUCCESS",
      sourceOperation: "test",
      evidence: {
        before: { roles: ["RN"] },
        after: { roles: ["RN", "ADMIN"] },
      },
      tx,
    });
    expect(audit.log).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.UPDATE,
      "User",
      expect.objectContaining({
        userId: "authenticated-user-id",
        facilityId: "authoritative-facility-id",
        entityId: "target-id",
        critical: true,
        tx,
        metadata: expect.objectContaining({
          event: "FACILITY_ROLES_CHANGED",
          outcome: "SUCCESS",
          severity: "HIGH",
        }),
      }),
    );
  });

  it("propagates audit persistence failure so its transaction can roll back", async () => {
    const audit = {
      log: jest.fn().mockRejectedValue(new Error("database unavailable")),
    };
    await expect(
      logSecurityAdminAudit(audit as never, AuditAction.UPDATE, {
        event: "ADMIN_USER_PASSWORD_RESET",
        actorUserId: "actor",
        entityType: "User",
        entityId: "target",
        severity: "CRITICAL",
        outcome: "SUCCESS",
        sourceOperation: "test",
        evidence: { passwordCredentialChanged: true, sessionsRevoked: true },
        tx: {} as never,
      }),
    ).rejects.toThrow("database unavailable");
  });
});
