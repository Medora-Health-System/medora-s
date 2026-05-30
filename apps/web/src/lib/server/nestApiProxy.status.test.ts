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
});
