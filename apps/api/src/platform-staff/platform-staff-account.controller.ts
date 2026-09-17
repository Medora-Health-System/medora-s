import { BadRequestException, Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RequirePlatformCapabilities } from "./platform-capabilities.decorator";
import { PlatformCapabilitiesGuard } from "./platform-capabilities.guard";
import { createPlatformStaffAccountSchema } from "./dto/platform-staff.dto";
import { PlatformStaffAccountService, type CreatePlatformStaffAccountInput } from "./platform-staff-account.service";

@Controller("platform/staff-accounts")
@UseGuards(AuthGuard("jwt"), PlatformCapabilitiesGuard)
export class PlatformStaffAccountController {
  constructor(private readonly accounts: PlatformStaffAccountService) {}

  @Post()
  @RequirePlatformCapabilities(["STAFF_PROVISION"], { requireRecentMfa: true, denialAudit: { event: "STAFF_MUTATION_DENIED", sourceOperation: "platform.staff.account.create", requestedCapabilityFrom: "NONE" } })
  create(@Req() req:any,@Body() body:unknown){
    const parsed=createPlatformStaffAccountSchema.safeParse(body);
    if(!parsed.success)throw new BadRequestException(parsed.error.issues[0]?.message??"Invalid request");
    return this.accounts.create(String(req.user?.userId??""),parsed.data as CreatePlatformStaffAccountInput);
  }
}
