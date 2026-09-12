import { Injectable } from "@nestjs/common";
import {
  AiClinicalReviewOutput,
  AiProviderRequestEnvelope,
  AiProviderResponseEnvelope,
} from "@medora/shared";
import { AiModelProvider } from "./ai-model-provider.interface";

/**
 * No-op AI provider.
 *
 * Returns an empty, deterministic, valid structured response. It performs no
 * network I/O, no database access, no file access, and no mutation. This is the
 * default provider so Medora AI modules can compile and test without external
 * model credentials.
 */
@Injectable()
export class NoOpAiProvider implements AiModelProvider {
  readonly providerName = "NO_OP" as const;
  readonly modelName = "NO_OP" as const;

  async generateStructured<TOutput>(
    request: AiProviderRequestEnvelope
  ): Promise<AiProviderResponseEnvelope & { output: TOutput }> {
    const output = { suggestions: [] } as unknown as TOutput;

    return {
      provider: this.providerName,
      model: this.modelName,
      output,
      latencyMs: 0,
      snapshotVersion: request.snapshotContext.snapshotVersion,
    };
  }

  /**
   * Convenience helper for clinical review output. Kept separate from the
   * generic interface so the no-op provider remains a pure adapter.
   */
  generateClinicalReview(
    request: AiProviderRequestEnvelope
  ): Promise<AiProviderResponseEnvelope & { output: AiClinicalReviewOutput }> {
    return this.generateStructured<AiClinicalReviewOutput>(request);
  }
}
