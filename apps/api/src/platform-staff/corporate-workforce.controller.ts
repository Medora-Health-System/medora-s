import { BadRequestException, Body, Controller, Get, Param, Put, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CorporateWorkforceService, type WorkforceInput } from "./corporate-workforce.service";
import { workforceProfileSchema } from "./dto/corporate-workforce.dto";
import { RequirePlatformCapabilities } from "./platform-capabilities.decorator";
import { PlatformCapabilitiesGuard } from "./platform-capabilities.guard";
import { PlatformOwnerControlService } from "./platform-owner-control.service";
@Controller("platform/staff") @UseGuards(AuthGuard("jwt"),PlatformCapabilitiesGuard)
export class CorporateWorkforceController{
 constructor(private readonly workforce:CorporateWorkforceService,private readonly owner:PlatformOwnerControlService){}
 @Get(":id/workforce") @RequirePlatformCapabilities(["STAFF_VIEW"],{requireRecentMfa:true}) async get(@Req()req:any,@Param("id")id:string){await this.owner.assertTargetVisibleTo(String(req.user?.userId??""),id);return this.workforce.get(id);}
 @Put(":id/workforce") @RequirePlatformCapabilities(["STAFF_PROVISION"],{requireRecentMfa:true,denialAudit:{event:"STAFF_MUTATION_DENIED",sourceOperation:"platform.staff.workforce.upsert",requestedCapabilityFrom:"NONE"}})
 async put(@Req()req:any,@Param("id")id:string,@Body()body:unknown){const actor=String(req.user?.userId??"");await this.owner.assertTargetVisibleTo(actor,id);const parsed=workforceProfileSchema.safeParse(body);if(!parsed.success)throw new BadRequestException(parsed.error.issues[0]?.message??"Invalid workforce profile");return this.workforce.upsert(actor,id,parsed.data as WorkforceInput);}
}
