import { BadRequestException, Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { BackupReadinessService } from "./backup-readiness.service";

function facilityIdFromReq(req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> }): string {
  const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
  const fid = typeof facilityId === "string" ? facilityId : Array.isArray(facilityId) ? facilityId[0] : "";
  if (!fid) throw new BadRequestException("Établissement requis");
  return fid;
}

@Controller("admin")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AdminBackupReadinessController {
  constructor(private readonly backupReadiness: BackupReadinessService) {}

  @Get("backup-readiness")
  @RequireRoles(RoleCode.ADMIN)
  getBackupReadiness(@Req() req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> }) {
    const facilityId = facilityIdFromReq(req);
    return this.backupReadiness.getSnapshot(facilityId);
  }
}
