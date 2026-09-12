import { z } from "zod";

export const AiProviderName = z.enum(["NO_OP", "OPENAI"]);
export type AiProviderName = z.infer<typeof AiProviderName>;

export const AiProviderConfigSchema = z.object({
  provider: AiProviderName,
  model: z.string().max(100).optional(),
  endpoint: z.string().url().max(500).optional(),
  timeoutMs: z.number().int().min(1).max(300_000).optional(),
});
export type AiProviderConfig = z.infer<typeof AiProviderConfigSchema>;

export const AiProviderSnapshotContext = z.object({
  snapshotVersion: z.string().max(255),
  facilityId: z.string(),
  encounterId: z.string(),
});
export type AiProviderSnapshotContext = z.infer<typeof AiProviderSnapshotContext>;

export const AiProviderRequestOptions = z.object({
  timeoutMs: z.number().int().min(1).max(300_000).optional(),
  signal: z.any().optional(),
});
export type AiProviderRequestOptions = z.infer<typeof AiProviderRequestOptions>;

/** Already-authorized/minimized payload plus a strict provider-neutral output contract. */
export const AiProviderRequestEnvelope = z.object({
  providerOptions: AiProviderRequestOptions.optional(),
  snapshotContext: AiProviderSnapshotContext,
  clinicalInput: z.unknown(),
  systemInstruction: z.string().max(20_000).optional(),
  responseSchemaName: z.string().regex(/^[A-Za-z0-9_-]+$/).max(64).optional(),
  responseJsonSchema: z.record(z.string(), z.unknown()).optional(),
});
export type AiProviderRequestEnvelope = z.infer<typeof AiProviderRequestEnvelope>;

export const AiProviderResponseEnvelope = z.object({
  provider: z.string().max(100),
  model: z.string().max(100),
  output: z.unknown(),
  latencyMs: z.number().int().min(0).optional(),
  snapshotVersion: z.string().max(255),
});
export type AiProviderResponseEnvelope = z.infer<typeof AiProviderResponseEnvelope>;
