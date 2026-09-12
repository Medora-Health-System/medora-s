import { Module } from "@nestjs/common";
import { AiCoreModule } from "./core/ai-core.module";
import { AiProviderModule } from "./providers/ai-provider.module";
import { AiAuditModule } from "./audit/ai-audit.module";
import { EncounterAiSnapshotModule } from "./snapshot/encounter-ai-snapshot.module";
import { DeterministicReviewModule } from "./review/review.module";
import { ClinicalReviewOrchestratorService } from "./review/clinical-review-orchestrator.service.js";
import { AiChartReviewController } from "./ai-chart-review.controller.js";

/**
 * Medora AI clinical review module.
 *
 * Phase 1E keeps deterministic safety review authoritative while optionally
 * adding a compliance-gated external structured model review. External AI is
 * read-only, schema validated, stale-result protected, and never required for
 * normal clinical workflow.
 */
@Module({
  imports: [
    AiCoreModule,
    AiProviderModule,
    AiAuditModule,
    EncounterAiSnapshotModule,
    DeterministicReviewModule,
  ],
  controllers: [AiChartReviewController],
  providers: [ClinicalReviewOrchestratorService],
  exports: [
    AiCoreModule,
    AiProviderModule,
    AiAuditModule,
    EncounterAiSnapshotModule,
    DeterministicReviewModule,
    ClinicalReviewOrchestratorService,
  ],
})
export class AiModule {}
