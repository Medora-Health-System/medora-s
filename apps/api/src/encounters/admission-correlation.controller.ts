/**
 * D3E.8 / D3E.8A — Admission correlation journey, cancel, and legacy reconciliation.
 * Correlation writes also occur on placement/admission pathways.
 */

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { AdmissionCorrelationService } from "./admission-correlation.service";

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

@Controller("admission-correlation")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AdmissionCorrelationController {
  constructor(private readonly correlation: AdmissionCorrelationService) {}

  @Get("meta")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  meta() {
    return this.correlation.meta();
  }

  @Get("encounters/:encounterId/journey")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async journey(@Param("encounterId") encounterId: string, @Req() req: any) {
    return this.correlation.buildJourney(facilityIdFromReq(req), encounterId);
  }

  @Post("encounters/:encounterId/cancel")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async cancel(
    @Param("encounterId") encounterId: string,
    @Body() body: { expectedVersion?: number; reason?: string },
    @Req() req: any
  ) {
    if (body?.expectedVersion == null || !Number.isFinite(Number(body.expectedVersion))) {
      throw new BadRequestException("expectedVersion is required");
    }
    return this.correlation.cancelAdmissionIntent({
      facilityId: facilityIdFromReq(req),
      sourceEncounterId: encounterId,
      expectedVersion: Number(body.expectedVersion),
      actorUserId: userIdFromReq(req),
      reason: typeof body.reason === "string" ? body.reason : null,
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }

  @Post("encounters/:encounterId/mutate")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async mutate(
    @Param("encounterId") encounterId: string,
    @Body()
    body: {
      expectedVersion?: number;
      patch?: Record<string, unknown>;
      auditEvent?: string;
    },
    @Req() req: any
  ) {
    if (body?.expectedVersion == null || !Number.isFinite(Number(body.expectedVersion))) {
      throw new BadRequestException("expectedVersion is required");
    }
    const patch = body.patch ?? {};
    // Prohibit whole-object client replacement — only allow governed patch keys.
    const allowed = [
      "status",
      "internalPlacementRequestId",
      "receivingEncounterId",
      "hospitalEpisodeId",
      "destinationUnitId",
      "requestedAdmissionAt",
      "receivingStartedAt",
      "arrivedAt",
      "completedAt",
      "receivingUserId",
      "admissionSource",
    ] as const;
    const safePatch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in patch) safePatch[key] = patch[key];
    }
    return this.correlation.mutateCorrelationOnEncounter({
      facilityId: facilityIdFromReq(req),
      encounterId,
      expectedVersion: Number(body.expectedVersion),
      patch: safePatch as never,
      actorUserId: userIdFromReq(req),
      auditEvent:
        typeof body.auditEvent === "string" && body.auditEvent.trim()
          ? body.auditEvent.trim()
          : "ADMISSION_CORRELATION_MUTATED",
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }

  @Get("reconciliation/queue")
  @RequireRoles(RoleCode.ADMIN)
  async reconciliationQueue(@Req() req: any) {
    return this.correlation.listReconciliationQueue(facilityIdFromReq(req));
  }

  @Post("reconciliation/correct")
  @RequireRoles(RoleCode.ADMIN)
  async reconciliationCorrect(@Body() body: Record<string, unknown>, @Req() req: any) {
    const hostEncounterId = String(body.hostEncounterId ?? "").trim();
    if (!hostEncounterId) throw new BadRequestException("hostEncounterId is required");
    if (body.expectedVersion == null || !Number.isFinite(Number(body.expectedVersion))) {
      throw new BadRequestException("expectedVersion is required");
    }
    return this.correlation.applyLegacyCorrection({
      facilityId: facilityIdFromReq(req),
      actorUserId: userIdFromReq(req),
      reason: String(body.reason ?? ""),
      expectedVersion: Number(body.expectedVersion),
      hostEncounterId,
      patch: (body.patch ?? {}) as never,
      evidence: (body.evidence ?? {}) as never,
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }
}
