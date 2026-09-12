import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AiProviderConfig, AiProviderConfigSchema, AiProviderName } from "@medora/shared";
import {
  AI_ENDPOINT,
  AI_MODEL,
  AI_OPENAI_PHI_ENABLED,
  AI_PROVIDER,
  AI_TIMEOUT_MS,
  DEFAULT_AI_TIMEOUT_MS,
  MAX_AI_TIMEOUT_MS,
  OPENAI_API_KEY,
} from "./ai.constants";

@Injectable()
export class AiConfigService {
  constructor(private readonly config: ConfigService) {}

  getProvider(): AiProviderName {
    const raw = this.config.get<string>(AI_PROVIDER)?.trim().toUpperCase();
    if (!raw) return "NO_OP";
    const parsed = AiProviderConfigSchema.shape.provider.safeParse(raw);
    return parsed.success ? parsed.data : "NO_OP";
  }

  getModel(): string | undefined {
    return this.config.get<string>(AI_MODEL)?.trim() || undefined;
  }

  getEndpoint(): string | undefined {
    const raw = this.config.get<string>(AI_ENDPOINT)?.trim();
    if (!raw) return undefined;
    const parsed = AiProviderConfigSchema.shape.endpoint.safeParse(raw);
    return parsed.success ? parsed.data : undefined;
  }

  getTimeoutMs(): number {
    const raw = this.config.get<string | number>(AI_TIMEOUT_MS);
    if (raw === undefined || raw === null || raw === "") return DEFAULT_AI_TIMEOUT_MS;
    const num = typeof raw === "string" ? Number(raw) : raw;
    if (!Number.isFinite(num) || num < 1) return DEFAULT_AI_TIMEOUT_MS;
    return Math.min(num, MAX_AI_TIMEOUT_MS);
  }

  /** Server-side secret; callers must never log or serialize this value. */
  getOpenAiApiKey(): string | undefined {
    return this.config.get<string>(OPENAI_API_KEY)?.trim() || undefined;
  }

  /**
   * Explicit deployment gate. This is not a compliance determination: operators
   * must enable it only for an OpenAI org/configuration approved to process PHI.
   */
  isOpenAiPhiEnabled(): boolean {
    return this.config.get<string | boolean>(AI_OPENAI_PHI_ENABLED) === true ||
      String(this.config.get<string>(AI_OPENAI_PHI_ENABLED) ?? "").toLowerCase() === "true";
  }

  getConfig(): AiProviderConfig {
    return { provider: this.getProvider(), model: this.getModel(), endpoint: this.getEndpoint(), timeoutMs: this.getTimeoutMs() };
  }
}
