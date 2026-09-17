import { BadRequestException, Body, Controller, Get, Param, Put, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CorporateWorkforceService, type WorkforceInput } from "./corporate-workforce.service";
import { workforceProfileSchema } from "./dto/corporate-workforce.dto";
import { RequirePlatformCapabilities } from "./platform-capabilities.decorator";
import { PlatformCapabilitiesGuard } from "./platform-capabilities.guard";

@Controller("platform/staff")
@UseGuards(AuthGuard("jwt"),PlatformCapabilitiesGuard)
export class CorporateWorkforceController{
  constructor(private readonly workforce:CorporateWorkforceService){}
  @Get(":id/workforce") @RequirePlatformCapabilities(["STAFF_VIEW"],{requireRecentMfa:true})
  get(@Param("id")id:string){return this.workforce.get(id);}
  @Put(":id/workforce") @RequirePlatformCapabilities(["STAFF_PROVISION"],{requireRecentMfa:true,denialAudit:{event:"STAFF_MUTATION_DENIED",sourceOperation:"platform.staff.workforce.upsert",requestedCapabilityFrom:"NONE"}})
  put(@Req()req:any,@Param("id")id:string,@Body()body:unknown){const parsed=workforceProfileSchema.safeParse(body);if(!parsed.success)throw new BadRequestException(parsed.error.issues[0]?.message??"Invalid workforce profile");return this.workforce.upsert(String(req.user?.userId??""),id,parsed.data as WorkforceInput);}
}
