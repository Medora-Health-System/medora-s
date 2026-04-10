import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { MsppRoleCode } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { MSPP_ROLES_KEY } from "../decorators/require-mspp-roles.decorator";

export type MsppRequestContext = {
  userId: string;
  msppAssignments: Array<{ role: MsppRoleCode; geoDepartmentId: string | null }>;
};

@Injectable()
export class MsppRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<MsppRoleCode[]>(MSPP_ROLES_KEY, context.getHandler());
    if (!requiredRoles || requiredRoles.length === 0) {
      throw new ForbiddenException("MSPP endpoint requires @RequireMsppRoles.");
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId as string | undefined;
    if (!userId) {
      throw new ForbiddenException("Authentication required");
    }

    const rows = await this.prisma.msppUserRoleAssignment.findMany({
      where: { userId, isActive: true },
      select: { role: true, geoDepartmentId: true },
    });

    const assignments = rows.map((r) => ({
      role: r.role,
      geoDepartmentId: r.geoDepartmentId,
    }));

    const allowed = assignments.some((a) => requiredRoles.includes(a.role));
    if (!allowed) {
      throw new ForbiddenException(`MSPP access denied. Required one of: ${requiredRoles.join(", ")}`);
    }

    request.msppContext = {
      userId,
      msppAssignments: assignments,
    } satisfies MsppRequestContext;

    return true;
  }
}
