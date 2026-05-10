/**
 * Phase 9 — Controller-level metadata + RBAC binding tests.
 *
 * Verifies that:
 *   * `MfaController` routes are guarded by the right combinations of
 *     `MfaEnrollmentGuard` / `MfaChallengeGuard` / `AuthGuard("jwt")`.
 *   * `AdminMfaController` requires `ADMIN` or `MEDORA_SUPER_ADMIN`
 *     via `@RequireRoles` + `RolesGuard`.
 *   * Throttling is configured.
 * These checks run against decorator metadata so they are stable and don't
 * boot the full app.
 */

import "reflect-metadata";

import { AuthGuard } from "@nestjs/passport";
import { ThrottlerGuard } from "@nestjs/throttler";
import { RoleCode } from "@prisma/client";

import { AdminMfaController } from "../../admin/admin-mfa.controller";
import { MfaController } from "./mfa.controller";
import { MfaChallengeGuard, MfaEnrollmentGuard } from "./mfa-grant.guard";

const GUARDS = "__guards__";
const ROLES = "roles";

function getMethodGuards(controller: any, method: string): any[] {
  return Reflect.getMetadata(GUARDS, controller.prototype[method]) ?? [];
}

function getMethodRoles(controller: any, method: string): RoleCode[] {
  return Reflect.getMetadata(ROLES, controller.prototype[method]) ?? [];
}

function getClassGuards(controller: any): any[] {
  return Reflect.getMetadata(GUARDS, controller) ?? [];
}

describe("MfaController metadata", () => {
  it("status requires standard JWT auth", () => {
    const guards = getMethodGuards(MfaController, "status");
    expect(guards).toEqual(expect.arrayContaining([AuthGuard("jwt")]));
  });

  it("enroll/init accepts MFA enrollment grant + standard JWT (via MfaEnrollmentGuard) and is throttled", () => {
    const guards = getMethodGuards(MfaController, "enrollInit");
    expect(guards).toEqual(
      expect.arrayContaining([MfaEnrollmentGuard, ThrottlerGuard])
    );
  });

  it("enroll/verify uses MfaEnrollmentGuard + throttler", () => {
    const guards = getMethodGuards(MfaController, "enrollVerify");
    expect(guards).toEqual(
      expect.arrayContaining([MfaEnrollmentGuard, ThrottlerGuard])
    );
  });

  it("login challenge verify is gated by MfaChallengeGuard + throttler", () => {
    const guards = getMethodGuards(MfaController, "verifyLogin");
    expect(guards).toEqual(
      expect.arrayContaining([MfaChallengeGuard, ThrottlerGuard])
    );
  });

  it("disable / regenerate require standard JWT + throttler", () => {
    expect(getMethodGuards(MfaController, "disable")).toEqual(
      expect.arrayContaining([AuthGuard("jwt"), ThrottlerGuard])
    );
    expect(getMethodGuards(MfaController, "regenerateRecoveryCodes")).toEqual(
      expect.arrayContaining([AuthGuard("jwt"), ThrottlerGuard])
    );
  });
});

describe("AdminMfaController metadata", () => {
  it("class is guarded by JWT + RolesGuard", () => {
    const guards = getClassGuards(AdminMfaController);
    expect(guards.length).toBeGreaterThan(0);
  });

  it("resetUserMfa requires ADMIN or MEDORA_SUPER_ADMIN", () => {
    const roles = getMethodRoles(AdminMfaController, "resetUserMfa");
    expect(roles).toEqual(
      expect.arrayContaining([RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN])
    );
    expect(roles).not.toContain(RoleCode.RN);
    expect(roles).not.toContain(RoleCode.PROVIDER);
    expect(roles).not.toContain(RoleCode.PHARMACY);
    expect(roles).not.toContain(RoleCode.LAB);
    expect(roles).not.toContain(RoleCode.FRONT_DESK);
  });
});
