import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RequireRoles, RolesGuard } from "../common/guards/roles.guard";
import { EncounterCarePlanService, type CarePlanActor } from "./encounter-care-plan.service";

@Controller("encounters/:encounterId/care-plans")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.PATIENT_CARE_TECH, RoleCode.ADMIN)
export class EncounterCarePlanController {
  constructor(private readonly service: EncounterCarePlanService) {}
  private actor(req: any): CarePlanActor { const userId = req.user?.userId; const facilityId = req.user?.facilityId; const role = req.userRole as RoleCode; if (!userId || !facilityId || !role) throw new BadRequestException("Authenticated facility actor required"); return { userId, facilityId, role }; }
  @Get() list(@Req() req: any, @Param("encounterId") encounterId: string) { return this.service.list(this.actor(req), encounterId); }
  @Post() activate(@Req() req: any, @Param("encounterId") encounterId: string, @Body() body: any) { return this.service.activate(this.actor(req), encounterId, body); }
  @Get(":carePlanId") get(@Req() req: any, @Param("encounterId") encounterId: string, @Param("carePlanId") carePlanId: string) { return this.service.get(this.actor(req), encounterId, carePlanId); }
  @Post(":carePlanId/components") component(@Req() req: any, @Param("encounterId") encounterId: string, @Param("carePlanId") carePlanId: string, @Body() body: any) { return this.service.addComponent(this.actor(req), encounterId, carePlanId, body); }
  @Patch(":carePlanId/components/:componentId") updateComponent(@Req() req: any, @Param("encounterId") encounterId: string, @Param("carePlanId") carePlanId: string, @Param("componentId") componentId: string, @Body() body: any) { return this.service.updateComponent(this.actor(req), encounterId, carePlanId, componentId, body); }
  @Post(":carePlanId/progress") progress(@Req() req: any, @Param("encounterId") encounterId: string, @Param("carePlanId") carePlanId: string, @Body() body: any) { return this.service.progress(this.actor(req), encounterId, carePlanId, body); }
  @Post(":carePlanId/reviews") review(@Req() req: any, @Param("encounterId") encounterId: string, @Param("carePlanId") carePlanId: string, @Body() body: any) { return this.service.review(this.actor(req), encounterId, carePlanId, body); }
  @Post(":carePlanId/transitions") transition(@Req() req: any, @Param("encounterId") encounterId: string, @Param("carePlanId") carePlanId: string, @Body() body: any) { return this.service.transition(this.actor(req), encounterId, carePlanId, body); }
}
