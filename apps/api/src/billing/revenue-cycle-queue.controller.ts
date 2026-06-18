import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { REVENUE_CYCLE_QUEUE, type RevenueCycleQueueFilter } from "@medora/shared";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { RevenueCycleQueueService } from "./revenue-cycle-queue.service";

function parseQueueFilter(raw: string | undefined): RevenueCycleQueueFilter {
  const value = (raw ?? "ALL").trim().toUpperCase();
  if (value === "ALL") return "ALL";
  if ((Object.values(REVENUE_CYCLE_QUEUE) as string[]).includes(value)) {
    return value as RevenueCycleQueueFilter;
  }
  return "ALL";
}

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class RevenueCycleQueueController {
  constructor(private readonly revenueCycleQueueService: RevenueCycleQueueService) {}

  @Get("billing/revenue-cycle/queue")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getRevenueCycleQueue(
    @Req() req: { facilityId: string },
    @Query("queue") queueRaw?: string,
    @Query("search") search?: string,
    @Query("limit") limitRaw?: string,
    @Query("offset") offsetRaw?: string
  ) {
    const facilityId = req.facilityId;
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    const offset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;
    return this.revenueCycleQueueService.listRevenueCycleQueue({
      facilityId,
      queue: parseQueueFilter(queueRaw),
      search,
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
  }
}
