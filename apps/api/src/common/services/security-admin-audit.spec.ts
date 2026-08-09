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
