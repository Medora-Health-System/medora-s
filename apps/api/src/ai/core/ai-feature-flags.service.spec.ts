import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { AiConfigService } from "./ai-config.service";
import { AiFeatureFlagsService } from "./ai-feature-flags.service";
import { AI_PROVIDER } from "./ai.constants";
import { PrismaService } from "../../prisma/prisma.service";

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
      providers: [AiConfigService, AiFeatureFlagsService, { provide: PrismaService, useValue: { facilityConfiguration: { findUnique: jest.fn(async ({ where }: any) => env.__FACILITY_ENABLED === "true" ? { settingsJson: { medoraAssist: { externalClinicalReviewEnabled: true } }, facility: { isActive: true } } : null) } } }],
    }).compile();

    return module.get(AiFeatureFlagsService);
  }

  it("disables AI by default when no provider is configured", async () => {
    const service = await createService({});
    expect(service.isAiEnabled()).toBe(false);
    expect(service.isCategoryEnabled("CLINICAL_SAFETY")).toBe(false);
    expect(await service.isFacilityEnabled("fac-1")).toBe(false);
  });

  it("keeps external AI off when provider is configured but facility is not explicitly allowlisted", async () => {
    const service = await createService({ [AI_PROVIDER]: "OPENAI" });
    const prior = process.env.MEDORA_AI_EXTERNAL_FACILITY_IDS;
    try {
      delete process.env.MEDORA_AI_EXTERNAL_FACILITY_IDS;
      expect(await service.isFacilityEnabled("11111111-1111-4111-8111-111111111111")).toBe(false);
      expect(service.isCategoryEnabled("CLINICAL_SAFETY")).toBe(false);
    } finally {
      if (prior === undefined) delete process.env.MEDORA_AI_EXTERNAL_FACILITY_IDS;
      else process.env.MEDORA_AI_EXTERNAL_FACILITY_IDS = prior;
    }
  });

  it("requires explicit persisted facility authorization", async () => {
    const service = await createService({ [AI_PROVIDER]: "OPENAI", __FACILITY_ENABLED: "true" });
    expect(await service.isFacilityEnabled("11111111-1111-4111-8111-111111111111")).toBe(true);
  });

  it("fails closed when persisted facility authorization is absent", async () => {
    const service = await createService({ [AI_PROVIDER]: "OPENAI" });
    expect(await service.isFacilityEnabled("11111111-1111-4111-8111-111111111111")).toBe(false);
  });

  it("disables AI when provider is NO_OP", async () => {
    const service = await createService({ [AI_PROVIDER]: "NO_OP" });
    expect(service.isAiEnabled()).toBe(false);
  });
});
