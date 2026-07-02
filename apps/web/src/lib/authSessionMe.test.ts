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

  it("force refresh bypasses cached unavailable result after login retry", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: "Service unavailable.", code: "AUTH_SERVICE_UNAVAILABLE" }, 503)
    );
    const failed = await fetchAuthMeSession({ force: true });
    expect(failed.ok).toBe(false);

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ id: "u1", facilityRoles: [{ facilityId: "f1" }] }, 200)
    );
    const recovered = await fetchAuthMeSession({ force: true });
    expect(recovered.ok).toBe(true);
    expect(recovered.data?.id).toBe("u1");
  });

  it("does not cache transient unavailable responses", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: "Service unavailable.", code: "AUTH_SERVICE_UNAVAILABLE" }, 503)
    );
    const first = await fetchAuthMeSession({ force: true });
    expect(first.ok).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ id: "u1", facilityRoles: [{ facilityId: "f1" }] }, 200)
    );
    const second = await fetchAuthMeSession();
    expect(second.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("supersedes stale in-flight fetch when a newer force fetch starts", async () => {
    let resolveFirst!: (value: Response) => void;
    let rejectFirst!: (reason?: unknown) => void;
    const firstHang = new Promise<Response>((resolve, reject) => {
      resolveFirst = resolve;
      rejectFirst = reject;
    });

    vi.mocked(fetch).mockImplementation((_url, init) => {
      const signal = init?.signal as AbortSignal | undefined;
      if (signal) {
        if (signal.aborted) {
          return Promise.reject(new DOMException("The operation was aborted.", "AbortError"));
        }
        signal.addEventListener(
          "abort",
          () => rejectFirst(new DOMException("The operation was aborted.", "AbortError")),
          { once: true }
        );
      }
      return firstHang;
    });

    const stale = fetchAuthMeSession({ force: true });
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ id: "u-new", facilityRoles: [{ facilityId: "f1" }] }, 200)
    );
    const latest = await fetchAuthMeSession({ force: true });
    resolveFirst(jsonResponse({ error: "Session expirée." }, 401));

    const staleResult = await stale;
    expect(latest.ok).toBe(true);
    expect(latest.data?.id).toBe("u-new");
    expect(staleResult.superseded || staleResult.failureKind === "superseded").toBe(true);
  });
});
