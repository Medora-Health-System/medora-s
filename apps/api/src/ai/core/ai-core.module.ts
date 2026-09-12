import { Module } from "@nestjs/common";
import { AiConfigService } from "./ai-config.service";
import { AiFeatureFlagsService } from "./ai-feature-flags.service";

@Module({
  providers: [AiConfigService, AiFeatureFlagsService],
  exports: [AiConfigService, AiFeatureFlagsService],
})
export class AiCoreModule {}
