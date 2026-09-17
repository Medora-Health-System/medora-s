/**
 * RolesGuard must evaluate x-facility-id first, then verify active UserRole
 * membership for that facility before granting access. JWT facility is only
 * the fallback when no explicit header exists. The header never grants access
 * by itself.
 */
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RoleCode } from "@prisma/client";
import { RequireRoles, RolesGuard } from "./roles.guard";
import { resolveAuthorizedFacilityId } from "../http/request-facility";

const FACILITY_A = "facility-a";
const FACILITY_B = "facility-b";
const USER_ID = "user-1";

class StaffRoutes {
  @RequireRoles(RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN)
  workspace() {}
}

function buildGuard(memberships: Array<{ facilityId: string; role: RoleCode }>) {
  const prisma = {
    userRole: {
      findMany: jest.fn().mockImplementation(async (args: { where?: { facilityId?: string; role?: { code?: { in?: RoleCode[] } } } }) => {
        const wantedFacilityId = args?.where?.facilityId;
        const wantedRoles = args?.where?.role?.code?.in;
        return memberships
          .filter((membership) => membership.facilityId === wantedFacilityId)
          .filter((membership) => !wantedRoles || wantedRoles.includes(membership.role))
          .map((membership) => ({
            role: { code: membership.role },
            facilityId: membership.facilityId,
            userId: USER_ID,
          }))
          .sort((a, b) => a.role.code.localeCompare(b.role.code));
      }),
      findFirst: jest.fn().mockImplementation(async (args: { where?: { facilityId?: string } }) => {
        const wantedFacilityId = args?.where?.facilityId;
        const membership = memberships.find((row) => row.facilityId === wantedFacilityId);
        return membership
          ? { role: { code: membership.role }, facilityId: membership.facilityId, userId: USER_ID }
          : null;
      }),
    },
    user: { findUnique: jest.fn() },
    facility: { findFirst: jest.fn() },
    msppUserRoleAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    breakGlassSession: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  return { guard: new RolesGuard(new Reflector(), prisma as never), prisma };
}

function context(request: Record<string, unknown>) {
  return {
    getHandler: () => StaffRoutes.prototype.workspace,
    getClass: () => StaffRoutes,
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}

describe("RolesGuard facility selection", () => {
  it("CASE A: JWT/default facility A with requested facility A and valid membership is allowed as A", async () => {
    const { guard, prisma } = buildGuard([{ facilityId: FACILITY_A, role: RoleCode.PROVIDER }]);
    const request = {
      user: { userId: USER_ID, facilityId: FACILITY_A },
      headers: { "x-facility-id": FACILITY_A },
    };
    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(request).toEqual(expect.objectContaining({ facilityId: FACILITY_A, userRole: RoleCode.PROVIDER }));
    expect(resolveAuthorizedFacilityId(request)).toBe(FACILITY_A);
    expect((prisma.userRole.findMany.mock.calls[0]![0] as { where: { facilityId: string } }).where.facilityId).toBe(
      FACILITY_A,
    );
  });

  it("CASE B: JWT facility A + requested facility B with valid membership B is allowed as B", async () => {
    const { guard, prisma } = buildGuard([
      { facilityId: FACILITY_A, role: RoleCode.PROVIDER },
      { facilityId: FACILITY_B, role: RoleCode.PROVIDER },
    ]);
    const request = {
      user: { userId: USER_ID, facilityId: FACILITY_A },
      headers: { "x-facility-id": FACILITY_B },
    };
    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(request).toEqual(expect.objectContaining({ facilityId: FACILITY_B, userRole: RoleCode.PROVIDER }));
    expect((request.user as { facilityId?: string }).facilityId).toBe(FACILITY_B);
    expect(resolveAuthorizedFacilityId(request)).toBe(FACILITY_B);
    expect((prisma.userRole.findMany.mock.calls[0]![0] as { where: { facilityId: string } }).where.facilityId).toBe(
      FACILITY_B,
    );
  });

  it("CASE C/F: JWT facility A + requested facility B without membership B is denied", async () => {
    const { guard, prisma } = buildGuard([{ facilityId: FACILITY_A, role: RoleCode.PROVIDER }]);
    const request = {
      user: { userId: USER_ID, facilityId: FACILITY_A },
      headers: { "x-facility-id": FACILITY_B },
    };
    await expect(guard.canActivate(context(request))).rejects.toBeInstanceOf(ForbiddenException);
    expect((prisma.userRole.findMany.mock.calls[0]![0] as { where: { facilityId: string } }).where.facilityId).toBe(
      FACILITY_B,
    );
    expect(request).not.toEqual(expect.objectContaining({ facilityId: FACILITY_B }));
    expect(resolveAuthorizedFacilityId(request)).toBe(FACILITY_A);
  });

  it("uses the JWT facility when no explicit header exists", async () => {
    const { guard, prisma } = buildGuard([{ facilityId: FACILITY_A, role: RoleCode.ADMIN }]);
    const request = {
      user: { userId: USER_ID, facilityId: FACILITY_A },
      headers: {},
    };
    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(request).toEqual(expect.objectContaining({ facilityId: FACILITY_A, userRole: RoleCode.ADMIN }));
    expect((prisma.userRole.findMany.mock.calls[0]![0] as { where: { facilityId: string } }).where.facilityId).toBe(
      FACILITY_A,
    );
  });

  it("rejects a missing facility context", async () => {
    const { guard } = buildGuard([{ facilityId: FACILITY_A, role: RoleCode.RN }]);
    await expect(
      guard.canActivate(context({ user: { userId: USER_ID }, headers: {} })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("does not grant Digital Care staff access to FRONT_DESK membership at the requested facility", async () => {
    const { guard } = buildGuard([{ facilityId: FACILITY_B, role: RoleCode.FRONT_DESK }]);
    const request = {
      user: { userId: USER_ID, facilityId: FACILITY_A },
      headers: { "x-facility-id": FACILITY_B },
    };
    await expect(guard.canActivate(context(request))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
