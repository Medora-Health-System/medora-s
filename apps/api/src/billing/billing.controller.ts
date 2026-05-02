import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import type { Response } from "express";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { BillingService } from "./billing.service";
import { ExternalBillingExportService } from "./external-billing-export.service";
import { queueMedoraAlert } from "../common/logging/medoraAlert";

function parseAllowOpen(raw: string | string[] | undefined): boolean {
  if (raw == null) return false;
  const v = Array.isArray(raw) ? raw[0] : raw;
  return String(v).trim().toLowerCase() === "true" || String(v).trim() === "1";
}

function externalExportAlertRoute(req: { method: string; originalUrl?: string; url?: string }): string | undefined {
  const raw = typeof req.originalUrl === "string" ? req.originalUrl : typeof req.url === "string" ? req.url : "";
  const pathOnly = raw.split("?")[0] || "";
  if (!pathOnly) return undefined;
  return `${req.method} ${pathOnly}`;
}

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly externalBillingExport: ExternalBillingExportService
  ) {}

  @Get("billing/encounters/:encounterId/readiness")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getEncounterBillingItemReadiness(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.billingService.getEncounterOrderItemReadiness(facilityId, encounterId);
  }

  @Get("billing/encounters/:encounterId/autobill-decisions")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getEncounterAutoBillDecisions(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.billingService.getEncounterAutoBillDecisions(facilityId, encounterId);
  }

  @Get("billing/manual-review")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getManualBillingReviewQueue(@Req() req: any) {
    const facilityId = req.facilityId;
    return this.billingService.getManualBillingReviewQueue(facilityId);
  }

  @Get("billing/encounters/:encounterId/manual-review-gate")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getEncounterManualReviewGate(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.billingService.getEncounterManualReviewGate(facilityId, encounterId);
  }

  @Get("billing/encounters/:encounterId/review-decisions")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getEncounterBillingReviewDecisions(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.billingService.getEncounterBillingReviewDecisions(facilityId, encounterId);
  }

  @Post("billing/manual-review/:orderItemId/decision")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN)
  async upsertManualBillingReviewDecision(
    @Param("orderItemId") orderItemId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    const payload =
      body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
    return this.billingService.upsertManualBillingReviewDecision(facilityId, orderItemId, payload, req.user?.userId);
  }

  @Get("billing/encounters/:encounterId/export")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async exportEncounterBillingItems(
    @Param("encounterId") encounterId: string,
    @Query("format") formatRaw: string | undefined,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const format = formatRaw?.trim().toLowerCase() || "json";
    if (format !== "json" && format !== "csv") {
      throw new BadRequestException("format must be json or csv");
    }

    const facilityId = req.facilityId;
    const rows = await this.billingService.getEncounterBillingExportRows(facilityId, encounterId);
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="billing-export-${encounterId}.csv"`);
      return this.billingService.toBillingExportCsv(rows);
    }

    return rows;
  }

  @Get("billing/external/encounters/:encounterId/export")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async exportExternalBillingEncounter(
    @Param("encounterId") encounterId: string,
    @Query("format") formatRaw: string | undefined,
    @Query("allowOpen") allowOpenRaw: string | undefined,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      const format = formatRaw?.trim().toLowerCase() || "json";
      if (format !== "json" && format !== "csv") {
        throw new BadRequestException("format must be json or csv");
      }
      const facilityId = req.facilityId;
      const userId = req.user?.userId;
      const userCtx = await this.externalBillingExport.resolveExportUserContext(userId, String(req.userRole ?? ""));
      const allowOpen = parseAllowOpen(allowOpenRaw);

      if (format === "csv") {
        const { csv, filename } = await this.externalBillingExport.exportEncounterCsv({
          facilityId,
          encounterId,
          allowOpen,
          userCtx,
          ip: req.ip,
          userAgent: req.headers["user-agent"] as string | undefined,
        });
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return csv;
      }

      return this.externalBillingExport.exportEncounterJson({
        facilityId,
        encounterId,
        allowOpen,
        userCtx,
        ip: req.ip,
        userAgent: req.headers["user-agent"] as string | undefined,
      });
    } catch (err: unknown) {
      if (!(err instanceof HttpException)) {
        queueMedoraAlert({
          event: "external_billing_export_failed",
          severity: "critical",
          requestId: typeof req.requestId === "string" ? req.requestId : undefined,
          facilityId: typeof req.facilityId === "string" ? req.facilityId : undefined,
          userId: typeof req.user?.userId === "string" ? req.user.userId : undefined,
          encounterId,
          route: externalExportAlertRoute(req),
        });
      }
      throw err;
    }
  }

  @Get("billing/external/daily-export")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async exportExternalBillingDaily(
    @Query("date") date: string,
    @Query("format") formatRaw: string | undefined,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      if (!date?.trim()) {
        throw new BadRequestException("date is required (YYYY-MM-DD)");
      }
      const format = formatRaw?.trim().toLowerCase() || "json";
      if (format !== "json" && format !== "csv") {
        throw new BadRequestException("format must be json or csv");
      }
      const facilityId = req.facilityId;
      const userId = req.user?.userId;
      const userCtx = await this.externalBillingExport.resolveExportUserContext(userId, String(req.userRole ?? ""));

      if (format === "csv") {
        const { csv, filename } = await this.externalBillingExport.exportDailyCsv({
          facilityId,
          date: date.trim(),
          userCtx,
          ip: req.ip,
          userAgent: req.headers["user-agent"] as string | undefined,
        });
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return csv;
      }

      return this.externalBillingExport.exportDailyJson({
        facilityId,
        date: date.trim(),
        userCtx,
        ip: req.ip,
        userAgent: req.headers["user-agent"] as string | undefined,
      });
    } catch (err: unknown) {
      if (!(err instanceof HttpException)) {
        queueMedoraAlert({
          event: "external_billing_export_failed",
          severity: "critical",
          requestId: typeof req.requestId === "string" ? req.requestId : undefined,
          facilityId: typeof req.facilityId === "string" ? req.facilityId : undefined,
          userId: typeof req.user?.userId === "string" ? req.user.userId : undefined,
          route: externalExportAlertRoute(req),
        });
      }
      throw err;
    }
  }
}
