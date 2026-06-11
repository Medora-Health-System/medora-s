import { parseApiResponse } from "@/lib/apiClient";

/** Session-level /api/auth/me cache — safe for concurrent layout + hook reads. */
export const AUTH_ME_SESSION_TTL_MS = 10_000;

type AuthMeSessionResult = {
  ok: boolean;
  data: Record<string, unknown> | null;
};

let cached: (AuthMeSessionResult & { at: number }) | null = null;
let inFlight: Promise<AuthMeSessionResult> | null = null;

export function invalidateAuthMeSessionCache(): void {
  cached = null;
}

export async function fetchAuthMeSession(options?: { force?: boolean }): Promise<AuthMeSessionResult> {
  const now = Date.now();
  if (!options?.force && cached && now - cached.at < AUTH_ME_SESSION_TTL_MS) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[perf] auth/me cache hit");
    }
    return { ok: cached.ok, data: cached.data };
  }

  if (!options?.force && inFlight) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[perf] auth/me in-flight reused");
    }
    return inFlight;
  }

  inFlight = (async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await parseApiResponse(res);
      const d =
        data && typeof data === "object" && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : null;
      const result: AuthMeSessionResult = { ok: res.ok, data: d };
      cached = { ...result, at: Date.now() };
      return result;
    } catch {
      const result: AuthMeSessionResult = { ok: false, data: null };
      cached = { ...result, at: Date.now() };
      return result;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
