import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PlatformCapabilitiesGuard } from "./platform-capabilities.guard";
import { RequirePlatformCapabilities } from "./platform-capabilities.decorator";
import { createPrivilegedActionSchema, decisionSchema, listPrivilegedActionsSchema } from "./dto/privileged-action.dto";
import { PrivilegedActionService } from "./privileged-action.service";
@Controller("platform/privileged-action-requests")
@UseGuards(AuthGuard("jwt"), PlatformCapabilitiesGuard)
export class PrivilegedActionController {
  constructor(private readonly actions: PrivilegedActionService) {}
  private actor(req:any){return {userId:String(req.user?.userId??""),sessionId:String(req.user?.sessionId??"")};}
  private parse(schema:any,value:unknown){const p=schema.safeParse(value);if(!p.success)throw new BadRequestException(p.error.issues[0]?.message??"Invalid request");return p.data;}
  @Post() @RequirePlatformCapabilities(["STAFF_PROVISION","STAFF_GRANT_CAPABILITIES","FACILITY_ACTIVATE","SECURITY_MFA_RECOVERY"],{mode:"ANY",requireRecentMfa:true})
  create(@Req() req:any,@Body() body:unknown){return this.actions.create(this.actor(req),this.parse(createPrivilegedActionSchema,body));}
  @Get() @RequirePlatformCapabilities(["STAFF_VIEW","FACILITY_ACTIVATE","SECURITY_MFA_RECOVERY","PRIVILEGED_ACTION_APPROVE"],{mode:"ANY",requireRecentMfa:true})
  list(@Req() req:any,@Query() query:unknown){const q:any=this.parse(listPrivilegedActionsSchema,query);return this.actions.list(this.actor(req).userId,q.status,q.take);}
  @Get(":id") @RequirePlatformCapabilities(["STAFF_VIEW","FACILITY_ACTIVATE","SECURITY_MFA_RECOVERY","PRIVILEGED_ACTION_APPROVE"],{mode:"ANY",requireRecentMfa:true})
  one(@Req() req:any,@Param("id") id:string){return this.actions.one(this.actor(req).userId,id);}
  @Post(":id/approve") @RequirePlatformCapabilities(["PRIVILEGED_ACTION_APPROVE"],{requireRecentMfa:true})
  approve(@Req() req:any,@Param("id") id:string){return this.actions.approve(this.actor(req),id);}
  @Post(":id/reject") @RequirePlatformCapabilities(["PRIVILEGED_ACTION_APPROVE"],{requireRecentMfa:true})
  reject(@Req() req:any,@Param("id") id:string,@Body() body:unknown){return this.actions.reject(this.actor(req),id,this.parse(decisionSchema,body).reason);}
  @Post(":id/cancel") @RequirePlatformCapabilities(["STAFF_PROVISION","STAFF_GRANT_CAPABILITIES","FACILITY_ACTIVATE","SECURITY_MFA_RECOVERY"],{mode:"ANY"})
  cancel(@Req() req:any,@Param("id") id:string,@Body() body:unknown){return this.actions.cancel(this.actor(req),id,this.parse(decisionSchema,body).reason);}
  @Post(":id/execute") @RequirePlatformCapabilities(["STAFF_PROVISION","STAFF_GRANT_CAPABILITIES","FACILITY_ACTIVATE","SECURITY_MFA_RECOVERY"],{mode:"ANY",requireRecentMfa:true})
  execute(@Req() req:any,@Param("id") id:string){return this.actions.execute(this.actor(req),id);}
}
