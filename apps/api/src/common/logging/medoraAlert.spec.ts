import * as medoraLogger from "./medoraLogger";
import {
  buildMedoraAlertPayload,
  buildPagerDutyEventsApiV2Body,
  buildSlackWebhookBody,
  deliverMedoraAlertWebhookWithRetries,
  drainMedoraAlerts,
  queueMedoraAlert,
  resetMedoraAlertTestState,
} from "./medoraAlert";

describe("medoraAlert S17C", () => {
  const baseInput = { event: "test_alert_event", severity: "critical" as const };
  const prevAlertEnabled = process.env.MEDORA_ALERT_ENABLED;
  const prevNodeEnv = process.env.NODE_ENV;
  const prevWebhook = process.env.MEDORA_ALERT_WEBHOOK_URL;
  const prevTransport = process.env.MEDORA_ALERT_TRANSPORT;
  const prevPagerDutyKey = process.env.MEDORA_PAGERDUTY_ROUTING_KEY;

  beforeEach(() => {
    jest.spyOn(medoraLogger, "logInfo").mockImplementation(() => {});
    jest.spyOn(medoraLogger, "logError").mockImplementation(() => {});
    resetMedoraAlertTestState();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resetMedoraAlertTestState();
    if (prevAlertEnabled === undefined) delete process.env.MEDORA_ALERT_ENABLED;
    else process.env.MEDORA_ALERT_ENABLED = prevAlertEnabled;
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    if (prevWebhook === undefined) delete process.env.MEDORA_ALERT_WEBHOOK_URL;
    else process.env.MEDORA_ALERT_WEBHOOK_URL = prevWebhook;
    if (prevTransport === undefined) delete process.env.MEDORA_ALERT_TRANSPORT;
    else process.env.MEDORA_ALERT_TRANSPORT = prevTransport;
    if (prevPagerDutyKey === undefined) delete process.env.MEDORA_PAGERDUTY_ROUTING_KEY;
    else process.env.MEDORA_PAGERDUTY_ROUTING_KEY = prevPagerDutyKey;
  });

  it("buildMedoraAlertPayload only exposes allowlisted operational fields", () => {
    const p = buildMedoraAlertPayload({
      ...baseInput,
      facilityId: "fac-1",
      encounterId: "enc-1",
      userId: "usr-1",
      requestId: "req-1",
      route: "GET /api/x",
      statusCode: 503,
    });
    const keys = Object.keys(p).join(" ").toLowerCase();
    expect(keys).not.toMatch(/patient|mrn|name|note|diagnosis|medication|message|payload/i);
    expect(p.event).toBe("test_alert_event");
    expect(p.service).toBe("medora-api");
  });

  it("PagerDuty Events API v2 body excludes internal actor, encounter, facility, route, and clinical identifiers", () => {
    const p = buildMedoraAlertPayload({
      ...baseInput,
      facilityId: "fac-secret",
      encounterId: "enc-secret",
      userId: "usr-secret",
      requestId: "req-opaque",
      route: "/patients/patient-secret/encounters/enc-secret",
      statusCode: 503,
    });
    const body = buildPagerDutyEventsApiV2Body(p, "routing-secret");
    expect(body.routing_key).toBe("routing-secret");
    expect(body.event_action).toBe("trigger");
    expect(body.payload.summary).toContain("test_alert_event");
    expect(body.payload.source).toBe("medora-api");
    expect(body.payload.custom_details).toEqual(
      expect.objectContaining({
        event: "test_alert_event",
        requestId: "req-opaque",
        statusCode: 503,
      })
    );
    const external = JSON.stringify(body);
    expect(external).not.toContain("fac-secret");
    expect(external).not.toContain("enc-secret");
    expect(external).not.toContain("usr-secret");
    expect(external).not.toContain("patient-secret");
    expect(external).not.toContain("/patients/");
  });

  it("PagerDuty dedup key is stable for retries of the same payload", () => {
    const p = buildMedoraAlertPayload(baseInput);
    const first = buildPagerDutyEventsApiV2Body(p, "key-a");
    const second = buildPagerDutyEventsApiV2Body(p, "key-a");
    expect(first.dedup_key).toBe(second.dedup_key);
    expect(first.dedup_key).toMatch(/^medora-[a-f0-9]{64}$/);
  });

  it("Slack body text and serialized blocks stay PHI-safe", () => {
    const p = buildMedoraAlertPayload({
      ...baseInput,
      facilityId: "11111111-1111-1111-1111-111111111111",
      encounterId: "22222222-2222-2222-2222-222222222222",
    });
    const slack = buildSlackWebhookBody(p);
    const raw = JSON.stringify(slack);
    expect(raw).not.toMatch(/patient|mrn|diagnosis|note|medication|chiefcomplaint/i);
    expect(slack.text).toContain("test_alert_event");
    expect(Array.isArray(slack.blocks)).toBe(true);
  });

  it("delivery uses up to 3 fetch attempts when all fail", async () => {
    const p = buildMedoraAlertPayload(baseInput);
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(
      deliverMedoraAlertWebhookWithRetries("http://example.test/hook", "{}", p, fetchImpl as unknown as typeof fetch)
    ).resolves.toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(medoraLogger.logError).toHaveBeenCalled();
  });

  it("delivery stops after first success", async () => {
    const p = buildMedoraAlertPayload(baseInput);
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    await expect(
      deliverMedoraAlertWebhookWithRetries("http://example.test/hook", "{}", p, fetchImpl as unknown as typeof fetch)
    ).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(medoraLogger.logInfo).toHaveBeenCalledWith(
      "medora_alert_delivery_succeeded",
      expect.objectContaining({ event: "test_alert_event", attempt: 1 })
    );
  });

  it("delivery does not throw when fetch rejects", async () => {
    const p = buildMedoraAlertPayload(baseInput);
    const fetchImpl = jest.fn().mockRejectedValue(new Error("network"));
    await expect(
      deliverMedoraAlertWebhookWithRetries("http://example.test/hook", "{}", p, fetchImpl as unknown as typeof fetch)
    ).resolves.toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("is a no-op in NODE_ENV=test unless MEDORA_ALERT_ENABLED=true", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.MEDORA_ALERT_ENABLED;
    delete process.env.MEDORA_ALERT_WEBHOOK_URL;
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    queueMedoraAlert(baseInput);
    await drainMedoraAlerts();
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns once when alerts enabled without the selected destination, and drain settles", async () => {
    process.env.NODE_ENV = "development";
    process.env.MEDORA_ALERT_ENABLED = "true";
    process.env.MEDORA_ALERT_TRANSPORT = "pagerduty";
    delete process.env.MEDORA_PAGERDUTY_ROUTING_KEY;
    delete process.env.MEDORA_ALERT_WEBHOOK_URL;
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    queueMedoraAlert(baseInput);
    queueMedoraAlert(baseInput);
    await drainMedoraAlerts();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0] ?? "")).toContain("alert destination not configured");
    expect(String(warn.mock.calls[0]?.[0] ?? "")).toContain("transport=pagerduty");
  });
});
