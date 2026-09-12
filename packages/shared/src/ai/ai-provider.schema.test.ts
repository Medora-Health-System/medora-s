import { describe, expect, it } from "vitest";
import {
  AiProviderConfigSchema,
  AiProviderName,
  AiProviderRequestEnvelope,
  AiProviderResponseEnvelope,
  AiProviderSnapshotContext,
} from "./ai-provider.schema.js";

describe("AiProvider schema", () => {
  it("accepts supported providers", () => {
    expect(AiProviderName.safeParse("NO_OP").success).toBe(true);
    expect(AiProviderName.safeParse("OPENAI").success).toBe(true);
  });

  it("rejects unknown provider", () => {
    expect(AiProviderName.safeParse("UNKNOWN_PROVIDER").success).toBe(false);
  });

  it("accepts a valid config without secrets", () => {
    const config = {
      provider: "OPENAI",
      timeoutMs: 30_000,
    };
    expect(AiProviderConfigSchema.safeParse(config).success).toBe(true);
  });

  it("rejects invalid endpoint URL", () => {
    const config = {
      provider: "NO_OP",
      endpoint: "not-a-url",
    };
    expect(AiProviderConfigSchema.safeParse(config).success).toBe(false);
  });

  it("rejects timeout above maximum", () => {
    const config = {
      provider: "NO_OP",
      timeoutMs: 999_999,
    };
    expect(AiProviderConfigSchema.safeParse(config).success).toBe(false);
  });

  it("accepts a valid request envelope with structured-output metadata", () => {
    const request = {
      providerOptions: { timeoutMs: 10_000 },
      snapshotContext: {
        snapshotVersion: "v1/abc",
        facilityId: "fac-1",
        encounterId: "enc-1",
      },
      clinicalInput: { chiefComplaint: "chest pain" },
      systemInstruction: "Return structured clinical review only.",
      responseSchemaName: "clinical_review",
      responseJsonSchema: { type: "object" },
    };
    expect(AiProviderRequestEnvelope.safeParse(request).success).toBe(true);
  });

  it("rejects request envelope missing snapshot context", () => {
    const request = {
      clinicalInput: {},
    };
    expect(AiProviderRequestEnvelope.safeParse(request).success).toBe(false);
  });

  it("accepts a valid response envelope", () => {
    const response = {
      provider: "OPENAI",
      model: "test-model",
      output: { suggestions: [] },
      latencyMs: 12,
      snapshotVersion: "v1/abc",
    };
    expect(AiProviderResponseEnvelope.safeParse(response).success).toBe(true);
  });

  it("snapshot context requires facility and encounter ids", () => {
    const bad = {
      snapshotVersion: "v1/abc",
      facilityId: "fac-1",
    };
    expect(AiProviderSnapshotContext.safeParse(bad).success).toBe(false);
  });
});
