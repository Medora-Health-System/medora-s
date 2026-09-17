import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PlatformCapabilitiesGuard } from "./platform-capabilities.guard";
import { RequirePlatformCapabilities } from "./platform-capabilities.decorator";
import { createPrivilegedActionSchema, decisionSchema, listPrivilegedActionsSchema } from "./dto/privileged-action.dto";
import { PrivilegedActionService } from "./privileged-action.service";
import { PlatformOwnerControlService } from "./platform-owner-control.service";
@Controller("platform/privileged-action-requests")
@UseGuards(AuthGuard("jwt"), PlatformCapabilitiesGuard)
export class PrivilegedActionController {
  constructor(private readonly actions: PrivilegedActionService, private readonly owner: PlatformOwnerControlService) {}
  private actor(req:any){return {userId:String(req.user?.userId??""),sessionId:String(req.user?.sessionId??"")};}
  private parse(schema:any,value:unknown){const p=schema.safeParse(value);if(!p.success)throw new BadRequestException(p.error.issues[0]?.message??"Invalid request");return p.data;}
  @Post() @RequirePlatformCapabilities(["STAFF_PROVISION","STAFF_GRANT_CAPABILITIES","FACILITY_ACTIVATE","SECURITY_MFA_RECOVERY"],{mode:"ANY",requireRecentMfa:true})
  async create(@Req() req:any,@Body() body:unknown){const actor=this.actor(req);const dto:any=this.parse(createPrivilegedActionSchema,body);if(dto.targetUserId)await this.owner.assertTargetVisibleTo(actor.userId,dto.targetUserId);return this.actions.create(actor,dto);}
  @Get() @RequirePlatformCapabilities(["STAFF_VIEW","FACILITY_ACTIVATE","SECURITY_MFA_RECOVERY","PRIVILEGED_ACTION_APPROVE"],{mode:"ANY",requireRecentMfa:true})
  async list(@Req() req:any,@Query() query:unknown){const actor=this.actor(req);const q:any=this.parse(listPrivilegedActionsSchema,query);const rows:any[]=await this.actions.list(actor.userId,q.status,q.take);if(await this.owner.isOwner(actor.userId))return rows;const out=[];for(const row of rows){if(row.targetUserId&&await this.owner.isOwner(row.targetUserId))continue;if(await this.owner.isOwner(row.requesterUserId))continue;out.push(row);}return out;}
  @Get(":id") @RequirePlatformCapabilities(["STAFF_VIEW","FACILITY_ACTIVATE","SECURITY_MFA_RECOVERY","PRIVILEGED_ACTION_APPROVE"],{mode:"ANY",requireRecentMfa:true})
  async one(@Req() req:any,@Param("id") id:string){const actor=this.actor(req);const row:any=await this.actions.one(actor.userId,id);if(!(await this.owner.isOwner(actor.userId))&&((row.targetUserId&&await this.owner.isOwner(row.targetUserId))||await this.owner.isOwner(row.requesterUserId)))throw new BadRequestException("Privileged action request not found");return row;}
  @Post(":id/approve") @RequirePlatformCapabilities(["PRIVILEGED_ACTION_APPROVE"],{requireRecentMfa:true})
  approve(@Req() req:any,@Param("id") id:string){return this.actions.approve(this.actor(req),id);}
  @Post(":id/reject") @RequirePlatformCapabilities(["PRIVILEGED_ACTION_APPROVE"],{requireRecentMfa:true})
  reject(@Req() req:any,@Param("id") id:string,@Body() body:unknown){return this.actions.reject(this.actor(req),id,this.parse(decisionSchema,body).reason);}
  @Post(":id/cancel") @RequirePlatformCapabilities(["STAFF_PROVISION","STAFF_GRANT_CAPABILITIES","FACILITY_ACTIVATE","SECURITY_MFA_RECOVERY"],{mode:"ANY"})
  cancel(@Req() req:any,@Param("id") id:string,@Body() body:unknown){return this.actions.cancel(this.actor(req),id,this.parse(decisionSchema,body).reason);}
  @Post(":id/execute") @RequirePlatformCapabilities(["STAFF_PROVISION","STAFF_GRANT_CAPABILITIES","FACILITY_ACTIVATE","SECURITY_MFA_RECOVERY"],{mode:"ANY",requireRecentMfa:true})
  execute(@Req() req:any,@Param("id") id:string){return this.actions.execute(this.actor(req),id);}
}
