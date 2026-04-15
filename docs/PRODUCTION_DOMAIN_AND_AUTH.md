# Production domain, cookies, and CORS (Medora-S)

Target layout:

- **Frontend (Next.js):** `https://app.<domain>` (e.g. Vercel)
- **API (Nest):** `https://api.<domain>` (e.g. Railway)

Auth uses a **BFF pattern**: the browser talks to the **same origin** as the web app (`/api/auth/*`, `/api/backend/*`). Next.js Route Handlers forward to the API with `API_URL`. Session cookies are **host-only** for the web app hostname unless `AUTH_COOKIE_DOMAIN` is set.

## 1. Current assumptions (audit)

- **Default dev:** web on `localhost:3002` / `3003`, API on `localhost:3001` (`API_URL`).
- **Cookies:** `medora_session`, `accessToken`, `refreshToken` (httpOnly), `facilityId` (httpOnly), `medora_facility_id` (readable client-side for legacy screens). Path `/`; **no `domain` by default** (host-only).
- **CORS (API):** allowlist built in `apps/api/src/config/cors-origins.ts` — dev localhost/127.0.0.1 defaults + `CORS_ORIGINS`. Production does **not** include localhost unless listed in `CORS_ORIGINS`.

## 2. Required environment variables

### Railway (API)

| Variable | Example | Notes |
|----------|---------|--------|
| `NODE_ENV` | `production` | |
| `CORS_ORIGINS` | `https://app.example.com` | Comma-separated; no `*` with `credentials`. Add staging URL if needed. |
| `DATABASE_URL` | `postgresql://…` | |
| `JWT_*`, `TOKEN_ISSUER` | (see `apps/api/.env.example`) | Align `JWT_ACCESS_TTL` with web. |
| `RESET_PASSWORD_BASE_URL` | `https://app.example.com` | Password-reset links in emails / logs. |

### Vercel (web)

| Variable | Example | Notes |
|----------|---------|--------|
| `NODE_ENV` | `production` (usually automatic) | |
| `API_URL` | `https://api.example.com` | Server-side only; not exposed to the browser bundle for API calls (BFF). |
| `JWT_ACCESS_TTL` | Same string as API | Cookie `maxAge` + `/api/auth/me` TTL. |
| `COOKIE_SECURE` | `true` | Optional if you need Secure cookies on HTTPS preview/staging when `NODE_ENV` is not `production`. |
| `AUTH_COOKIE_SAME_SITE` | `lax` (default) | Use `strict` only if all flows stay on the same site. |
| `AUTH_COOKIE_DOMAIN` | (omit) | Set only if multiple subdomains must share cookies (e.g. `.example.com`). Usually omit for single app host. |

## 3. Cookie settings (production)

| Attribute | Value | Notes |
|-----------|--------|--------|
| `httpOnly` | `true` for access + refresh | Refresh is never readable from JS. |
| `secure` | `true` in production (`NODE_ENV`) or if `COOKIE_SECURE=true` | HTTPS only. |
| `sameSite` | `lax` (default) | Same-site navigations + top-level GET; aligns with BFF. |
| `path` | `/` | |
| `domain` | unset (default) | Safer; set `AUTH_COOKIE_DOMAIN` only for a deliberate multi-subdomain model. |

## 4. CORS settings

| Environment | Allowed origins |
|-------------|-----------------|
| **Local dev** | `http://localhost:3002`, `http://localhost:3003`, `http://127.0.0.1:3002`, `http://127.0.0.1:3003`, plus `CORS_ORIGINS` |
| **Production** | Only `CORS_ORIGINS` (comma-separated). No wildcard. |
| **Staging** | Add `https://staging-app.example.com` to `CORS_ORIGINS` on the API. |

`credentials: true` remains enabled for Nest CORS when origins are listed; do not use `*` in production with credentials.

## 5. Cutover checklist

1. Deploy API with `CORS_ORIGINS` including the exact production web origin (`https://app.…`, no trailing slash unless you standardize it everywhere).
2. Set `API_URL` on Vercel to the public API base (`https://api.…`).
3. Set `RESET_PASSWORD_BASE_URL` on the API to the web app URL.
4. Smoke-test: login, navigation, `/api/auth/me`, refresh interval, logout, MSPP flows, facility switch.
5. Confirm cookies in DevTools: `Secure`, `HttpOnly` on tokens, host or intended `Domain`.

## 6. Verify commands

```bash
pnpm verify:api
pnpm verify:web
```
