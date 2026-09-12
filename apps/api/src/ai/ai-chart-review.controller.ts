import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { AiSuggestionFeedbackRequest } from "@medora/shared";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard.js";
import { AiAuditService } from "./audit/ai-audit.service.js";
import { ClinicalReviewOrchestratorService } from "./review/clinical-review-orchestrator.service.js";
import { EncounterAiSnapshotBuilder } from "./snapshot/encounter-ai-snapshot.builder.js";

@Controller("ai/chart-review")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AiChartReviewController {
  constructor(
    private readonly reviewOrchestrator: ClinicalReviewOrchestratorService,
    private readonly snapshotBuilder: EncounterAiSnapshotBuilder,
    private readonly aiAudit: AiAuditService
  ) {}

  @Get(":encounterId")
  @RequireRoles(RoleCode.PROVIDER)
  async getChartReview(@Param("encounterId") encounterId: string, @Req() req: any) {
    const { facilityId, actorUserId } = this.resolveActor(req);

    await this.safeAudit("AI_REVIEW_REQUESTED", { facilityId, encounterId }, actorUserId);
    try {
      const output = await this.reviewOrchestrator.run({
        facilityId,
        encounterId,
        actorUserId,
      });
      await this.safeAudit(
        "AI_REVIEW_COMPLETED",
        {
          facilityId,
          encounterId,
          snapshotVersion: output.suggestions[0]?.snapshotVersion,
        },
        actorUserId
      );
      return output;
    } catch (error) {
      await this.safeAudit("AI_REVIEW_FAILED", { facilityId, encounterId }, actorUserId);
      throw error;
    }
  }

  @Post(":encounterId/feedback")
  @RequireRoles(RoleCode.PROVIDER)
  async submitSuggestionFeedback(
    @Param("encounterId") encounterId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const { facilityId, actorUserId } = this.resolveActor(req);
    const parsed = AiSuggestionFeedbackRequest.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid AI suggestion feedback");
    }

    // Rebuild through the same authorized snapshot boundary used by chart
    // review. This prevents feedback from being accepted for an encounter the
    // actor cannot currently access and rejects feedback for stale suggestions.
    const currentSnapshot = await this.snapshotBuilder.build({
      facilityId,
      encounterId,
      actorUserId,
    });
    if (currentSnapshot.snapshotVersion !== parsed.data.snapshotVersion) {
      throw new ConflictException("AI suggestion is stale; refresh chart review before submitting feedback");
    }

    await this.safeAudit(
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

    if (!facilityId || typeof facilityId !== "string") {
      throw new BadRequestException("Facility ID required");
    }
    if (!actorUserId || typeof actorUserId !== "string") {
      throw new BadRequestException("Authenticated user required");
    }
    return { facilityId, actorUserId };
  }

  private async safeAudit(
    action: Parameters<AiAuditService["log"]>[0],
    metadata: Parameters<AiAuditService["log"]>[1],
    actorUserId: string
  ): Promise<void> {
    try {
      await this.aiAudit.log(action, metadata, actorUserId);
    } catch {
      // AI audit telemetry must never block clinical care or the read-only
      // decision-support response. The underlying audit service remains the
      // source of truth when available; no PHI is emitted here on failure.
    }
  }
}
