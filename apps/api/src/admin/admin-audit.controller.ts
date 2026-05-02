import { BadRequestException, Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { AdminAuditService } from "./admin-audit.service";
import { adminAuditEventsQuerySchema } from "./dto/admin-audit-events-query.dto";

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

@Controller("admin/audit")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AdminAuditController {
  constructor(private readonly adminAudit: AdminAuditService) {}

  @Get("events")
  @RequireRoles(RoleCode.ADMIN)
  async listEvents(@Req() req: any, @Query() query: Record<string, string | string[] | undefined>) {
    const parsed = adminAuditEventsQuerySchema.safeParse(flattenQuery(query));
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    const facilityId = facilityIdFromReq(req);
    return this.adminAudit.listEvents(facilityId, parsed.data);
  }
}
