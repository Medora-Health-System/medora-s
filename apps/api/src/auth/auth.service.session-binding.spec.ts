import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { AuthService } from "./auth.service";

const ACCESS_SECRET = "session-binding-access-secret";
const REFRESH_SECRET = "session-binding-refresh-secret";
const ISSUER = "medora-s";

function makeService() {
  const prisma: any = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: "user-a", email: "user-a@example.test", isActive: true, refreshTokenHash: null,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    authSession: {
      create: jest.fn().mockImplementation(async ({ data }: any) => data),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const config = { get: jest.fn((key: string) => ({
    JWT_ACCESS_SECRET: ACCESS_SECRET,
    JWT_REFRESH_SECRET: REFRESH_SECRET,
    JWT_ACCESS_TTL: "8h",
    JWT_REFRESH_TTL: "14d",
    TOKEN_ISSUER: ISSUER,
  } as Record<string, string>)[key]) } as any;
  const jwt = new JwtService();
  const failedLogin = {
    assertIpNotLocked: jest.fn(), assertAccountNotLocked: jest.fn(),
    recordUnknownUser: jest.fn(), recordBadPassword: jest.fn(), reset: jest.fn(),
  } as any;
  const service = new AuthService(prisma, jwt, config, failedLogin);
  (service as any).buildAuthUserDto = jest.fn().mockResolvedValue({ id: "user-a" });
  return { service, prisma, jwt };
}

function decode(jwt: JwtService, token: string): any {
  return jwt.verify(token, { secret: ACCESS_SECRET, issuer: ISSUER });
}

describe("D4SEC.1C.4A AuthService access-token issuance", () => {
  it("MFA-completed login creates one session and issues access with the same sid", async () => {
    const { service, prisma, jwt } = makeService();
    const result = await service.completeAuthAfterMfa("user-a", "totp");
    const access = decode(jwt, result.accessToken);
    expect(access.sid).toEqual(expect.any(String));
    expect(prisma.authSession.create.mock.calls[0][0].data.id).toBe(access.sid);
  });

  it("ordinary clinical password login creates a session and always issues matching sid", async () => {
    const { service, prisma, jwt } = makeService();
    const password = "ClinicalPassword123!";
    prisma.user.findFirst = jest.fn().mockResolvedValue({
      id: "user-a", email: "user-a@example.test", firstName: "Clinical", lastName: "User",
      isActive: true, passwordHash: await argon2.hash(password), mfaEnabled: false,
      userRoles: [{
        facilityId: "facility-a", departmentId: null,
        role: { code: "RN" }, facility: { isActive: true, defaultLanguage: "en" },
      }],
    });
    const result = await service.login("user-a@example.test", password, { ip: "127.0.0.1" });
    expect(result.kind).toBe("session");
    if (result.kind !== "session") throw new Error("expected session login");
    const access = decode(jwt, result.accessToken);
    expect(access.sid).toEqual(expect.any(String));
    expect(prisma.authSession.create.mock.calls[0][0].data.id).toBe(access.sid);
  });

  it("refresh preserves the active refresh session sid in the new access token", async () => {
    const { service, prisma, jwt } = makeService();
    const refreshToken = jwt.sign({
      sub: "user-a", username: "user-a@example.test", iss: ISSUER,
      type: "refresh", sid: "session-existing",
    }, { secret: REFRESH_SECRET, expiresIn: "14d" });
    prisma.authSession.findFirst.mockResolvedValue({
      id: "session-existing", userId: "user-a", revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000), refreshTokenHash: await argon2.hash(refreshToken),
    });
    const result = await service.refresh(refreshToken);
    expect(decode(jwt, result.accessToken).sid).toBe("session-existing");
  });

  it("legacy refresh migration creates a session and returns a sid-bearing access token", async () => {
    const { service, prisma, jwt } = makeService();
    const refreshToken = jwt.sign({
      sub: "user-a", username: "user-a@example.test", iss: ISSUER, type: "refresh",
    }, { secret: REFRESH_SECRET, expiresIn: "14d" });
    prisma.user.findUnique.mockResolvedValue({
      id: "user-a", email: "user-a@example.test", isActive: true,
      refreshTokenHash: await argon2.hash(refreshToken),
    });
    const result = await service.refresh(refreshToken);
    const access = decode(jwt, result.accessToken);
    expect(access.sid).toEqual(expect.any(String));
    expect(prisma.authSession.create.mock.calls[0][0].data.id).toBe(access.sid);
  });

  it("step-up replacement token retains the exact current sid", () => {
    const { service, jwt } = makeService();
    const token = service.issueAccessTokenForSession("user-a", "user-a@example.test", "session-a");
    expect(decode(jwt, token).sid).toBe("session-a");
  });
});
