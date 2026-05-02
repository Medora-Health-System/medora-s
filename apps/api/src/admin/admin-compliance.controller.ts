import { BadRequestException, Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PLATFORM_OPERATOR_ROLES } from "../common/auth/platform-operator-roles";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { AdminComplianceService } from "./admin-compliance.service";

function facilityIdFromReq(req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> }): string {
  const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
  const fid = typeof facilityId === "string" ? facilityId : Array.isArray(facilityId) ? facilityId[0] : "";
  if (!fid) throw new BadRequestException("Établissement requis");
  return fid;
}

@Controller("admin")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AdminComplianceController {
  constructor(private readonly compliance: AdminComplianceService) {}

  /** S24E — PHI-safe aggregate compliance snapshot; platform operators only. */
  @Get("compliance")
  @RequireRoles(...PLATFORM_OPERATOR_ROLES)
  async getCompliance(@Req() req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> }) {
    const facilityId = facilityIdFromReq(req);
    return this.compliance.getDashboard(facilityId);
  }
}
