import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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
  cookies: vi.fn().mockResolvedValue({
    get: () => undefined,
  }),
}));

import { proxyNestRequest } from "./nestApiProxy";

describe("proxyNestRequest status propagation", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Droits insuffisants pour annuler cette ligne." }), {
          status: 403,
          headers: { "content-type": "application/json" },
        })
      )
    );
  });

  it("forwards upstream 403 to the client response", async () => {
    const req = new NextRequest("https://app.example.test/api/backend/orders/items/x/cancel", {
      method: "POST",
      headers: {
        cookie: "accessToken=test-token",
        "x-facility-id": "fac-1",
      },
    });
    req.cookies.set("accessToken", "test-token");

    const res = await proxyNestRequest(req, "orders/items/x/cancel");
    expect(res.status).toBe(403);
    const body = (await res.json()) as { message?: string };
    expect(body.message).toContain("Droits insuffisants");
  });

  it("forwards upstream 409 to the client response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Cette commande ne peut plus être annulée." }), {
          status: 409,
          headers: { "content-type": "application/json" },
        })
      )
    );
    const req = new NextRequest("https://app.example.test/api/backend/orders/items/x/cancel", {
      method: "POST",
      headers: {
        cookie: "accessToken=test-token",
        "x-facility-id": "fac-1",
      },
    });
    req.cookies.set("accessToken", "test-token");
    const res = await proxyNestRequest(req, "orders/items/x/cancel");
    expect(res.status).toBe(409);
  });

  it("allows only platform integration-admin routes without clinical facility context", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith("/auth/me")) return Promise.resolve(new Response(JSON.stringify({ facilityRoles: [] }), { status: 200, headers: { "content-type": "application/json" } }));
      return Promise.resolve(new Response(JSON.stringify([{ id: "integration-1" }]), { status: 200, headers: { "content-type": "application/json" } }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const req = new NextRequest("https://app.example.test/api/admin/integrations", { headers: { cookie: "accessToken=test-token" } });
    req.cookies.set("accessToken", "test-token");
    const res = await proxyNestRequest(req, "admin/integrations");
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.test/admin/integrations", expect.objectContaining({ method: "GET" }));
  });

  it("continues to reject an ordinary clinical route without facility context", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ facilityRoles: [] }), { status: 200, headers: { "content-type": "application/json" } })));
    vi.stubGlobal("fetch", fetchMock);
    const req = new NextRequest("https://app.example.test/api/backend/patients", { headers: { cookie: "accessToken=test-token" } });
    req.cookies.set("accessToken", "test-token");
    const res = await proxyNestRequest(req, "patients");
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ message: "No facility selected." });
    expect(fetchMock.mock.calls.every(([url]) => String(url).endsWith("/auth/me"))).toBe(true);
  });
});
