/**
 * S17B / S17C — Operational alerts (webhook or console). Never include PHI; never throw to callers.
 * Payload is a strict allowlist aligned with go-live ops runbooks.
 */

import { createHash } from "node:crypto";
import { logError, logInfo } from "./medoraLogger";

export type MedoraAlertSeverity = "critical" | "warning";
export type MedoraAlertTransport = "webhook" | "pagerduty";

const PAGERDUTY_EVENTS_API_V2_URL = "https://events.pagerduty.com/v2/enqueue";

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
const pendingAlertDeliveries = new Set<Promise<void>>();

function trimOrUndef(s: string | null | undefined): string | undefined {
  if (s == null) return undefined;
  const t = String(s).trim();
  return t.length > 0 ? t : undefined;
}

function readAlertsEnabled(): boolean {
  const raw = process.env.MEDORA_ALERT_ENABLED?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no" || raw === "off") return false;
  if (raw === "true" || raw === "1" || raw === "yes" || raw === "on") return true;
  // Quiet no-op transport in Jest / NODE_ENV=test unless explicitly enabled.
  if ((process.env.NODE_ENV ?? "").toLowerCase() === "test") return false;
  return true;
}

/** Await in-flight alert deliveries so Jest can exit without open handles. */
export async function drainMedoraAlerts(): Promise<void> {
  await Promise.allSettled([...pendingAlertDeliveries]);
}

/** Test helper: clear one-shot webhook warnings and pending set. */
export function resetMedoraAlertTestState(): void {
  warnedNoWebhookForEventType.clear();
  pendingAlertDeliveries.clear();
}

function readWebhookUrl(): string | undefined {
  return trimOrUndef(process.env.MEDORA_ALERT_WEBHOOK_URL);
}

function readPagerDutyRoutingKey(): string | undefined {
  return trimOrUndef(process.env.MEDORA_PAGERDUTY_ROUTING_KEY);
}

function readAlertTransport(): MedoraAlertTransport {
  const raw = trimOrUndef(process.env.MEDORA_ALERT_TRANSPORT)?.toLowerCase();
  if (raw === "pagerduty") return "pagerduty";
  if (raw === "webhook") return "webhook";
  // Backward-compatible auto-detection: an explicit PagerDuty key opts into PagerDuty.
  return readPagerDutyRoutingKey() ? "pagerduty" : "webhook";
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
export type PagerDutyEventsApiV2Body = {
  routing_key: string;
  event_action: "trigger";
  dedup_key: string;
  payload: {
    summary: string;
    source: "medora-api";
    severity: MedoraAlertSeverity;
    timestamp: string;
    component: "api";
    group: string;
    class: "medora_operational_alert";
    custom_details: {
      event: string;
      environment: string;
      timestamp: string;
      requestId?: string;
      statusCode?: number;
    };
  };
};

/**
 * PagerDuty Events API v2 payload.
 *
 * External incident payloads intentionally exclude facilityId, encounterId, userId,
 * patient identifiers, clinical text, and arbitrary route values. Request IDs are
 * retained solely as opaque correlation identifiers.
 */
export function buildPagerDutyEventsApiV2Body(
  payload: MedoraAlertPayload,
  routingKey: string
): PagerDutyEventsApiV2Body {
  const dedupMaterial = [
    payload.service,
    payload.environment,
    payload.event,
    payload.severity,
    payload.timestamp,
    payload.requestId ?? "",
  ].join("|");
  const dedupKey = `medora-${createHash("sha256").update(dedupMaterial).digest("hex")}`;
  const customDetails: PagerDutyEventsApiV2Body["payload"]["custom_details"] = {
    event: payload.event,
    environment: payload.environment,
    timestamp: payload.timestamp,
  };
  if (payload.requestId) customDetails.requestId = payload.requestId;
  if (payload.statusCode != null) customDetails.statusCode = payload.statusCode;

  return {
    routing_key: routingKey,
    event_action: "trigger",
    dedup_key: dedupKey,
    payload: {
      summary: `Medora ${payload.environment} ${payload.event}`.slice(0, 1024),
      source: "medora-api",
      severity: payload.severity,
      timestamp: payload.timestamp,
      component: "api",
      group: payload.environment.slice(0, 255),
      class: "medora_operational_alert",
      custom_details: customDetails,
    },
  };
}

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

  const severityLabel = payload.severity === "warning" ? "warning" : "critical";
  return {
    text: `🚨 Medora ${severityLabel} alert: ${payload.event}`,
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
/** @returns true if HTTP delivery succeeded within retry budget */
export async function deliverMedoraAlertWebhookWithRetries(
  url: string,
  bodyString: string,
  payload: MedoraAlertPayload,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
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
        return true;
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
  return false;
}

export type MedoraAlertStatusForApi = {
  enabled: boolean;
  /** Backward-compatible field used by existing admin clients; true when the selected destination is configured. */
  webhookConfigured: boolean;
  destinationConfigured: boolean;
  transport: MedoraAlertTransport;
  format: "json" | "slack";
  environment: string;
  canSendTest: boolean;
};

/** Read-only snapshot for admin APIs (no secrets). S23 */
export function getMedoraAlertStatusForApi(): MedoraAlertStatusForApi {
  const enabled = readAlertsEnabled();
  const transport = readAlertTransport();
  const destinationConfigured =
    transport === "pagerduty" ? Boolean(readPagerDutyRoutingKey()) : Boolean(readWebhookUrl());
  return {
    enabled,
    webhookConfigured: destinationConfigured,
    destinationConfigured,
    transport,
    format: readAlertFormat(),
    environment: readEnvironment(),
    canSendTest: enabled && destinationConfigured,
  };
}

export type MedoraTestAlertMessageKey =
  | "test_alert_delivered"
  | "test_alert_failed_delivery"
  | "test_alert_disabled"
  | "test_alert_no_webhook";

/**
 * Synchronous test delivery (PHI-safe payload). Logs medora_test_alert_* ; never exposes webhook URL.
 */
export async function sendMedoraTestAlert(params: {
  facilityId?: string;
  userId?: string;
  requestId?: string;
}): Promise<{ delivered: boolean; messageKey: MedoraTestAlertMessageKey }> {
  logInfo("medora_test_alert_requested", {
    action: "medora_test_alert_requested",
    facilityId: params.facilityId,
  });

  if (!readAlertsEnabled()) {
    logError("medora_test_alert_failed", {
      action: "medora_test_alert_failed",
      reason: "alerts_disabled",
      facilityId: params.facilityId,
    });
    return { delivered: false, messageKey: "test_alert_disabled" };
  }
  const transport = readAlertTransport();
  const pagerDutyRoutingKey = readPagerDutyRoutingKey();
  const webhookUrl = readWebhookUrl();
  const destinationConfigured =
    transport === "pagerduty" ? Boolean(pagerDutyRoutingKey) : Boolean(webhookUrl);
  if (!destinationConfigured) {
    logError("medora_test_alert_failed", {
      action: "medora_test_alert_failed",
      reason: "no_alert_destination",
      transport,
      facilityId: params.facilityId,
    });
    return { delivered: false, messageKey: "test_alert_no_webhook" };
  }

  const input: MedoraAlertInput = {
    event: "medora_test_alert",
    severity: "warning",
    route: "/admin/system-health/test-alert",
    facilityId: params.facilityId ?? null,
    userId: params.userId ?? null,
    requestId: params.requestId ?? null,
  };
  const payload = buildMedoraAlertPayload(input);
  const format = readAlertFormat();
  const url = transport === "pagerduty" ? PAGERDUTY_EVENTS_API_V2_URL : webhookUrl!;
  const bodyString =
    transport === "pagerduty"
      ? JSON.stringify(buildPagerDutyEventsApiV2Body(payload, pagerDutyRoutingKey!))
      : format === "slack"
        ? JSON.stringify(buildSlackWebhookBody(payload))
        : JSON.stringify(payload);

  const ok = await deliverMedoraAlertWebhookWithRetries(url, bodyString, payload, fetch);
  if (ok) {
    logInfo("medora_test_alert_sent", {
      action: "medora_test_alert_sent",
      event: payload.event,
      facilityId: payload.facilityId,
    });
    return { delivered: true, messageKey: "test_alert_delivered" };
  }
  logError("medora_test_alert_failed", {
    action: "medora_test_alert_failed",
    reason: "delivery_exhausted",
    event: payload.event,
    facilityId: payload.facilityId,
  });
  return { delivered: false, messageKey: "test_alert_failed_delivery" };
}

/**
 * Fire-and-forget operational alert. Respects MEDORA_ALERT_ENABLED; uses MEDORA_ALERT_WEBHOOK_URL when set.
 * S17C: retries (3×), backoff, Slack/json format, delivery logs; never throws to callers.
 */
export function queueMedoraAlert(input: MedoraAlertInput): void {
  if (!readAlertsEnabled()) return;

  const payload = buildMedoraAlertPayload(input);
  const transport = readAlertTransport();
  const pagerDutyRoutingKey = readPagerDutyRoutingKey();
  const webhookUrl = readWebhookUrl();
  const format = readAlertFormat();
  const url = transport === "pagerduty" ? PAGERDUTY_EVENTS_API_V2_URL : webhookUrl;
  const bodyString =
    transport === "pagerduty" && pagerDutyRoutingKey
      ? JSON.stringify(buildPagerDutyEventsApiV2Body(payload, pagerDutyRoutingKey))
      : format === "slack"
        ? JSON.stringify(buildSlackWebhookBody(payload))
        : JSON.stringify(payload);

  const delivery = (async () => {
    try {
      const destinationConfigured =
        transport === "pagerduty" ? Boolean(pagerDutyRoutingKey) : Boolean(webhookUrl);
      if (!destinationConfigured || !url) {
        if (!warnedNoWebhookForEventType.has(payload.event)) {
          warnedNoWebhookForEventType.add(payload.event);
          console.warn(
            `[medora-alert] alert destination not configured (transport=${transport}); delivery skipped (event=${payload.event}).`
          );
        }
        return;
      }

      await deliverMedoraAlertWebhookWithRetries(url, bodyString, payload, fetch).catch(() => false);
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

  pendingAlertDeliveries.add(delivery);
  void delivery.finally(() => {
    pendingAlertDeliveries.delete(delivery);
  });
}
