import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { AiModule } from "./ai.module";
import { AI_MODEL_PROVIDER } from "./providers/ai-provider.tokens";
import { AiModelProvider } from "./providers/ai-model-provider.interface";
import { NoOpAiProvider } from "./providers/no-op-ai-provider.service";
import { AiConfigService } from "./core/ai-config.service";
import { AiFeatureFlagsService } from "./core/ai-feature-flags.service";
import { AiAuditService } from "./audit/ai-audit.service";

describe("AiModule", () => {
  it("compiles and exposes the no-op provider by default", async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({})],
        }),
        AiModule,
      ],
      providers: [
        { provide: PrismaService, useValue: { $connect: async () => {}, $disconnect: async () => {} } },
      ],
    }).compile();

    const provider = module.get<AiModelProvider>(AI_MODEL_PROVIDER);
    expect(provider).toBeInstanceOf(NoOpAiProvider);
    expect(provider.providerName).toBe("NO_OP");

    expect(module.get(AiConfigService)).toBeDefined();
    expect(module.get(AiFeatureFlagsService)).toBeDefined();
    expect(module.get(AiAuditService)).toBeDefined();
  });

  it("disables AI by default", async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({})],
        }),
        AiModule,
      ],
      providers: [
        { provide: PrismaService, useValue: { $connect: async () => {}, $disconnect: async () => {} } },
      ],
    }).compile();

    const flags = module.get(AiFeatureFlagsService);
    expect(flags.isAiEnabled()).toBe(false);
  });
});
