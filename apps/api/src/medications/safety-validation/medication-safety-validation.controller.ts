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
  SAFETY_VALIDATION_ADJUDICATOR_ROLES,
  SAFETY_VALIDATION_ADMIN_ROLES,
  SAFETY_VALIDATION_READ_ROLES,
  SAFETY_VALIDATION_REVIEWER_ROLES,
} from "./medication-safety-validation.roles";
import { MedicationSafetyValidationHttpService } from "./medication-safety-validation.http-service";

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

@Controller("medications/safety-validation")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationSafetyValidationController {
  constructor(
    private readonly validation: MedicationSafetyValidationHttpService
  ) {}

  // —— Coverage ——
  @Get("coverage/dashboard")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  coverageDashboard() {
    return this.validation.coverageDashboard();
  }

  @Get("coverage/families")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  coverageFamilies(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.validation.listFamilies(
      limit ? Number(limit) : 100,
      offset ? Number(offset) : 0
    );
  }

  @Get("coverage/families/:id")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  coverageFamily(@Param("id") id: string) {
    return this.validation.getFamily(id);
  }

  @Post("coverage/recalculate")
  @RequireRoles(...SAFETY_VALIDATION_ADMIN_ROLES)
  recalculate(@Req() req: AuthReq) {
    return this.validation.recalculateCoverage(actorFromReq(req));
  }

  @Get("coverage/gaps")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  coverageGaps() {
    return this.validation.coverageGaps();
  }

  // —— Cases ——
  @Get("cases")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  cases(
    @Query("status") status?: string,
    @Query("reviewerUserId") reviewerUserId?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.validation.listCases({
      status,
      reviewerUserId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get("cases/:id")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  caseDetail(@Param("id") id: string, @Req() req: AuthReq) {
    return this.validation.getCase(id, actorFromReq(req));
  }

  @Post("cases/:id/assign")
  @RequireRoles(...SAFETY_VALIDATION_ADMIN_ROLES)
  assign(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.validation.assignCase(id, body, actorFromReq(req));
  }

  @Post("cases/:id/review")
  @RequireRoles(...SAFETY_VALIDATION_REVIEWER_ROLES)
  review(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.validation.reviewCase(id, body, actorFromReq(req));
  }

  @Post("cases/:id/defer")
  @RequireRoles(...SAFETY_VALIDATION_REVIEWER_ROLES)
  defer(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.validation.deferCase(id, body, actorFromReq(req));
  }

  @Post("cases/:id/exclude")
  @RequireRoles(...SAFETY_VALIDATION_REVIEWER_ROLES)
  exclude(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.validation.excludeCase(id, body, actorFromReq(req));
  }

  // —— Adjudication ——
  @Get("adjudications")
  @RequireRoles(...SAFETY_VALIDATION_ADJUDICATOR_ROLES)
  adjudications() {
    return this.validation.listAdjudications();
  }

  @Get("adjudications/:id")
  @RequireRoles(...SAFETY_VALIDATION_ADJUDICATOR_ROLES)
  adjudication(@Param("id") id: string) {
    return this.validation.getAdjudication(id);
  }

  @Post("adjudications/:id/resolve")
  @RequireRoles(...SAFETY_VALIDATION_ADJUDICATOR_ROLES)
  resolveAdj(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.validation.resolveAdj(id, body, actorFromReq(req));
  }

  // —— Batches ——
  @Get("batches")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  batches() {
    return this.validation.listBatches();
  }

  @Get("batches/:id")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  batch(@Param("id") id: string) {
    return this.validation.getBatch(id);
  }

  @Post("batches")
  @RequireRoles(...SAFETY_VALIDATION_ADMIN_ROLES)
  createBatch(@Body() body: unknown, @Req() req: AuthReq) {
    return this.validation.createBatch(body, actorFromReq(req));
  }

  @Post("batches/:id/start")
  @RequireRoles(...SAFETY_VALIDATION_ADMIN_ROLES)
  startBatch(@Param("id") id: string, @Req() req: AuthReq) {
    return this.validation.startBatch(id, actorFromReq(req));
  }

  @Post("batches/:id/complete")
  @RequireRoles(...SAFETY_VALIDATION_ADMIN_ROLES)
  completeBatch(@Param("id") id: string, @Req() req: AuthReq) {
    return this.validation.completeBatch(id, actorFromReq(req));
  }

  @Post("batches/:id/lock")
  @RequireRoles(...SAFETY_VALIDATION_ADMIN_ROLES)
  lockBatch(@Param("id") id: string, @Req() req: AuthReq) {
    return this.validation.lockBatch(id, actorFromReq(req));
  }

  // —— Reference sets ——
  @Get("reference-sets")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  referenceSets() {
    return this.validation.listReferenceSets();
  }

  @Get("reference-sets/:id")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  referenceSet(@Param("id") id: string) {
    return this.validation.getReferenceSet(id);
  }

  @Post("reference-sets")
  @RequireRoles(...SAFETY_VALIDATION_ADMIN_ROLES)
  createReferenceSet(@Body() body: unknown, @Req() req: AuthReq) {
    return this.validation.createReferenceSet(body, actorFromReq(req));
  }

  @Post("reference-sets/:id/run")
  @RequireRoles(...SAFETY_VALIDATION_ADMIN_ROLES)
  runReferenceSet(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.validation.runReferenceSet(id, body, actorFromReq(req));
  }

  @Post("reference-sets/:id/approve")
  @RequireRoles(...SAFETY_VALIDATION_ADMIN_ROLES)
  approveReferenceSet(@Param("id") id: string, @Req() req: AuthReq) {
    return this.validation.approveReferenceSet(id, actorFromReq(req));
  }

  // —— Analytics ——
  @Get("analytics/accuracy")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  accuracy() {
    return this.validation.analyticsAccuracy();
  }

  @Get("analytics/severity")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  severity() {
    return this.validation.analyticsSeverity();
  }

  @Get("analytics/burden")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  burden() {
    return this.validation.analyticsBurden();
  }

  @Get("analytics/emergency-contexts")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  emergency() {
    return this.validation.analyticsEmergency();
  }

  @Get("analytics/reliability")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  reliability() {
    return this.validation.analyticsReliability();
  }

  @Get("analytics/suppressions")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  suppressions() {
    return this.validation.analyticsSuppressions();
  }

  // —— Gaps ——
  @Get("knowledge-gaps")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  knowledgeGaps(@Query("status") status?: string) {
    return this.validation.listKnowledgeGaps(status);
  }

  @Post("knowledge-gaps/:id/transition")
  @RequireRoles(...SAFETY_VALIDATION_REVIEWER_ROLES)
  knowledgeGapTransition(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.validation.transitionKnowledgeGap(id, body, actorFromReq(req));
  }

  @Get("identity-gaps")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  identityGaps(@Query("status") status?: string) {
    return this.validation.listIdentityGaps(status);
  }

  @Post("identity-gaps/:id/transition")
  @RequireRoles(...SAFETY_VALIDATION_REVIEWER_ROLES)
  identityGapTransition(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.validation.transitionIdentityGap(id, body, actorFromReq(req));
  }

  @Get("context-gaps")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  contextGaps(@Query("status") status?: string) {
    return this.validation.listContextGaps(status);
  }

  @Post("context-gaps/:id/transition")
  @RequireRoles(...SAFETY_VALIDATION_REVIEWER_ROLES)
  contextGapTransition(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.validation.transitionContextGap(id, body, actorFromReq(req));
  }

  // —— Readiness ——
  @Get("readiness/policies")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  policies() {
    return this.validation.listPolicies();
  }

  @Post("readiness/policies")
  @RequireRoles(...SAFETY_VALIDATION_ADMIN_ROLES)
  createPolicy(@Body() body: unknown, @Req() req: AuthReq) {
    return this.validation.createPolicy(body, actorFromReq(req));
  }

  @Post("readiness/policies/:id/transition")
  @RequireRoles(...SAFETY_VALIDATION_ADMIN_ROLES)
  transitionPolicy(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.validation.transitionPolicy(id, body, actorFromReq(req));
  }

  @Post("readiness/policies/:id/approve")
  @RequireRoles(...SAFETY_VALIDATION_ADMIN_ROLES)
  approvePolicy(@Param("id") id: string, @Req() req: AuthReq) {
    return this.validation.approvePolicy(id, actorFromReq(req));
  }

  @Get("readiness/assessments")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  assessments() {
    return this.validation.listAssessments();
  }

  @Post("readiness/assess")
  @RequireRoles(...SAFETY_VALIDATION_ADMIN_ROLES)
  assess(@Body() body: unknown, @Req() req: AuthReq) {
    return this.validation.assess(body, actorFromReq(req));
  }

  @Get("readiness/candidates")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  candidates() {
    return this.validation.listCandidates();
  }

  @Post("readiness/candidates")
  @RequireRoles(...SAFETY_VALIDATION_ADMIN_ROLES)
  createCandidate(@Body() body: unknown, @Req() req: AuthReq) {
    return this.validation.createCandidate(body, actorFromReq(req));
  }

  @Get("readiness/attestations")
  @RequireRoles(...SAFETY_VALIDATION_READ_ROLES)
  attestations() {
    return this.validation.listAttestations();
  }

  @Post("readiness/attest")
  @RequireRoles(...SAFETY_VALIDATION_ADMIN_ROLES)
  attest(@Body() body: unknown, @Req() req: AuthReq) {
    return this.validation.attest(body, actorFromReq(req));
  }
}
