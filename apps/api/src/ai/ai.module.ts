import { Module } from "@nestjs/common";
import { AiCoreModule } from "./core/ai-core.module";
import { AiProviderModule } from "./providers/ai-provider.module";
import { AiAuditModule } from "./audit/ai-audit.module";
import { EncounterAiSnapshotModule } from "./snapshot/encounter-ai-snapshot.module";
import { DeterministicReviewModule } from "./review/review.module";

/**
 * Medora AI backend foundation module.
 *
 * Phase 1A registers provider-agnostic, no-op infrastructure. Phase 1C-B adds the
 * deterministic clinical review engine. No routes, no clinical engines, no
 * external model connections, and no database changes.
 */
@Module({
  imports: [AiCoreModule, AiProviderModule, AiAuditModule, EncounterAiSnapshotModule, DeterministicReviewModule],
  exports: [AiCoreModule, AiProviderModule, AiAuditModule, EncounterAiSnapshotModule, DeterministicReviewModule],
})
export class AiModule {}
