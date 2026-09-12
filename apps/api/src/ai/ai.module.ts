import { Module } from "@nestjs/common";
import { AiCoreModule } from "./core/ai-core.module";
import { AiProviderModule } from "./providers/ai-provider.module";
import { AiAuditModule } from "./audit/ai-audit.module";

/**
 * Medora AI backend foundation module.
 *
 * Phase 1A registers only provider-agnostic, no-op infrastructure. No routes,
 * no clinical engines, no external model connections, and no database changes.
 */
@Module({
  imports: [AiCoreModule, AiProviderModule, AiAuditModule],
  exports: [AiCoreModule, AiProviderModule, AiAuditModule],
})
export class AiModule {}
