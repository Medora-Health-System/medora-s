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
  ER_ADMIN_ROLES,
  ER_READ_ROLES,
  ER_WRITE_ROLES,
} from "./medication-expert-review.roles";
import { MedicationExpertReviewHttpService } from "./medication-expert-review.http-service";

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

@Controller("medications")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationExpertReviewController {
  constructor(private readonly http: MedicationExpertReviewHttpService) {}

  @Get("review/dashboard")
  @RequireRoles(...ER_READ_ROLES)
  reviewDashboard() {
    return this.http.dashboard();
  }

  @Post("review/batch")
  @RequireRoles(...ER_ADMIN_ROLES)
  createBatch(@Req() req: AuthReq) {
    return this.http.createBatch(actorFromReq(req));
  }

  @Post("review/seed-domains")
  @RequireRoles(...ER_ADMIN_ROLES)
  seed(@Req() req: AuthReq) {
    return this.http.seed(actorFromReq(req));
  }

  @Post("review/clinical")
  @RequireRoles(...ER_WRITE_ROLES)
  clinical(@Req() req: AuthReq) {
    return this.http.clinicalReview(actorFromReq(req));
  }

  @Post("review/safety")
  @RequireRoles(...ER_WRITE_ROLES)
  safety(@Req() req: AuthReq) {
    return this.http.safetyReview(actorFromReq(req));
  }

  @Post("review/consistency")
  @RequireRoles(...ER_WRITE_ROLES)
  consistency(@Req() req: AuthReq) {
    return this.http.consistency(actorFromReq(req));
  }

  @Post("review/pipeline")
  @RequireRoles(...ER_ADMIN_ROLES)
  pipeline(@Req() req: AuthReq) {
    return this.http.pipeline(actorFromReq(req));
  }

  @Get("review/history")
  @RequireRoles(...ER_READ_ROLES)
  history() {
    return {
      note: "Audit trail via MedicationExpertReviewAuditEvent; use dashboard metrics.",
      KnowledgeControlsPatientCare: false,
    };
  }

  @Get("quality/dashboard")
  @RequireRoles(...ER_READ_ROLES)
  qualityDashboard() {
    return this.http.dashboard();
  }

  @Post("quality/calculate")
  @RequireRoles(...ER_ADMIN_ROLES)
  qualityCalculate(@Req() req: AuthReq) {
    return this.http.quality(actorFromReq(req));
  }

  @Get("shadow/dashboard")
  @RequireRoles(...ER_READ_ROLES)
  shadowDashboard() {
    return this.http.dashboard();
  }

  @Post("shadow/qualify")
  @RequireRoles(...ER_ADMIN_ROLES)
  shadowQualify(@Req() req: AuthReq) {
    return this.http.qualifyShadow(actorFromReq(req));
  }

  @Post("shadow/approve")
  @RequireRoles(...ER_ADMIN_ROLES)
  shadowApprove(@Req() req: AuthReq) {
    return this.http.qualifyShadow(actorFromReq(req));
  }

  @Get("conflicts")
  @RequireRoles(...ER_READ_ROLES)
  listConflicts() {
    return this.http.conflicts();
  }

  @Post("conflicts/:id/resolve")
  @RequireRoles(...ER_ADMIN_ROLES)
  resolveConflict(
    @Param("id") id: string,
    @Body() body: { resolutionNotes?: string },
    @Req() req: AuthReq
  ) {
    return this.http.resolveConflict(
      id,
      body?.resolutionNotes ?? "",
      actorFromReq(req)
    );
  }
}
