import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import {
  CLAIM_SUBMISSION_WORKSPACE_QUEUE,
  type RevenueClaimSubmissionFilter,
} from "@medora/shared";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { RevenueCycleClaimsService } from "./revenue-cycle-claims.service";

function parseQueueFilter(raw: string | undefined): RevenueClaimSubmissionFilter {
  const value = (raw ?? "ALL").trim().toUpperCase();
  if (value === "ALL") return "ALL";
  if ((Object.values(CLAIM_SUBMISSION_WORKSPACE_QUEUE) as string[]).includes(value)) {
    return value as RevenueClaimSubmissionFilter;
  }
  return "ALL";
}

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class RevenueCycleClaimsController {
  constructor(private readonly revenueCycleClaimsService: RevenueCycleClaimsService) {}

  @Get("billing/revenue-cycle/claims")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getRevenueCycleClaims(
    @Req() req: { facilityId: string },
    @Query("queue") queueRaw?: string,
    @Query("search") search?: string,
    @Query("limit") limitRaw?: string,
    @Query("offset") offsetRaw?: string
  ) {
    const facilityId = req.facilityId;
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    const offset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;
    return this.revenueCycleClaimsService.listRevenueCycleClaims({
      facilityId,
      queue: parseQueueFilter(queueRaw),
      search,
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
  }
}
