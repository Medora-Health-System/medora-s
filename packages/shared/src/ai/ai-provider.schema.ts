import { z } from "zod";

/**
 * Supported AI provider identifiers.
 *
 * Phase 1A only includes the no-op provider. Future adapters (OpenAI,
 * Anthropic, self-hosted, etc.) are added here after provider review.
 */
export const AiProviderName = z.enum(["NO_OP"]);

export type AiProviderName = z.infer<typeof AiProviderName>;

/**
 * Minimal provider configuration shape. No secrets are stored in this schema;
 * API keys, if ever used, must be sourced from a secrets manager / environment
 * and never logged.
 */
export const AiProviderConfigSchema = z.object({
  provider: AiProviderName,
  model: z.string().max(100).optional(),
  endpoint: z.string().url().max(500).optional(),
  timeoutMs: z.number().int().min(1).max(300_000).optional(),
});

export type AiProviderConfig = z.infer<typeof AiProviderConfigSchema>;

/**
 * Context identifying the authorized encounter snapshot that feeds the provider.
 * The provider must never use this to perform authorization; it only ensures
 * response provenance and stale-result detection.
 */
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

/**
 * Provider-agnostic request envelope.
 *
 * `clinicalInput` is an already-authorized, minimized, server-side payload.
 * The provider adapter must not access Prisma, perform authorization, or
 * mutate clinical data.
 */
export const AiProviderRequestEnvelope = z.object({
  providerOptions: AiProviderRequestOptions.optional(),
  snapshotContext: AiProviderSnapshotContext,
  clinicalInput: z.unknown(),
});

export type AiProviderRequestEnvelope = z.infer<typeof AiProviderRequestEnvelope>;

/**
 * Provider-agnostic response envelope.
 *
 * `output` is the structured, validated result produced by the provider adapter.
 */
export const AiProviderResponseEnvelope = z.object({
  provider: z.string().max(100),
  model: z.string().max(100),
  output: z.unknown(),
  latencyMs: z.number().int().min(0).optional(),
  snapshotVersion: z.string().max(255),
});

export type AiProviderResponseEnvelope = z.infer<typeof AiProviderResponseEnvelope>;
