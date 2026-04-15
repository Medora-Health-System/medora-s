/**
 * Centralized auth cookie flags for Next.js Route Handlers (login, refresh, logout, /api/auth/me).
 * BFF pattern: cookies are host-only for the web app (e.g. app.example.com); the API is reached server-side.
 *
 * Env:
 * - COOKIE_SECURE=true forces Secure cookies even when NODE_ENV !== production (e.g. HTTPS staging).
 * - AUTH_COOKIE_SAME_SITE=lax | strict (default lax). Use strict only if all flows stay same-site.
 * - AUTH_COOKIE_DOMAIN=.example.com optional; omit for host-only cookies (recommended for single app host).
 */

export type AuthCookieSameSite = "lax" | "strict";

function parseSameSite(raw: string | undefined): AuthCookieSameSite {
  const v = raw?.trim().toLowerCase();
  if (v === "strict") return "strict";
  return "lax";
}

export function cookieSecureEnabled(): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  return process.env.NODE_ENV === "production";
}

export function authCookieSameSite(): AuthCookieSameSite {
  return parseSameSite(process.env.AUTH_COOKIE_SAME_SITE);
}

/** Optional cookie Domain (e.g. `.medora.example`); undefined = host-only for current hostname. */
export function authCookieDomain(): string | undefined {
  const d = process.env.AUTH_COOKIE_DOMAIN?.trim();
  return d || undefined;
}

const PATH = "/";

export function accessTokenCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: authCookieSameSite(),
    secure: cookieSecureEnabled(),
    path: PATH,
    maxAge: maxAgeSeconds,
    ...(authCookieDomain() ? { domain: authCookieDomain() } : {}),
  } as const;
}

export function refreshTokenCookieOptions() {
  return {
    httpOnly: true,
    sameSite: authCookieSameSite(),
    secure: cookieSecureEnabled(),
    path: PATH,
    maxAge: 7 * 24 * 60 * 60,
    ...(authCookieDomain() ? { domain: authCookieDomain() } : {}),
  } as const;
}

export function clearAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: authCookieSameSite(),
    secure: cookieSecureEnabled(),
    path: PATH,
    maxAge: 0,
    ...(authCookieDomain() ? { domain: authCookieDomain() } : {}),
  } as const;
}

const FACILITY_MAX_AGE = 7 * 24 * 60 * 60;

/** facilityId (httpOnly) — aligné durée sur la session refresh. */
export function facilityIdHttpOnlyCookieOptions() {
  return {
    httpOnly: true,
    sameSite: authCookieSameSite(),
    secure: cookieSecureEnabled(),
    path: PATH,
    maxAge: FACILITY_MAX_AGE,
    ...(authCookieDomain() ? { domain: authCookieDomain() } : {}),
  } as const;
}

/** medora_facility_id (lisible client pour quelques écrans legacy). */
export function facilityIdReadableCookieOptions() {
  return {
    httpOnly: false,
    sameSite: authCookieSameSite(),
    secure: cookieSecureEnabled(),
    path: PATH,
    maxAge: FACILITY_MAX_AGE,
    ...(authCookieDomain() ? { domain: authCookieDomain() } : {}),
  } as const;
}
