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
  EG_ADMIN_ROLES,
  EG_READ_ROLES,
} from "./medication-evidence-governance.roles";
import { MedicationEvidenceGovernanceHttpService } from "./medication-evidence-governance.http-service";

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

@Controller("medications/evidence-governance")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationEvidenceGovernanceController {
  constructor(private readonly eg: MedicationEvidenceGovernanceHttpService) {}

  @Get("dashboard")
  @RequireRoles(...EG_READ_ROLES)
  dashboard() {
    return this.eg.dashboard();
  }

  @Get("batches")
  @RequireRoles(...EG_READ_ROLES)
  batches() {
    return this.eg.listBatches();
  }

  @Get("batches/:id")
  @RequireRoles(...EG_READ_ROLES)
  batch(@Param("id") id: string) {
    return this.eg.getBatch(id);
  }

  @Post("batches")
  @RequireRoles(...EG_ADMIN_ROLES)
  createBatch(@Req() req: AuthReq) {
    return this.eg.createBatch(actorFromReq(req));
  }

  @Get("sources")
  @RequireRoles(...EG_READ_ROLES)
  sources() {
    return this.eg.listRegistrations();
  }

  @Post("sources/register")
  @RequireRoles(...EG_ADMIN_ROLES)
  register(@Body() body: unknown, @Req() req: AuthReq) {
    return this.eg.registerSources(body, actorFromReq(req));
  }

  @Get("evidence-links")
  @RequireRoles(...EG_READ_ROLES)
  links() {
    return this.eg.listLinks();
  }

  @Post("wave1/complete-provenance")
  @RequireRoles(...EG_ADMIN_ROLES)
  complete(@Body() body: unknown, @Req() req: AuthReq) {
    return this.eg.completeKnowledge(body, actorFromReq(req));
  }

  @Post("completeness/recalculate")
  @RequireRoles(...EG_ADMIN_ROLES)
  completeness(@Req() req: AuthReq) {
    return this.eg.completeness(actorFromReq(req));
  }

  @Post("pipeline")
  @RequireRoles(...EG_ADMIN_ROLES)
  pipeline(@Body() body: unknown, @Req() req: AuthReq) {
    return this.eg.pipeline(body, actorFromReq(req));
  }

  @Get("certification")
  @RequireRoles(...EG_READ_ROLES)
  certification() {
    return this.eg.certification();
  }

  @Post("certification/run")
  @RequireRoles(...EG_ADMIN_ROLES)
  certificationRun() {
    return {
      note: "Use CLI medication:evidence-governance:certify / medication:certify:phase14a",
      ClinicalActivationEnabled: false,
      KnowledgeControlsPatientCare: false,
    };
  }
}
