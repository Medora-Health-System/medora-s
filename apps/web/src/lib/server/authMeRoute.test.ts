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

  it("maps backend 503 to BACKEND_TEMPORARILY_UNAVAILABLE without clearing cookies", async () => {
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
    const body = (await res.json()) as { error?: string; retryable?: boolean };
    expect(body.error).toBe("BACKEND_TEMPORARILY_UNAVAILABLE");
    expect(body.retryable).toBe(true);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("maps backend 502 to retryable 503 and does not convert to 401", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "bad gateway" }), { status: 502 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "bad gateway" }), { status: 502 })
      );

    const req = new NextRequest("https://app.example.test/api/auth/me");
    const res = await GET(req);
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error?: string; retryable?: boolean };
    expect(body.error).toBe("BACKEND_TEMPORARILY_UNAVAILABLE");
    expect(body.retryable).toBe(true);
    expect(body.error).not.toBe("SESSION_INVALID");
  });

  it("maps backend 401 to SESSION_INVALID", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })
    );

    const req = new NextRequest("https://app.example.test/api/auth/me");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string; retryable?: boolean };
    expect(body.error).toBe("SESSION_INVALID");
    expect(body.retryable).not.toBe(true);
  });
});
