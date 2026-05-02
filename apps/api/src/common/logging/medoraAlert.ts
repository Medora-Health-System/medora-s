/**
 * S17B — Operational alerts (webhook or console). Never include PHI; never throw to callers.
 * Payload is a strict allowlist aligned with go-live ops runbooks.
 */

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

async function postWebhook(url: string, body: MedoraAlertPayload): Promise<void> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    if (!res.ok) {
      console.warn("[medora-alert] webhook non-OK status", res.status);
    }
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fire-and-forget operational alert. Respects MEDORA_ALERT_ENABLED; uses MEDORA_ALERT_WEBHOOK_URL when set,
 * otherwise logs one console line (safe JSON). Webhook/network failures are console.warn only.
 */
export function queueMedoraAlert(input: MedoraAlertInput): void {
  if (!readAlertsEnabled()) return;

  const body = buildMedoraAlertPayload(input);
  const url = readWebhookUrl();

  void (async () => {
    try {
      if (url) {
        await postWebhook(url, body);
      } else {
        console.warn(`[medora-alert] ${JSON.stringify(body)}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[medora-alert] delivery failed", msg);
    }
  })();
}
