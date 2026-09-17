import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { applyWorkforceAccessPackageSchema } from "./dto/workforce-access-package.dto";
import { RequirePlatformCapabilities } from "./platform-capabilities.decorator";
import { PlatformCapabilitiesGuard } from "./platform-capabilities.guard";
import { WorkforceAccessPackageService } from "./workforce-access-package.service";

@Controller("platform/staff")
@UseGuards(AuthGuard("jwt"),PlatformCapabilitiesGuard)
export class WorkforceAccessPackageController {
  constructor(private readonly packages:WorkforceAccessPackageService){}
  @Get(":id/workforce/access-package")
  @RequirePlatformCapabilities(["STAFF_VIEW"],{requireRecentMfa:true})
  preview(@Param("id") id:string){return this.packages.preview(id);}

  @Post(":id/workforce/access-package/apply")
  @RequirePlatformCapabilities(["STAFF_GRANT_CAPABILITIES"],{
    requireRecentMfa:true,
    denialAudit:{event:"PLATFORM_CAPABILITY_GRANT_DENIED",sourceOperation:"platform.staff.workforce.access-package.apply",requestedCapabilityFrom:"NONE"},
  })
  apply(@Req() req:any,@Param("id") id:string,@Body() body:unknown){
    const parsed=applyWorkforceAccessPackageSchema.safeParse(body);
    if(!parsed.success)throw new BadRequestException(parsed.error.issues[0]?.message??"Invalid workforce access package request");
    return this.packages.apply({userId:String(req.user?.userId??""),sessionId:String(req.user?.sessionId??"")},id,parsed.data.reason,parsed.data.ticketReference);
  }
}
