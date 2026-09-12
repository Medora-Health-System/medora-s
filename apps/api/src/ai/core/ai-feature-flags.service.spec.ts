import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { AiConfigService } from "./ai-config.service";
import { AiFeatureFlagsService } from "./ai-feature-flags.service";
import { AI_PROVIDER } from "./ai.constants";

describe("AiFeatureFlagsService", () => {
  async function createService(env: Record<string, string | undefined>) {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => env],
        }),
      ],
      providers: [AiConfigService, AiFeatureFlagsService],
    }).compile();

    return module.get(AiFeatureFlagsService);
  }

  it("disables AI by default when no provider is configured", async () => {
    const service = await createService({});
    expect(service.isAiEnabled()).toBe(false);
    expect(service.isCategoryEnabled("CLINICAL_SAFETY")).toBe(false);
    expect(service.isFacilityEnabled("fac-1")).toBe(false);
  });

  it("disables AI when provider is NO_OP", async () => {
    const service = await createService({ [AI_PROVIDER]: "NO_OP" });
    expect(service.isAiEnabled()).toBe(false);
  });
});
