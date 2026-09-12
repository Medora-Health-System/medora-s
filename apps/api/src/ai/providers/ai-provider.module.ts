import { Module, Provider } from "@nestjs/common";
import { AiCoreModule } from "../core/ai-core.module";
import { AiConfigService } from "../core/ai-config.service";
import { AiModelProvider } from "./ai-model-provider.interface";
import { NoOpAiProvider } from "./no-op-ai-provider.service";
import { OpenAiProvider } from "./openai-ai-provider.service";
import { AI_MODEL_PROVIDER } from "./ai-provider.tokens";

const providerFactory: Provider = {
  provide: AI_MODEL_PROVIDER,
  useFactory: (
    config: AiConfigService,
    noOp: NoOpAiProvider,
    openAi: OpenAiProvider
  ): AiModelProvider => {
    switch (config.getProvider()) {
      case "OPENAI": return openAi;
      case "NO_OP":
      default: return noOp;
    }
  },
  inject: [AiConfigService, NoOpAiProvider, OpenAiProvider],
};

@Module({
  imports: [AiCoreModule],
  providers: [NoOpAiProvider, OpenAiProvider, providerFactory],
  exports: [AI_MODEL_PROVIDER, NoOpAiProvider, OpenAiProvider],
})
export class AiProviderModule {}
