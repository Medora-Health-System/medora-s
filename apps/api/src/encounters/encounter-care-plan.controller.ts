import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RequireRoles, RolesGuard } from "../common/guards/roles.guard";
import { EncounterCarePlanService, type CarePlanActor } from "./encounter-care-plan.service";
import { FacilityConfigurationService } from "../facility-configuration/facility-configuration.service";

@Controller("encounters/:encounterId/care-plans")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.PATIENT_CARE_TECH, RoleCode.ADMIN)
export class EncounterCarePlanController {
  constructor(
    private readonly service: EncounterCarePlanService,
    private readonly facilityConfiguration: FacilityConfigurationService,
  ) {}
  private actor(req: any): CarePlanActor { const userId = req.user?.userId; const facilityId = req.user?.facilityId; const role = req.userRole as RoleCode; if (!userId || !facilityId || !role) throw new BadRequestException("Authenticated facility actor required"); return { userId, facilityId, role }; }
  @Get() async list(@Req() req: any, @Param("encounterId") encounterId: string) { const actor = this.actor(req); await this.facilityConfiguration.assertCarePlansEnabled(actor.facilityId); return this.service.list(actor, encounterId); }
  @Post() async activate(@Req() req: any, @Param("encounterId") encounterId: string, @Body() body: any) { const actor = this.actor(req); await this.facilityConfiguration.assertCarePlansEnabled(actor.facilityId); return this.service.activate(actor, encounterId, body); }
  @Get(":carePlanId") async get(@Req() req: any, @Param("encounterId") encounterId: string, @Param("carePlanId") carePlanId: string) { const actor = this.actor(req); await this.facilityConfiguration.assertCarePlansEnabled(actor.facilityId); return this.service.get(actor, encounterId, carePlanId); }
  @Post(":carePlanId/components") async component(@Req() req: any, @Param("encounterId") encounterId: string, @Param("carePlanId") carePlanId: string, @Body() body: any) { const actor = this.actor(req); await this.facilityConfiguration.assertCarePlansEnabled(actor.facilityId); return this.service.addComponent(actor, encounterId, carePlanId, body); }
  @Patch(":carePlanId/components/:componentId") async updateComponent(@Req() req: any, @Param("encounterId") encounterId: string, @Param("carePlanId") carePlanId: string, @Param("componentId") componentId: string, @Body() body: any) { const actor = this.actor(req); await this.facilityConfiguration.assertCarePlansEnabled(actor.facilityId); return this.service.updateComponent(actor, encounterId, carePlanId, componentId, body); }
  @Post(":carePlanId/progress") async progress(@Req() req: any, @Param("encounterId") encounterId: string, @Param("carePlanId") carePlanId: string, @Body() body: any) { const actor = this.actor(req); await this.facilityConfiguration.assertCarePlansEnabled(actor.facilityId); return this.service.progress(actor, encounterId, carePlanId, body); }
  @Post(":carePlanId/reviews") async review(@Req() req: any, @Param("encounterId") encounterId: string, @Param("carePlanId") carePlanId: string, @Body() body: any) { const actor = this.actor(req); await this.facilityConfiguration.assertCarePlansEnabled(actor.facilityId); return this.service.review(actor, encounterId, carePlanId, body); }
  @Post(":carePlanId/transitions") async transition(@Req() req: any, @Param("encounterId") encounterId: string, @Param("carePlanId") carePlanId: string, @Body() body: any) { const actor = this.actor(req); await this.facilityConfiguration.assertCarePlansEnabled(actor.facilityId); return this.service.transition(actor, encounterId, carePlanId, body); }
}
