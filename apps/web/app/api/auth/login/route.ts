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
      return withRequestId(NextResponse.json(
        { error: "Identifiant et mot de passe requis." },
        { status: 400 }
      ));
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
      return withRequestId(NextResponse.json(
        { error: "Service indisponible. Vérifiez que le serveur est démarré ou contactez l'administrateur." },
        { status: 503 }
      ));
    }

    if (!r.ok) {
      const errorData = await r.json().catch(() => ({ error: "Échec de la connexion" }));
      const message =
        r.status === 401
          ? "Identifiants incorrects."
          : r.status === 429
            ? "Trop de tentatives. Réessayez plus tard."
            : (errorData.message ?? errorData.error ?? "Échec de la connexion");
      return withRequestId(NextResponse.json(
        { error: typeof message === "string" ? message : "Échec de la connexion" },
        { status: r.status }
      ));
    }

    let json: {
      accessToken?: string;
      refreshToken?: string;
      user?: { facilityRoles?: Array<{ facilityId: string }> };
      mfaRequired?: boolean;
      mfaChallengeToken?: string;
      mfaEnrollmentRequired?: boolean;
      mfaEnrollmentToken?: string;
    };
    try {
      json = await r.json();
    } catch {
      return withRequestId(NextResponse.json(
        { error: "Réponse du serveur invalide. Réessayez plus tard." },
        { status: 502 }
      ));
    }

    /** Phase 9 — MFA branches: do NOT set session cookies; return tokens to UI for the challenge/enrollment step. */
    if (json.mfaRequired && json.mfaChallengeToken) {
      return withRequestId(
        NextResponse.json({
          mfaRequired: true,
          mfaChallengeToken: json.mfaChallengeToken,
        })
      );
    }
    if (json.mfaEnrollmentRequired && json.mfaEnrollmentToken) {
      return withRequestId(
        NextResponse.json({
          mfaEnrollmentRequired: true,
          mfaEnrollmentToken: json.mfaEnrollmentToken,
        })
      );
    }

    const refreshFromCookie = extractRefreshTokenFromApiSetCookie(r) ?? json.refreshToken;
    if (!json.accessToken || !refreshFromCookie) {
      return withRequestId(NextResponse.json(
        { error: "Réponse du serveur invalide. Réessayez plus tard." },
        { status: 502 }
      ));
    }

    const res = NextResponse.json({ user: json.user });

    /** Aligné sur JWT_ACCESS_TTL côté API (variable d’environnement partagée recommandée). */
    const accessSeconds = jwtAccessTtlSeconds();
    const sessionCookieOpts = accessTokenCookieOptions(accessSeconds);
    res.cookies.set("medora_session", json.accessToken, sessionCookieOpts);
    res.cookies.set("accessToken", json.accessToken, sessionCookieOpts);

    res.cookies.set("refreshToken", refreshFromCookie, refreshTokenCookieOptions());

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
    const message = isNetworkError(error)
      ? "Service indisponible. Vérifiez votre connexion ou contactez l'administrateur."
      : "Une erreur inattendue s'est produite. Réessayez.";
    return withRequestId(NextResponse.json(
      { error: message },
      { status: 500 }
    ));
  }
}

