import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { MsppRoleCode, RoleCode } from "@prisma/client";
import {
  BREAK_GLASS_PATIENT_PARAM_KEY,
  MSPP_ROLES_KEY,
} from "./roles.decorators";

export {
  BREAK_GLASS_PATIENT_PARAM_KEY,
  AllowBreakGlassForPatientParam,
  MSPP_ROLES_KEY,
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
     * `findFirst` sans filtre sur le rôle peut renvoyer une ligne arbitraire et refuser à tort l’accès ADMIN.
     * On vérifie d’abord s’il existe une ligne dont le rôle est dans `requiredRoles`.
     */
    const membershipSatisfying = await this.prisma.userRole.findFirst({
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
    });

    if (membershipSatisfying) {
      request.userRole = membershipSatisfying.role.code;
      request.facilityId = facilityId;
      request.user = request.user || {};
      request.user.facilityId = facilityId;
      request.breakGlassSessionId = undefined;
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
