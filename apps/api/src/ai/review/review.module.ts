import { Module } from "@nestjs/common";
import { DeterministicReviewEngine } from "./deterministic-review-engine.service.js";

/**
 * Medora AI deterministic clinical review module.
 *
 * Provides the Phase 1C-B deterministic review engine. No routes, no UI, no
 * LLM providers, and no database writes.
 */
@Module({
  providers: [DeterministicReviewEngine],
  exports: [DeterministicReviewEngine],
})
export class DeterministicReviewModule {}
