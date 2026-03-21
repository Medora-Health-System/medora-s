import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { applyAuthCookiesToResponse, refreshAccessTokenFromCookies } from "@/lib/server/refreshAccessToken";
import { jwtAccessTtlSeconds } from "@/lib/server/sessionCookieOptions";

const API_URL = process.env.API_URL ?? process.env.MEDORA_API_URL ?? "http://localhost:3001";

export async function GET() {
  try {
    const cookieStore = await cookies();
    let accessToken =
      cookieStore.get("accessToken")?.value ?? cookieStore.get("medora_session")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const fetchMe = (token: string) =>
      fetch(`${API_URL}/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

    let backendResponse = await fetchMe(accessToken);
    let refreshedTokens: Awaited<ReturnType<typeof refreshAccessTokenFromCookies>> = null;

    if (backendResponse.status === 401) {
      refreshedTokens = await refreshAccessTokenFromCookies();
      if (refreshedTokens) {
        accessToken = refreshedTokens.accessToken;
        backendResponse = await fetchMe(accessToken);
      }
    }

    if (!backendResponse.ok) {
      if (backendResponse.status === 401) {
        return NextResponse.json({ error: "Session expirée. Reconnectez-vous." }, { status: 401 });
      }
      const errorData = await backendResponse.json().catch(() => ({ error: "Échec de la requête" }));
      return NextResponse.json(
        {
          error:
            typeof errorData.error === "string"
              ? errorData.error
              : typeof errorData.message === "string"
                ? errorData.message
                : "Échec de la requête",
        },
        { status: backendResponse.status }
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

    return res;
  } catch (error) {
    console.error("Me endpoint error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
