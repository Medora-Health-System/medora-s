/**
 * Phase 9 — End-to-end MFA login flow.
 *
 * Drives the real `/auth/login` + `/auth/mfa/*` HTTP surface through Nest /
 * supertest, with a mocked PrismaService. Exercises:
 *
 *   1. ADMIN with MFA disabled → `mfa_enrollment_required` (no session yet).
 *   2. Enrollment via `enroll/init` then `enroll/verify` (with the grant) →
 *      session cookie + recovery codes.
 *   3. New login on a user whose MFA is enabled → `mfa_challenge`.
 *   4. `verify` with a valid TOTP issues a session.
 *   5. Replay of the same TOTP step is rejected.
 *   6. Recovery code is single-use.
 *   7. RN with MFA disabled (non-required role) logs in normally.
 */

import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as argon2 from "argon2";
import * as request from "supertest";
import cookieParser = require("cookie-parser");
import { randomBytes } from "node:crypto";

import { AppModule } from "../../app.module";
import { PrismaService } from "../../prisma/prisma.service";
import { RoleCode } from "@prisma/client";
import { generateCurrentTotp } from "./mfa-totp.util";
import { decryptMfaSecret, getMfaEncryptionKey } from "./mfa-encryption.util";

describe("MFA login flow (e2e)", () => {
  let app: INestApplication;

  const adminId = "u-admin";
  const adminEmail = "admin@medora.local";
  const rnId = "u-rn";
  const rnEmail = "rn@medora.local";
  const facilityId = "f-1";
  let passwordHash: string;

  // In-memory user store the prisma mock reads/writes against
  type FakeRow = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    refreshTokenHash: string | null;
    isActive: boolean;
    canCreateFacilities: boolean;
    mfaEnabled: boolean;
    mfaSecretEncrypted: string | null;
    mfaEnabledAt: Date | null;
    mfaRecoveryCodesHash: any;
    mfaLastVerifiedAt: Date | null;
    mfaLastUsedStep: bigint | null;
    userRoles: { id: string; facilityId: string; departmentId: null; isActive: true; role: { code: string }; facility: any }[];
  };

  let users: Record<string, FakeRow>;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = "test_access_secret";
    process.env.JWT_REFRESH_SECRET = "test_refresh_secret";
    process.env.JWT_ACCESS_TTL = "15m";
    process.env.JWT_REFRESH_TTL = "14d";
    process.env.TOKEN_ISSUER = "medora-s";
    process.env.MFA_SECRET_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    /**
     * Narrow gate for most scenarios: only ADMIN is MFA-required for enrollment,
     * so RN can obtain a normal session while admin exercises enrollment/challenge.
     * A dedicated test sets `MFA_REQUIRED_ROLES` to the full `RoleCode` list to
     * assert universal enrollment when explicitly configured.
     */
    process.env.MFA_REQUIRED_ROLES = "ADMIN";

    passwordHash = await argon2.hash("MedoraAdmin123!");

    users = {
      [adminId]: {
        id: adminId,
        email: adminEmail,
        firstName: "Admin",
        lastName: "User",
        passwordHash,
        refreshTokenHash: null,
        isActive: true,
        canCreateFacilities: false,
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
        mfaRecoveryCodesHash: null,
        mfaLastVerifiedAt: null,
        mfaLastUsedStep: null,
        userRoles: [
          {
            id: "ur-1",
            facilityId,
            departmentId: null,
            isActive: true,
            role: { code: "ADMIN" },
            facility: { id: facilityId, name: "Clinic", isActive: true, defaultLanguage: "fr", allowRnLabResultSubmission: false },
          },
        ],
      },
      [rnId]: {
        id: rnId,
        email: rnEmail,
        firstName: "Nina",
        lastName: "Nurse",
        passwordHash,
        refreshTokenHash: null,
        isActive: true,
        canCreateFacilities: false,
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
        mfaRecoveryCodesHash: null,
        mfaLastVerifiedAt: null,
        mfaLastUsedStep: null,
        userRoles: [
          {
            id: "ur-2",
            facilityId,
            departmentId: null,
            isActive: true,
            role: { code: "RN" },
            facility: { id: facilityId, name: "Clinic", isActive: true, defaultLanguage: "fr", allowRnLabResultSubmission: false },
          },
        ],
      },
    };

    const sessions = new Map<string, { userId: string; refreshTokenHash: string; revokedAt: Date | null; expiresAt: Date }>();

    const filterUserRoles = (rows: any[], whereUserRoles: any | undefined) => {
      if (!whereUserRoles?.where) return rows;
      const w = whereUserRoles.where as { isActive?: boolean; facility?: { isActive?: boolean } };
      return rows.filter(
        (r) =>
          (w.isActive == null || r.isActive === w.isActive) &&
          (w.facility?.isActive == null || r.facility.isActive === w.facility.isActive)
      );
    };

    const projectRoles = (rows: any[], includeFacility: any | true | undefined) => {
      return rows.map((r) => ({
        ...r,
        facility:
          includeFacility && typeof includeFacility === "object"
            ? Object.fromEntries(
                Object.entries(r.facility).filter(([k]) =>
                  Object.prototype.hasOwnProperty.call(includeFacility.select ?? {}, k) ||
                  k === "id"
                )
              )
            : includeFacility
            ? r.facility
            : undefined,
      }));
    };

    const buildResultForFindFirstUnique = (row: FakeRow | undefined, opts: any): any => {
      if (!row) return null;
      const include = opts?.include;
      const select = opts?.select;
      const base: any = { ...row };
      if (select) {
        const out: any = {};
        for (const k of Object.keys(select)) {
          if (k === "userRoles" && select.userRoles) {
            const filtered = filterUserRoles(row.userRoles, select.userRoles);
            out.userRoles = projectRoles(filtered, select.userRoles.include?.facility ?? select.userRoles.select?.facility ?? false);
            if (select.userRoles.select?.role) {
              out.userRoles = out.userRoles.map((ur: any) => ({ ...ur, role: ur.role }));
            }
          } else {
            out[k] = (row as any)[k] ?? null;
          }
        }
        return out;
      }
      if (include?.userRoles) {
        const filtered = filterUserRoles(row.userRoles, include.userRoles);
        base.userRoles = projectRoles(filtered, include.userRoles.include?.facility ?? false);
      }
      return base;
    };

    const db: any = {
      authSession: {
        create: jest.fn(async ({ data }: any) => {
          sessions.set(data.id, {
            userId: data.userId,
            refreshTokenHash: data.refreshTokenHash,
            revokedAt: null,
            expiresAt: data.expiresAt,
          });
          return { ...data };
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          const id = where?.id;
          if (!id) return null;
          const s = sessions.get(id);
          if (!s || s.userId !== where.userId) return null;
          return { id, ...s };
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const s = sessions.get(where.id);
          if (!s) return { id: where.id };
          Object.assign(s, data);
          return { id: where.id, ...s };
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const s of sessions.values()) {
            if (s.userId === where.userId && s.revokedAt == null) {
              Object.assign(s, data);
              count += 1;
            }
          }
          return { count };
        }),
      },
      user: {
        findFirst: jest.fn(async (opts: any) => {
          const email = opts?.where?.email;
          const row = Object.values(users).find((u) => u.email === email);
          return buildResultForFindFirstUnique(row, opts);
        }),
        findUnique: jest.fn(async (opts: any) => {
          const id = opts?.where?.id;
          return buildResultForFindFirstUnique(users[id], opts);
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const row = users[where.id];
          if (!row) return null;
          Object.assign(row, data);
          return { ...row };
        }),
      },
      msppUserRoleAssignment: {
        findMany: jest.fn(async () => []),
      },
      auditLog: {
        create: jest.fn(async () => ({ id: "audit_" + Math.random().toString(36).slice(2) })),
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("ADMIN login (no MFA enrolled) is forced into enrollment", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: adminEmail, password: "MedoraAdmin123!" })
      .expect(201);
    expect(res.body.mfaEnrollmentRequired).toBe(true);
    expect(typeof res.body.mfaEnrollmentToken).toBe("string");
    expect(res.body.accessToken).toBeUndefined();
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("Enrollment via init + verify issues a full session and returns recovery codes", async () => {
    // Login → enrollment grant
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: adminEmail, password: "MedoraAdmin123!" })
      .expect(201);
    const enrollmentToken: string = login.body.mfaEnrollmentToken;

    // Init
    const init = await request(app.getHttpServer())
      .post("/auth/mfa/enroll/init")
      .send({ enrollmentToken })
      .expect(200);
    expect(init.body.qrCodeDataUrl.startsWith("data:image/png;base64,")).toBe(true);

    // Decrypt to compute a valid TOTP for the verify step
    const k = getMfaEncryptionKey(process.env)!;
    const secret = decryptMfaSecret(k, users[adminId].mfaSecretEncrypted!);
    const code = generateCurrentTotp(secret);

    const verify = await request(app.getHttpServer())
      .post("/auth/mfa/enroll/verify")
      .send({ enrollmentToken, code })
      .expect(200);
    expect(verify.body.enabled).toBe(true);
    expect(Array.isArray(verify.body.recoveryCodes)).toBe(true);
    expect(verify.body.recoveryCodes).toHaveLength(10);
    expect(typeof verify.body.accessToken).toBe("string");
    const sc = verify.headers["set-cookie"];
    const cookieStr = Array.isArray(sc) ? sc.join(";") : String(sc);
    expect(cookieStr).toContain("refreshToken=");
    expect(users[adminId].mfaEnabled).toBe(true);
  });

  it("Subsequent login with MFA enabled returns an mfa_challenge and verify issues a session; replay is rejected", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: adminEmail, password: "MedoraAdmin123!" })
      .expect(201);
    expect(login.body.mfaRequired).toBe(true);
    const challengeToken: string = login.body.mfaChallengeToken;

    const k = getMfaEncryptionKey(process.env)!;
    const secret = decryptMfaSecret(k, users[adminId].mfaSecretEncrypted!);

    /**
     * Force the verify request into a TOTP step strictly greater than the one
     * consumed at enrollment so replay protection allows it. The mock must be
     * persistent (not `mockReturnValueOnce`) because the request handler reads
     * `Date.now` more than once (TOTP verify, audit, mfaLastVerifiedAt update).
     */
    const t1 = Date.now() + 60_000;
    const code = generateCurrentTotp(secret, t1);

    const dateSpy = jest.spyOn(Date, "now").mockReturnValue(t1);
    try {
      const verify = await request(app.getHttpServer())
        .post("/auth/mfa/verify")
        .send({ challengeToken, code })
        .expect(200);
      expect(verify.body.method).toBe("totp");
      expect(typeof verify.body.accessToken).toBe("string");
    } finally {
      dateSpy.mockRestore();
    }

    // Replay: same code in the same step → 401 (mfaLastUsedStep blocks reuse).
    const login2 = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: adminEmail, password: "MedoraAdmin123!" })
      .expect(201);
    const challenge2: string = login2.body.mfaChallengeToken;
    const dateSpy2 = jest.spyOn(Date, "now").mockReturnValue(t1);
    try {
      await request(app.getHttpServer())
        .post("/auth/mfa/verify")
        .send({ challengeToken: challenge2, code })
        .expect(401);
    } finally {
      dateSpy2.mockRestore();
    }
  });

  it("Recovery code is accepted once and rejected on reuse", async () => {
    // Enable MFA on RN to exercise the recovery path on a fresh user
    const rnLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: rnEmail, password: "MedoraAdmin123!" })
      .expect(201);
    expect(rnLogin.body.accessToken).toBeTruthy();

    // Manually enroll RN by calling init/verify with the access token via Bearer
    const accessToken = rnLogin.body.accessToken;
    await request(app.getHttpServer())
      .post("/auth/mfa/enroll/init")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({})
      .expect(200);
    const k = getMfaEncryptionKey(process.env)!;
    const secret = decryptMfaSecret(k, users[rnId].mfaSecretEncrypted!);
    const enrollVerify = await request(app.getHttpServer())
      .post("/auth/mfa/enroll/verify")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ code: generateCurrentTotp(secret) })
      .expect(200);
    const recoveryCode: string = enrollVerify.body.recoveryCodes[0];

    // Re-login → challenge
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: rnEmail, password: "MedoraAdmin123!" })
      .expect(201);
    const challengeToken: string = login.body.mfaChallengeToken;

    const ok = await request(app.getHttpServer())
      .post("/auth/mfa/verify")
      .send({ challengeToken, recoveryCode })
      .expect(200);
    expect(ok.body.method).toBe("recovery_code");

    // Reuse → 401
    const login2 = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: rnEmail, password: "MedoraAdmin123!" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/auth/mfa/verify")
      .send({ challengeToken: login2.body.mfaChallengeToken, recoveryCode })
      .expect(401);
  });

  it("Non-required role (RN) without MFA logs in normally (with narrow override)", async () => {
    // Reset RN's MFA fields to simulate a fresh non-MFA user
    users[rnId].mfaEnabled = false;
    users[rnId].mfaSecretEncrypted = null;
    users[rnId].mfaRecoveryCodesHash = null;
    users[rnId].mfaLastUsedStep = null;
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: rnEmail, password: "MedoraAdmin123!" })
      .expect(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.mfaRequired).toBeUndefined();
    expect(res.body.mfaEnrollmentRequired).toBeUndefined();
  });

  /**
   * Universal enrollment when `MFA_REQUIRED_ROLES` lists every interactive
   * `RoleCode` — explicit operator choice, not the implicit default when unset.
   */
  it("Explicit full RoleCode list forces MFA enrollment for RN, LAB, RADIOLOGY, FRONT_DESK", async () => {
    const previousOverride = process.env.MFA_REQUIRED_ROLES;
    const allRolesCsv = (Object.values(RoleCode) as string[]).join(",");
    process.env.MFA_REQUIRED_ROLES = allRolesCsv;
    try {
      // Reset RN to a fresh MFA-disabled user so we exercise the enrollment branch.
      users[rnId].mfaEnabled = false;
      users[rnId].mfaSecretEncrypted = null;
      users[rnId].mfaRecoveryCodesHash = null;
      users[rnId].mfaLastUsedStep = null;

      // Cycle RN through each role we care about. Same user record, so we just swap the role code.
      const rolesToCheck = ["RN", "LAB", "RADIOLOGY", "FRONT_DESK"] as const;
      for (const code of rolesToCheck) {
        users[rnId].userRoles[0]!.role = { code };
        users[rnId].mfaEnabled = false;
        users[rnId].mfaSecretEncrypted = null;
        users[rnId].mfaRecoveryCodesHash = null;
        users[rnId].mfaLastUsedStep = null;

        const res = await request(app.getHttpServer())
          .post("/auth/login")
          .send({ username: rnEmail, password: "MedoraAdmin123!" })
          .expect(201);
        expect(res.body.mfaEnrollmentRequired).toBe(true);
        expect(typeof res.body.mfaEnrollmentToken).toBe("string");
        expect(res.body.accessToken).toBeUndefined();
        expect(res.headers["set-cookie"]).toBeUndefined();
      }
    } finally {
      // Restore the suite-wide override so the rest of the test file remains valid.
      if (previousOverride === undefined) {
        delete process.env.MFA_REQUIRED_ROLES;
      } else {
        process.env.MFA_REQUIRED_ROLES = previousOverride;
      }
      // Restore the original role on the RN row to avoid leaking state.
      users[rnId].userRoles[0]!.role = { code: "RN" };
    }
  });

  /**
   * Phase 9 patch — language correctness. The login response surfaces
   * `preferredLanguage` from the user's primary facility's `defaultLanguage`
   * so the MFA panels can switch the i18n locale before any session exists.
   */
  it("Login MFA branches expose preferredLanguage derived from the user's facility", async () => {
    // English-language facility → MFA enrollment branch returns preferredLanguage = "en"
    const previousLang = users[adminId].userRoles[0]!.facility.defaultLanguage;
    users[adminId].userRoles[0]!.facility.defaultLanguage = "en";
    // Force the enrollment branch (mfa not enabled yet for a fresh principal).
    users[adminId].mfaEnabled = false;
    users[adminId].mfaSecretEncrypted = null;
    users[adminId].mfaRecoveryCodesHash = null;
    users[adminId].mfaLastUsedStep = null;
    try {
      const enRes = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ username: adminEmail, password: "MedoraAdmin123!" })
        .expect(201);
      expect(enRes.body.mfaEnrollmentRequired).toBe(true);
      expect(enRes.body.preferredLanguage).toBe("en");

      // Switch the facility back to French → preferredLanguage = "fr"
      users[adminId].userRoles[0]!.facility.defaultLanguage = "fr";
      const frRes = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ username: adminEmail, password: "MedoraAdmin123!" })
        .expect(201);
      expect(frRes.body.mfaEnrollmentRequired).toBe(true);
      expect(frRes.body.preferredLanguage).toBe("fr");
    } finally {
      users[adminId].userRoles[0]!.facility.defaultLanguage = previousLang;
    }
  });
});
