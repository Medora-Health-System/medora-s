import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { BillingService } from "./billing.service";

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("billing/encounters/:encounterId/readiness")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getEncounterBillingItemReadiness(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.billingService.getEncounterOrderItemReadiness(facilityId, encounterId);
  }
}
