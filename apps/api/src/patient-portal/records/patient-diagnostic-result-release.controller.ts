import { BadRequestException, Controller, Delete, Get, Param, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RequireRoles, RolesGuard } from "../../common/guards/roles.guard";
import { PatientDiagnosticResultReleaseService, type DiagnosticResultStaffActor } from "./patient-diagnostic-result-release.service";

@Controller("patient-portal/v1/staff/results")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@RequireRoles(RoleCode.PROVIDER, RoleCode.RN)
export class PatientDiagnosticResultReleaseController {
  constructor(private readonly releases: PatientDiagnosticResultReleaseService) {}
  private actor(req: any): DiagnosticResultStaffActor {
    const userId = req.user?.userId as string | undefined;
    const facilityId = (req.user?.facilityId || req.headers?.["x-facility-id"]) as string | undefined;
    if (!userId) throw new UnauthorizedException("Staff identity missing");
    if (!facilityId) throw new BadRequestException("Facility is required");
    return { userId, facilityId, ip: req.ip, userAgent: req.headers?.["user-agent"] };
  }
  @Get() list(@Req() req: any) { return this.releases.list(this.actor(req)); }
  @Post(":orderItemId/release") release(@Param("orderItemId") id: string, @Req() req: any) { return this.releases.release(id, this.actor(req)); }
  @Delete(":orderItemId/release") revoke(@Param("orderItemId") id: string, @Req() req: any) { return this.releases.revoke(id, this.actor(req)); }
}
