/**
 * S17B / S17C — Operational alerts (webhook or console). Never include PHI; never throw to callers.
 * Payload is a strict allowlist aligned with go-live ops runbooks.
 */

import { logError, logInfo } from "./medoraLogger";

export type MedoraAlertSeverity = "critical" | "warning";

export type MedoraAlertPayload = {
  service: "medora-api";
  environment: string;
  event: string;
  severity: MedoraAlertSeverity;
  timestamp: string;
  requestId?: string;
  facilityId?: string;
  encounterId?: string;
  userId?: string;
  route?: string;
  statusCode?: number;
};

export type MedoraAlertInput = {
  event: string;
  severity: MedoraAlertSeverity;
  environment?: string;
  requestId?: string | null;
  facilityId?: string | null;
  encounterId?: string | null;
  userId?: string | null;
  route?: string | null;
  statusCode?: number | null;
};

/** S17C — backoff after failure on attempt `attempt` (1-based) before the next attempt. */
function backoffMsAfterFailure(attempt: number): number {
  const steps = [500, 1500, 5000] as const;
  return steps[Math.min(Math.max(attempt - 1, 0), steps.length - 1)];
}

const warnedNoWebhookForEventType = new Set<string>();

function trimOrUndef(s: string | null | undefined): string | undefined {
  if (s == null) return undefined;
  const t = String(s).trim();
  return t.length > 0 ? t : undefined;
}

function readAlertsEnabled(): boolean {
  const raw = process.env.MEDORA_ALERT_ENABLED?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no" || raw === "off") return false;
  return true;
}

function readWebhookUrl(): string | undefined {
  return trimOrUndef(process.env.MEDORA_ALERT_WEBHOOK_URL);
}

function readEnvironment(): string {
  return trimOrUndef(process.env.MEDORA_ENVIRONMENT) ?? trimOrUndef(process.env.NODE_ENV) ?? "development";
}

function readAlertFormat(): "json" | "slack" {
  const raw = process.env.MEDORA_ALERT_FORMAT?.trim().toLowerCase();
  return raw === "slack" ? "slack" : "json";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Build alert body with only allowlisted keys (no free text, no names, no MRN). */
export function buildMedoraAlertPayload(input: MedoraAlertInput): MedoraAlertPayload {
  const out: MedoraAlertPayload = {
    service: "medora-api",
    environment: input.environment ?? readEnvironment(),
    event: input.event,
    severity: input.severity,
    timestamp: new Date().toISOString(),
  };
  const requestId = trimOrUndef(input.requestId ?? undefined);
  const facilityId = trimOrUndef(input.facilityId ?? undefined);
  const encounterId = trimOrUndef(input.encounterId ?? undefined);
  const userId = trimOrUndef(input.userId ?? undefined);
  const route = trimOrUndef(input.route ?? undefined);
  if (requestId) out.requestId = requestId;
  if (facilityId) out.facilityId = facilityId;
  if (encounterId) out.encounterId = encounterId;
  if (userId) out.userId = userId;
  if (route) out.route = route;
  if (input.statusCode != null && Number.isFinite(input.statusCode)) {
    out.statusCode = Math.trunc(Number(input.statusCode));
  }
  return out;
}

function slackFieldLine(label: string, value: string | number | undefined): string {
  if (value === undefined || value === "") return "";
  const v = typeof value === "number" ? String(value) : value;
  return `*${label}* \`${String(v).replace(/`/g, "'")}\``;
}

/**
 * Slack-compatible incoming-webhook body. Only structured codes/ids — no clinical free text.
 */
export function buildSlackWebhookBody(payload: MedoraAlertPayload): { text: string; blocks: unknown[] } {
  const lines = [
    slackFieldLine("Event", payload.event),
    slackFieldLine("Severity", payload.severity),
    slackFieldLine("Environment", payload.environment),
    slackFieldLine("Route", payload.route),
    slackFieldLine("Status", payload.statusCode),
    slackFieldLine("Request", payload.requestId),
    slackFieldLine("Facility", payload.facilityId),
    slackFieldLine("Encounter", payload.encounterId),
    slackFieldLine("User", payload.userId),
    slackFieldLine("Timestamp", payload.timestamp),
  ].filter(Boolean);

  return {
    text: `🚨 Medora critical alert: ${payload.event}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: lines.join("\n"),
        },
      },
    ],
  };
}

function deliveryLogPayload(
  payload: MedoraAlertPayload,
  extra: { attempt?: number; httpStatus?: number; errorName?: string; phase?: string }
): Record<string, unknown> {
  return {
    action: "medora_alert.delivery",
    event: payload.event,
    severity: payload.severity,
    requestId: payload.requestId,
    facilityId: payload.facilityId,
    encounterId: payload.encounterId,
    userId: payload.userId,
    route: payload.route,
    statusCode: payload.statusCode,
    ...extra,
  };
}

/**
 * POST with 8s timeout per attempt, up to 3 attempts, exponential backoff between failures.
 * Logs delivery outcome via medoraLogger. Does not throw.
 * @param fetchImpl inject for tests (default global fetch).
 */
export async function deliverMedoraAlertWebhookWithRetries(
  url: string,
  bodyString: string,
  payload: MedoraAlertPayload,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  let lastHttpStatus = 0;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 8_000);
    try {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyString,
        signal: ac.signal,
      });
      lastHttpStatus = res.status;
      if (res.ok) {
        logInfo("medora_alert_delivery_succeeded", deliveryLogPayload(payload, { attempt, httpStatus: res.status }));
        return;
      }
    } catch {
      lastHttpStatus = 0;
    } finally {
      clearTimeout(timer);
    }

    if (attempt < 3) {
      logInfo("medora_alert_delivery_retrying", deliveryLogPayload(payload, { attempt, httpStatus: lastHttpStatus }));
      await sleep(backoffMsAfterFailure(attempt));
    }
  }

  logError("medora_alert_delivery_failed", deliveryLogPayload(payload, { attempt: 3, httpStatus: lastHttpStatus }));
  console.warn("[medora-alert] delivery exhausted after 3 attempts", payload.event, lastHttpStatus);
}

/**
 * Fire-and-forget operational alert. Respects MEDORA_ALERT_ENABLED; uses MEDORA_ALERT_WEBHOOK_URL when set.
 * S17C: retries (3×), backoff, Slack/json format, delivery logs; never throws to callers.
 */
export function queueMedoraAlert(input: MedoraAlertInput): void {
  if (!readAlertsEnabled()) return;

  const payload = buildMedoraAlertPayload(input);
  const url = readWebhookUrl();
  const format = readAlertFormat();
  const bodyString =
    format === "slack" ? JSON.stringify(buildSlackWebhookBody(payload)) : JSON.stringify(payload);

  void (async () => {
    try {
      if (!url) {
        if (!warnedNoWebhookForEventType.has(payload.event)) {
          warnedNoWebhookForEventType.add(payload.event);
          console.warn(
            `[medora-alert] MEDORA_ALERT_WEBHOOK_URL not set; delivery skipped (event=${payload.event}).`
          );
        }
        return;
      }

      await deliverMedoraAlertWebhookWithRetries(url, bodyString, payload, fetch);
    } catch (e: unknown) {
      const errorName = e instanceof Error ? e.name : typeof e;
      logError("medora_alert_delivery_failed", {
        ...deliveryLogPayload(payload, {}),
        phase: "unexpected",
        errorName,
      });
      console.warn("[medora-alert] unexpected delivery error", errorName);
    }
  })();
}
