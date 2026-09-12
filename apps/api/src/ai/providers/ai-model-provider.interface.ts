import { AiProviderRequestEnvelope, AiProviderResponseEnvelope } from "@medora/shared";

/**
 * Provider-agnostic AI model interface.
 *
 * Implementations must:
 * - be stateless with respect to clinical data
 * - never access Prisma or the database
 * - never perform authorization or facility isolation
 * - never mutate the chart or place orders
 * - return only structured, validated output
 *
 * Authorization, snapshot building, and output validation are the
 * responsibility of higher-level orchestrators.
 */
export interface AiModelProvider {
  readonly providerName: string;
  readonly modelName: string;

  generateStructured<TOutput>(
    request: AiProviderRequestEnvelope
  ): Promise<AiProviderResponseEnvelope & { output: TOutput }>;
}
