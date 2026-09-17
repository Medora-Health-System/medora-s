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
import { MFA_TRUST_COOKIE_NAME, clearMfaTrustedDeviceCookieOptions } from "@/lib/server/mfaTrustedDeviceCookie";

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError && err.message?.includes("fetch")) return true;
  const c = err as { code?: string; cause?: { code?: string } };
  return c?.code === "ECONNREFUSED" || c?.cause?.code === "ECONNREFUSED" || c?.code === "ENOTFOUND" || c?.cause?.code === "ENOTFOUND";
}

type LoginJson = {
  accessToken?: string;
  refreshToken?: string;
  user?: { facilityRoles?: Array<{ facilityId: string }> };
  mfaRequired?: boolean;
  mfaChallengeToken?: string;
  mfaEnrollmentRequired?: boolean;
  mfaEnrollmentToken?: string;
  preferredLanguage?: string;
};

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
    if (!username || !password) return withRequestId(NextResponse.json({ errorCode: "INVALID_REQUEST_BODY" }, { status: 400 }));

    let r: Response;
    try {
      r = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(requestId ? { "x-request-id": requestId } : {}) },
        body: JSON.stringify({ username, password }),
      });
    } catch (fetchErr) {
      console.error("Login API unreachable:", fetchErr);
      return withRequestId(NextResponse.json({ errorCode: "SERVER_UNAVAILABLE" }, { status: 503 }));
    }
    if (!r.ok) {
      const errorData = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      const { errorCode, message } = authBffErrorJson(r.status, errorData, { fallback401: "INVALID_CREDENTIALS", fallbackOther: "AUTH_REQUEST_FAILED" });
      return withRequestId(NextResponse.json({ errorCode, ...(message ? { message } : {}) }, { status: r.status }));
    }

    let json = (await r.json().catch(() => null)) as LoginJson | null;
    if (!json) return withRequestId(NextResponse.json({ errorCode: "INVALID_SERVER_RESPONSE" }, { status: 502 }));

    /** Phase 18D — after password validation, exchange an unexpired HttpOnly device proof server-to-server. */
    if (json.mfaRequired && json.mfaChallengeToken) {
      const trustedMfaToken = request.cookies.get(MFA_TRUST_COOKIE_NAME)?.value;
      if (trustedMfaToken) {
        const exchange = await fetch(`${apiUrl}/auth/mfa/trust/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(requestId ? { "x-request-id": requestId } : {}) },
          body: JSON.stringify({ challengeToken: json.mfaChallengeToken, trustedMfaToken }),
        }).catch(() => null);
        if (exchange?.ok) {
          r = exchange;
          json = (await exchange.json()) as LoginJson;
        } else {
          const challenge = NextResponse.json({ mfaRequired: true, mfaChallengeToken: json.mfaChallengeToken, preferredLanguage: json.preferredLanguage });
          challenge.cookies.set(MFA_TRUST_COOKIE_NAME, "", clearMfaTrustedDeviceCookieOptions());
          return withRequestId(challenge);
        }
      } else {
        return withRequestId(NextResponse.json({ mfaRequired: true, mfaChallengeToken: json.mfaChallengeToken, preferredLanguage: json.preferredLanguage }));
      }
    }
    if (json.mfaEnrollmentRequired && json.mfaEnrollmentToken) {
      return withRequestId(NextResponse.json({ mfaEnrollmentRequired: true, mfaEnrollmentToken: json.mfaEnrollmentToken, preferredLanguage: json.preferredLanguage }));
    }

    const refreshFromCookie = extractRefreshTokenFromApiSetCookie(r) ?? json.refreshToken;
    if (!json.accessToken || !refreshFromCookie) return withRequestId(NextResponse.json({ errorCode: "INVALID_SERVER_RESPONSE" }, { status: 502 }));

    const res = NextResponse.json({ user: json.user });
    const sessionCookieOpts = accessTokenCookieOptions(jwtAccessTtlSeconds());
    res.cookies.set("medora_session", json.accessToken, sessionCookieOpts);
    res.cookies.set("accessToken", json.accessToken, sessionCookieOpts);
    res.cookies.set("refreshToken", refreshFromCookie, refreshTokenCookieOptions());

    const sortedRoles = [...(json.user?.facilityRoles ?? [])].sort((a, b) => String(a.facilityId).localeCompare(String(b.facilityId), "en"));
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
