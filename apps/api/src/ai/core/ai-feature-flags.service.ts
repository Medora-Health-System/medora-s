import { Injectable } from "@nestjs/common";
import { AiConfigService } from "./ai-config.service";

/**
 * Phase 1A feature-gating foundation.
 *
 * AI is disabled by default. In future phases this service can be extended to
 * evaluate facility/organization/category-level configuration once an
 * authoritative feature-flag source exists.
 */
@Injectable()
export class AiFeatureFlagsService {
  constructor(private readonly config: AiConfigService) {}

  isAiEnabled(): boolean {
    // Phase 1A: AI is enabled only when the provider is explicitly configured.
    // The NO_OP default keeps AI off until deliberate opt-in.
    const provider = this.config.getProvider();
    return provider !== "NO_OP";
  }

  isCategoryEnabled(_category: string): boolean {
    return this.isAiEnabled();
  }

  isFacilityEnabled(_facilityId: string): boolean {
    return this.isAiEnabled();
  }
}
