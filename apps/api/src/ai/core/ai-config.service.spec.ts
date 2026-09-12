import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { AiConfigService } from "./ai-config.service";
import { AI_PROVIDER, AI_MODEL, AI_ENDPOINT, AI_TIMEOUT_MS } from "./ai.constants";

describe("AiConfigService", () => {
  async function createService(env: Record<string, string | undefined>) {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => env,
          ],
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
  });

  it("defaults to NO_OP for unknown provider", async () => {
    const service = await createService({ [AI_PROVIDER]: "OPENAI" });
    expect(service.getProvider()).toBe("NO_OP");
  });

  it("parses NO_OP provider explicitly", async () => {
    const service = await createService({ [AI_PROVIDER]: "NO_OP" });
    expect(service.getProvider()).toBe("NO_OP");
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
