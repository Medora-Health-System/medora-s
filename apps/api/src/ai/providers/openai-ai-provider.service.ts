import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AiProviderRequestEnvelope, AiProviderResponseEnvelope } from "@medora/shared";
import { AiConfigService } from "../core/ai-config.service";
import { DEFAULT_OPENAI_RESPONSES_ENDPOINT } from "../core/ai.constants";
import { AiModelProvider } from "./ai-model-provider.interface";

/**
 * OpenAI Responses API adapter. It has no DB/auth/chart access and is disabled
 * unless the deployment explicitly attests that its OpenAI configuration is
 * approved for PHI processing. No prompts or model responses are logged.
 */
@Injectable()
export class OpenAiProvider implements AiModelProvider {
  readonly providerName = "OPENAI";
  readonly modelName: string;

  constructor(private readonly config: AiConfigService) {
    this.modelName = config.getModel() || "gpt-5.6-terra";
  }

  async generateStructured<TOutput>(
    request: AiProviderRequestEnvelope
  ): Promise<AiProviderResponseEnvelope & { output: TOutput }> {
    if (!this.config.isOpenAiPhiEnabled()) {
      throw new ServiceUnavailableException("External clinical AI is not enabled for PHI processing");
    }
    const apiKey = this.config.getOpenAiApiKey();
    if (!apiKey) throw new ServiceUnavailableException("External clinical AI is not configured");
    if (!request.responseJsonSchema || !request.responseSchemaName) {
      throw new ServiceUnavailableException("External clinical AI structured-output contract is missing");
    }

    const started = Date.now();
    const controller = new AbortController();
    const timeoutMs = request.providerOptions?.timeoutMs ?? this.config.getTimeoutMs();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const externalSignal = request.providerOptions?.signal as AbortSignal | undefined;
    const onAbort = () => controller.abort();
    externalSignal?.addEventListener?.("abort", onAbort, { once: true });

    try {
      const response = await fetch(this.config.getEndpoint() || DEFAULT_OPENAI_RESPONSES_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.modelName,
          store: false,
          input: [
            ...(request.systemInstruction
              ? [{ role: "system", content: [{ type: "input_text", text: request.systemInstruction }] }]
              : []),
            { role: "user", content: [{ type: "input_text", text: JSON.stringify(request.clinicalInput) }] },
          ],
          text: {
            format: {
              type: "json_schema",
              name: request.responseSchemaName,
              strict: true,
              schema: request.responseJsonSchema,
            },
          },
        }),
      });
      if (!response.ok) throw new ServiceUnavailableException("External clinical AI request failed");
      const payload = (await response.json()) as any;
      const text = payload?.output
        ?.flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
        ?.find((item: any) => item?.type === "output_text")?.text;
      if (typeof text !== "string") throw new ServiceUnavailableException("External clinical AI returned no structured output");
      let output: TOutput;
      try { output = JSON.parse(text) as TOutput; }
      catch { throw new ServiceUnavailableException("External clinical AI returned malformed structured output"); }
      return {
        provider: this.providerName,
        model: this.modelName,
        output,
        latencyMs: Date.now() - started,
        snapshotVersion: request.snapshotContext.snapshotVersion,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException("External clinical AI is temporarily unavailable");
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener?.("abort", onAbort);
    }
  }
}
