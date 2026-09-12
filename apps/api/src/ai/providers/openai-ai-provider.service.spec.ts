import { ServiceUnavailableException } from "@nestjs/common";
import { OpenAiProvider } from "./openai-ai-provider.service.js";

const request = {
  snapshotContext: {
    snapshotVersion: "snapshot-v1",
    facilityId: "facility-secret-id",
    encounterId: "encounter-secret-id",
  },
  clinicalInput: { patient: { age: 42 }, presentation: { chiefComplaint: "cough" } },
  systemInstruction: "Return structured review only.",
  responseSchemaName: "medora_clinical_chart_review",
  responseJsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["suggestions"],
    properties: { suggestions: { type: "array", items: { type: "object" } } },
  },
};

describe("OpenAiProvider", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function config(overrides: Record<string, unknown> = {}) {
    return {
      getModel: jest.fn(() => "gpt-5.6-terra"),
      isOpenAiPhiEnabled: jest.fn(() => true),
      getOpenAiApiKey: jest.fn(() => "server-only-key"),
      getTimeoutMs: jest.fn(() => 30_000),
      getEndpoint: jest.fn(() => undefined),
      ...overrides,
    } as any;
  }

  it("refuses network calls while the PHI processing gate is disabled", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;
    const provider = new OpenAiProvider(config({ isOpenAiPhiEnabled: jest.fn(() => false) }));

    await expect(provider.generateStructured(request as any)).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends only minimized clinical input, uses store false, and keeps provenance IDs local", async () => {
    const fetchMock = jest.fn(async (_url: string, init: any) => ({
      ok: true,
      json: async () => ({
        output: [
          {
            content: [
              { type: "output_text", text: JSON.stringify({ suggestions: [] }) },
            ],
          },
        ],
      }),
    }));
    global.fetch = fetchMock as any;
    const provider = new OpenAiProvider(config());

    const result = await provider.generateStructured(request as any);

    expect(result.output).toEqual({ suggestions: [] });
    expect(result.snapshotVersion).toBe("snapshot-v1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const init = fetchMock.mock.calls[0]?.[1] as any;
    const body = JSON.parse(init.body);
    const serializedBody = JSON.stringify(body);

    expect(body.store).toBe(false);
    expect(body.model).toBe("gpt-5.6-terra");
    expect(body.text.format.type).toBe("json_schema");
    expect(body.text.format.strict).toBe(true);
    expect(serializedBody).toContain("cough");
    expect(serializedBody).not.toContain("facility-secret-id");
    expect(serializedBody).not.toContain("encounter-secret-id");
    expect(serializedBody).not.toContain("server-only-key");
    expect((init.headers as any).authorization).toBe("Bearer server-only-key");
  });

  it("converts malformed provider output into a sanitized service-unavailable failure", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        output: [{ content: [{ type: "output_text", text: "not-json" }] }],
      }),
    })) as any;
    const provider = new OpenAiProvider(config());

    await expect(provider.generateStructured(request as any)).rejects.toThrow(
      "External clinical AI returned malformed structured output"
    );
  });

  it("does not expose upstream response bodies when the provider returns an error", async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ sensitive: "upstream-detail" }),
    })) as any;
    const provider = new OpenAiProvider(config());

    await expect(provider.generateStructured(request as any)).rejects.toThrow(
      "External clinical AI request failed"
    );
  });
});
