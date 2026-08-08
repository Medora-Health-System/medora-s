/**
 * MEDUI.D4C.7K — platform-administrator route access for the enterprise lifecycle routes.
 *
 * Contract pinned here:
 *   * The authoritative Medora platform principal reaches an opted-in lifecycle route without a
 *     facility `UserRole`, but only with an explicit, active facility context.
 *   * No facility context → denied (400). Unknown / inactive facility → denied (403).
 *   * Routes that do not opt in stay facility-scoped, even for the platform principal.
 *   * Facility Provider / RN / ADMIN authorization is unchanged and stays facility-scoped.
 */

import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RoleCode } from "@prisma/client";
import {
  AllowPlatformPrincipalWithFacilityContext,
  RequireRoles,
  RolesGuard,
} from "./roles.guard";

const facilityId = "facility-1";
const otherFacilityId = "facility-2";
const userId = "user-1";

class LifecycleRoutes {
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN)
  @AllowPlatformPrincipalWithFacilityContext()
  close() {}

  @RequireRoles(RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN)
  @AllowPlatformPrincipalWithFacilityContext()
  reopen() {}

  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN)
  @AllowPlatformPrincipalWithFacilityContext()
  lifecycleTimeline() {}

  /** Not opted in: stays strictly facility-scoped. */
  @RequireRoles(RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN)
  otherAdminRoute() {}
}

function buildGuard(opts: {
  platformAuthority?: boolean;
  canCreateFacilities?: boolean;
  isActive?: boolean;
  membershipRole?: RoleCode | null;
  facilityFound?: boolean;
}) {
  const membership =
    opts.membershipRole != null
      ? { role: { code: opts.membershipRole }, facilityId, userId }
      : null;
  const prisma = {
    userRole: {
      findFirst: jest.fn().mockImplementation(async (args: any) => {
        if (!membership) return null;
        const wanted = args?.where?.role?.code?.in as RoleCode[] | undefined;
        if (wanted && !wanted.includes(membership.role.code as RoleCode)) return null;
        return membership;
      }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: userId,
        isActive: opts.isActive ?? true,
        canCreateFacilities: opts.canCreateFacilities ?? opts.platformAuthority === true,
        userRoles: opts.platformAuthority === true ? [{ id: "super-role" }] : [],
      }),
    },
    facility: {
      findFirst: jest
        .fn()
        .mockResolvedValue(opts.facilityFound === false ? null : { id: facilityId }),
    },
    msppUserRoleAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    breakGlassSession: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  return { guard: new RolesGuard(new Reflector(), prisma as never), prisma };
}

function context(handler: (...args: unknown[]) => unknown, request: Record<string, unknown>) {
  return {
    getHandler: () => handler,
    getClass: () => LifecycleRoutes,
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}

function platformRequest(headers: Record<string, unknown> = { "x-facility-id": facilityId }) {
  return { user: { userId }, headers } as Record<string, unknown>;
}

describe("MEDUI.D4C.7K — platform administrator lifecycle route access", () => {
  it("reaches the close route with explicit facility context", async () => {
    const { guard } = buildGuard({ platformAuthority: true });
    const request = platformRequest();
    await expect(guard.canActivate(context(LifecycleRoutes.prototype.close, request))).resolves.toBe(
      true
    );
    expect(request.userRole).toBe(RoleCode.MEDORA_SUPER_ADMIN);
    expect(request.platformPrincipal).toBe(true);
    expect(request.platformFacilityMembership).toBe(false);
    expect((request.user as { facilityId?: string }).facilityId).toBe(facilityId);
  });

  it("reaches the reopen route with explicit facility context", async () => {
    const { guard } = buildGuard({ platformAuthority: true });
    const request = platformRequest();
    await expect(
      guard.canActivate(context(LifecycleRoutes.prototype.reopen, request))
    ).resolves.toBe(true);
    expect(request.platformPrincipal).toBe(true);
  });

  it("reaches the lifecycle-timeline route with explicit facility context", async () => {
    const { guard } = buildGuard({ platformAuthority: true });
    const request = platformRequest();
    await expect(
      guard.canActivate(context(LifecycleRoutes.prototype.lifecycleTimeline, request))
    ).resolves.toBe(true);
  });

  it("is denied without facility context", async () => {
    const { guard, prisma } = buildGuard({ platformAuthority: true });
    await expect(
      guard.canActivate(context(LifecycleRoutes.prototype.reopen, { user: { userId }, headers: {} }))
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("is denied with a mismatched or inactive facility context", async () => {
    const { guard } = buildGuard({
      platformAuthority: true,
      facilityFound: false,
    });
    await expect(
      guard.canActivate(
        context(LifecycleRoutes.prototype.reopen, {
          user: { userId },
          headers: { "x-facility-id": otherFacilityId },
        })
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("is denied for an inactive platform account", async () => {
    const { guard } = buildGuard({ platformAuthority: true, isActive: false });
    await expect(
      guard.canActivate(context(LifecycleRoutes.prototype.reopen, platformRequest()))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("does not grant generic access on routes that did not opt in", async () => {
    const { guard } = buildGuard({ platformAuthority: true });
    await expect(
      guard.canActivate(context(LifecycleRoutes.prototype.otherAdminRoute, platformRequest()))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("does not grant access to a non-platform account without facility membership", async () => {
    const { guard } = buildGuard({});
    await expect(
      guard.canActivate(context(LifecycleRoutes.prototype.reopen, platformRequest()))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("keeps facility ADMIN facility-scoped (no platform stamp)", async () => {
    const { guard, prisma } = buildGuard({
      membershipRole: RoleCode.ADMIN,
    });
    const request = platformRequest();
    await expect(
      guard.canActivate(context(LifecycleRoutes.prototype.reopen, request))
    ).resolves.toBe(true);
    expect(request.userRole).toBe(RoleCode.ADMIN);
    expect(request.platformPrincipal).toBe(false);
    expect(request.platformFacilityMembership).toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect((prisma.userRole.findFirst.mock.calls[0]![0] as any).where.facilityId).toBe(facilityId);
  });

  it("keeps facility Provider and RN close authorization unchanged", async () => {
    for (const role of [RoleCode.PROVIDER, RoleCode.RN]) {
      const { guard } = buildGuard({ membershipRole: role });
      const request = platformRequest();
      await expect(
        guard.canActivate(context(LifecycleRoutes.prototype.close, request))
      ).resolves.toBe(true);
      expect(request.userRole).toBe(role);
      expect(request.platformPrincipal).toBe(false);
    }
  });

  it("denies a facility role that is not authorized for reopen", async () => {
    const { guard } = buildGuard({ membershipRole: RoleCode.RN });
    await expect(
      guard.canActivate(context(LifecycleRoutes.prototype.reopen, platformRequest()))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
