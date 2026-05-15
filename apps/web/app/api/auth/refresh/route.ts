import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applyAuthCookiesToResponse, refreshAccessTokenFromCookies } from "@/lib/server/refreshAccessToken";

/**
 * Rafraîchit le jeton d’accès à partir du cookie refreshToken (httpOnly).
 */
export async function POST(request: NextRequest) {
  const tokens = await refreshAccessTokenFromCookies(undefined, request);
  if (!tokens) {
    return NextResponse.json({ error: "Impossible de renouveler la session. Reconnectez-vous." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  applyAuthCookiesToResponse(res, tokens);
  if (process.env.NODE_ENV !== "production") {
    console.log("[api/auth/refresh] OK — cookies session mis à jour");
  }
  return res;
}
