import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { AiConfigService } from "./ai-config.service";
import {
  AI_ENDPOINT,
  AI_MODEL,
  AI_OPENAI_PHI_ENABLED,
  AI_PROVIDER,
  AI_TIMEOUT_MS,
  OPENAI_API_KEY,
} from "./ai.constants";

describe("AiConfigService", () => {
  async function createService(env: Record<string, string | undefined>) {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => env],
        }),
      ],
      providers: [AiConfigService],
    }).compile();

    return module.get(AiConfigService);
  }

  it("defaults to NO_OP when no AI env vars are present", async () => {
    const service = await createService({});
    expect(service.getProvider()).toBe("NO_OP");
    expect(service.getModel()).toBeUndefined();
    expect(service.getEndpoint()).toBeUndefined();
    expect(service.getTimeoutMs()).toBe(30_000);
    expect(service.isOpenAiPhiEnabled()).toBe(false);
  });

  it("accepts OPENAI only when explicitly configured as the provider", async () => {
    const service = await createService({ [AI_PROVIDER]: "OPENAI" });
    expect(service.getProvider()).toBe("OPENAI");
  });

  it("defaults to NO_OP for an unknown provider", async () => {
    const service = await createService({ [AI_PROVIDER]: "UNKNOWN" });
    expect(service.getProvider()).toBe("NO_OP");
  });

  it("parses NO_OP provider explicitly", async () => {
    const service = await createService({ [AI_PROVIDER]: "NO_OP" });
    expect(service.getProvider()).toBe("NO_OP");
  });

  it("keeps the PHI processing gate off unless explicitly enabled", async () => {
    const disabled = await createService({
      [AI_PROVIDER]: "OPENAI",
      [OPENAI_API_KEY]: "server-secret",
    });
    expect(disabled.getOpenAiApiKey()).toBe("server-secret");
    expect(disabled.isOpenAiPhiEnabled()).toBe(false);

    const enabled = await createService({
      [AI_PROVIDER]: "OPENAI",
      [AI_OPENAI_PHI_ENABLED]: "true",
    });
    expect(enabled.isOpenAiPhiEnabled()).toBe(true);
  });

  it("ignores invalid endpoint and falls back to undefined", async () => {
    const service = await createService({
      [AI_PROVIDER]: "NO_OP",
      [AI_ENDPOINT]: "not-a-url",
    });
    expect(service.getEndpoint()).toBeUndefined();
  });

  it("caps timeout at maximum", async () => {
    const service = await createService({
      [AI_TIMEOUT_MS]: "999999",
    });
    expect(service.getTimeoutMs()).toBe(300_000);
  });

  it("uses default timeout for non-numeric value", async () => {
    const service = await createService({
      [AI_TIMEOUT_MS]: "abc",
    });
    expect(service.getTimeoutMs()).toBe(30_000);
  });
});
