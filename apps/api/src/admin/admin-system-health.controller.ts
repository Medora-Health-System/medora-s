import { BadRequestException, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PLATFORM_OPERATOR_ROLES } from "../common/auth/platform-operator-roles";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { sendMedoraTestAlert } from "../common/logging/medoraAlert";
import { SystemHealthService } from "./system-health.service";

type AuthedReq = {
  user?: { userId?: string; facilityId?: string };
  headers: Record<string, string | string[] | undefined>;
};

function facilityIdFromReq(req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> }): string {
  const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
  const fid = typeof facilityId === "string" ? facilityId : Array.isArray(facilityId) ? facilityId[0] : "";
  if (!fid) throw new BadRequestException("Établissement requis");
  return fid;
}

@Controller("admin")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AdminSystemHealthController {
  constructor(private readonly systemHealth: SystemHealthService) {}

  @Get("system-health")
  @RequireRoles(...PLATFORM_OPERATOR_ROLES)
  async getSystemHealth(@Req() req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> }) {
    const facilityId = facilityIdFromReq(req);
    return this.systemHealth.getSnapshot(facilityId);
  }

  /** S23 — PHI-safe test alert; platform operators only. */
  @Post("system-health/test-alert")
  @RequireRoles(...PLATFORM_OPERATOR_ROLES)
  async postTestAlert(@Req() req: AuthedReq) {
    const facilityId = facilityIdFromReq(req);
    const userId = typeof req.user?.userId === "string" ? req.user.userId : undefined;
    const requestId =
      typeof req.headers["x-request-id"] === "string"
        ? req.headers["x-request-id"]
        : Array.isArray(req.headers["x-request-id"])
          ? req.headers["x-request-id"][0]
          : undefined;
    const { delivered, messageKey } = await sendMedoraTestAlert({ facilityId, userId, requestId });
    return { ok: true, delivered, messageKey };
  }
}
