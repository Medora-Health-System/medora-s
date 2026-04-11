import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { MsppRoleCode } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { MSPP_ROLES_KEY } from "../decorators/require-mspp-roles.decorator";

export type MsppAssignmentRow = {
  role: MsppRoleCode;
  geoDepartmentId: string | null;
  allGeoDepartments: boolean;
};

export type MsppRequestContext = {
  userId: string;
  msppAssignments: MsppAssignmentRow[];
  /**
   * Geo departments this user may act on as département validator (union of
   * `MSPP_VALIDATOR_DEPT` assignments with a specific `geoDepartmentId`).
   * Does not include national dept scope; see `deptValidatorAllGeoDepartments`.
   */
  allowedDepartments: string[];
  /**
   * True when the user has at least one `MSPP_VALIDATOR_DEPT` assignment with
   * `allGeoDepartments` (may validate any geographic department at dept level).
   */
  deptValidatorAllGeoDepartments: boolean;
};

/** Unique geo department IDs from MSPP département-validator rows scoped to one department. */
export function allowedDepartmentsFromAssignments(assignments: MsppAssignmentRow[]): string[] {
  const ids = assignments
    .filter(
      (a) =>
        a.role === MsppRoleCode.MSPP_VALIDATOR_DEPT &&
        !a.allGeoDepartments &&
        a.geoDepartmentId
    )
    .map((a) => a.geoDepartmentId as string);
  return [...new Set(ids)];
}

export function hasDeptValidatorAllGeoDepartments(assignments: MsppAssignmentRow[]): boolean {
  return assignments.some(
    (a) => a.role === MsppRoleCode.MSPP_VALIDATOR_DEPT && a.allGeoDepartments === true
  );
}

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
      select: { role: true, geoDepartmentId: true, allGeoDepartments: true },
    });

    const assignments: MsppAssignmentRow[] = rows.map((r) => ({
      role: r.role,
      geoDepartmentId: r.geoDepartmentId,
      allGeoDepartments: r.allGeoDepartments,
    }));

    const allowed = assignments.some((a) => requiredRoles.includes(a.role));
    if (!allowed) {
      throw new ForbiddenException(`MSPP access denied. Required one of: ${requiredRoles.join(", ")}`);
    }

    request.msppContext = {
      userId,
      msppAssignments: assignments,
      allowedDepartments: allowedDepartmentsFromAssignments(assignments),
      deptValidatorAllGeoDepartments: hasDeptValidatorAllGeoDepartments(assignments),
    } satisfies MsppRequestContext;

    return true;
  }
}
