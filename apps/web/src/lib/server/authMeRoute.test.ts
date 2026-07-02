import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/resolveApiUrl", () => ({
  resolveApiUrl: () => "https://api.example.test",
}));

vi.mock("@/lib/server/refreshAccessToken", () => ({
  refreshAccessTokenFromCookies: vi.fn().mockResolvedValue(null),
  applyAuthCookiesToResponse: vi.fn(),
  jwtAccessTtlSeconds: () => 900,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: (name: string) => {
      if (name === "accessToken") return { value: "test-access-token" };
      return undefined;
    },
  }),
}));

import { GET } from "../../../app/api/auth/me/route";

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("forwards Authorization bearer to backend /auth/me", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "u1", facilityRoles: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    const req = new NextRequest("https://app.example.test/api/auth/me", {
      headers: { cookie: "accessToken=test-access-token" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.test/auth/me");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-access-token",
    });
  });

  it("maps backend 503 to recoverable AUTH_SERVICE_UNAVAILABLE without clearing cookies", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "upstream down" }), { status: 503 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "upstream down" }), { status: 503 })
      );

    const req = new NextRequest("https://app.example.test/api/auth/me");
    const res = await GET(req);
    expect(res.status).toBe(503);
    const body = (await res.json()) as { code?: string; error?: string };
    expect(body.code).toBe("AUTH_SERVICE_UNAVAILABLE");
    expect(body.error).toContain("temporarily unavailable");
    expect(body.error).not.toMatch(/authentification|indisponible/i);
  });
});
