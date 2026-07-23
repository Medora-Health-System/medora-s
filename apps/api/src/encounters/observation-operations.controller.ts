/**
 * D4A.2.7C — Observation operations HTTP surface.
 */

import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { ObservationOperationsService } from "./observation-operations.service";

function facilityIdFromReq(req: { user?: { facilityId?: string } }): string {
  const facilityId = req.user?.facilityId;
  if (!facilityId || typeof facilityId !== "string") {
    throw new BadRequestException("Facility ID required");
  }
  return facilityId;
}

function userIdFromReq(req: { user?: { userId?: string; id?: string } }): string {
  const userId = req.user?.userId || req.user?.id;
  if (!userId) throw new BadRequestException("User ID required");
  return userId;
}

@Controller("observation-operations")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class ObservationOperationsController {
  constructor(private readonly ops: ObservationOperationsService) {}

  @Get("encounters/:encounterId/workspace-bootstrap")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN, RoleCode.LAB, RoleCode.RADIOLOGY)
  async getWorkspaceBootstrap(
    @Param("encounterId") encounterId: string,
    @Query("role") role: string | undefined,
    @Req() req: any
  ) {
    const roleNorm = String(role ?? "CHART")
      .trim()
      .toUpperCase();
    const safeRole =
      roleNorm === "PROVIDER" ||
      roleNorm === "NURSING" ||
      roleNorm === "TECHNICIAN" ||
      roleNorm === "CHART"
        ? roleNorm
        : "CHART";
    return this.ops.getWorkspaceBootstrap(facilityIdFromReq(req), encounterId, userIdFromReq(req), {
      role: safeRole,
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }
}
