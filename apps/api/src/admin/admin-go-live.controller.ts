import { BadRequestException, Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FACILITY_OR_PLATFORM_ADMIN_ROLES } from "../common/auth/platform-operator-roles";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { GoLiveReadinessService } from "./go-live-readiness.service";

function facilityIdFromReq(req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> }): string {
  const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
  const fid = typeof facilityId === "string" ? facilityId : Array.isArray(facilityId) ? facilityId[0] : "";
  if (!fid) throw new BadRequestException("Établissement requis");
  return fid;
}

@Controller("admin")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AdminGoLiveController {
  constructor(private readonly goLive: GoLiveReadinessService) {}

  @Get("go-live-readiness")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async getGoLiveReadiness(@Req() req: any) {
    const facilityId = facilityIdFromReq(req);
    return this.goLive.getSnapshot(facilityId);
  }
}
