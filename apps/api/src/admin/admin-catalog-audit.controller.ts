import { BadRequestException, Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PLATFORM_OPERATOR_ROLES } from "../common/auth/platform-operator-roles";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { AdminCatalogAuditService } from "./admin-catalog-audit.service";

function facilityIdFromReq(req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> }): string {
  const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
  const fid = typeof facilityId === "string" ? facilityId : Array.isArray(facilityId) ? facilityId[0] : "";
  if (!fid) throw new BadRequestException("Établissement requis");
  return fid;
}

@Controller("admin")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AdminCatalogAuditController {
  constructor(private readonly catalogAudit: AdminCatalogAuditService) {}

  /** Phase 6B — PHI-safe catalog classification audit; platform operators only. */
  @Get("catalog-audit")
  @RequireRoles(...PLATFORM_OPERATOR_ROLES)
  async getCatalogAudit(@Req() req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> }) {
    const facilityId = facilityIdFromReq(req);
    return this.catalogAudit.getDashboard(facilityId);
  }
}
