import { BadRequestException, Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
/** Role label for export audit context (JWT guard already enforced ADMIN). */
const ADMIN_ROLE_LABEL = "ADMIN";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { ExternalBillingAutomationService } from "../billing/external-billing-automation.service";
import { ExternalBillingExportService } from "../billing/external-billing-export.service";
import { AdminExportMonitoringService } from "./admin-export-monitoring.service";
import { exportMonitoringQuerySchema } from "./dto/export-monitoring-query.dto";
import { exportMonitoringRetryBodySchema } from "./dto/export-monitoring-retry.dto";

type AuthedReq = {
  user?: { userId: string; facilityId?: string };
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  get(name: string): string | undefined;
};

function facilityIdFromReq(req: AuthedReq): string {
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

@Controller("admin")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AdminExportMonitoringController {
  constructor(
    private readonly monitoring: AdminExportMonitoringService,
    private readonly automation: ExternalBillingAutomationService,
    private readonly externalExport: ExternalBillingExportService
  ) {}

  @Get("export-monitoring")
  @RequireRoles(RoleCode.ADMIN)
  async getExportMonitoring(@Req() req: AuthedReq, @Query() query: Record<string, string | string[] | undefined>) {
    const parsed = exportMonitoringQuerySchema.safeParse(flattenQuery(query));
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", { cause: parsed.error });
    }
    const facilityId = facilityIdFromReq(req);
    return this.monitoring.getExportMonitoring(facilityId, parsed.data);
  }

  @Post("export-monitoring/retry")
  @RequireRoles(RoleCode.ADMIN)
  async postExportRetry(@Req() req: AuthedReq, @Body() body: unknown) {
    const parsed = exportMonitoringRetryBodySchema.safeParse(body && typeof body === "object" ? body : {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Corps invalide.", { cause: parsed.error });
    }
    const facilityId = facilityIdFromReq(req);
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException("Utilisateur non authentifié.");
    }
    const userCtx = await this.externalExport.resolveExportUserContext(userId, ADMIN_ROLE_LABEL);
    return this.automation.retryDailyVendorDeliveryForFacility({
      facilityId,
      exportDate: parsed.data.date,
      format: parsed.data.format,
      userCtx,
      ip: req.ip,
      userAgent: typeof req.get === "function" ? req.get("user-agent") : undefined,
    });
  }
}
