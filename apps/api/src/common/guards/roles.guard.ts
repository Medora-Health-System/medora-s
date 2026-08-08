import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { MsppRoleCode, RoleCode } from "@prisma/client";
import {
  resolvePlatformAuthority,
  resolvePlatformPrincipalAccess,
} from "../../auth/platform-principal";
import {
  BREAK_GLASS_PATIENT_PARAM_KEY,
  MSPP_ROLES_KEY,
  PLATFORM_PRINCIPAL_FACILITY_CONTEXT_KEY,
} from "./roles.decorators";

export {
  BREAK_GLASS_PATIENT_PARAM_KEY,
  AllowBreakGlassForPatientParam,
  AllowPlatformPrincipalWithFacilityContext,
  MSPP_ROLES_KEY,
  PLATFORM_PRINCIPAL_FACILITY_CONTEXT_KEY,
  RequireRoles,
  RequireClinicalOrMspp,
} from "./roles.decorators";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const requiredRoles =
      this.reflector.get<RoleCode[]>("roles", handler) || this.reflector.get<RoleCode[]>("roles", context.getClass());

    if (!requiredRoles || requiredRoles.length === 0) {
      throw new ForbiddenException("This endpoint requires configured roles.");
    }

    const msppAllowed =
      this.reflector.get<MsppRoleCode[]>(MSPP_ROLES_KEY, handler) ??
      this.reflector.get<MsppRoleCode[]>(MSPP_ROLES_KEY, context.getClass()) ??
      [];

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const rawFacilityId = request.user?.facilityId || request.headers["x-facility-id"];
    const facilityId =
      typeof rawFacilityId === "string"
        ? rawFacilityId
        : Array.isArray(rawFacilityId)
          ? rawFacilityId[0]
          : "";

    if (!userId) {
      throw new ForbiddenException("Authentication required");
    }

    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    /**
     * Un utilisateur peut avoir plusieurs `UserRole` pour le même établissement (ex. ADMIN + PROVIDER).
     * Charger tous les rôles acceptés évite qu'une ligne arbitraire masque une autorisation
     * établissement indépendante, puis permet une sélection déterministe ci-dessous.
     */
    const membershipsSatisfying = await this.prisma.userRole.findMany({
      where: {
        userId,
        facilityId,
        isActive: true,
        facility: { isActive: true },
        role: { code: { in: requiredRoles } },
      },
      include: {
        role: true,
      },
      orderBy: { role: { code: "asc" } },
    });

    if (membershipsSatisfying.length > 0) {
      // An accepted ordinary facility role is independent of global platform authority. Prefer it
      // deterministically so a stale/unauthorized MEDORA_SUPER_ADMIN row cannot mask valid ADMIN,
      // PROVIDER, RN, or other route-specific access.
      const membershipSatisfying =
        membershipsSatisfying.find(
          (membership) => membership.role.code !== RoleCode.MEDORA_SUPER_ADMIN
        ) ?? membershipsSatisfying[0]!;
      if (membershipSatisfying.role.code === RoleCode.MEDORA_SUPER_ADMIN) {
        if (!(await resolvePlatformAuthority(this.prisma, userId)).granted) {
          throw new ForbiddenException("Platform authority assignment is not active.");
        }
      }
      request.userRole = membershipSatisfying.role.code;
      request.facilityId = facilityId;
      request.user = request.user || {};
      request.user.facilityId = facilityId;
      request.platformPrincipal = membershipSatisfying.role.code === RoleCode.MEDORA_SUPER_ADMIN;
      request.platformFacilityMembership = true;
      request.breakGlassSessionId = undefined;
      return true;
    }

    /**
     * MEDUI.D4C.7K — authoritative Medora platform administration.
     *
     * Only routes that opt in (`AllowPlatformPrincipalWithFacilityContext`) *and* declare
     * `RoleCode.MEDORA_SUPER_ADMIN` may be reached without a facility `UserRole`, and only inside an
     * explicit, active facility context. Authentication and tenant isolation are unchanged: handlers
     * still resolve records scoped to `facilityId`.
     */
    const platformPrincipalRouteAllowed =
      (this.reflector.get<boolean>(PLATFORM_PRINCIPAL_FACILITY_CONTEXT_KEY, handler) ??
        this.reflector.get<boolean>(PLATFORM_PRINCIPAL_FACILITY_CONTEXT_KEY, context.getClass())) ===
      true;
    if (
      platformPrincipalRouteAllowed &&
      requiredRoles.includes(RoleCode.MEDORA_SUPER_ADMIN) &&
      (await this.tryPlatformPrincipal(request, facilityId, userId))
    ) {
      return true;
    }

    const membership = await this.prisma.userRole.findFirst({
      where: {
        userId,
        facilityId,
        isActive: true,
        facility: { isActive: true },
      },
      include: {
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException("Access denied for this facility.");
    }

    const breakGlassParam = this.reflector.get<string | undefined>(
      BREAK_GLASS_PATIENT_PARAM_KEY,
      handler
    );

    if (msppAllowed.length === 0) {
      if (breakGlassParam && (await this.tryBreakGlass(request, facilityId, userId, breakGlassParam))) {
        request.userRole = membership.role.code;
        request.facilityId = facilityId;
        request.user = request.user || {};
        request.user.facilityId = facilityId;
        return true;
      }
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(", ")}`);
    }

    const msppRows = await this.prisma.msppUserRoleAssignment.findMany({
      where: { userId, isActive: true },
      select: { role: true },
    });
    const ok = msppRows.some((row) => msppAllowed.includes(row.role));
    if (!ok) {
      if (breakGlassParam && (await this.tryBreakGlass(request, facilityId, userId, breakGlassParam))) {
        request.userRole = membership.role.code;
        request.facilityId = facilityId;
        request.user = request.user || {};
        request.user.facilityId = facilityId;
        return true;
      }
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(", ")}`);
    }

    request.userRole = membership.role.code;
    request.facilityId = facilityId;
    request.user = request.user || {};
    request.user.facilityId = facilityId;
    request.breakGlassSessionId = undefined;

    return true;
  }

  /**
   * Platform-principal access for lifecycle routes (close / reopen / lifecycle timeline).
   * Returns false when the caller is not the authoritative platform principal so the normal
   * facility denial applies.
   */
  private async tryPlatformPrincipal(
    request: {
      user?: Record<string, unknown>;
      userRole?: string;
      facilityId?: string;
      platformPrincipal?: boolean;
      platformFacilityMembership?: boolean;
      breakGlassSessionId?: string;
    },
    facilityId: string,
    userId: string
  ): Promise<boolean> {
    const decision = await resolvePlatformPrincipalAccess(this.prisma, {
      userId,
      facilityId,
    });
    if (!decision.granted) {
      return false;
    }

    const facility = await this.prisma.facility.findFirst({
      where: { id: facilityId, isActive: true },
      select: { id: true },
    });
    if (!facility) {
      throw new ForbiddenException("Access denied for this facility.");
    }

    request.userRole = RoleCode.MEDORA_SUPER_ADMIN;
    request.facilityId = facilityId;
    request.user = request.user || {};
    request.user.facilityId = facilityId;
    request.user.canCreateFacilities = true;
    request.platformPrincipal = true;
    request.platformFacilityMembership = false;
    request.breakGlassSessionId = undefined;
    return true;
  }

  private async tryBreakGlass(
    request: { params?: Record<string, string>; breakGlassSessionId?: string },
    facilityId: string,
    userId: string,
    paramName: string
  ): Promise<boolean> {
    const patientId = request.params?.[paramName];
    if (!patientId || typeof patientId !== "string") {
      return false;
    }
    const now = new Date();
    const row = await this.prisma.breakGlassSession.findFirst({
      where: {
        userId,
        facilityId,
        patientId,
        endedAt: null,
        startedAt: { lte: now },
        expiresAt: { gt: now },
      },
      orderBy: { startedAt: "desc" },
      select: { id: true },
    });
    if (!row) {
      return false;
    }
    request.breakGlassSessionId = row.id;
    return true;
  }
}
