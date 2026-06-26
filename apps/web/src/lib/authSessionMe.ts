import { parseApiResponse } from "@/lib/apiClient";

/** Session-level /api/auth/me cache — safe for concurrent layout + hook reads. */
export const AUTH_ME_SESSION_TTL_MS = 10_000;
export const AUTH_ME_FETCH_TIMEOUT_MS = 15_000;
export const AUTH_ME_RETRY_DELAY_MS = 400;

export type AuthMeFailureKind =
  | "none"
  | "unauthenticated"
  | "unavailable"
  | "network"
  | "timeout";

export type AuthMeSessionResult = {
  ok: boolean;
  status: number | null;
  data: Record<string, unknown> | null;
  failureKind: AuthMeFailureKind;
  message: string | null;
};

let cached: (AuthMeSessionResult & { at: number }) | null = null;
let inFlight: Promise<AuthMeSessionResult> | null = null;

export function invalidateAuthMeSessionCache(): void {
  cached = null;
}

export function classifyAuthMeHttpStatus(status: number): AuthMeFailureKind {
  if (status === 401) return "unauthenticated";
  if (status === 502 || status === 503 || status === 504) return "unavailable";
  if (status >= 500) return "unavailable";
  return "unavailable";
}

function buildAuthMeSessionResult(input: {
  ok: boolean;
  status: number | null;
  data: Record<string, unknown> | null;
}): AuthMeSessionResult {
  if (input.ok) {
    return {
      ok: true,
      status: input.status,
      data: input.data,
      failureKind: "none",
      message: null,
    };
  }
  const message =
    typeof input.data?.error === "string"
      ? input.data.error
      : typeof input.data?.message === "string"
        ? input.data.message
        : null;
  const failureKind =
    input.status != null ? classifyAuthMeHttpStatus(input.status) : "network";
  return {
    ok: false,
    status: input.status,
    data: input.data,
    failureKind,
    message,
  };
}

function isRetryableAuthMeStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

async function fetchAuthMeOnce(signal: AbortSignal): Promise<AuthMeSessionResult> {
  const res = await fetch("/api/auth/me", { credentials: "include", signal });
  const data = await parseApiResponse(res);
  const d =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  return buildAuthMeSessionResult({ ok: res.ok, status: res.status, data: d });
}

async function fetchAuthMeWithRetry(): Promise<AuthMeSessionResult> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), AUTH_ME_FETCH_TIMEOUT_MS);
  try {
    let result = await fetchAuthMeOnce(controller.signal);
    if (
      !result.ok &&
      result.status != null &&
      isRetryableAuthMeStatus(result.status)
    ) {
      await new Promise((resolve) => globalThis.setTimeout(resolve, AUTH_ME_RETRY_DELAY_MS));
      result = await fetchAuthMeOnce(controller.signal);
    }
    return result;
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "AbortError";
    return {
      ok: false,
      status: null,
      data: null,
      failureKind: isTimeout ? "timeout" : "network",
      message: null,
    };
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function fetchAuthMeSession(options?: { force?: boolean }): Promise<AuthMeSessionResult> {
  const now = Date.now();
  if (!options?.force && cached && now - cached.at < AUTH_ME_SESSION_TTL_MS) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[perf] auth/me cache hit");
    }
    const { at: _at, ...result } = cached;
    return result;
  }

  if (!options?.force && inFlight) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[perf] auth/me in-flight reused");
    }
    return inFlight;
  }

  inFlight = (async () => {
    try {
      const result = await fetchAuthMeWithRetry();
      cached = { ...result, at: Date.now() };
      return result;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
