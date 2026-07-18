import {
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
  RXNORM_PILOT_ADMIN_ROLES,
  RXNORM_REVIEW_READ_ROLES,
  RXNORM_REVIEW_WRITE_ROLES,
} from "../rxnorm-review/rxnorm-review.roles";
import { MedicationSafetyEvaluationHttpService } from "./medication-safety-evaluation.http-service";

type AuthReq = Request & {
  user?: { userId?: string; facilityId?: string };
  userRole?: string;
};

function actorFromReq(req: AuthReq) {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedException();
  return {
    userId,
    facilityId: req.user?.facilityId,
    roles: req.userRole ? [String(req.userRole)] : ["MEDICATION_REVIEWER"],
  };
}

@Controller("medications/safety-evaluation")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationSafetyEvaluationController {
  constructor(private readonly evaluation: MedicationSafetyEvaluationHttpService) {}

  @Get("dashboard")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  dashboard() {
    return this.evaluation.dashboard();
  }

  @Get("metrics")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  metrics() {
    return this.evaluation.metrics();
  }

  @Get("runs")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  listRuns(
    @Query("status") status?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.evaluation.listRuns({
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get("runs/:id")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  getRun(@Param("id") id: string) {
    return this.evaluation.getRun(id);
  }

  @Get("findings")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  listFindings(@Query("findingType") findingType?: string) {
    return this.evaluation.listFindings(findingType);
  }

  @Get("findings/:id")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  getFinding(@Param("id") id: string) {
    return this.evaluation.getFinding(id);
  }

  @Get("unresolved-identities")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  unresolved() {
    return this.evaluation.listUnresolvedIdentities();
  }

  @Get("knowledge-conflicts")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  conflicts() {
    return this.evaluation.listKnowledgeConflicts();
  }

  @Get("suppressions")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  suppressions() {
    return this.evaluation.listSuppressions();
  }

  @Post("run-shadow")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  runShadow(@Body() body: unknown, @Req() req: AuthReq) {
    return this.evaluation.runShadow(body, actorFromReq(req));
  }

  @Post("replay")
  @RequireRoles(...RXNORM_PILOT_ADMIN_ROLES)
  replay(@Body() body: unknown, @Req() req: AuthReq) {
    return this.evaluation.replay(body, actorFromReq(req));
  }

  @Post("validate-fixture")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  validateFixture(@Body() body: unknown, @Req() req: AuthReq) {
    return this.evaluation.validateFixture(body, actorFromReq(req));
  }

  @Post("suppressions")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  createSuppression(@Body() body: unknown, @Req() req: AuthReq) {
    return this.evaluation.createSuppression(body, actorFromReq(req));
  }

  @Post("suppressions/:id/transition")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  transitionSuppression(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.evaluation.transitionSuppression(id, body, actorFromReq(req));
  }

  @Post("suppressions/:id/approve")
  @RequireRoles(...RXNORM_PILOT_ADMIN_ROLES)
  approveSuppression(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.evaluation.approveSuppression(id, body, actorFromReq(req));
  }

  @Post("findings/:id/validate")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  classifyFinding(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.evaluation.classifyFinding(id, body, actorFromReq(req));
  }
}
