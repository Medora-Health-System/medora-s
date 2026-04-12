import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { MsppRoleCode, RoleCode } from "@prisma/client";

/** Optional MSPP national roles that may satisfy access when facility `UserRole` is not clinical. */
export const MSPP_ROLES_KEY = "msppRoles";

export const RequireRoles = (...roles: RoleCode[]) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata("roles", roles, descriptor.value);
      Reflect.defineMetadata(MSPP_ROLES_KEY, [] as MsppRoleCode[], descriptor.value);
    } else {
      Reflect.defineMetadata("roles", roles, target);
      Reflect.defineMetadata(MSPP_ROLES_KEY, [] as MsppRoleCode[], target);
    }
  };
};

/**
 * Facility-scoped access: user must have an active `UserRole` at the facility.
 * Authorization if either:
 * - `UserRole.role` is one of `clinical` (Medora clinical / desk roles), or
 * - `UserRole` exists at facility and user has an active MSPP assignment whose role is in `mspp`.
 */
export const RequireClinicalOrMspp = (clinical: RoleCode[], mspp: MsppRoleCode[]) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata("roles", clinical, descriptor.value);
      Reflect.defineMetadata(MSPP_ROLES_KEY, mspp, descriptor.value);
    } else {
      Reflect.defineMetadata("roles", clinical, target);
      Reflect.defineMetadata(MSPP_ROLES_KEY, mspp, target);
    }
  };
};

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
    const facilityId = request.user?.facilityId || request.headers["x-facility-id"];

    if (!userId) {
      throw new ForbiddenException("Authentication required");
    }

    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
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

    if (requiredRoles.includes(membership.role.code)) {
      request.userRole = membership.role.code;
      request.facilityId = facilityId;
      request.user = request.user || {};
      request.user.facilityId = facilityId;
      return true;
    }

    if (msppAllowed.length === 0) {
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(", ")}`);
    }

    const msppRows = await this.prisma.msppUserRoleAssignment.findMany({
      where: { userId, isActive: true },
      select: { role: true },
    });
    const ok = msppRows.some((row) => msppAllowed.includes(row.role));
    if (!ok) {
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(", ")}`);
    }

    request.userRole = membership.role.code;
    request.facilityId = facilityId;
    request.user = request.user || {};
    request.user.facilityId = facilityId;

    return true;
  }
}

