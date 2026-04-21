import type {
  ClearinghouseSendInput,
  ClearinghouseSendResult,
  ClearinghouseTransport,
} from "./clearinghouse-transport.interface";
import {
  clearinghouseExternalSendAllowedInProduction,
  clearinghouseIsNonProduction,
  loadClearinghouseConfig,
  safeEndpointHostForAudit,
} from "./clearinghouse-config.util";

export class SandboxApiClearinghouseTransport implements ClearinghouseTransport {
  readonly key = "SANDBOX_API" as const;

  async send(input: ClearinghouseSendInput): Promise<ClearinghouseSendResult> {
    const cfg = loadClearinghouseConfig();
    const endpoint = cfg.endpointUrl;
    const apiKey = cfg.apiKey;

    if (!endpoint || !apiKey) {
      return {
        ok: false,
        requestMeta: {
          transport: this.key,
          configured: false,
          submissionId: input.submissionId,
          batchId: input.batchId,
          bytes: Buffer.byteLength(input.x12Text, "utf8"),
        },
        responseMeta: { configured: false, sandbox: true },
        errorMessage: "CLEARINGHOUSE_NOT_CONFIGURED",
      };
    }

    if (!clearinghouseIsNonProduction() && !clearinghouseExternalSendAllowedInProduction()) {
      return {
        ok: false,
        requestMeta: {
          transport: this.key,
          blockedInProduction: true,
          endpointHost: safeEndpointHostForAudit(endpoint),
          submissionId: input.submissionId,
          batchId: input.batchId,
          bytes: Buffer.byteLength(input.x12Text, "utf8"),
        },
        responseMeta: { sandbox: true, note: "External sandbox send blocked in production unless CLEARINGHOUSE_EXTERNAL_SEND_IN_PRODUCTION=true" },
        errorMessage: "EXTERNAL_SEND_BLOCKED_IN_PRODUCTION",
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
      isTest: cfg.isTest,
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Api-Key": apiKey,
          "X-Medora-Facility-Id": input.facilityId,
          "X-Medora-Batch-Id": input.batchId,
          "X-Medora-Submission-Id": input.submissionId,
          ...(cfg.senderId ? { "X-Medora-Sender-Id": cfg.senderId } : {}),
          ...(cfg.receiverId ? { "X-Medora-Receiver-Id": cfg.receiverId } : {}),
        },
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
      };
      const ok = res.ok;
      return {
        ok,
        requestMeta,
        responseMeta: {
          httpStatus: res.status,
          bodySnippet: bodySnippet || null,
          sandbox: true,
        },
        transportMeta,
        externalReference: refHeader ?? (ok ? `SANDBOX-API-${input.submissionId}-${Date.now()}` : undefined),
        errorMessage: ok ? undefined : `SANDBOX_HTTP_${res.status}`,
      };
    } catch (e) {
      clearTimeout(timer);
      const msg = e instanceof Error ? e.message : "SANDBOX_API_REQUEST_FAILED";
      return {
        ok: false,
        requestMeta,
        responseMeta: { sandbox: true, error: msg },
        errorMessage: msg,
      };
    }
  }
}
