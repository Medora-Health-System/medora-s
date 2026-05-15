import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "@/lib/server/authCookieOptions";
import { jwtAccessTtlSeconds } from "@/lib/server/sessionCookieOptions";

import { resolveApiUrl } from "@/lib/server/resolveApiUrl";
import { extractRefreshTokenFromApiSetCookie } from "@/lib/server/extractRefreshTokenFromApiSetCookie";

export type RefreshedTokens = {
  accessToken: string;
  refreshToken: string;
};

function parseCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`).exec(cookieHeader);
  return match ? decodeURIComponent(match[1].trim()) : null;
}

function resolveRefreshTokenFromIncoming(req?: NextRequest): string | null {
  if (req) {
    const fromJar = req.cookies.get("refreshToken")?.value?.trim();
    if (fromJar) return fromJar;
    const fromHdr = parseCookieValue(req.headers.get("cookie"), "refreshToken")?.trim();
    if (fromHdr) return fromHdr;
  }
  return null;
}

/**
 * Lit le cookie refreshToken et appelle Nest /auth/refresh.
 * Utilisé par GET /api/auth/me et POST /api/auth/refresh.
 *
 * Phase 14D — préfère `NextRequest.cookies` / en-tête `Cookie` lorsqu'une requête entrante est
 * disponible (fiabilité BFF vs lecture isolée via `cookies()`).
 */
export async function refreshAccessTokenFromCookies(
  requestId?: string,
  req?: NextRequest
): Promise<RefreshedTokens | null> {
  let refreshToken = resolveRefreshTokenFromIncoming(req);
  if (!refreshToken) {
    const cookieStore = await cookies();
    refreshToken = cookieStore.get("refreshToken")?.value ?? null;
  }
  if (!refreshToken) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[auth] refreshAccessTokenFromCookies: pas de cookie refreshToken");
    }
    return null;
  }

  const apiUrl = resolveApiUrl();

  let r: Response;
  try {
    const refreshHeaders: Record<string, string> = {
      Cookie: `refreshToken=${encodeURIComponent(refreshToken)}`,
    };
    if (requestId) refreshHeaders["x-request-id"] = requestId;
    r = await fetch(`${apiUrl}/auth/refresh`, {
      method: "POST",
      headers: refreshHeaders,
    });
  } catch (e) {
    console.error("[auth] refresh fetch error:", e);
    return null;
  }

  let json: { accessToken?: string; refreshToken?: string };
  try {
    json = await r.json();
  } catch {
    return null;
  }

  const rotated = extractRefreshTokenFromApiSetCookie(r) ?? json.refreshToken;
  if (!r.ok || !json.accessToken || !rotated) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[auth] refresh Nest refusé:", r.status);
    }
    return null;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[auth] refresh Nest OK");
  }

  return { accessToken: json.accessToken, refreshToken: rotated };
}

export function applyAuthCookiesToResponse(
  res: { cookies: { set: (name: string, value: string, options: object) => void } },
  tokens: RefreshedTokens
): void {
  const accessSeconds = jwtAccessTtlSeconds();
  const accessOpts = accessTokenCookieOptions(accessSeconds);
  const refreshOpts = refreshTokenCookieOptions();
  res.cookies.set("medora_session", tokens.accessToken, accessOpts);
  res.cookies.set("accessToken", tokens.accessToken, accessOpts);
  res.cookies.set("refreshToken", tokens.refreshToken, refreshOpts);
}
