import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { applyAuthCookiesToResponse, refreshAccessTokenFromCookies } from "@/lib/server/refreshAccessToken";
import { jwtAccessTtlSeconds } from "@/lib/server/sessionCookieOptions";

import { resolveApiUrl } from "@/lib/server/resolveApiUrl";

const BACKEND_ME_TIMEOUT_MS = 12_000;
const BACKEND_ME_RETRY_DELAY_MS = 350;

function isRetryableBackendStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

async function fetchBackendMe(input: {
  apiUrl: string;
  accessToken: string;
  requestId: string;
  signal: AbortSignal;
}): Promise<Response> {
  return fetch(`${input.apiUrl}/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.accessToken}`,
      ...(input.requestId ? { "x-request-id": input.requestId } : {}),
    },
    signal: input.signal,
  });
}

async function fetchBackendMeWithRetry(input: {
  apiUrl: string;
  accessToken: string;
  requestId: string;
}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_ME_TIMEOUT_MS);
  try {
    let response = await fetchBackendMe({ ...input, signal: controller.signal });
    if (isRetryableBackendStatus(response.status)) {
      await new Promise((resolve) => setTimeout(resolve, BACKEND_ME_RETRY_DELAY_MS));
      response = await fetchBackendMe({ ...input, signal: controller.signal });
    }
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(request: NextRequest) {
  const requestId = request.headers.get("x-request-id")?.trim() ?? "";
  const withRequestId = (res: NextResponse) => {
    if (requestId) res.headers.set("x-request-id", requestId);
    return res;
  };
  try {
    let apiUrl: string;
    try {
      apiUrl = resolveApiUrl();
    } catch (configError) {
      console.error("[auth/me] API URL misconfigured", {
        requestId: requestId || undefined,
        reason: configError instanceof Error ? configError.message : String(configError),
      });
      return withRequestId(
        NextResponse.json(
          {
            error: "Authentication service temporarily unavailable.",
            code: "AUTH_SERVICE_UNAVAILABLE",
          },
          { status: 503 }
        )
      );
    }

    const cookieStore = await cookies();
    let accessToken =
      cookieStore.get("accessToken")?.value ?? cookieStore.get("medora_session")?.value;

    if (!accessToken) {
      return withRequestId(
        NextResponse.json({ error: "Not authenticated.", code: "AUTH_REQUIRED" }, { status: 401 })
      );
    }

    let backendResponse = await fetchBackendMeWithRetry({
      apiUrl,
      accessToken,
      requestId,
    });
    let refreshedTokens: Awaited<ReturnType<typeof refreshAccessTokenFromCookies>> = null;

    if (backendResponse.status === 401) {
      refreshedTokens = await refreshAccessTokenFromCookies(requestId || undefined, request);
      if (refreshedTokens) {
        accessToken = refreshedTokens.accessToken;
        backendResponse = await fetchBackendMeWithRetry({
          apiUrl,
          accessToken,
          requestId,
        });
      }
    }

    if (!backendResponse.ok) {
      if (backendResponse.status === 401) {
        return withRequestId(
          NextResponse.json(
            { error: "Session expired.", code: "AUTH_SESSION_EXPIRED" },
            { status: 401 }
          )
        );
      }
      if (isRetryableBackendStatus(backendResponse.status)) {
        console.error("[auth/me] backend unavailable", {
          requestId: requestId || undefined,
          status: backendResponse.status,
        });
        return withRequestId(
          NextResponse.json(
            {
              error: "Authentication service temporarily unavailable.",
              code: "AUTH_SERVICE_UNAVAILABLE",
            },
            { status: 503 }
          )
        );
      }
      const errorData = await backendResponse.json().catch(() => ({ error: "Request failed." }));
      return withRequestId(
        NextResponse.json(
          {
            error:
              typeof errorData.error === "string"
                ? errorData.error
                : typeof errorData.message === "string"
                  ? errorData.message
                  : "Request failed.",
          },
          { status: backendResponse.status }
        )
      );
    }

    const userData = await backendResponse.json();
    /** Même base que les cookies d’accès (JWT_ACCESS_TTL apps/web) — évite un décalage avec NEXT_PUBLIC côté client. */
    const res = NextResponse.json({
      ...(typeof userData === "object" && userData !== null && !Array.isArray(userData) ? userData : {}),
      accessTokenTtlSeconds: jwtAccessTtlSeconds(),
    });

    if (refreshedTokens) {
      applyAuthCookiesToResponse(res, refreshedTokens);
      if (process.env.NODE_ENV !== "production") {
        console.log("[auth/me] session renouvelée, cookies mis à jour");
      }
    }

    return withRequestId(res);
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    console.error("[auth/me] proxy failure", {
      requestId: requestId || undefined,
      reason: isAbort ? "timeout" : error instanceof Error ? error.name : "unknown",
    });
    return withRequestId(
      NextResponse.json(
        {
          error: isAbort
            ? "Session verification timed out."
            : "Authentication service temporarily unavailable.",
          code: "AUTH_SERVICE_UNAVAILABLE",
        },
        { status: 503 }
      )
    );
  }
}
