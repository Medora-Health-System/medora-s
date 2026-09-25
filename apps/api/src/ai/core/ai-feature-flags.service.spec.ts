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

  it("keeps external AI off when provider is configured but facility is not explicitly allowlisted", async () => {
    const service = await createService({ [AI_PROVIDER]: "OPENAI" });
    const prior = process.env.MEDORA_AI_EXTERNAL_FACILITY_IDS;
    try {
      delete process.env.MEDORA_AI_EXTERNAL_FACILITY_IDS;
      expect(service.isFacilityEnabled("11111111-1111-4111-8111-111111111111")).toBe(false);
      expect(service.isCategoryEnabled("CLINICAL_SAFETY")).toBe(false);
    } finally {
      if (prior === undefined) delete process.env.MEDORA_AI_EXTERNAL_FACILITY_IDS;
      else process.env.MEDORA_AI_EXTERNAL_FACILITY_IDS = prior;
    }
  });

  it("requires exact facility match and rejects wildcards", async () => {
    const service = await createService({ [AI_PROVIDER]: "OPENAI" });
    const prior = process.env.MEDORA_AI_EXTERNAL_FACILITY_IDS;
    const facility = "11111111-1111-4111-8111-111111111111";
    try {
      process.env.MEDORA_AI_EXTERNAL_FACILITY_IDS = facility;
      expect(service.isFacilityEnabled(facility)).toBe(true);
      expect(service.isFacilityEnabled("22222222-2222-4222-8222-222222222222")).toBe(false);
      process.env.MEDORA_AI_EXTERNAL_FACILITY_IDS = facility + ",*";
      expect(service.isFacilityEnabled(facility)).toBe(false);
    } finally {
      if (prior === undefined) delete process.env.MEDORA_AI_EXTERNAL_FACILITY_IDS;
      else process.env.MEDORA_AI_EXTERNAL_FACILITY_IDS = prior;
    }
  });

  it("disables AI when provider is NO_OP", async () => {
    const service = await createService({ [AI_PROVIDER]: "NO_OP" });
    expect(service.isAiEnabled()).toBe(false);
  });
});
