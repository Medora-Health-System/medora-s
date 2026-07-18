import {
  BadRequestException,
  Body,
  Controller,
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
  KP_ADMIN_ROLES,
  KP_READ_ROLES,
  KP_WRITE_ROLES,
} from "./medication-knowledge-population.roles";
import { MedicationKnowledgePopulationHttpService } from "./medication-knowledge-population.http-service";

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

@Controller("medications/knowledge-population")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationKnowledgePopulationController {
  constructor(private readonly kp: MedicationKnowledgePopulationHttpService) {}

  @Get("dashboard")
  @RequireRoles(...KP_READ_ROLES)
  dashboard() {
    return this.kp.dashboard();
  }

  @Get("batches")
  @RequireRoles(...KP_READ_ROLES)
  batches() {
    return this.kp.listBatches();
  }

  @Get("batches/:id")
  @RequireRoles(...KP_READ_ROLES)
  batch(@Param("id") id: string) {
    return this.kp.getBatch(id);
  }

  @Post("batches")
  @RequireRoles(...KP_ADMIN_ROLES)
  createBatch(@Req() req: AuthReq) {
    return this.kp.createBatch(actorFromReq(req));
  }

  @Post("batches/:id/transition")
  @RequireRoles(...KP_ADMIN_ROLES)
  transition(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.kp.transition(id, body, actorFromReq(req));
  }

  @Post("batches/:id/lock")
  @RequireRoles(...KP_ADMIN_ROLES)
  lock(@Param("id") id: string, @Req() req: AuthReq) {
    return this.kp.lock(id, actorFromReq(req));
  }

  @Get("batches/:id/manifest")
  @RequireRoles(...KP_READ_ROLES)
  manifest(@Param("id") id: string) {
    return this.kp.manifest(id);
  }

  @Post("batches/:id/manifest/validate")
  @RequireRoles(...KP_WRITE_ROLES)
  validateManifest() {
    return this.kp.validateManifest();
  }

  @Post("batches/:id/manifest/resolve")
  @RequireRoles(...KP_ADMIN_ROLES)
  resolve(@Param("id") id: string, @Req() req: AuthReq) {
    return this.kp.resolve(id, actorFromReq(req));
  }

  @Get("sources")
  @RequireRoles(...KP_READ_ROLES)
  sources() {
    return this.kp.sources();
  }

  @Get("source-versions")
  @RequireRoles(...KP_READ_ROLES)
  sourceVersions() {
    return this.kp.sourceVersions();
  }

  @Post("source-versions/validate")
  @RequireRoles(...KP_WRITE_ROLES)
  validateSources() {
    return { valid: true, note: "Reuse Phase 8/9 source routes for creation." };
  }

  @Post("batches/:id/preview")
  @RequireRoles(...KP_ADMIN_ROLES)
  preview(@Param("id") id: string, @Req() req: AuthReq) {
    return this.kp.preview(id, actorFromReq(req));
  }

  @Post("batches/:id/dry-run")
  @RequireRoles(...KP_ADMIN_ROLES)
  dryRun(@Param("id") id: string, @Req() req: AuthReq) {
    return this.kp.dryRun(id, actorFromReq(req));
  }

  @Post("batches/:id/execute-drafts")
  @RequireRoles(...KP_ADMIN_ROLES)
  execute(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.kp.executeDrafts(id, body, actorFromReq(req));
  }

  @Post("batches/:id/rollback")
  @RequireRoles(...KP_ADMIN_ROLES)
  rollback(@Param("id") id: string, @Req() req: AuthReq) {
    return this.kp.rollback(id, actorFromReq(req));
  }

  @Post("batches/:id/resume")
  @RequireRoles(...KP_ADMIN_ROLES)
  resume(@Param("id") id: string, @Req() req: AuthReq) {
    return this.kp.resume(id, actorFromReq(req));
  }

  @Get("conflicts")
  @RequireRoles(...KP_READ_ROLES)
  conflicts(@Query("batchId") batchId?: string) {
    return this.kp.conflicts(batchId);
  }

  @Get("conflicts/:id")
  @RequireRoles(...KP_READ_ROLES)
  async conflict(@Param("id") id: string) {
    const rows = await this.kp.conflicts();
    return rows.find((r) => r.id === id) ?? null;
  }

  @Post("conflicts/:id/resolve")
  @RequireRoles(...KP_ADMIN_ROLES)
  resolveConflict(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.kp.resolveConflict(id, body, actorFromReq(req));
  }

  @Get("duplicates")
  @RequireRoles(...KP_READ_ROLES)
  duplicates() {
    return this.kp.duplicatesCheck();
  }

  @Post("duplicates/check")
  @RequireRoles(...KP_WRITE_ROLES)
  duplicatesCheck() {
    return this.kp.duplicatesCheck();
  }

  @Get("coverage")
  @RequireRoles(...KP_READ_ROLES)
  coverage() {
    return this.kp.coverage();
  }

  @Get("coverage/:familyKey")
  @RequireRoles(...KP_READ_ROLES)
  async coverageFamily(@Param("familyKey") familyKey: string) {
    const dash = await this.kp.coverage();
    return { familyKey, dashboard: dash };
  }

  @Post("coverage/recalculate")
  @RequireRoles(...KP_ADMIN_ROLES)
  coverageRecalc(@Req() req: AuthReq) {
    return this.kp.coverageRecalculate(actorFromReq(req));
  }

  @Get("shadow-eligibility")
  @RequireRoles(...KP_READ_ROLES)
  shadowEligibility(@Query("batchId") batchId?: string) {
    return this.kp.shadowEligibility(batchId);
  }

  @Post("shadow-eligibility/recalculate")
  @RequireRoles(...KP_ADMIN_ROLES)
  async shadowRecalc(@Body() body: unknown, @Req() req: AuthReq) {
    const batchId = zBatchId(body);
    return this.kp.shadowEligibilityRecalculate(batchId, actorFromReq(req));
  }

  @Get("certification")
  @RequireRoles(...KP_READ_ROLES)
  certification() {
    return {
      certificationId:
        "MEDUI.MEDICATION_INTELLIGENCE_PHASE_12_CONTROLLED_EMERGENCY_MEDICATION_CLINICAL_SAFETY_KNOWLEDGE_POPULATION",
      ClinicalActivationEnabled: false,
      ProviderFacingAlertsEnabled: false,
      OrderBlockingEnabled: false,
    };
  }

  @Post("certification/run")
  @RequireRoles(...KP_ADMIN_ROLES)
  certificationRun() {
    return {
      note: "Use CLI medication:knowledge-population:certify / medication:certify:phase12",
      ClinicalActivationEnabled: false,
    };
  }
}

function zBatchId(body: unknown): string {
  if (!body || typeof body !== "object" || !(body as any).batchId) {
    throw new BadRequestException("batchId required");
  }
  return String((body as any).batchId);
}
