import type { CookieOptions } from "express";

function secureCookies(): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  return process.env.NODE_ENV === "production";
}

/** ~14d default; align with `JWT_REFRESH_TTL` when possible. */
function refreshMaxAgeMs(): number {
  const raw = process.env.JWT_REFRESH_TTL?.trim();
  if (!raw) return 14 * 24 * 60 * 60 * 1000;
  const m = /^(\d+)([dhms])$/i.exec(raw);
  if (!m) return 14 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  const mult =
    u === "d" ? 86400_000 : u === "h" ? 3600_000 : u === "m" ? 60_000 : u === "s" ? 1000 : 86400_000;
  return n * mult;
}

export function refreshTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: refreshMaxAgeMs(),
  };
}

export function clearRefreshTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  };
}

export { REFRESH_TOKEN_COOKIE_NAME } from "./auth.constants";
