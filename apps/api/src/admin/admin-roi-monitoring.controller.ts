import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuditAction } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { PLATFORM_OPERATOR_ROLES } from "../common/auth/platform-operator-roles";

/**
 * Phase 5G — platform-level ROI queue metrics (counts only, no patient identifiers in the response body).
 *
 * **RBAC:** `MEDORA_SUPER_ADMIN` only (see `PLATFORM_OPERATOR_ROLES`). Facility admins use
 * `/roi-requests` within their active facility instead.
 */
@Controller("admin")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AdminRoiMonitoringController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  @Get("roi-monitoring/summary")
  @RequireRoles(...PLATFORM_OPERATOR_ROLES)
  async summary(@Req() req: any) {
    const userId = req.user?.userId as string | undefined;
    const ip = req.ip as string | undefined;
    const userAgent = req.headers?.["user-agent"] as string | undefined;

    const [byStatus, byFacility] = await Promise.all([
      this.prisma.chartRoiRequest.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.chartRoiRequest.groupBy({
        by: ["facilityId", "status"],
        _count: { _all: true },
      }),
    ]);

    await this.audit.log(AuditAction.VIEW, "ROI_MONITORING_SUMMARY", {
      userId,
      entityId: "aggregate",
      ip,
      userAgent,
      metadata: {
        aggregate: true,
        rowCountByStatus: byStatus.length,
        rowCountByFacilityBucket: byFacility.length,
      },
    });

    return {
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      byFacility: byFacility.map((r) => ({
        facilityId: r.facilityId,
        status: r.status,
        count: r._count._all,
      })),
    };
  }
}
