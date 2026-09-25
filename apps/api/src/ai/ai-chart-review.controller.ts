import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { AiSuggestionFeedbackRequest } from "@medora/shared";
import {
  AllowPlatformPrincipalWithFacilityContext,
  RolesGuard,
  RequireRoles,
} from "../common/guards/roles.guard.js";
import { AiAuditService } from "./audit/ai-audit.service.js";
import { AiFacilityReviewContextService } from "./core/ai-facility-review-context.service.js";
import { ClinicalReviewOrchestratorService } from "./review/clinical-review-orchestrator.service.js";
import { EncounterAiSnapshotBuilder } from "./snapshot/encounter-ai-snapshot.builder.js";

const AI_CHART_REVIEW_ROLES = [
  RoleCode.PROVIDER,
  RoleCode.ADMIN,
  RoleCode.MEDORA_SUPER_ADMIN,
] as const;

type AiReviewLocale = "en" | "fr" | "es";

@Controller("ai/chart-review")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AiChartReviewController {
  constructor(
    private readonly reviewOrchestrator: ClinicalReviewOrchestratorService,
    private readonly snapshotBuilder: EncounterAiSnapshotBuilder,
    private readonly aiAudit: AiAuditService,
    private readonly facilityReviewContext: AiFacilityReviewContextService
  ) {}

  @Get(":encounterId")
  @RequireRoles(...AI_CHART_REVIEW_ROLES)
  @AllowPlatformPrincipalWithFacilityContext()
  async getChartReview(
    @Param("encounterId") encounterId: string,
    @Query("locale") localeValue: string | undefined,
    @Req() req: any
  ) {
    const { facilityId, actorUserId } = this.resolveActor(req);
    // The request locale is retained for backwards compatibility only; the
    // persisted encounter facility language is authoritative.
    void localeValue;
    const { language: locale } = await this.facilityReviewContext.resolve(facilityId, encounterId);

    // AI chart access is PHI-bearing clinical access: the request audit is a\n    // mandatory control, not best-effort telemetry. If persistence fails, fail closed.\n    await this.aiAudit.log("AI_REVIEW_REQUESTED", { facilityId, encounterId }, actorUserId);
    try {
      const output = await this.reviewOrchestrator.run({ facilityId, encounterId, actorUserId }, locale);
      await this.safeAudit(
        "AI_REVIEW_COMPLETED",
        { facilityId, encounterId, snapshotVersion: output.suggestions[0]?.snapshotVersion },
        actorUserId
      );
      return output;
    } catch (error) {
      await this.safeAudit("AI_REVIEW_FAILED", { facilityId, encounterId }, actorUserId);
      throw error;
    }
  }

  @Post(":encounterId/feedback")
  @RequireRoles(...AI_CHART_REVIEW_ROLES)
  @AllowPlatformPrincipalWithFacilityContext()
  async submitSuggestionFeedback(
    @Param("encounterId") encounterId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const { facilityId, actorUserId } = this.resolveActor(req);
    const parsed = AiSuggestionFeedbackRequest.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid AI suggestion feedback");

    const currentSnapshot = await this.snapshotBuilder.build({ facilityId, encounterId, actorUserId });
    if (currentSnapshot.snapshotVersion !== parsed.data.snapshotVersion) {
      throw new ConflictException("AI suggestion is stale; refresh chart review before submitting feedback");
    }

    await this.aiAudit.log(
      parsed.data.rating === "HELPFUL" ? "AI_SUGGESTION_HELPFUL" : "AI_SUGGESTION_NOT_HELPFUL",
      {
        facilityId,
        encounterId,
        snapshotVersion: parsed.data.snapshotVersion,
        suggestionId: parsed.data.suggestionId,
        category: parsed.data.category,
      },
      actorUserId
    );

    return { accepted: true };
  }

  private resolveActor(req: any): { facilityId: string; actorUserId: string } {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    const actorUserId = req.user?.userId;
    if (!facilityId || typeof facilityId !== "string") throw new BadRequestException("Facility ID required");
    if (!actorUserId || typeof actorUserId !== "string") throw new BadRequestException("Authenticated user required");
    return { facilityId, actorUserId };
  }

}
