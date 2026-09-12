import { Module } from "@nestjs/common";
import { AiCoreModule } from "./core/ai-core.module";
import { AiProviderModule } from "./providers/ai-provider.module";
import { AiAuditModule } from "./audit/ai-audit.module";
import { EncounterAiSnapshotModule } from "./snapshot/encounter-ai-snapshot.module";
import { DeterministicReviewModule } from "./review/review.module";
import { AiChartReviewController } from "./ai-chart-review.controller.js";

/**
 * Medora AI backend foundation module.
 *
 * Phase 1D exposes the existing authorized snapshot + deterministic review engine
 * through a provider-only, read-only chart review endpoint. No external model
 * calls, chart writes, coding logic, or persistence are introduced here.
 */
@Module({
  imports: [AiCoreModule, AiProviderModule, AiAuditModule, EncounterAiSnapshotModule, DeterministicReviewModule],
  controllers: [AiChartReviewController],
  exports: [AiCoreModule, AiProviderModule, AiAuditModule, EncounterAiSnapshotModule, DeterministicReviewModule],
})
export class AiModule {}
