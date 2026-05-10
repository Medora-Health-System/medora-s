import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode, ChartRoiRequestStatus } from "@prisma/client";
import type { Response } from "express";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { ChartRoiService } from "./chart-roi.service";
import {
  cancelChartRoiRequestDtoSchema,
  createChartRoiRequestDtoSchema,
  denyChartRoiRequestDtoSchema,
} from "./chart-roi.dto";

/**
 * Phase 5G — Release of Information (ROI) workflow.
 *
 * **RBAC:** facility `ADMIN` only. Does not grant PROVIDER/RN/LAB/RAD/BILLING access to ROI.
 * Chart export snapshot creation remains on `EncounterChartExportService` (PROVIDER+ADMIN);
 * ROI fulfillment may call that service to create a snapshot when explicitly requested.
 *
 * **Audit:** every state transition logs a dedicated `ROI_*` action with PHI-safe metadata
 * (ids, enums, status — never purpose text, names, MRN, or clinical narratives in metadata).
 */
@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class ChartRoiController {
  constructor(private readonly chartRoiService: ChartRoiService) {}

  @Post("roi-requests")
  @RequireRoles(RoleCode.ADMIN)
  async create(@Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Facility ID required");
    const parsed = createChartRoiRequestDtoSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.chartRoiService.create(facilityId, parsed.data, req.user?.userId, req.ip, req.headers["user-agent"]);
  }

  @Get("roi-requests")
  @RequireRoles(RoleCode.ADMIN)
  async list(@Query("status") statusRaw: string | undefined, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Facility ID required");
    let status: ChartRoiRequestStatus | undefined;
    if (statusRaw && String(statusRaw).trim()) {
      const s = String(statusRaw).trim().toUpperCase();
      const allowed = new Set<string>(Object.values(ChartRoiRequestStatus));
      if (!allowed.has(s)) {
        throw new BadRequestException("Invalid status filter");
      }
      status = s as ChartRoiRequestStatus;
    }
    return this.chartRoiService.list(facilityId, status);
  }

  @Get("roi-requests/:id")
  @RequireRoles(RoleCode.ADMIN)
  async getOne(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Facility ID required");
    return this.chartRoiService.getOne(facilityId, id);
  }

  @Patch("roi-requests/:id/approve")
  @RequireRoles(RoleCode.ADMIN)
  async approve(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Facility ID required");
    return this.chartRoiService.approve(facilityId, id, req.user?.userId, req.ip, req.headers["user-agent"]);
  }

  @Patch("roi-requests/:id/deny")
  @RequireRoles(RoleCode.ADMIN)
  async deny(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Facility ID required");
    const parsed = denyChartRoiRequestDtoSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.chartRoiService.deny(
      facilityId,
      id,
      req.user?.userId,
      parsed.data.denialReason,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Patch("roi-requests/:id/cancel")
  @RequireRoles(RoleCode.ADMIN)
  async cancel(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Facility ID required");
    const parsed = cancelChartRoiRequestDtoSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.chartRoiService.cancel(
      facilityId,
      id,
      req.user?.userId,
      parsed.data.cancelledReason,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Patch("roi-requests/:id/fulfill")
  @RequireRoles(RoleCode.ADMIN)
  async fulfill(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Facility ID required");
    return this.chartRoiService.fulfill(facilityId, id, req.user?.userId, body, req.ip, req.headers["user-agent"]);
  }

  /**
   * Returns the immutable snapshot document for a fulfilled ROI request.
   * `?format=json|html` — default json. Audits `ROI_EXPORT_VIEW` (not `RECORD_EXPORT_VIEW`).
   */
  @Get("roi-requests/:id/snapshot-document")
  @RequireRoles(RoleCode.ADMIN)
  async getSnapshotDocument(
    @Param("id") id: string,
    @Query("format") formatRaw: string | undefined,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Facility ID required");
    const fmt = (formatRaw ?? "json").trim().toLowerCase();
    if (fmt !== "json" && fmt !== "html") {
      throw new BadRequestException('Invalid format. Use "json" (default) or "html".');
    }
    const format = fmt === "html" ? "html" : "json";
    const result = await this.chartRoiService.getFulfilledSnapshotDocument(
      facilityId,
      id,
      format,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
    if (format === "html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return result.html;
    }
    return {
      snapshot: result.row,
      manifest: result.manifest,
    };
  }
}
