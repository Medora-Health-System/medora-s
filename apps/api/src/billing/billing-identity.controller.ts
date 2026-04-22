import { Body, Controller, Get, Patch, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { RoleCode } from "@prisma/client";
import { facilityBillingIdentityPatchDtoSchema } from "@medora/shared";
import { BillingIdentityService } from "./billing-identity.service";

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class BillingIdentityController {
  constructor(private readonly billingIdentityService: BillingIdentityService) {}

  @Get("billing/facility-identity")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN)
  async getFacilityBillingIdentity(@Req() req: any) {
    const facilityId = req.facilityId as string;
    return this.billingIdentityService.getFacilityBillingIdentity(facilityId);
  }

  @Patch("billing/facility-identity")
  @RequireRoles(RoleCode.ADMIN)
  async patchFacilityBillingIdentity(@Body() body: unknown, @Req() req: any) {
    const parsed = facilityBillingIdentityPatchDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const facilityId = req.facilityId as string;
    return this.billingIdentityService.updateFacilityBillingIdentity(facilityId, parsed.data);
  }
}
