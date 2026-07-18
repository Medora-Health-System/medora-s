import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { RolesGuard, RequireRoles } from "../../common/guards/roles.guard";
import {
  PILOT_ADMIN_ROLES,
  PILOT_APPROVER_ROLES,
  PILOT_PROVIDER_ROLES,
  PILOT_READ_ROLES,
  PILOT_WRITE_ROLES,
} from "./medication-recommendation-pilot.roles";
import { MedicationRecommendationPilotHttpService } from "./medication-recommendation-pilot.http-service";

type AuthReq = Request & {
  user?: { userId?: string };
  userRole?: string;
};

function actorFromReq(req: AuthReq) {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedException();
  return {
    userId,
    roles: req.userRole ? [String(req.userRole)] : ["MEDICATION_REVIEWER"],
  };
}

@Controller("medications/recommendation-pilot")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationRecommendationPilotController {
  constructor(private readonly http: MedicationRecommendationPilotHttpService) {}

  @Get("dashboard")
  @RequireRoles(...PILOT_READ_ROLES)
  dashboard() {
    return this.http.dashboard();
  }

  @Get("readiness")
  @RequireRoles(...PILOT_READ_ROLES)
  readiness() {
    return this.http.readiness();
  }

  @Get("qualifications")
  @RequireRoles(...PILOT_READ_ROLES)
  qualifications() {
    return this.http.qualifications();
  }

  @Get("qualifications/:definitionId")
  @RequireRoles(...PILOT_READ_ROLES)
  qualification(@Param("definitionId") definitionId: string) {
    return this.http.qualification(definitionId);
  }

  @Post("qualifications/evaluate-all")
  @RequireRoles(...PILOT_WRITE_ROLES)
  evaluateAll(
    @Req() req: AuthReq,
    @Body() body: { facilityId?: string }
  ) {
    return this.http.evaluateAll(actorFromReq(req), body.facilityId);
  }

  @Post("qualifications/:definitionId/evaluate")
  @RequireRoles(...PILOT_WRITE_ROLES)
  evaluateOne(
    @Req() req: AuthReq,
    @Param("definitionId") definitionId: string,
    @Body() body: { facilityId?: string }
  ) {
    return this.http.evaluateOne(actorFromReq(req), definitionId, body.facilityId);
  }

  @Get("programs")
  @RequireRoles(...PILOT_READ_ROLES)
  programs() {
    return this.http.programs();
  }

  @Get("programs/:id")
  @RequireRoles(...PILOT_READ_ROLES)
  program(@Param("id") id: string) {
    return this.http.program(id);
  }

  @Post("programs")
  @RequireRoles(...PILOT_ADMIN_ROLES)
  create(@Req() req: AuthReq, @Body() body: Record<string, unknown>) {
    return this.http.createProgram(actorFromReq(req), body as never);
  }

  @Post("programs/:id/submit")
  @RequireRoles(...PILOT_WRITE_ROLES)
  submit(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body() body: { reason: string }
  ) {
    return this.http.submit(actorFromReq(req), id, body.reason);
  }

  @Post("programs/:id/approve")
  @RequireRoles(...PILOT_APPROVER_ROLES)
  approve(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body() body: { reason: string }
  ) {
    return this.http.approve(actorFromReq(req), id, body.reason);
  }

  @Post("programs/:id/schedule")
  @RequireRoles(...PILOT_ADMIN_ROLES)
  schedule(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body() body: { reason: string }
  ) {
    return this.http.schedule(actorFromReq(req), id, body.reason);
  }

  @Post("programs/:id/activate")
  @RequireRoles(...PILOT_ADMIN_ROLES)
  activate(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body() body: { reason: string }
  ) {
    return this.http.activate(actorFromReq(req), id, body.reason);
  }

  @Post("programs/:id/pause")
  @RequireRoles(...PILOT_ADMIN_ROLES)
  pause(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body() body: { reason: string }
  ) {
    return this.http.pause(actorFromReq(req), id, body.reason);
  }

  @Post("programs/:id/resume")
  @RequireRoles(...PILOT_ADMIN_ROLES)
  resume(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body() body: { reason: string }
  ) {
    return this.http.resume(actorFromReq(req), id, body.reason);
  }

  @Post("programs/:id/suspend")
  @RequireRoles(...PILOT_ADMIN_ROLES)
  suspend(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body() body: { reason: string }
  ) {
    return this.http.suspend(actorFromReq(req), id, body.reason);
  }

  @Post("programs/:id/revoke")
  @RequireRoles(...PILOT_ADMIN_ROLES)
  revoke(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body() body: { reason: string }
  ) {
    return this.http.revoke(actorFromReq(req), id, body.reason);
  }

  @Post("programs/:id/complete")
  @RequireRoles(...PILOT_ADMIN_ROLES)
  complete(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body() body: { reason: string }
  ) {
    return this.http.complete(actorFromReq(req), id, body.reason);
  }

  @Post("programs/:id/providers")
  @RequireRoles(...PILOT_ADMIN_ROLES)
  addProvider(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body() body: { providerUserId: string; facilityId: string }
  ) {
    return this.http.addProvider(actorFromReq(req), id, body);
  }

  @Delete("programs/:id/providers/:providerId")
  @RequireRoles(...PILOT_ADMIN_ROLES)
  removeProvider(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Param("providerId") providerId: string,
    @Body() body: { reason: string }
  ) {
    return this.http.removeProvider(
      actorFromReq(req),
      id,
      providerId,
      body.reason ?? "Revoked"
    );
  }

  @Post("programs/:id/providers/:providerId/training")
  @RequireRoles(...PILOT_ADMIN_ROLES)
  train(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Param("providerId") providerId: string
  ) {
    return this.http.trainProvider(actorFromReq(req), id, providerId);
  }

  @Get("encounters/:encounterId/advisories")
  @RequireRoles(...PILOT_PROVIDER_ROLES)
  advisories(
    @Req() req: AuthReq,
    @Param("encounterId") encounterId: string,
    @Query("facilityId") facilityId: string
  ) {
    return this.http.advisories(actorFromReq(req), encounterId, facilityId);
  }

  @Get("advisories/:exposureId/explanation")
  @RequireRoles(...PILOT_PROVIDER_ROLES)
  explanation(@Param("exposureId") exposureId: string) {
    return this.http.explanation(exposureId);
  }

  @Get("advisories/:exposureId/evidence")
  @RequireRoles(...PILOT_PROVIDER_ROLES)
  evidence(@Param("exposureId") exposureId: string) {
    return this.http.evidence(exposureId);
  }

  @Post("advisories/:exposureId/acknowledge")
  @RequireRoles(...PILOT_PROVIDER_ROLES)
  ack(
    @Req() req: AuthReq,
    @Param("exposureId") exposureId: string,
    @Body() body: { reason?: string }
  ) {
    return this.http.respond(
      actorFromReq(req),
      exposureId,
      "ACKNOWLEDGED",
      body.reason
    );
  }

  @Post("advisories/:exposureId/dismiss")
  @RequireRoles(...PILOT_PROVIDER_ROLES)
  dismiss(
    @Req() req: AuthReq,
    @Param("exposureId") exposureId: string,
    @Body() body: { reason?: string }
  ) {
    return this.http.respond(
      actorFromReq(req),
      exposureId,
      "DISMISSED",
      body.reason
    );
  }

  @Post("advisories/:exposureId/disagree")
  @RequireRoles(...PILOT_PROVIDER_ROLES)
  disagree(
    @Req() req: AuthReq,
    @Param("exposureId") exposureId: string,
    @Body() body: { reason?: string }
  ) {
    return this.http.respond(
      actorFromReq(req),
      exposureId,
      "DISAGREED",
      body.reason
    );
  }

  @Get("programs/:id/monitoring")
  @RequireRoles(...PILOT_READ_ROLES)
  monitoring(@Param("id") id: string) {
    return this.http.monitoring(id);
  }

  @Get("programs/:id/safety-events")
  @RequireRoles(...PILOT_READ_ROLES)
  safety(@Param("id") id: string) {
    return this.http.safetyEvents(id);
  }

  @Post("programs/:id/safety-events")
  @RequireRoles(...PILOT_WRITE_ROLES)
  reportSafety(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body()
    body: {
      eventType: string;
      description: string;
      severity?: string;
      requiresSuspension?: boolean;
      exposureId?: string;
    }
  ) {
    return this.http.reportSafety(actorFromReq(req), id, body);
  }

  @Get("programs/:id/audit")
  @RequireRoles(...PILOT_READ_ROLES)
  audit(@Param("id") id: string) {
    return this.http.audit(id);
  }
}
