/**
 * MEDUI.D4C.7J — proves the encounter-close acknowledgement body reaches the Nest endpoint
 * unchanged. Production logs proved the facility header was forwarded but said nothing about
 * the request body, so the acknowledgement fields are asserted field by field here.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { D4C7J_ACKNOWLEDGEMENT_VERSION, D4C7J_CLOSE_CODES } from "@medora/shared";

vi.mock("@/lib/server/validateRequestOrigin", () => ({
  validateRequestOrigin: () => null,
}));

vi.mock("@/lib/server/resolveApiUrl", () => ({
  resolveApiUrl: () => "https://api.example.test",
}));

vi.mock("@/lib/server/refreshAccessToken", () => ({
  refreshAccessTokenFromCookies: vi.fn().mockResolvedValue(null),
  applyAuthCookiesToResponse: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: () => undefined }),
}));

import { proxyNestRequest } from "./nestApiProxy";

const ENCOUNTER_ID = "44d7099e-5617-4bc8-93aa-e31452188479";
const FACILITY_ID = "2deef640-019a-49f4-8593-76ca4aab2334";
const NEST_PATH = `encounters/${ENCOUNTER_ID}/close`;

const closeBody = {
  dischargeStatus: "DISCHARGED",
  acknowledgePendingClinicalItems: true,
  acknowledgementVersion: D4C7J_ACKNOWLEDGEMENT_VERSION,
  acknowledgementReason: "PROVIDER_ELECTED_TO_CLOSE",
  clientRequestId: "close-req-1",
  expectedVersion: 7,
};

function buildCloseRequest(body: unknown = closeBody): NextRequest {
  const req = new NextRequest(`https://app.example.test/api/backend/${NEST_PATH}`, {
    method: "POST",
    headers: {
      cookie: "accessToken=test-token",
      "content-type": "application/json",
      "x-facility-id": FACILITY_ID,
      "x-request-id": "req-corr-1",
    },
    body: JSON.stringify(body),
  });
  req.cookies.set("accessToken", "test-token");
  return req;
}

function stubUpstream(status = 200, payload: unknown = { id: ENCOUNTER_ID, status: "CLOSED" }) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" },
    })
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("MEDUI.D4C.7J proxy body forwarding (/api/backend/[...path])", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards method, path, and the full acknowledgement body unchanged", async () => {
    const fetchMock = stubUpstream();
    await proxyNestRequest(buildCloseRequest(), NEST_PATH);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://api.example.test/${NEST_PATH}`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(closeBody);
  });

  it("preserves the acknowledgement boolean, version, reason, and request id", async () => {
    const fetchMock = stubUpstream();
    await proxyNestRequest(buildCloseRequest(), NEST_PATH);

    const forwarded = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(forwarded.acknowledgePendingClinicalItems).toBe(true);
    expect(forwarded.acknowledgementVersion).toBe(D4C7J_ACKNOWLEDGEMENT_VERSION);
    expect(forwarded.acknowledgementReason).toBe("PROVIDER_ELECTED_TO_CLOSE");
    expect(forwarded.clientRequestId).toBe("close-req-1");
    expect(forwarded.expectedVersion).toBe(7);
  });

  it("preserves facility, authorization, correlation id, and JSON content type", async () => {
    const fetchMock = stubUpstream();
    await proxyNestRequest(buildCloseRequest(), NEST_PATH);

    const init = (fetchMock.mock.calls[0] as [string, RequestInit])[1];
    const headers = init.headers as Headers;
    expect(headers.get("x-facility-id")).toBe(FACILITY_ID);
    expect(headers.get("authorization")).toBe("Bearer test-token");
    expect(headers.get("x-request-id")).toBe("req-corr-1");
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("returns the advisory 409 payload to the browser without rewriting it", async () => {
    const advisory = {
      statusCode: 409,
      code: D4C7J_CLOSE_CODES.PENDING_CLINICAL_ITEMS,
      preflight: {
        pending: { medications: 2, followUps: 1 },
        priorityCategories: ["activeInfusion"],
        canCloseAfterAcknowledgement: true,
      },
    };
    stubUpstream(409, advisory);
    const res = await proxyNestRequest(buildCloseRequest({ dischargeStatus: "DISCHARGED" }), NEST_PATH);

    expect(res.status).toBe(409);
    const body = (await res.json()) as typeof advisory;
    expect(body.code).toBe(D4C7J_CLOSE_CODES.PENDING_CLINICAL_ITEMS);
    expect(body.preflight.pending.medications).toBe(2);
    expect(body.preflight.canCloseAfterAcknowledgement).toBe(true);
  });

  it("sends exactly one upstream request per close call (no proxy-level retry on 409)", async () => {
    const fetchMock = stubUpstream(409, { code: D4C7J_CLOSE_CODES.PENDING_CLINICAL_ITEMS });
    await proxyNestRequest(buildCloseRequest(), NEST_PATH);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("passes the idempotent success projection through unchanged", async () => {
    stubUpstream(200, {
      id: ENCOUNTER_ID,
      status: "CLOSED",
      closeResult: { idempotent: true, pendingClinicalItemsPreserved: true },
    });
    const res = await proxyNestRequest(buildCloseRequest(), NEST_PATH);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { closeResult?: { idempotent?: boolean } };
    expect(body.closeResult?.idempotent).toBe(true);
  });
});
