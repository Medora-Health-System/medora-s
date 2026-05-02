import { BadRequestException, Controller, Get, Query, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuditAction, RoleCode } from "@prisma/client";
import type { Response } from "express";
import type { Request } from "express";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { AuditService } from "../common/services/audit.service";
import { edReportsQuerySchema } from "./dto/ed-reports-query.dto";
import type { EdReportsQueryDto } from "./dto/ed-reports-query.dto";
import { assertEdReportDateRange } from "./ed-report-range.util";
import { parseReportTimeBoundary } from "./ed-reports-time.util";
import { ReportsService } from "./reports.service";

type AuthedRequest = Request & {
  user?: { userId: string; facilityId?: string };
};

function facilityIdFromReq(req: AuthedRequest): string {
  const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
  const fid = typeof facilityId === "string" ? facilityId : Array.isArray(facilityId) ? facilityId[0] : "";
  if (!fid) throw new BadRequestException("Établissement requis");
  return fid;
}

function flattenQuery(q: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null) continue;
    const s = Array.isArray(v) ? String(v[0] ?? "") : String(v);
    if (s.trim() === "") continue;
    out[k] = s;
  }
  return out;
}

function assertCsvDateRange(query: EdReportsQueryDto): void {
  const from = parseReportTimeBoundary(query.from, false);
  const to = parseReportTimeBoundary(query.to, true);
  assertEdReportDateRange(from, to);
}

/**
 * ED operational reports — JSON (default) or streaming CSV (`format=csv`).
 */
@Controller("reports/ed")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly audit: AuditService
  ) {}

  private async logCsvExport(
    req: AuthedRequest,
    facilityId: string,
    reportType: string,
    query: EdReportsQueryDto,
    rowCount: number
  ): Promise<void> {
    try {
      await this.audit.log(AuditAction.VIEW, "ED_REPORT_EXPORT", {
        userId: req.user?.userId,
        facilityId,
        ip: req.ip,
        userAgent: typeof req.get === "function" ? req.get("user-agent") : undefined,
        metadata: {
          reportType,
          from: query.from,
          to: query.to,
          rowCount,
          format: "csv",
        },
      });
    } catch {
      // VIEW audit is best-effort; response body may already be committed.
    }
  }

  @Get("door-to-ekg")
  @RequireRoles(RoleCode.ADMIN)
  async doorToEkg(
    @Req() req: AuthedRequest,
    @Query() query: Record<string, string | string[] | undefined>,
    @Res({ passthrough: true }) res: Response
  ) {
    const parsed = edReportsQuerySchema.safeParse(flattenQuery(query));
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", { cause: parsed.error });
    }
    const facilityId = facilityIdFromReq(req);
    if (parsed.data.format === "csv") {
      assertCsvDateRange(parsed.data);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="door-to-ekg.csv"`);
      const rowCount = await this.reports.streamDoorToEkgCsv(facilityId, parsed.data, res);
      await this.logCsvExport(req, facilityId, "door-to-ekg", parsed.data, rowCount);
      return;
    }
    return this.reports.doorToEkgJson(facilityId, parsed.data);
  }

  @Get("door-to-provider")
  @RequireRoles(RoleCode.ADMIN)
  async doorToProvider(
    @Req() req: AuthedRequest,
    @Query() query: Record<string, string | string[] | undefined>,
    @Res({ passthrough: true }) res: Response
  ) {
    const parsed = edReportsQuerySchema.safeParse(flattenQuery(query));
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", { cause: parsed.error });
    }
    const facilityId = facilityIdFromReq(req);
    if (parsed.data.format === "csv") {
      assertCsvDateRange(parsed.data);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="door-to-provider.csv"`);
      const rowCount = await this.reports.streamDoorToProviderCsv(facilityId, parsed.data, res);
      await this.logCsvExport(req, facilityId, "door-to-provider", parsed.data, rowCount);
      return;
    }
    return this.reports.doorToProviderJson(facilityId, parsed.data);
  }

  @Get("door-to-door")
  @RequireRoles(RoleCode.ADMIN)
  async doorToDoor(
    @Req() req: AuthedRequest,
    @Query() query: Record<string, string | string[] | undefined>,
    @Res({ passthrough: true }) res: Response
  ) {
    const parsed = edReportsQuerySchema.safeParse(flattenQuery(query));
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", { cause: parsed.error });
    }
    const facilityId = facilityIdFromReq(req);
    if (parsed.data.format === "csv") {
      assertCsvDateRange(parsed.data);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="door-to-door.csv"`);
      const rowCount = await this.reports.streamDoorToDoorCsv(facilityId, parsed.data, res);
      await this.logCsvExport(req, facilityId, "door-to-door", parsed.data, rowCount);
      return;
    }
    return this.reports.doorToDoorJson(facilityId, parsed.data);
  }

  @Get("medication-administration")
  @RequireRoles(RoleCode.ADMIN)
  async medicationAdministration(
    @Req() req: AuthedRequest,
    @Query() query: Record<string, string | string[] | undefined>,
    @Res({ passthrough: true }) res: Response
  ) {
    const parsed = edReportsQuerySchema.safeParse(flattenQuery(query));
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", { cause: parsed.error });
    }
    const facilityId = facilityIdFromReq(req);
    if (parsed.data.format === "csv") {
      assertCsvDateRange(parsed.data);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="medication-administration.csv"`);
      const rowCount = await this.reports.streamMedicationAdministrationCsv(facilityId, parsed.data, res);
      await this.logCsvExport(req, facilityId, "medication-administration", parsed.data, rowCount);
      return;
    }
    return this.reports.medicationAdministrationJson(facilityId, parsed.data);
  }
}
