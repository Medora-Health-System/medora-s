import { cookies } from "next/headers";
import { jwtAccessTtlSeconds } from "@/lib/server/sessionCookieOptions";

const API_URL = process.env.API_URL ?? process.env.MEDORA_API_URL ?? "http://localhost:3001";

export type RefreshedTokens = {
  accessToken: string;
  refreshToken: string;
};

/**
 * Lit le cookie refreshToken et appelle Nest /auth/refresh.
 * Utilisé par GET /api/auth/me et POST /api/auth/refresh.
 */
export async function refreshAccessTokenFromCookies(): Promise<RefreshedTokens | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;
  if (!refreshToken) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[auth] refreshAccessTokenFromCookies: pas de cookie refreshToken");
    }
    return null;
  }

  let r: Response;
  try {
    r = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
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

  if (!r.ok || !json.accessToken || !json.refreshToken) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[auth] refresh Nest refusé:", r.status);
    }
    return null;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[auth] refresh Nest OK");
  }

  return { accessToken: json.accessToken, refreshToken: json.refreshToken };
}

export function applyAuthCookiesToResponse(
  res: { cookies: { set: (name: string, value: string, options: object) => void } },
  tokens: RefreshedTokens
): void {
  const isProduction = process.env.NODE_ENV === "production";
  const accessSeconds = jwtAccessTtlSeconds();
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/",
    maxAge: accessSeconds,
  };
  res.cookies.set("medora_session", tokens.accessToken, opts);
  res.cookies.set("accessToken", tokens.accessToken, opts);
  res.cookies.set("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}
