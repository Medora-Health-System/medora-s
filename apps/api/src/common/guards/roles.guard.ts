import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { RoleCode } from "@prisma/client";

export const RequireRoles = (...roles: RoleCode[]) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata("roles", roles, descriptor.value);
    } else {
      Reflect.defineMetadata("roles", roles, target);
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
    const requiredRoles = this.reflector.get<RoleCode[]>("roles", context.getHandler()) ||
      this.reflector.get<RoleCode[]>("roles", context.getClass());

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No role requirement
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const facilityId = request.user?.facilityId || request.headers["x-facility-id"];

    if (!userId) {
      throw new ForbiddenException("Authentication required");
    }

    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    // Load user roles for this facility
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        facilityId,
        isActive: true,
        role: {
          code: { in: requiredRoles }
        }
      },
      include: {
        role: true
      }
    });

    if (!userRole) {
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(", ")}`);
    }

    // Attach user role info to request for use in controllers
    request.userRole = userRole.role.code;
    request.facilityId = facilityId;
    request.user = request.user || {};
    request.user.facilityId = facilityId;

    return true;
  }
}

