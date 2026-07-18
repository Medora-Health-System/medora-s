import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { RolesGuard, RequireRoles } from "../../common/guards/roles.guard";
import {
  OPS_ADMIN_ROLES,
  OPS_READ_ROLES,
  OPS_WRITE_ROLES,
} from "./medication-recommendation-ops.roles";
import { MedicationRecommendationOpsHttpService } from "./medication-recommendation-ops.http-service";

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

@Controller("medications/recommendation-ops")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationRecommendationOpsController {
  constructor(private readonly http: MedicationRecommendationOpsHttpService) {}

  @Get("dashboard")
  @RequireRoles(...OPS_READ_ROLES)
  dashboard() {
    return this.http.dashboard();
  }

  @Get("readiness")
  @RequireRoles(...OPS_READ_ROLES)
  readiness() {
    return this.http.readiness();
  }

  @Get("operational-health")
  @RequireRoles(...OPS_READ_ROLES)
  operationalHealth() {
    return this.http.operationalHealth();
  }

  @Get("quality-metrics")
  @RequireRoles(...OPS_READ_ROLES)
  quality() {
    return this.http.qualityMetrics();
  }

  @Get("safety-metrics")
  @RequireRoles(...OPS_READ_ROLES)
  safety() {
    return this.http.safetyMetrics();
  }

  @Get("drift-metrics")
  @RequireRoles(...OPS_READ_ROLES)
  driftMetrics() {
    return this.http.driftMetrics();
  }

  @Get("governance-summary")
  @RequireRoles(...OPS_READ_ROLES)
  governance() {
    return this.http.governanceSummary();
  }

  @Get("recommendations/:id/explanation")
  @RequireRoles(...OPS_READ_ROLES)
  explanation(@Param("id") id: string) {
    return this.http.explanation(id);
  }

  @Get("recommendations/:id/lineage")
  @RequireRoles(...OPS_READ_ROLES)
  lineage(@Param("id") id: string) {
    return this.http.lineage(id);
  }

  @Get("recommendations/:id/provenance")
  @RequireRoles(...OPS_READ_ROLES)
  provenance(@Param("id") id: string) {
    return this.http.provenance(id);
  }

  @Get("recommendations/:id/version")
  @RequireRoles(...OPS_READ_ROLES)
  version(@Param("id") id: string) {
    return this.http.version(id);
  }

  @Get("replay/:id")
  @RequireRoles(...OPS_READ_ROLES)
  getReplay(@Param("id") id: string) {
    return this.http.getReplay(id);
  }

  @Post("seal-immutable")
  @RequireRoles(...OPS_WRITE_ROLES)
  seal(@Req() req: AuthReq) {
    return this.http.seal(actorFromReq(req));
  }

  @Post("replay")
  @RequireRoles(...OPS_WRITE_ROLES)
  replay(@Req() req: AuthReq, @Body() body: Record<string, unknown>) {
    return this.http.replay(actorFromReq(req), body as never);
  }

  @Post("replay/:id/validate")
  @RequireRoles(...OPS_WRITE_ROLES)
  validate(@Param("id") id: string) {
    return this.http.validateReplay(id);
  }

  @Post("replay/compare")
  @RequireRoles(...OPS_WRITE_ROLES)
  compare(@Req() req: AuthReq, @Body() body: Record<string, unknown>) {
    return this.http.compareReplay(actorFromReq(req), body as never);
  }

  @Post("rollback")
  @RequireRoles(...OPS_ADMIN_ROLES)
  rollback(
    @Req() req: AuthReq,
    @Body() body: { definitionId: string; reason: string }
  ) {
    return this.http.rollback(actorFromReq(req), body);
  }

  @Post("drift/detect")
  @RequireRoles(...OPS_WRITE_ROLES)
  detect(@Req() req: AuthReq) {
    return this.http.detectDrift(actorFromReq(req));
  }

  @Get("drift/alerts")
  @RequireRoles(...OPS_READ_ROLES)
  alerts() {
    return this.http.driftAlerts();
  }

  @Get("rollbacks")
  @RequireRoles(...OPS_READ_ROLES)
  rollbacks() {
    return this.http.rollbacks();
  }

  @Post("regulatory/generate")
  @RequireRoles(...OPS_ADMIN_ROLES)
  regulatory(@Req() req: AuthReq) {
    return this.http.regulatory(actorFromReq(req));
  }

  @Get("audit")
  @RequireRoles(...OPS_READ_ROLES)
  audit() {
    return this.http.audit();
  }
}
