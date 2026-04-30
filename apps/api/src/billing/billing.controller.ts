import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import type { Response } from "express";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { BillingService } from "./billing.service";

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

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
}
