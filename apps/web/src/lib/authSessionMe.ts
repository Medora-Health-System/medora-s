import { parseApiResponse } from "@/lib/apiClient";

/** Session-level /api/auth/me cache — safe for concurrent layout + hook reads. */
export const AUTH_ME_SESSION_TTL_MS = 10_000;
export const AUTH_ME_FETCH_TIMEOUT_MS = 15_000;
export const AUTH_ME_RETRY_DELAY_MS = 400;

export type AuthMeFailureKind =
  | "none"
  | "unauthenticated"
  | "forbidden"
  | "unavailable"
  | "network"
  | "timeout"
  | "superseded";

export type AuthMeSessionResult = {
  ok: boolean;
  status: number | null;
  data: Record<string, unknown> | null;
  failureKind: AuthMeFailureKind;
  message: string | null;
  superseded?: boolean;
};

let cached: (AuthMeSessionResult & { at: number }) | null = null;
let inFlight: Promise<AuthMeSessionResult> | null = null;
let inFlightEpoch = 0;
let fetchEpoch = 0;
let activeFetchController: AbortController | null = null;

export function invalidateAuthMeSessionCache(): void {
  cached = null;
  fetchEpoch += 1;
  activeFetchController?.abort();
  activeFetchController = null;
  inFlight = null;
}

export function classifyAuthMeHttpStatus(status: number): AuthMeFailureKind {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 502 || status === 503 || status === 504) return "unavailable";
  if (status >= 500) return "unavailable";
  return "unavailable";
}

function buildAuthMeSessionResult(input: {
  ok: boolean;
  status: number | null;
  data: Record<string, unknown> | null;
  failureKind?: AuthMeFailureKind;
  superseded?: boolean;
}): AuthMeSessionResult {
  if (input.superseded) {
    return {
      ok: false,
      status: input.status,
      data: input.data,
      failureKind: "superseded",
      message: null,
      superseded: true,
    };
  }
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
    input.failureKind ??
    (input.status != null ? classifyAuthMeHttpStatus(input.status) : "network");
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

function isSupersededAbort(error: unknown, epoch: number): boolean {
  return (
    epoch !== fetchEpoch &&
    error instanceof DOMException &&
    error.name === "AbortError"
  );
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

async function fetchAuthMeWithRetry(
  signal: AbortSignal,
  epoch: number
): Promise<AuthMeSessionResult> {
  const timeoutController = new AbortController();
  const timeoutId = globalThis.setTimeout(() => timeoutController.abort(), AUTH_ME_FETCH_TIMEOUT_MS);
  const onParentAbort = () => timeoutController.abort();
  if (signal.aborted) {
    timeoutController.abort();
  } else {
    signal.addEventListener("abort", onParentAbort, { once: true });
  }
  try {
    let result = await fetchAuthMeOnce(timeoutController.signal);
    if (
      !result.ok &&
      result.status != null &&
      isRetryableAuthMeStatus(result.status)
    ) {
      await new Promise((resolve) => globalThis.setTimeout(resolve, AUTH_ME_RETRY_DELAY_MS));
      result = await fetchAuthMeOnce(timeoutController.signal);
    }
    return result;
  } catch (error) {
    if (isSupersededAbort(error, epoch)) {
      return buildAuthMeSessionResult({
        ok: false,
        status: null,
        data: null,
        superseded: true,
      });
    }
    const isTimeout = error instanceof DOMException && error.name === "AbortError";
    return buildAuthMeSessionResult({
      ok: false,
      status: null,
      data: null,
      failureKind: isTimeout ? "timeout" : "network",
    });
  } finally {
    signal.removeEventListener("abort", onParentAbort);
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

  if (options?.force) {
    cached = null;
    activeFetchController?.abort();
    activeFetchController = null;
    inFlight = null;
  } else if (inFlight) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[perf] auth/me in-flight reused");
    }
    return inFlight;
  }

  const epoch = ++fetchEpoch;
  const controller = new AbortController();
  activeFetchController = controller;
  inFlightEpoch = epoch;

  inFlight = (async () => {
    try {
      const result = await fetchAuthMeWithRetry(controller.signal, epoch);
      if (result.superseded) {
        return result;
      }
      if (epoch === fetchEpoch && result.ok) {
        cached = { ...result, at: Date.now() };
      }
      return result;
    } finally {
      if (inFlightEpoch === epoch) {
        inFlight = null;
      }
      if (activeFetchController === controller) {
        activeFetchController = null;
      }
    }
  })();

  return inFlight;
}
