import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  accessTokenCookieOptions,
  facilityIdHttpOnlyCookieOptions,
  facilityIdReadableCookieOptions,
  refreshTokenCookieOptions,
} from "@/lib/server/authCookieOptions";
import { jwtAccessTtlSeconds } from "@/lib/server/sessionCookieOptions";
import { resolveApiUrl } from "@/lib/server/resolveApiUrl";
import { extractRefreshTokenFromApiSetCookie } from "@/lib/server/extractRefreshTokenFromApiSetCookie";
import { authBffErrorJson } from "@/lib/server/authBffErrorJson";

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError && err.message?.includes("fetch")) return true;
  const c = err as { code?: string; cause?: { code?: string } };
  return c?.code === "ECONNREFUSED" || c?.cause?.code === "ECONNREFUSED" || c?.code === "ENOTFOUND" || c?.cause?.code === "ENOTFOUND";
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id")?.trim() ?? "";
  const withRequestId = (res: NextResponse) => {
    if (requestId) res.headers.set("x-request-id", requestId);
    return res;
  };
  try {
    const apiUrl = resolveApiUrl();

    const body = await request.json();

    const username = body.username ?? body.email ?? body.identifier ?? body.user ?? "";
    const password = body.password ?? "";

    if (!username || !password) {
      return withRequestId(NextResponse.json({ errorCode: "INVALID_REQUEST_BODY" }, { status: 400 }));
    }

    let r: Response;
    try {
      r = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(requestId ? { "x-request-id": requestId } : {}),
        },
        body: JSON.stringify({ username, password }),
      });
    } catch (fetchErr) {
      console.error("Login API unreachable:", fetchErr);
      return withRequestId(NextResponse.json({ errorCode: "SERVER_UNAVAILABLE" }, { status: 503 }));
    }

    if (!r.ok) {
      const errorData = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      const { errorCode, message } = authBffErrorJson(r.status, errorData, {
        fallback401: "INVALID_CREDENTIALS",
        fallbackOther: "AUTH_REQUEST_FAILED",
      });
      return withRequestId(
        NextResponse.json({ errorCode, ...(message ? { message } : {}) }, { status: r.status })
      );
    }

    let json: {
      accessToken?: string;
      refreshToken?: string;
      user?: { facilityRoles?: Array<{ facilityId: string }> };
      mfaRequired?: boolean;
      mfaChallengeToken?: string;
      mfaEnrollmentRequired?: boolean;
      mfaEnrollmentToken?: string;
      /** Phase 9 patch — facility-derived UI language, used by MFA panels before any session is issued. */
      preferredLanguage?: string;
    };
    try {
      json = await r.json();
    } catch {
      return withRequestId(NextResponse.json({ errorCode: "INVALID_SERVER_RESPONSE" }, { status: 502 }));
    }

    /** Phase 9 — MFA branches: do NOT set session cookies; return tokens to UI for the challenge/enrollment step. */
    if (json.mfaRequired && json.mfaChallengeToken) {
      return withRequestId(
        NextResponse.json({
          mfaRequired: true,
          mfaChallengeToken: json.mfaChallengeToken,
          preferredLanguage: json.preferredLanguage,
        })
      );
    }
    if (json.mfaEnrollmentRequired && json.mfaEnrollmentToken) {
      return withRequestId(
        NextResponse.json({
          mfaEnrollmentRequired: true,
          mfaEnrollmentToken: json.mfaEnrollmentToken,
          preferredLanguage: json.preferredLanguage,
        })
      );
    }

    const refreshFromCookie = extractRefreshTokenFromApiSetCookie(r) ?? json.refreshToken;
    if (!json.accessToken || !refreshFromCookie) {
      return withRequestId(NextResponse.json({ errorCode: "INVALID_SERVER_RESPONSE" }, { status: 502 }));
    }

    const res = NextResponse.json({ user: json.user });

    /** Aligné sur JWT_ACCESS_TTL côté API (variable d’environnement partagée recommandée). */
    const accessSeconds = jwtAccessTtlSeconds();
    const sessionCookieOpts = accessTokenCookieOptions(accessSeconds);
    res.cookies.set("medora_session", json.accessToken, sessionCookieOpts);
    res.cookies.set("accessToken", json.accessToken, sessionCookieOpts);

    res.cookies.set("refreshToken", refreshFromCookie, refreshTokenCookieOptions());

    /**
     * D4A.2.8-HF3 — No primary/home facility field exists in schema yet.
     * Deterministic default: lexicographically first facilityId among memberships
     * (same rule as MFA verify + landingRoute.getDefaultSessionFacilityId).
     * Multi-facility users must switch via POST /api/auth/facility so both cookies stay synced.
     */
    const sortedRoles = [...(json.user?.facilityRoles ?? [])].sort((a, b) =>
      String(a.facilityId).localeCompare(String(b.facilityId), "en")
    );
    const defaultFacilityId = sortedRoles[0]?.facilityId;
    if (defaultFacilityId) {
      res.cookies.set("facilityId", defaultFacilityId, facilityIdHttpOnlyCookieOptions());
      res.cookies.set("medora_facility_id", defaultFacilityId, facilityIdReadableCookieOptions());
    }

    return withRequestId(res);
  } catch (error) {
    console.error("Login error:", error);
    const errorCode = isNetworkError(error) ? "SERVER_UNAVAILABLE" : "UNEXPECTED_ERROR";
    return withRequestId(NextResponse.json({ errorCode }, { status: 500 }));
  }
}

