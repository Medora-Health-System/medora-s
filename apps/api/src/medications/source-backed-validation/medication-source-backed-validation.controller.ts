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
  SBV_ADMIN_ROLES,
  SBV_READ_ROLES,
} from "./medication-source-backed-validation.roles";
import { MedicationSourceBackedValidationHttpService } from "./medication-source-backed-validation.http-service";

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

@Controller("medications/source-backed-validation")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationSourceBackedValidationController {
  constructor(private readonly sbv: MedicationSourceBackedValidationHttpService) {}

  @Get("dashboard")
  @RequireRoles(...SBV_READ_ROLES)
  dashboard() {
    return this.sbv.dashboard();
  }

  @Get("baseline")
  @RequireRoles(...SBV_READ_ROLES)
  baseline() {
    return this.sbv.baseline();
  }

  @Get("identity-cases")
  @RequireRoles(...SBV_READ_ROLES)
  identityCases() {
    return this.sbv.identityCases();
  }

  @Get("identity-cases/:id")
  @RequireRoles(...SBV_READ_ROLES)
  identityCase(@Param("id") id: string) {
    return this.sbv.identityCase(id);
  }

  @Post("identity-cases/:id/investigate")
  @RequireRoles(...SBV_ADMIN_ROLES)
  investigate(@Req() req: AuthReq) {
    return this.sbv.investigate(actorFromReq(req));
  }

  @Post("identity-cases/investigate")
  @RequireRoles(...SBV_ADMIN_ROLES)
  investigateAll(@Req() req: AuthReq) {
    return this.sbv.investigate(actorFromReq(req));
  }

  @Post("identity-cases/:id/resolve")
  @RequireRoles(...SBV_ADMIN_ROLES)
  resolve(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.sbv.resolve(id, body, actorFromReq(req));
  }

  @Post("identity-cases/:id/defer")
  @RequireRoles(...SBV_ADMIN_ROLES)
  defer(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.sbv.defer(id, body, actorFromReq(req));
  }

  @Get("waves")
  @RequireRoles(...SBV_READ_ROLES)
  waves() {
    return this.sbv.waves();
  }

  @Get("waves/:id")
  @RequireRoles(...SBV_READ_ROLES)
  wave(@Param("id") id: string) {
    return this.sbv.wave(id);
  }

  @Post("waves")
  @RequireRoles(...SBV_ADMIN_ROLES)
  createWave(@Req() req: AuthReq) {
    return this.sbv.createWave(actorFromReq(req));
  }

  @Post("waves/:id/select-families")
  @RequireRoles(...SBV_ADMIN_ROLES)
  selectFamilies(@Req() req: AuthReq) {
    return this.sbv.selectFamilies(actorFromReq(req));
  }

  @Post("waves/:id/lock")
  @RequireRoles(...SBV_ADMIN_ROLES)
  lock(@Param("id") id: string, @Req() req: AuthReq) {
    return this.sbv.lock(id, actorFromReq(req));
  }

  @Get("waves/:id/source-readiness")
  @RequireRoles(...SBV_READ_ROLES)
  async getSourceReadiness(@Param("id") id: string) {
    return this.sbv.wave(id);
  }

  @Post("waves/:id/source-readiness/recalculate")
  @RequireRoles(...SBV_ADMIN_ROLES)
  sourceReadiness(@Param("id") id: string, @Req() req: AuthReq) {
    return this.sbv.sourceReadiness(id, actorFromReq(req));
  }

  @Post("records/:id/approve-shadow")
  @RequireRoles(...SBV_ADMIN_ROLES)
  approveShadow(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.sbv.approveShadow(id, body, actorFromReq(req));
  }

  @Get("review/clinical")
  @RequireRoles(...SBV_READ_ROLES)
  reviewClinical() {
    return { note: "Reuse Phase 8 clinical knowledge review queues.", ClinicalActivationEnabled: false };
  }

  @Get("review/pharmacy")
  @RequireRoles(...SBV_READ_ROLES)
  reviewPharmacy() {
    return { note: "Reuse Phase 8/9 pharmacist review paths.", ClinicalActivationEnabled: false };
  }

  @Get("review/medical")
  @RequireRoles(...SBV_READ_ROLES)
  reviewMedical() {
    return { note: "Medical review required for high-risk content.", ClinicalActivationEnabled: false };
  }

  @Get("review/adjudication")
  @RequireRoles(...SBV_READ_ROLES)
  reviewAdjudication() {
    return { note: "Reuse Phase 11 adjudication for dual/blind disagreements." };
  }

  @Get("eligibility")
  @RequireRoles(...SBV_READ_ROLES)
  async eligibility() {
    const dash = await this.sbv.dashboard();
    return {
      FamiliesShadowEvaluable: dash.FamiliesShadowEvaluable,
      ClinicalRecordsApprovedForShadow: dash.ClinicalRecordsApprovedForShadow,
    };
  }

  @Post("eligibility/recalculate")
  @RequireRoles(...SBV_ADMIN_ROLES)
  async eligibilityRecalc(@Req() req: AuthReq) {
    return this.sbv.pipeline(actorFromReq(req));
  }

  @Get("reference-sets")
  @RequireRoles(...SBV_READ_ROLES)
  referenceSets() {
    return this.sbv.listReferenceSets();
  }

  @Post("reference-sets")
  @RequireRoles(...SBV_ADMIN_ROLES)
  createReferenceSet(@Req() req: AuthReq) {
    return this.sbv.createReferenceSet(actorFromReq(req));
  }

  @Get("shadow-runs")
  @RequireRoles(...SBV_READ_ROLES)
  async shadowRuns() {
    const results = await this.sbv.results();
    return results;
  }

  @Post("shadow-runs")
  @RequireRoles(...SBV_ADMIN_ROLES)
  createShadowRun(@Req() req: AuthReq) {
    return this.sbv.runShadow(actorFromReq(req));
  }

  @Post("shadow-runs/:id/execute")
  @RequireRoles(...SBV_ADMIN_ROLES)
  executeShadow(@Req() req: AuthReq) {
    return this.sbv.runShadow(actorFromReq(req));
  }

  @Get("results/accuracy")
  @RequireRoles(...SBV_READ_ROLES)
  async accuracy() {
    return (await this.sbv.results()).accuracy;
  }

  @Get("results/missed-findings")
  @RequireRoles(...SBV_READ_ROLES)
  async missed() {
    return { MissedFindings: (await this.sbv.results()).missedFindings };
  }

  @Get("results/unexpected-findings")
  @RequireRoles(...SBV_READ_ROLES)
  async unexpected() {
    return { UnexpectedFindings: (await this.sbv.results()).unexpectedFindings };
  }

  @Get("results/severity")
  @RequireRoles(...SBV_READ_ROLES)
  async severity() {
    return (await this.sbv.results()).severity;
  }

  @Get("results/performance")
  @RequireRoles(...SBV_READ_ROLES)
  async performance() {
    return (await this.sbv.results()).performance;
  }

  @Get("results/gaps")
  @RequireRoles(...SBV_READ_ROLES)
  async gaps() {
    return (await this.sbv.results()).gaps;
  }

  @Get("certification")
  @RequireRoles(...SBV_READ_ROLES)
  certification() {
    return this.sbv.certification();
  }

  @Post("certification/run")
  @RequireRoles(...SBV_ADMIN_ROLES)
  certificationRun() {
    return {
      note: "Use CLI medication:source-backed-validation:certify / medication:certify:phase13",
      ClinicalActivationEnabled: false,
    };
  }
}
