import * as medoraLogger from "./medoraLogger";
import {
  buildMedoraAlertPayload,
  buildSlackWebhookBody,
  deliverMedoraAlertWebhookWithRetries,
} from "./medoraAlert";

describe("medoraAlert S17C", () => {
  const baseInput = { event: "test_alert_event", severity: "critical" as const };

  beforeEach(() => {
    jest.spyOn(medoraLogger, "logInfo").mockImplementation(() => {});
    jest.spyOn(medoraLogger, "logError").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
    await deliverMedoraAlertWebhookWithRetries("http://example.test/hook", "{}", p, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(medoraLogger.logError).toHaveBeenCalled();
  });

  it("delivery stops after first success", async () => {
    const p = buildMedoraAlertPayload(baseInput);
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    await deliverMedoraAlertWebhookWithRetries("http://example.test/hook", "{}", p, fetchImpl as unknown as typeof fetch);
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
    ).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
