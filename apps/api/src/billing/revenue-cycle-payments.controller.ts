import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { REVENUE_PAYMENT_QUEUE, type RevenuePaymentFilter } from "@medora/shared";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { RevenueCyclePaymentsService } from "./revenue-cycle-payments.service";

function parseQueueFilter(raw: string | undefined): RevenuePaymentFilter {
  const value = (raw ?? "ALL").trim().toUpperCase();
  if (value === "ALL") return "ALL";
  if ((Object.values(REVENUE_PAYMENT_QUEUE) as string[]).includes(value)) {
    return value as RevenuePaymentFilter;
  }
  return "ALL";
}

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class RevenueCyclePaymentsController {
  constructor(private readonly revenueCyclePaymentsService: RevenueCyclePaymentsService) {}

  @Get("billing/revenue-cycle/payments")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getRevenueCyclePayments(
    @Req() req: { facilityId: string },
    @Query("queue") queueRaw?: string,
    @Query("search") search?: string,
    @Query("limit") limitRaw?: string,
    @Query("offset") offsetRaw?: string
  ) {
    const facilityId = req.facilityId;
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    const offset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;
    return this.revenueCyclePaymentsService.listRevenueCyclePayments({
      facilityId,
      queue: parseQueueFilter(queueRaw),
      search,
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
  }
}
