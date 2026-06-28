import { BadRequestException, Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { enterpriseOrderSetAnalyticsFiltersSchema } from "@medora/shared";
import { FACILITY_OR_PLATFORM_ADMIN_ROLES } from "../common/auth/platform-operator-roles";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { EnterpriseOrderSetAnalyticsService } from "./enterprise-order-set-analytics.service";

function facilityIdFromReq(req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> }): string {
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

@Controller("orders/enterprise-order-sets")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class EnterpriseOrderSetAnalyticsController {
  constructor(private readonly analytics: EnterpriseOrderSetAnalyticsService) {}

  @Get("analytics")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async getAnalytics(@Req() req: any, @Query() query: Record<string, string | string[] | undefined>) {
    const parsed = enterpriseOrderSetAnalyticsFiltersSchema.safeParse(flattenQuery(query));
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    const facilityId = facilityIdFromReq(req);
    return this.analytics.getAnalytics(facilityId, parsed.data);
  }
}
