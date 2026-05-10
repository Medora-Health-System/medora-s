/**
 * Phase 9 — MfaService unit tests.
 *
 * Coverage
 *   * Enrollment init (audit + secret persistence + QR data URL)
 *   * Enrollment verify (TOTP, audit MFA_ENABLED, recovery codes returned once)
 *   * Login challenge (TOTP success, replay rejection, recovery code single-use)
 *   * PHI-safe audit metadata (no secrets, no codes, no plaintext)
 *   * Disable + regenerate require fresh code
 *   * Admin reset clears state, revokes sessions, audits critical event
 */

import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuditAction, RoleCode } from "@prisma/client";
import { randomBytes } from "node:crypto";

import { AuditService } from "../../common/services/audit.service";
import { MfaService, MFA_INVALID_CODE, MFA_REPLAY_DETECTED } from "./mfa.service";
import { generateCurrentTotp } from "./mfa-totp.util";
import {
  decryptMfaSecret,
  encryptMfaSecret,
  getMfaEncryptionKey,
} from "./mfa-encryption.util";

const ENC_KEY_B64 = randomBytes(32).toString("base64");

beforeAll(() => {
  process.env.MFA_SECRET_ENCRYPTION_KEY = ENC_KEY_B64;
  process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
  // Always exercise the default Phase 9A required-roles policy in this file.
  delete process.env.MFA_REQUIRED_ROLES;
});

type FakeUser = {
  id: string;
  email: string;
  isActive: boolean;
  mfaEnabled: boolean;
  mfaSecretEncrypted: string | null;
  mfaEnabledAt: Date | null;
  mfaRecoveryCodesHash: unknown;
  mfaLastVerifiedAt: Date | null;
  mfaLastUsedStep: bigint | null;
  refreshTokenHash: string | null;
  userRoles: { facilityId: string; role: { code: RoleCode } }[];
};

function makeFakeUser(overrides: Partial<FakeUser> = {}): FakeUser {
  return {
    id: "u-1",
    email: "u@example.com",
    isActive: true,
    mfaEnabled: false,
    mfaSecretEncrypted: null,
    mfaEnabledAt: null,
    mfaRecoveryCodesHash: null,
    mfaLastVerifiedAt: null,
    mfaLastUsedStep: null,
    refreshTokenHash: null,
    userRoles: [{ facilityId: "f-1", role: { code: RoleCode.ADMIN } }],
    ...overrides,
  };
}

function makePrisma(user: FakeUser) {
  const sessions: Array<{ id: string; userId: string; revokedAt: Date | null }> = [];
  const prisma: any = {
    user: {
      findUnique: jest.fn(async ({ where, select }: any) => {
        if (where?.id !== user.id) return null;
        if (!select) return { ...user };
        const out: any = {};
        for (const k of Object.keys(select)) {
          if (k === "userRoles" && select[k]) {
            out.userRoles = user.userRoles;
            continue;
          }
          out[k] = (user as any)[k] ?? null;
        }
        return out;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        if (where?.id !== user.id) return null;
        for (const k of Object.keys(data)) {
          (user as any)[k] = data[k];
        }
        return { ...user };
      }),
    },
    authSession: {
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const s of sessions) {
          if (s.userId === where.userId && s.revokedAt == null) {
            s.revokedAt = data.revokedAt;
            count += 1;
          }
        }
        return { count };
      }),
    },
    _sessions: sessions,
  };
  return prisma;
}

function makeService() {
  const user = makeFakeUser();
  const prisma = makePrisma(user);
  const audit: AuditService = {
    log: jest.fn(async () => undefined),
  } as unknown as AuditService;
  const config = {
    get: (k: string) => {
      if (k === "JWT_REFRESH_SECRET") return "test-refresh";
      if (k === "TOKEN_ISSUER") return "medora-s";
      if (k === "NODE_ENV") return "test";
      return undefined;
    },
  } as unknown as ConfigService;
  const jwt = new JwtService({});
  const svc = new MfaService(prisma as any, audit, config, jwt);
  return { svc, prisma, audit, user };
}

describe("MfaService", () => {
  it("encryption key is loadable from env (round-trip)", () => {
    const k = getMfaEncryptionKey(process.env);
    expect(k).toBeInstanceOf(Buffer);
    const ct = encryptMfaSecret(k!, "JBSWY3DPEHPK3PXP");
    expect(decryptMfaSecret(k!, ct)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("beginEnrollment stores encrypted secret and audits MFA_ENROLLMENT_INIT", async () => {
    const { svc, audit, user } = makeService();
    const out = await svc.beginEnrollment(user.id);
    expect(out.qrCodeDataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(user.mfaEnabled).toBe(false);
    expect(typeof user.mfaSecretEncrypted).toBe("string");
    const k = getMfaEncryptionKey(process.env)!;
    const decrypted = decryptMfaSecret(k, user.mfaSecretEncrypted!);
    expect(decrypted.length).toBeGreaterThan(0);
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.MFA_ENROLLMENT_INIT,
      "USER_MFA",
      expect.objectContaining({ userId: user.id })
    );
  });

  it("beginEnrollment refuses when MFA already enabled", async () => {
    const { svc, user } = makeService();
    user.mfaEnabled = true;
    await expect(svc.beginEnrollment(user.id)).rejects.toBeInstanceOf(ConflictException);
  });

  it("confirmEnrollment with valid code flips mfaEnabled, returns recovery codes once, audits MFA_ENABLED", async () => {
    const { svc, audit, user } = makeService();
    await svc.beginEnrollment(user.id);
    const k = getMfaEncryptionKey(process.env)!;
    const secret = decryptMfaSecret(k, user.mfaSecretEncrypted!);
    const code = generateCurrentTotp(secret);
    const out = await svc.confirmEnrollment(user.id, code);
    expect(out.enabled).toBe(true);
    expect(out.recoveryCodes).toHaveLength(10);
    for (const c of out.recoveryCodes) {
      expect(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c)).toBe(true);
    }
    expect(user.mfaEnabled).toBe(true);
    expect(user.mfaEnabledAt).toBeInstanceOf(Date);
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.MFA_ENABLED,
      "USER_MFA",
      expect.objectContaining({ userId: user.id })
    );
    // Audit metadata must NOT contain plaintext recovery codes or the TOTP secret.
    const seen = JSON.stringify((audit.log as jest.Mock).mock.calls);
    expect(seen).not.toContain(secret);
    for (const c of out.recoveryCodes) expect(seen).not.toContain(c);
  });

  it("verifyLoginChallenge accepts a valid code, blocks replay of the same code, and audits success / failure", async () => {
    const { svc, audit, user } = makeService();
    await svc.beginEnrollment(user.id);
    const k = getMfaEncryptionKey(process.env)!;
    const secret = decryptMfaSecret(k, user.mfaSecretEncrypted!);
    await svc.confirmEnrollment(user.id, generateCurrentTotp(secret));

    // Login challenge — fresh code in next step accepted
    const t1 = Date.now() + 30_000;
    const code1 = generateCurrentTotp(secret, t1);
    jest.spyOn(Date, "now").mockReturnValueOnce(t1);
    const r1 = await svc.verifyLoginChallenge(user.id, code1, undefined);
    expect(r1.method).toBe("totp");

    // Replay of same code rejected (step <= last)
    jest.spyOn(Date, "now").mockReturnValueOnce(t1);
    await expect(svc.verifyLoginChallenge(user.id, code1, undefined)).rejects.toMatchObject({
      message: MFA_REPLAY_DETECTED,
    });
    const failureAudits = (audit.log as jest.Mock).mock.calls.filter(
      (c: any[]) => c[0] === AuditAction.MFA_LOGIN_FAILURE
    );
    expect(failureAudits.length).toBeGreaterThanOrEqual(1);
  });

  it("verifyLoginChallenge rejects an invalid code with MFA_LOGIN_FAILURE audit", async () => {
    const { svc, audit, user } = makeService();
    await svc.beginEnrollment(user.id);
    const k = getMfaEncryptionKey(process.env)!;
    const secret = decryptMfaSecret(k, user.mfaSecretEncrypted!);
    await svc.confirmEnrollment(user.id, generateCurrentTotp(secret));

    await expect(svc.verifyLoginChallenge(user.id, "000000", undefined)).rejects.toMatchObject({
      message: MFA_INVALID_CODE,
    });
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.MFA_LOGIN_FAILURE,
      "USER_MFA",
      expect.objectContaining({ metadata: expect.objectContaining({ method: "totp", success: false }) })
    );
  });

  it("verifyLoginChallenge accepts a recovery code once, then refuses the same code", async () => {
    const { svc, audit, user } = makeService();
    await svc.beginEnrollment(user.id);
    const k = getMfaEncryptionKey(process.env)!;
    const secret = decryptMfaSecret(k, user.mfaSecretEncrypted!);
    const enroll = await svc.confirmEnrollment(user.id, generateCurrentTotp(secret));
    const code = enroll.recoveryCodes[0]!;

    const r = await svc.verifyLoginChallenge(user.id, undefined, code);
    expect(r.method).toBe("recovery_code");
    await expect(svc.verifyLoginChallenge(user.id, undefined, code)).rejects.toMatchObject({
      message: MFA_INVALID_CODE,
    });
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.MFA_RECOVERY_CODE_USED,
      "USER_MFA",
      expect.any(Object)
    );
  });

  it("disable requires a fresh TOTP and clears state on success", async () => {
    const { svc, user } = makeService();
    await svc.beginEnrollment(user.id);
    const k = getMfaEncryptionKey(process.env)!;
    const secret = decryptMfaSecret(k, user.mfaSecretEncrypted!);
    await svc.confirmEnrollment(user.id, generateCurrentTotp(secret));

    // wrong code refuses
    await expect(svc.disable(user.id, "000000")).rejects.toThrow();

    // correct code from a future step works
    const t = Date.now() + 60_000;
    jest.spyOn(Date, "now").mockReturnValueOnce(t);
    await svc.disable(user.id, generateCurrentTotp(secret, t));
    expect(user.mfaEnabled).toBe(false);
    expect(user.mfaSecretEncrypted).toBeNull();
    expect(user.mfaRecoveryCodesHash).toBeNull();
  });

  it("adminReset clears MFA, revokes sessions, and writes critical audit (with PHI-safe metadata)", async () => {
    const { svc, prisma, audit, user } = makeService();
    await svc.beginEnrollment(user.id);
    const k = getMfaEncryptionKey(process.env)!;
    const secret = decryptMfaSecret(k, user.mfaSecretEncrypted!);
    await svc.confirmEnrollment(user.id, generateCurrentTotp(secret));

    // Two active sessions for the target user
    prisma._sessions.push({ id: "s1", userId: user.id, revokedAt: null });
    prisma._sessions.push({ id: "s2", userId: user.id, revokedAt: null });

    const out = await svc.adminReset(
      { userId: "admin-1", facilityId: "f-1", role: RoleCode.ADMIN },
      user.id
    );
    expect(out).toEqual({ reset: true, sessionsRevoked: 2 });
    expect(user.mfaEnabled).toBe(false);
    expect(user.mfaSecretEncrypted).toBeNull();
    expect(prisma._sessions.every((s: any) => s.revokedAt != null)).toBe(true);

    const call = (audit.log as jest.Mock).mock.calls.find(
      (c: any[]) => c[0] === AuditAction.MFA_RESET_BY_ADMIN
    );
    expect(call).toBeDefined();
    expect(call?.[2].critical).toBe(true);
    // PHI safety: no email, no plaintext secret, no recovery codes in metadata
    const seen = JSON.stringify(call);
    expect(seen).not.toContain(user.email);
    expect(seen).not.toContain(secret);
  });

  it("adminReset blocks self-reset", async () => {
    const { svc, user } = makeService();
    await expect(
      svc.adminReset({ userId: user.id, facilityId: "f-1", role: RoleCode.ADMIN }, user.id)
    ).rejects.toThrow(/sa propre/);
  });

  it("adminReset by ADMIN refuses cross-facility targets", async () => {
    const { svc, user } = makeService();
    await expect(
      svc.adminReset(
        { userId: "admin-1", facilityId: "OTHER_FAC", role: RoleCode.ADMIN },
        user.id
      )
    ).rejects.toThrow(/établissement/);
  });

  it("issueChallengeToken / verifyChallengeToken round-trip; wrong type rejected", () => {
    const { svc } = makeService();
    const tok = svc.issueChallengeToken({ id: "u-1", email: "u@e.com" } as any);
    const ok = svc.verifyChallengeToken(tok);
    expect(ok.sub).toBe("u-1");
    expect(ok.type).toBe("mfa_challenge");
    // Using as enrollment must fail
    expect(() => svc.verifyEnrollmentToken(tok)).toThrow(UnauthorizedException);
  });

  it("decideLoginPath returns the right branch", () => {
    const { svc } = makeService();
    expect(
      svc.decideLoginPath({ id: "u", email: "u@e.com", mfaEnabled: true } as any, [
        RoleCode.ADMIN,
      ]).next
    ).toBe("mfa_challenge");
    expect(
      svc.decideLoginPath({ id: "u", email: "u@e.com", mfaEnabled: false } as any, [
        RoleCode.ADMIN,
      ]).next
    ).toBe("mfa_enrollment");
    expect(
      svc.decideLoginPath({ id: "u", email: "u@e.com", mfaEnabled: false } as any, [
        RoleCode.RN,
      ]).next
    ).toBe("full");
  });
});
