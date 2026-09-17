import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { applyWorkforceAccessPackageSchema } from "./dto/workforce-access-package.dto";
import { RequirePlatformCapabilities } from "./platform-capabilities.decorator";
import { PlatformCapabilitiesGuard } from "./platform-capabilities.guard";
import { WorkforceAccessPackageService } from "./workforce-access-package.service";
import { PlatformOwnerControlService } from "./platform-owner-control.service";
@Controller("platform/staff") @UseGuards(AuthGuard("jwt"),PlatformCapabilitiesGuard)
export class WorkforceAccessPackageController{
 constructor(private readonly packages:WorkforceAccessPackageService,private readonly owner:PlatformOwnerControlService){}
 @Get(":id/workforce/access-package") @RequirePlatformCapabilities(["STAFF_VIEW"],{requireRecentMfa:true}) async preview(@Req()req:any,@Param("id")id:string){await this.owner.assertTargetVisibleTo(String(req.user?.userId??""),id);return this.packages.preview(id);}
 @Post(":id/workforce/access-package/apply") @RequirePlatformCapabilities(["STAFF_GRANT_CAPABILITIES"],{requireRecentMfa:true,denialAudit:{event:"PLATFORM_CAPABILITY_GRANT_DENIED",sourceOperation:"platform.staff.workforce.access-package.apply",requestedCapabilityFrom:"NONE"}})
 async apply(@Req()req:any,@Param("id")id:string,@Body()body:unknown){const actor={userId:String(req.user?.userId??""),sessionId:String(req.user?.sessionId??"")};await this.owner.assertTargetVisibleTo(actor.userId,id);const p=applyWorkforceAccessPackageSchema.safeParse(body);if(!p.success)throw new BadRequestException(p.error.issues[0]?.message??"Invalid workforce access package request");return this.packages.apply(actor,id,p.data.reason,p.data.ticketReference);}
}
