/**
 * D4A.2.7A — Operational Governance + Inpatient Operations reporting APIs.
 * Facility always from JWT. Read-only administration surfaces (except chart-access append).
 * ED and Inpatient remain separate — this controller never exposes ED trackboard logic.
 */

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import type { ChartAccessKind } from "@medora/shared";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { OperationalGovernanceService } from "./operational-governance.service";

function facilityIdFromReq(req: { user?: { facilityId?: string } }): string {
  return String(req.user?.facilityId ?? "").trim();
}

function actorUserIdFromReq(req: { user?: { userId?: string; sub?: string } }): string {
  return String(req.user?.userId ?? req.user?.sub ?? "").trim();
}

@Controller("hospital-care/operational-governance")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class OperationalGovernanceController {
  constructor(private readonly governance: OperationalGovernanceService) {}

  @Get("platform-manifest")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  platformManifest() {
    return this.governance.getPlatformManifest();
  }

  /** Inpatient Operational Dashboard — excludes ED-specific logic. */
  @Get("inpatient-dashboard")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  inpatientDashboard(
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.governance.getInpatientOperationalDashboard(
      facilityIdFromReq(req),
      actorUserIdFromReq(req)
    );
  }

  @Get("dashboards/:kind")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  dashboardByKind(
    @Param("kind") kind: string,
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.governance.getDashboardByKind(
      facilityIdFromReq(req),
      actorUserIdFromReq(req),
      kind
    );
  }

  @Get("medication-compliance")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  medicationCompliance(@Req() req: { user?: { facilityId?: string } }) {
    return this.governance.getMedicationCompliance(facilityIdFromReq(req));
  }

  @Get("documentation-compliance")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  documentationCompliance(@Req() req: { user?: { facilityId?: string } }) {
    return this.governance.getDocumentationCompliance(facilityIdFromReq(req));
  }

  @Get("staff-analytics")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  staffAnalytics(
    @Query("role") role: string | undefined,
    @Req() req: { user?: { facilityId?: string } }
  ) {
    return this.governance.getStaffAnalytics(facilityIdFromReq(req), role);
  }

  @Get("chart-access")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  listChartAccess(
    @Query("encounterId") encounterId: string | undefined,
    @Query("patientId") patientId: string | undefined,
    @Query("userId") userId: string | undefined,
    @Query("limit") limit: string | undefined,
    @Req() req: { user?: { facilityId?: string } }
  ) {
    return this.governance.listChartAccess(facilityIdFromReq(req), {
      encounterId,
      patientId,
      userId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post("chart-access")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  recordChartAccess(
    @Body()
    body: {
      encounterId: string;
      patientId?: string | null;
      accessKind: ChartAccessKind;
      reason?: string | null;
      workstation?: string | null;
      sessionId?: string | null;
      openTime?: string | null;
      closeTime?: string | null;
      durationMs?: number | null;
      department?: string | null;
      role?: string | null;
    },
    @Req()
    req: {
      user?: { facilityId?: string; userId?: string; sub?: string };
      ip?: string;
      headers?: { "user-agent"?: string };
    }
  ) {
    return this.governance.recordChartAccess(
      facilityIdFromReq(req),
      actorUserIdFromReq(req),
      {
        ...body,
        ip: req.ip ?? null,
        userAgent: req.headers?.["user-agent"] ?? null,
      }
    );
  }

  @Get("audit-center")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  auditCenter(
    @Query("facet") facet: string | undefined,
    @Query("encounterId") encounterId: string | undefined,
    @Query("patientId") patientId: string | undefined,
    @Query("userId") userId: string | undefined,
    @Query("q") q: string | undefined,
    @Query("limit") limit: string | undefined,
    @Req() req: { user?: { facilityId?: string } }
  ) {
    return this.governance.searchAuditCenter(facilityIdFromReq(req), {
      facet,
      encounterId,
      patientId,
      userId,
      q,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("role-timeline")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  roleTimeline(
    @Query("userId") userId: string | undefined,
    @Query("limit") limit: string | undefined,
    @Req() req: { user?: { facilityId?: string } }
  ) {
    return this.governance.getRoleActivityTimeline(
      facilityIdFromReq(req),
      userId,
      limit ? Number(limit) : undefined
    );
  }

  @Get("placement-readiness")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  placementReadiness(
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.governance.getPlacementReadiness(
      facilityIdFromReq(req),
      actorUserIdFromReq(req)
    );
  }
}
