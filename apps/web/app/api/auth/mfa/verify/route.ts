/**
 * Phase 9 — MFA login challenge verify (BFF).
 *
 * Posts the body as-is to the API. On success, the API sets a refresh-token
 * cookie which we forward to the browser, plus the access token returned in
 * the body is mirrored into our standard `accessToken` / `medora_session`
 * cookies so the rest of the app keeps working unchanged.
 */

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

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id")?.trim() ?? "";
  const withRequestId = (res: NextResponse) => {
    if (requestId) res.headers.set("x-request-id", requestId);
    return res;
  };
  try {
    const apiUrl = resolveApiUrl();
    const body = await request.json();
    const r = await fetch(`${apiUrl}/auth/mfa/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(requestId ? { "x-request-id": requestId } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      const message =
        r.status === 401
          ? "Code MFA invalide ou expiré."
          : (err.message ?? err.error ?? "Échec de la vérification MFA.");
      return withRequestId(
        NextResponse.json({ error: typeof message === "string" ? message : "Échec." }, { status: r.status })
      );
    }

    const json = (await r.json()) as {
      accessToken?: string;
      method?: string;
      user?: { facilityRoles?: { facilityId: string }[] };
    };
    const refresh = extractRefreshTokenFromApiSetCookie(r);
    if (!json.accessToken || !refresh) {
      return withRequestId(NextResponse.json({ error: "Réponse du serveur invalide." }, { status: 502 }));
    }

    const res = NextResponse.json({ user: json.user, method: json.method });
    const accessSeconds = jwtAccessTtlSeconds();
    const sessionCookieOpts = accessTokenCookieOptions(accessSeconds);
    res.cookies.set("medora_session", json.accessToken, sessionCookieOpts);
    res.cookies.set("accessToken", json.accessToken, sessionCookieOpts);
    res.cookies.set("refreshToken", refresh, refreshTokenCookieOptions());

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
    console.error("[mfa/verify]", error);
    return withRequestId(NextResponse.json({ error: "Service indisponible." }, { status: 500 }));
  }
}
