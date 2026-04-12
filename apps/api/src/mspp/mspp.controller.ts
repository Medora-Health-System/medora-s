import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { MsppRoleCode } from "@prisma/client";
import { MsppRolesGuard, type MsppRequestContext } from "./guards/mspp-roles.guard";
import { RequireMsppRoles } from "./decorators/require-mspp-roles.decorator";
import { MsppService } from "./mspp.service";
import { msppReviewActionSchema, type MsppReviewActionDto } from "./dto/review-action.dto";
import {
  parseMsppAlertTriageAcknowledge,
  parseMsppAlertTriageAssign,
  parseMsppAlertTriageNote,
  parseMsppAlertTriageStatus,
} from "./dto/mspp-alert-triage.dto";
import { parseCreateMsppDiseaseReportFeedback } from "../public-health/dto/mspp-disease-report-feedback.dto";
import { PublicHealthService } from "../public-health/public-health.service";

type RequestWithJwtAndMspp = {
  user?: { userId: string };
  msppContext?: MsppRequestContext;
};

function msppCtx(req: RequestWithJwtAndMspp): MsppRequestContext {
  const ctx = req.msppContext;
  if (!ctx) {
    throw new ForbiddenException("MSPP context missing");
  }
  return ctx;
}

function parseReviewAction(body: unknown): MsppReviewActionDto {
  const parsed = msppReviewActionSchema.safeParse(body ?? {});
  if (!parsed.success) {
    const msg =
      parsed.error.errors.map((e) => e.message).join(" ") || "Corps de requête invalide.";
    throw new BadRequestException(msg);
  }
  return parsed.data;
}

@Controller("mspp")
@UseGuards(AuthGuard("jwt"), MsppRolesGuard)
export class MsppController {
  constructor(
    private readonly mspp: MsppService,
    private readonly publicHealth: PublicHealthService
  ) {}

  @Get("reviews")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  listReviews(
    @Req() req: RequestWithJwtAndMspp,
    @Query("includeAuditEvents") includeAuditEvents?: string
  ) {
    const inc = includeAuditEvents === "true" || includeAuditEvents === "1";
    return this.mspp.listReviews(msppCtx(req), inc);
  }

  @Post("reviews/:id/department-approve")
  @RequireMsppRoles(MsppRoleCode.MSPP_VALIDATOR_DEPT, MsppRoleCode.MSPP_VALIDATOR_CENTRAL)
  departmentApprove(
    @Param("id") id: string,
    @Req() req: RequestWithJwtAndMspp,
    @Body() body: unknown
  ) {
    return this.mspp.departmentApprove(id, msppCtx(req), parseReviewAction(body));
  }

  @Post("reviews/:id/department-reject")
  @RequireMsppRoles(MsppRoleCode.MSPP_VALIDATOR_DEPT, MsppRoleCode.MSPP_VALIDATOR_CENTRAL)
  departmentReject(
    @Param("id") id: string,
    @Req() req: RequestWithJwtAndMspp,
    @Body() body: unknown
  ) {
    return this.mspp.departmentReject(id, msppCtx(req), parseReviewAction(body));
  }

  @Post("reviews/:id/central-approve")
  @RequireMsppRoles(MsppRoleCode.MSPP_VALIDATOR_CENTRAL)
  centralApprove(
    @Param("id") id: string,
    @Req() req: RequestWithJwtAndMspp,
    @Body() body: unknown
  ) {
    return this.mspp.centralApprove(id, msppCtx(req), parseReviewAction(body));
  }

  @Post("reviews/:id/central-reject")
  @RequireMsppRoles(MsppRoleCode.MSPP_VALIDATOR_CENTRAL)
  centralReject(
    @Param("id") id: string,
    @Req() req: RequestWithJwtAndMspp,
    @Body() body: unknown
  ) {
    return this.mspp.centralReject(id, msppCtx(req), parseReviewAction(body));
  }

  @Post("reviews/:id/department-requeue")
  @RequireMsppRoles(MsppRoleCode.MSPP_VALIDATOR_DEPT, MsppRoleCode.MSPP_VALIDATOR_CENTRAL)
  departmentRequeue(@Param("id") id: string, @Req() req: RequestWithJwtAndMspp) {
    return this.mspp.departmentRequeue(id, msppCtx(req));
  }

  @Post("reviews/:id/central-requeue")
  @RequireMsppRoles(MsppRoleCode.MSPP_VALIDATOR_CENTRAL)
  centralRequeue(@Param("id") id: string, @Req() req: RequestWithJwtAndMspp) {
    return this.mspp.centralRequeue(id, msppCtx(req));
  }

  @Get("summary")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  summary(@Req() req: RequestWithJwtAndMspp) {
    return this.mspp.summary(msppCtx(req));
  }

  @Get("trends")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  trends(@Req() req: RequestWithJwtAndMspp) {
    return this.mspp.trends(msppCtx(req));
  }

  @Get("geography")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  geography(@Req() req: RequestWithJwtAndMspp) {
    return this.mspp.geography(msppCtx(req));
  }

  @Get("diseases")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  diseases(@Req() req: RequestWithJwtAndMspp) {
    return this.mspp.diseases(msppCtx(req));
  }

  /** Read-only decision-support signals (7d vs previous 7d); no writes, no stored alert state. */
  @Get("alerts/signals")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  sanitarySignals(@Req() req: RequestWithJwtAndMspp) {
    return this.mspp.sanitarySignals(msppCtx(req));
  }

  /** Commune-level signals (7d vs prior 7d); optional `departmentId` narrows to one geographic department. */
  @Get("alerts/communes")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  communeSanitarySignals(
    @Req() req: RequestWithJwtAndMspp,
    @Query("departmentId") departmentId?: string
  ) {
    const d = departmentId?.trim();
    return this.mspp.communeSanitarySignals(msppCtx(req), d || undefined);
  }

  /** Read-only escalation tiers (catalog governance + existing signal rows); no writes, no epidemic semantics. */
  @Get("alerts/escalations")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  alertEscalations(@Req() req: RequestWithJwtAndMspp) {
    return this.mspp.alertEscalations(msppCtx(req));
  }

  /** Escalation rows merged with internal triage state (same national roles as alerts). */
  @Get("alerts/triage")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  alertTriageSnapshot(@Req() req: RequestWithJwtAndMspp) {
    return this.mspp.alertTriageSnapshot(msppCtx(req));
  }

  /** Users who may receive an alert assignment (active MSPP operational roles). */
  @Get("alerts/triage/assignees")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  alertTriageAssignees() {
    return this.mspp.listAlertTriageAssignees();
  }

  @Post("alerts/triage/acknowledge")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  alertTriageAcknowledge(@Req() req: RequestWithJwtAndMspp, @Body() body: unknown) {
    const actor = req.user?.userId;
    if (!actor) throw new ForbiddenException();
    const dto = parseMsppAlertTriageAcknowledge(body);
    return this.mspp.acknowledgeAlertTriage(msppCtx(req), dto, actor);
  }

  @Post("alerts/triage/status")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  alertTriageStatus(@Req() req: RequestWithJwtAndMspp, @Body() body: unknown) {
    const actor = req.user?.userId;
    if (!actor) throw new ForbiddenException();
    const dto = parseMsppAlertTriageStatus(body);
    return this.mspp.updateAlertTriageStatus(msppCtx(req), dto, actor);
  }

  @Post("alerts/triage/note")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  alertTriageNote(@Req() req: RequestWithJwtAndMspp, @Body() body: unknown) {
    const actor = req.user?.userId;
    if (!actor) throw new ForbiddenException();
    const dto = parseMsppAlertTriageNote(body);
    return this.mspp.updateAlertTriageNote(msppCtx(req), dto, actor);
  }

  @Post("alerts/triage/assign")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  alertTriageAssign(@Req() req: RequestWithJwtAndMspp, @Body() body: unknown) {
    const actor = req.user?.userId;
    if (!actor) throw new ForbiddenException();
    const dto = parseMsppAlertTriageAssign(body);
    return this.mspp.assignAlertTriage(msppCtx(req), dto, actor);
  }

  /** Retour qualité structuré vers l’établissement (ne modifie pas la déclaration). */
  @Post("disease-reports/feedback")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  createDiseaseReportFeedback(@Body() body: unknown, @Req() req: RequestWithJwtAndMspp) {
    const userId = req.user?.userId;
    if (!userId) throw new ForbiddenException();
    const dto = parseCreateMsppDiseaseReportFeedback(body);
    return this.publicHealth.createMsppDiseaseReportFeedbackFromMspp(dto, userId);
  }

  /** Liste des retours pour une déclaration (lecture nationale MSPP). */
  @Get("disease-reports/:reportId/feedback")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  listDiseaseReportFeedback(@Param("reportId") reportId: string) {
    return this.publicHealth.listMsppDiseaseReportFeedbackForReport(reportId, {});
  }

  /** Read-only validation pipeline analytics (snapshot + audit-based timing in lookback window). */
  @Get("analytics/validation")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  validationAnalytics(@Req() req: RequestWithJwtAndMspp) {
    return this.mspp.validationAnalytics(msppCtx(req));
  }
}
