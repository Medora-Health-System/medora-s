/**
 * Phase 9 — MFA enrollment verify (BFF).
 *
 * On success the API issues a full session; we mirror the access cookies for
 * downstream pages. Recovery codes are returned in the response body for
 * one-time display in the UI; the BFF does NOT persist them.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
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

export async function POST(request: NextRequest) {
  try {
    const apiUrl = resolveApiUrl();
    const body = await request.json().catch(() => ({}));
    const cookieStore = await cookies();
    const accessToken =
      cookieStore.get("accessToken")?.value ?? cookieStore.get("medora_session")?.value ?? null;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const enrollmentTok =
      typeof body?.enrollmentToken === "string" ? body.enrollmentToken.trim() : "";
    if (enrollmentTok.length > 0) {
      headers["Authorization"] = `Bearer ${enrollmentTok}`;
    } else if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const r = await fetch(`${apiUrl}/auth/mfa/enroll/verify`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        code: body?.code,
        ...(enrollmentTok.length > 0 ? { enrollmentToken: enrollmentTok } : {}),
      }),
    });

    if (!r.ok) {
      const err = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      const { errorCode, message } = authBffErrorJson(r.status, err, {
        fallback401: "MFA_INVALID_CODE",
        fallbackOther: "AUTH_REQUEST_FAILED",
      });
      return NextResponse.json({ errorCode, ...(message ? { message } : {}) }, { status: r.status });
    }

    const json = (await r.json()) as {
      accessToken?: string;
      enabled?: boolean;
      recoveryCodes?: string[];
      user?: { facilityRoles?: { facilityId: string }[] };
    };
    const refresh = extractRefreshTokenFromApiSetCookie(r);
    if (!json.accessToken || !refresh) {
      return NextResponse.json({ errorCode: "INVALID_SERVER_RESPONSE" }, { status: 502 });
    }

    const res = NextResponse.json({
      enabled: json.enabled,
      recoveryCodes: json.recoveryCodes,
      user: json.user,
    });
    const accessSeconds = jwtAccessTtlSeconds();
    const sessionCookieOpts = accessTokenCookieOptions(accessSeconds);
    res.cookies.set("medora_session", json.accessToken, sessionCookieOpts);
    res.cookies.set("accessToken", json.accessToken, sessionCookieOpts);
    res.cookies.set("refreshToken", refresh, refreshTokenCookieOptions());

    // D4A.2.8-HF3 — same deterministic lexicographic default as login (both cookies synced).
    const sortedRoles = [...(json.user?.facilityRoles ?? [])].sort((a, b) =>
      String(a.facilityId).localeCompare(String(b.facilityId), "en")
    );
    const defaultFacilityId = sortedRoles[0]?.facilityId;
    if (defaultFacilityId) {
      res.cookies.set("facilityId", defaultFacilityId, facilityIdHttpOnlyCookieOptions());
      res.cookies.set("medora_facility_id", defaultFacilityId, facilityIdReadableCookieOptions());
    }
    return res;
  } catch (error) {
    console.error("[mfa/enroll/verify]", error);
    return NextResponse.json({ errorCode: "SERVER_UNAVAILABLE" }, { status: 500 });
  }
}
