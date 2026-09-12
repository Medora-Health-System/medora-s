import { Module, Provider } from "@nestjs/common";
import { AiCoreModule } from "../core/ai-core.module";
import { AiConfigService } from "../core/ai-config.service";
import { AiModelProvider } from "./ai-model-provider.interface";
import { NoOpAiProvider } from "./no-op-ai-provider.service";
import { AI_MODEL_PROVIDER } from "./ai-provider.tokens";

const providerFactory: Provider = {
  provide: AI_MODEL_PROVIDER,
  useFactory: (config: AiConfigService): AiModelProvider => {
    // Phase 1A: only the no-op provider exists. Future adapters are selected
    // here once provider review and contractual controls are complete.
    const provider = config.getProvider();
    switch (provider) {
      case "NO_OP":
      default:
        return new NoOpAiProvider();
    }
  },
  inject: [AiConfigService],
};

@Module({
  imports: [AiCoreModule],
  providers: [NoOpAiProvider, providerFactory],
  exports: [AI_MODEL_PROVIDER, NoOpAiProvider],
})
export class AiProviderModule {}
