import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  Param,
  Patch,
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
import { ChargeCaptureReviewService } from "../encounters/charge-capture-review.service";
import { CodingIntegrityReviewService } from "../encounters/coding-integrity-review.service";
import { ClaimAssemblyPreviewService } from "../encounters/claim-assembly-preview.service";
import { ProcedureRevenueReviewService } from "./procedure-revenue-review.service";
import {
  billingClassificationSchema,
  chargeReviewDomainSchema,
  chargeReviewStatusSchema,
  claimAssemblyPackageTypeSchema,
  claimAssemblyPreviewStatusSchema,
  codingIntegrityDomainSchema,
  codingIntegrityStatusSchema,
} from "@medora/shared";
import { queueMedoraAlert } from "../common/logging/medoraAlert";
import { patchInfusionBillingReviewBodySchema } from "./dto/infusion-billing-review.dto";

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
    private readonly externalBillingExport: ExternalBillingExportService,
    private readonly chargeCaptureReviewService: ChargeCaptureReviewService,
    private readonly codingIntegrityReviewService: CodingIntegrityReviewService,
    private readonly claimAssemblyPreviewService: ClaimAssemblyPreviewService,
    private readonly procedureRevenueReviewService: ProcedureRevenueReviewService,
  ) {}

  /** MEDPROC.7 — enterprise procedure revenue review queue (preview only). */
  @Get("billing/procedure-review")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN)
  async getProcedureRevenueReviewQueue(
    @Req() req: any,
    @Query("reviewStatus") reviewStatus?: string,
    @Query("mappingStatus") mappingStatus?: string,
    @Query("documentationMissing") documentationMissingRaw?: string,
    @Query("billingSideReview") billingSideReview?: string,
    @Query("enterpriseProcedureId") enterpriseProcedureId?: string,
    @Query("dateFrom") dateFromRaw?: string,
    @Query("dateTo") dateToRaw?: string,
    @Query("limit") limitRaw?: string
  ) {
    const facilityId = req.facilityId;
    const documentationMissing =
      documentationMissingRaw?.trim().toLowerCase() === "true"
        ? true
        : documentationMissingRaw?.trim().toLowerCase() === "false"
          ? false
          : undefined;
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    return this.procedureRevenueReviewService.getQueue({
      facilityId,
      reviewStatus: reviewStatus?.trim() as never,
      mappingStatus: mappingStatus?.trim() || undefined,
      documentationMissing,
      billingSideReview: billingSideReview?.trim() as never,
      enterpriseProcedureId: enterpriseProcedureId?.trim() || undefined,
      dateFrom: dateFromRaw?.trim() ? new Date(dateFromRaw.trim()) : undefined,
      dateTo: dateToRaw?.trim() ? new Date(dateToRaw.trim()) : undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
  }

  @Post("billing/procedure-review/:billingEventId/decision")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN)
  async postProcedureRevenueReviewDecision(
    @Param("billingEventId") billingEventId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    const userId = req.user?.userId;
    return this.procedureRevenueReviewService.recordDecision(
      facilityId,
      billingEventId,
      body != null && typeof body === "object" ? (body as Record<string, unknown>) : {},
      userId
    );
  }

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

  /** Phase 19UCED.6 — read-only charge capture / revenue review queue (no claim submission). */
  @Get("billing/charge-review")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getChargeReviewQueue(
    @Req() req: any,
    @Query("status") statusRaw?: string,
    @Query("domain") domainRaw?: string,
    @Query("billingClassification") billingClassificationRaw?: string,
    @Query("dateFrom") dateFromRaw?: string,
    @Query("dateTo") dateToRaw?: string,
    @Query("encounterOpen") encounterOpenRaw?: string,
    @Query("manualReviewOnly") manualReviewOnlyRaw?: string,
    @Query("limit") limitRaw?: string,
  ) {
    const facilityId = req.facilityId;
    const statusParsed = statusRaw?.trim()
      ? chargeReviewStatusSchema.safeParse(statusRaw.trim())
      : null;
    if (statusParsed && !statusParsed.success) {
      throw new BadRequestException("Invalid status filter");
    }
    const domainParsed = domainRaw?.trim()
      ? chargeReviewDomainSchema.safeParse(domainRaw.trim())
      : null;
    if (domainParsed && !domainParsed.success) {
      throw new BadRequestException("Invalid domain filter");
    }
    const classificationParsed = billingClassificationRaw?.trim()
      ? billingClassificationSchema.safeParse(billingClassificationRaw.trim())
      : null;
    if (classificationParsed && !classificationParsed.success) {
      throw new BadRequestException("Invalid billingClassification filter");
    }
    const encounterOpen =
      encounterOpenRaw?.trim().toLowerCase() === "true"
        ? true
        : encounterOpenRaw?.trim().toLowerCase() === "false"
          ? false
          : undefined;
    const manualReviewOnly =
      manualReviewOnlyRaw?.trim().toLowerCase() === "true" ||
      manualReviewOnlyRaw?.trim() === "1";
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

    return this.chargeCaptureReviewService.getQueue({
      facilityId,
      status: statusParsed?.success ? statusParsed.data : undefined,
      domain: domainParsed?.success ? domainParsed.data : undefined,
      billingClassification: classificationParsed?.success ? classificationParsed.data : undefined,
      dateFrom: dateFromRaw?.trim() ? new Date(dateFromRaw.trim()) : undefined,
      dateTo: dateToRaw?.trim() ? new Date(dateToRaw.trim()) : undefined,
      encounterOpen,
      manualReviewOnly: manualReviewOnly || undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
  }

  /** Phase 19UCED.7 — read-only coding integrity / documentation review queue. */
  @Get("coding/review-queue")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getCodingReviewQueue(
    @Req() req: any,
    @Query("status") statusRaw?: string,
    @Query("domain") domainRaw?: string,
    @Query("billingClassification") billingClassificationRaw?: string,
    @Query("dateFrom") dateFromRaw?: string,
    @Query("dateTo") dateToRaw?: string,
    @Query("observationOnly") observationOnlyRaw?: string,
    @Query("providerClarificationOnly") providerClarificationOnlyRaw?: string,
    @Query("complianceOnly") complianceOnlyRaw?: string,
    @Query("limit") limitRaw?: string,
  ) {
    const facilityId = req.facilityId;
    const statusParsed = statusRaw?.trim()
      ? codingIntegrityStatusSchema.safeParse(statusRaw.trim())
      : null;
    if (statusParsed && !statusParsed.success) {
      throw new BadRequestException("Invalid status filter");
    }
    const domainParsed = domainRaw?.trim()
      ? codingIntegrityDomainSchema.safeParse(domainRaw.trim())
      : null;
    if (domainParsed && !domainParsed.success) {
      throw new BadRequestException("Invalid domain filter");
    }
    const classificationParsed = billingClassificationRaw?.trim()
      ? billingClassificationSchema.safeParse(billingClassificationRaw.trim())
      : null;
    if (classificationParsed && !classificationParsed.success) {
      throw new BadRequestException("Invalid billingClassification filter");
    }
    const observationOnly =
      observationOnlyRaw?.trim().toLowerCase() === "true" || observationOnlyRaw?.trim() === "1";
    const providerClarificationOnly =
      providerClarificationOnlyRaw?.trim().toLowerCase() === "true" ||
      providerClarificationOnlyRaw?.trim() === "1";
    const complianceOnly =
      complianceOnlyRaw?.trim().toLowerCase() === "true" || complianceOnlyRaw?.trim() === "1";
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

    return this.codingIntegrityReviewService.getQueue({
      facilityId,
      status: statusParsed?.success ? statusParsed.data : undefined,
      domain: domainParsed?.success ? domainParsed.data : undefined,
      billingClassification: classificationParsed?.success ? classificationParsed.data : undefined,
      dateFrom: dateFromRaw?.trim() ? new Date(dateFromRaw.trim()) : undefined,
      dateTo: dateToRaw?.trim() ? new Date(dateToRaw.trim()) : undefined,
      observationOnly: observationOnly || undefined,
      providerClarificationOnly: providerClarificationOnly || undefined,
      complianceOnly: complianceOnly || undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
  }

  /** Phase 19UCED.8 — read-only claim assembly / export orchestration preview queue. */
  @Get("billing/claim-assembly-preview")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getClaimAssemblyPreviewQueue(
    @Req() req: any,
    @Query("status") statusRaw?: string,
    @Query("packageType") packageTypeRaw?: string,
    @Query("billingClassification") billingClassificationRaw?: string,
    @Query("dateFrom") dateFromRaw?: string,
    @Query("dateTo") dateToRaw?: string,
    @Query("manualReviewOnly") manualReviewOnlyRaw?: string,
    @Query("professionalOnly") professionalOnlyRaw?: string,
    @Query("facilityOnly") facilityOnlyRaw?: string,
    @Query("limit") limitRaw?: string,
  ) {
    const facilityId = req.facilityId;
    const statusParsed = statusRaw?.trim()
      ? claimAssemblyPreviewStatusSchema.safeParse(statusRaw.trim())
      : null;
    if (statusParsed && !statusParsed.success) {
      throw new BadRequestException("Invalid status filter");
    }
    const packageTypeParsed = packageTypeRaw?.trim()
      ? claimAssemblyPackageTypeSchema.safeParse(packageTypeRaw.trim())
      : null;
    if (packageTypeParsed && !packageTypeParsed.success) {
      throw new BadRequestException("Invalid packageType filter");
    }
    const classificationParsed = billingClassificationRaw?.trim()
      ? billingClassificationSchema.safeParse(billingClassificationRaw.trim())
      : null;
    if (classificationParsed && !classificationParsed.success) {
      throw new BadRequestException("Invalid billingClassification filter");
    }
    const manualReviewOnly =
      manualReviewOnlyRaw?.trim().toLowerCase() === "true" ||
      manualReviewOnlyRaw?.trim() === "1";
    const professionalOnly =
      professionalOnlyRaw?.trim().toLowerCase() === "true" ||
      professionalOnlyRaw?.trim() === "1";
    const facilityOnly =
      facilityOnlyRaw?.trim().toLowerCase() === "true" ||
      facilityOnlyRaw?.trim() === "1";
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

    return this.claimAssemblyPreviewService.getQueue({
      facilityId,
      status: statusParsed?.success ? statusParsed.data : undefined,
      packageType: packageTypeParsed?.success ? packageTypeParsed.data : undefined,
      billingClassification: classificationParsed?.success ? classificationParsed.data : undefined,
      dateFrom: dateFromRaw?.trim() ? new Date(dateFromRaw.trim()) : undefined,
      dateTo: dateToRaw?.trim() ? new Date(dateToRaw.trim()) : undefined,
      manualReviewOnly: manualReviewOnly || undefined,
      professionalOnly: professionalOnly || undefined,
      facilityOnly: facilityOnly || undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
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

  /** Phase 7 — infusion billing suggestion review (capture JSON + audit); no claim submission. */
  @Patch("billing/encounters/:encounterId/infusion-review/:captureItemId")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN)
  async patchEncounterInfusionBillingReview(
    @Param("encounterId") encounterId: string,
    @Param("captureItemId") captureItemId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    const userId = req.user?.userId;
    if (!userId) throw new ForbiddenException("Authentication required");
    const parsed = patchInfusionBillingReviewBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    const ip = typeof req.ip === "string" && req.ip ? req.ip : undefined;
    const uaRaw = req.headers["user-agent"];
    const userAgent = typeof uaRaw === "string" ? uaRaw : undefined;
    return this.billingService.patchEncounterInfusionBillingReview(
      facilityId,
      encounterId,
      captureItemId,
      parsed.data,
      userId,
      ip,
      userAgent
    );
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
