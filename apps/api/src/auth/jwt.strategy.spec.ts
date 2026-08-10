import { UnauthorizedException } from "@nestjs/common";
import { JwtStrategy } from "./jwt.strategy";
import type { JwtPayload } from "./types";

const payload: JwtPayload = {
  sub: "user-a", username: "principal@example.test", iss: "medora-s",
  type: "access", sid: "session-a",
};

function make(overrides: { user?: any; session?: any } = {}) {
  const user = "user" in overrides ? overrides.user : {
    id: "user-a", isActive: true, canCreateFacilities: true,
    userRoles: [{ facilityId: "facility", departmentId: null, role: { code: "MEDORA_SUPER_ADMIN" } }],
  };
  const session = "session" in overrides ? overrides.session : {
    id: "session-a", mfaVerifiedAt: new Date(), mfaMethod: "totp",
  };
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(user) },
    authSession: { findFirst: jest.fn().mockResolvedValue(session) },
  } as any;
  const strategy = new JwtStrategy({ get: jest.fn().mockReturnValue("access-secret") } as any, prisma);
  return { strategy, prisma };
}

describe("D4SEC.1C.4A access-token session validation", () => {
  it("accepts a live session owned by sub and returns only DB assurance", async () => {
    const verifiedAt = new Date();
    const { strategy, prisma } = make({ session: { id: "session-a", mfaVerifiedAt: verifiedAt, mfaMethod: "totp" } });
    await expect(strategy.validate({ ...payload, mfaVerifiedAt: "forged" } as any)).resolves.toEqual(
      expect.objectContaining({ sessionId: "session-a", mfaVerifiedAt: verifiedAt }),
    );
    expect(prisma.authSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "session-a", userId: "user-a", revokedAt: null, expiresAt: { gt: expect.any(Date) } },
    }));
  });

  it.each([
    ["revoked", null],
    ["expired", null],
    ["nonexistent", null],
    ["owned by another user", null],
  ])("rejects a still-unexpired JWT when its session is %s", async (_case, session) => {
    const { strategy } = make({ session });
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects an inactive user before platform-principal authority can be considered", async () => {
    const { strategy, prisma } = make({ user: { id: "user-a", isActive: false, canCreateFacilities: true, userRoles: [{ id: "super" }] } });
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.authSession.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a revoked session even for the complete platform principal", async () => {
    const { strategy } = make({ session: null });
    await expect(strategy.validate(payload)).rejects.toThrow("Session not active");
  });
});
