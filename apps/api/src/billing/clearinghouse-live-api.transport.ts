import type {
  ClearinghouseSendInput,
  ClearinghouseSendResult,
  ClearinghouseTransport,
} from "./clearinghouse-transport.interface";
import {
  clearinghouseLiveOutboundSendAllowed,
  loadClearinghouseConfig,
  safeEndpointHostForAudit,
} from "./clearinghouse-config.util";

function httpBaseUrl(cfg: ReturnType<typeof loadClearinghouseConfig>): string | undefined {
  return cfg.apiBaseUrl ?? cfg.endpointUrl;
}

function basicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

/**
 * Live HTTP outbound (vendor-agnostic POST of raw X12). Requires CLEARINGHOUSE_MODE=live_api,
 * complete credentials, and CLEARINGHOUSE_LIVE_SEND_ENABLED=true (plus production guard when applicable).
 */
export class LiveApiClearinghouseTransport implements ClearinghouseTransport {
  readonly key = "LIVE_API" as const;

  async send(input: ClearinghouseSendInput): Promise<ClearinghouseSendResult> {
    const cfg = loadClearinghouseConfig();
    if (cfg.mode !== "live_api") {
      return {
        ok: false,
        requestMeta: {
          transport: this.key,
          modeMismatch: true,
          clearinghouseMode: cfg.mode,
          submissionId: input.submissionId,
          batchId: input.batchId,
        },
        responseMeta: { live: true },
        errorMessage: "LIVE_API_CLEARINGHOUSE_MODE_MISMATCH",
      };
    }

    const endpoint = httpBaseUrl(cfg);
    if (!endpoint || !clearinghouseLiveOutboundSendAllowed(cfg)) {
      return {
        ok: false,
        requestMeta: {
          transport: this.key,
          configured: false,
          live: true,
          submissionId: input.submissionId,
          batchId: input.batchId,
          bytes: Buffer.byteLength(input.x12Text, "utf8"),
        },
        responseMeta: { live: true, sendNotAllowed: true },
        errorMessage: "CLEARINGHOUSE_LIVE_OUTBOUND_NOT_ALLOWED",
      };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/octet-stream",
      "X-Medora-Facility-Id": input.facilityId,
      "X-Medora-Batch-Id": input.batchId,
      "X-Medora-Submission-Id": input.submissionId,
    };
    if (cfg.senderId) headers["X-Medora-Sender-Id"] = cfg.senderId;
    if (cfg.receiverId) headers["X-Medora-Receiver-Id"] = cfg.receiverId;

    if (cfg.apiAuthType === "api_key") {
      if (!cfg.apiKey) {
        return {
          ok: false,
          requestMeta: { transport: this.key, live: true, submissionId: input.submissionId },
          responseMeta: { live: true },
          errorMessage: "LIVE_API_MISSING_API_KEY",
        };
      }
      headers["X-Api-Key"] = cfg.apiKey;
    } else if (cfg.apiAuthType === "basic") {
      if (!cfg.apiUsername || !cfg.apiPassword) {
        return {
          ok: false,
          requestMeta: { transport: this.key, live: true, submissionId: input.submissionId },
          responseMeta: { live: true },
          errorMessage: "LIVE_API_MISSING_BASIC_CREDENTIALS",
        };
      }
      headers.Authorization = basicAuthHeader(cfg.apiUsername, cfg.apiPassword);
    } else {
      return {
        ok: false,
        requestMeta: { transport: this.key, live: true, authType: cfg.apiAuthType },
        responseMeta: { live: true },
        errorMessage: "LIVE_API_UNSUPPORTED_AUTH",
      };
    }

    const bytes = Buffer.byteLength(input.x12Text, "utf8");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    const requestMeta: Record<string, unknown> = {
      transport: this.key,
      method: "POST",
      endpointHost: safeEndpointHostForAudit(endpoint),
      submissionId: input.submissionId,
      batchId: input.batchId,
      facilityId: input.facilityId,
      bytes,
      claimType: input.claimType,
      vendor: cfg.vendor,
      live: true,
      integrationTier: "live",
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: input.x12Text,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const refHeader = res.headers.get("x-external-reference") ?? res.headers.get("X-Request-Id");
      let bodySnippet = "";
      try {
        const t = await res.text();
        bodySnippet = t.length > 2000 ? `${t.slice(0, 2000)}…` : t;
      } catch {
        bodySnippet = "";
      }
      const transportMeta: Record<string, unknown> = {
        httpStatus: res.status,
        statusText: res.statusText,
        externalReferenceHeader: refHeader ?? null,
        live: true,
      };
      const ok = res.ok;
      return {
        ok,
        requestMeta,
        responseMeta: {
          httpStatus: res.status,
          bodySnippet: bodySnippet || null,
          live: true,
        },
        transportMeta,
        externalReference: refHeader ?? (ok ? `LIVE-API-${input.submissionId}-${Date.now()}` : undefined),
        errorMessage: ok ? undefined : `LIVE_HTTP_${res.status}`,
      };
    } catch (e) {
      clearTimeout(timer);
      const msg = e instanceof Error ? e.message : "LIVE_API_REQUEST_FAILED";
      return {
        ok: false,
        requestMeta,
        responseMeta: { live: true, error: msg },
        errorMessage: msg,
      };
    }
  }
}
