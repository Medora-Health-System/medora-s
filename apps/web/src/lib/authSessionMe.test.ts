import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifyAuthMeHttpStatus,
  fetchAuthMeSession,
  invalidateAuthMeSessionCache,
} from "./authSessionMe";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("authSessionMe bootstrap recovery", () => {
  beforeEach(() => {
    invalidateAuthMeSessionCache();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    invalidateAuthMeSessionCache();
  });

  it("returns authenticated result on auth/me 200", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ id: "u1", facilityRoles: [] }, 200)
    );

    const result = await fetchAuthMeSession({ force: true });
    expect(result.ok).toBe(true);
    expect(result.failureKind).toBe("none");
    expect(result.data?.id).toBe("u1");
  });

  it("returns unauthenticated on auth/me 401", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: "Session expirée." }, 401)
    );

    const result = await fetchAuthMeSession({ force: true });
    expect(result.ok).toBe(false);
    expect(result.failureKind).toBe("unauthenticated");
    expect(result.status).toBe(401);
  });

  it("retries once on auth/me 502 then succeeds", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ error: "bad gateway" }, 502))
      .mockResolvedValueOnce(jsonResponse({ id: "u1", facilityRoles: [{ facilityId: "f1" }] }, 200));

    const result = await fetchAuthMeSession({ force: true });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });

  it("returns unavailable after retry still fails with 502", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ error: "bad gateway" }, 502))
      .mockResolvedValueOnce(jsonResponse({ error: "bad gateway" }, 502));

    const result = await fetchAuthMeSession({ force: true });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(false);
    expect(result.failureKind).toBe("unavailable");
    expect(result.status).toBe(502);
  });

  it("returns network failure on fetch throw", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const result = await fetchAuthMeSession({ force: true });
    expect(result.ok).toBe(false);
    expect(result.failureKind).toBe("network");
  });

  it("classifies HTTP statuses for recovery routing", () => {
    expect(classifyAuthMeHttpStatus(401)).toBe("unauthenticated");
    expect(classifyAuthMeHttpStatus(502)).toBe("unavailable");
    expect(classifyAuthMeHttpStatus(503)).toBe("unavailable");
  });
});
