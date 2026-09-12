import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AiProviderConfig,
  AiProviderConfigSchema,
  AiProviderName,
} from "@medora/shared";
import {
  AI_ENDPOINT,
  AI_MODEL,
  AI_PROVIDER,
  AI_TIMEOUT_MS,
  DEFAULT_AI_TIMEOUT_MS,
  MAX_AI_TIMEOUT_MS,
} from "./ai.constants";

/**
 * Safe configuration boundary for the AI subsystem.
 *
 * Defaults to the NO_OP provider so Medora boots without any AI credentials
 * or external dependencies. AI is never required for normal clinical workflow.
 */
@Injectable()
export class AiConfigService {
  constructor(private readonly config: ConfigService) {}

  getProvider(): AiProviderName {
    const raw = this.config.get<string>(AI_PROVIDER)?.trim().toUpperCase();
    if (!raw) {
      return "NO_OP";
    }
    const parsed = AiProviderConfigSchema.shape.provider.safeParse(raw);
    return parsed.success ? parsed.data : "NO_OP";
  }

  getModel(): string | undefined {
    return this.config.get<string>(AI_MODEL)?.trim() || undefined;
  }

  getEndpoint(): string | undefined {
    const raw = this.config.get<string>(AI_ENDPOINT)?.trim();
    if (!raw) {
      return undefined;
    }
    const parsed = AiProviderConfigSchema.shape.endpoint.safeParse(raw);
    return parsed.success ? parsed.data : undefined;
  }

  getTimeoutMs(): number {
    const raw = this.config.get<string | number>(AI_TIMEOUT_MS);
    if (raw === undefined || raw === null || raw === "") {
      return DEFAULT_AI_TIMEOUT_MS;
    }
    const num = typeof raw === "string" ? Number(raw) : raw;
    if (!Number.isFinite(num) || num < 1) {
      return DEFAULT_AI_TIMEOUT_MS;
    }
    return Math.min(num, MAX_AI_TIMEOUT_MS);
  }

  getConfig(): AiProviderConfig {
    return {
      provider: this.getProvider(),
      model: this.getModel(),
      endpoint: this.getEndpoint(),
      timeoutMs: this.getTimeoutMs(),
    };
  }
}
