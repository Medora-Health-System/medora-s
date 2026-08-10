import { BadRequestException, Controller, ForbiddenException, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { platformAuditEventsQuerySchema } from "./dto/platform-audit-events-query.dto";
import { PlatformAuditService } from "./platform-audit.service";

@Controller("platform/audit")
@UseGuards(AuthGuard("jwt"))
export class PlatformAuditController {
  constructor(private readonly platformAudit: PlatformAuditService) {}

  @Get("events")
  async listEvents(@Req() req: any, @Query() query: Record<string, string | string[] | undefined>) {
    const actorUserId = typeof req.user?.userId === "string" ? req.user.userId.trim() : "";
    if (!actorUserId) throw new ForbiddenException("Authentication required");
    const flattened = Object.fromEntries(Object.entries(query).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
    const parsed = platformAuditEventsQuerySchema.safeParse(flattened);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid query.");
    return this.platformAudit.listEvents(actorUserId, parsed.data);
  }
}
