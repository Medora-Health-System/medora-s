# Medora-S — Production environment checklist

Single reference for **Railway** (API + Postgres) and **Vercel** (Next.js BFF + UI) before go-live or after an incident. Values are **never** logged or returned by health endpoints; only presence/configuration flags are surfaced in `admin/system-health`.

Companion docs: `docs/DEPLOYMENT_RUNBOOK.md`, `docs/OPS.md`, `docs/ER_RESTORE_DRILL_CHECKLIST.md`, `docs/ER_PILOT_MONITORING_AND_INCIDENTS.md`, `docs/INTEROPERABILITY_FOUNDATION.md`, `docs/DEVICE_MONITOR_INTEGRATION_ARCHITECTURE.md` (device vitals — design only until adapters ship).

---

## 1. Core API (Railway)

| Variable | Required (prod) | Notes |
|----------|-----------------|--------|
| `DATABASE_URL` | **yes** | Railway Postgres connection string. |
| `NODE_ENV` | **yes** | Must be `production`. |
| `PORT` | optional | Railway sets automatically. |
| `JWT_ACCESS_SECRET` | **yes** | Changing it invalidates all access tokens. |
| `JWT_REFRESH_SECRET` | **yes** | Changing it invalidates refresh tokens and **MFA enrollment/challenge** grants (same signing family). Coordinate maintenance. |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | optional | Defaults documented in runbook. |
| `TOKEN_ISSUER` | optional | Default `medora-s`; must match between any service that verifies JWTs. |
| `CORS_ORIGINS` | **yes** | Comma-separated list of allowed browser origins (Vercel app URL(s)). Empty list disables CORS (browser calls fail). |
| `AUDIT_FAILURE_MODE` | **recommended `fail_closed`** | Pilot production: prefer `fail_closed` so critical audit writes abort the request on DB failure (`apps/api/src/common/services/audit.service.ts`). |
| `CHART_EXPORT_SIGNING_SECRET` | **yes** | HMAC key for immutable chart export signatures; missing in prod fails closed on snapshot create/read paths. **Rotation** invalidates verification for rows signed with the old secret unless a dual-key strategy is introduced (not in MVP). |
| `MFA_SECRET_ENCRYPTION_KEY` | **yes** | Base64-encoded **32-byte** key for AES-256-GCM of stored TOTP secrets. **Rotation without a migration plan** makes existing encrypted secrets unreadable — treat as a controlled data migration. |
| `RESET_PASSWORD_BASE_URL` | **yes** (if password reset is used) | Public base URL for reset links (must match the web origin users reach). |
| `PATIENT_APP_BASE_URL` | **yes** (if patient email invitation is used) | Public origin of the patient app used in invitation links. Must not be localhost in production. |
| `SENDGRID_API_KEY` / `MAIL_FROM` | **yes** (if patient email invitation is used) | Existing named SendGrid integration. Invitation send fails closed when unset. |

---

## 2. Web / BFF (Vercel)

| Variable | Required (prod) | Notes |
|----------|-----------------|--------|
| `NODE_ENV` | **yes** | `production`. |
| `API_URL` or `MEDORA_API_URL` | **yes** | HTTPS URL of the Railway API; must not be empty or `localhost` in production (`apps/web/src/lib/server/resolveApiUrl.ts`). |
| Session/cookie-related vars | per setup | Same secrets and issuer assumptions as API for cookie-backed auth. |

---

## 3. Operational governance (env acknowledgements)

| Variable | Expected | Notes |
|----------|----------|--------|
| `MEDORA_BACKUP_POLICY_CONFIRMED` | `true` | Operator confirms backup retention matches organisational policy. |
| `MEDORA_DATA_RETENTION_POLICY_CONFIRMED` | `true` | Operator confirms retention posture. |
| `MEDORA_LAST_RESTORE_DRILL_AT` | ISO-8601 timestamp | Updated after each restore drill; stale values surface in `admin/backup-readiness`. |

---

## 4. Alerts (required for production readiness)

| Variable | Notes |
|----------|--------|
| `MEDORA_ALERT_ENABLED` | Default on; set `false` / `0` / `off` only for a controlled maintenance exception. Production readiness fails when alerts are disabled. |
| `MEDORA_ALERT_TRANSPORT` | `pagerduty` for the governed PagerDuty Events API v2 transport, or `webhook` for the legacy generic webhook transport. If unset, a PagerDuty routing key auto-selects PagerDuty; otherwise Medora falls back to webhook mode. |
| `MEDORA_PAGERDUTY_ROUTING_KEY` | **Secret.** PagerDuty Events API v2 integration/routing key. Never log it, return it from health APIs, or place it in URLs/screenshots. Required when transport is `pagerduty`. |
| `MEDORA_ALERT_WEBHOOK_URL` | Legacy/generic webhook destination. Required only when transport is `webhook`. Do not point this directly at PagerDuty Events API v2; PagerDuty requires its own event envelope and routing key. |
| `MEDORA_ALERT_FORMAT` | Applies only to generic webhook transport: `json` (default) or `slack`. Ignored by PagerDuty transport. |

PagerDuty delivery is fixed to the official US Events API v2 endpoint `https://events.pagerduty.com/v2/enqueue`. The routing key is sent in the JSON request body, never in the URL. External PagerDuty payloads are deliberately minimized: no patient identifiers, encounter IDs, user IDs, facility IDs, clinical text, or arbitrary route values are transmitted.

---

## 5. Feature-specific (pilot-dependent)

| Prefix | Notes |
|--------|--------|
| `MEDORA_EXTERNAL_BILLING_*` | Only when external billing automation is in scope. |
| `MEDORA_INTEROP_ENABLED` | **Reserved — Phase 11B+.** Leave **unset** or `false` until inbound HL7/FHIR/device adapters are implemented and reviewed. If set `true` early, operators may assume ingestion exists when it does not (`docs/INTEROPERABILITY_FOUNDATION.md` §9). |

---

## 6. Secret rotation — safety rules

| Secret | Risk if rotated blindly |
|--------|-------------------------|
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | All users signed out; MFA grants invalidated until re-login/MFA flow. |
| `MFA_SECRET_ENCRYPTION_KEY` | Existing DB ciphertext for TOTP secrets cannot be decrypted — requires re-enrollment or a documented key-rotation migration. |
| `CHART_EXPORT_SIGNING_SECRET` | Historical signed exports may fail integrity verification if only one secret is supported. |
| `DATABASE_URL` (restore) | Restoring a backup without mirroring **chart export signing** and **JWT** env from the era of the backup breaks verification and sessions (`ER_RESTORE_DRILL_CHECKLIST.md`). |
| `MEDORA_PAGERDUTY_ROUTING_KEY` | Rotate in PagerDuty and Railway together. An exposed/deleted key stops alert delivery but must never be placed in logs or client-visible configuration. |

---

## 7. Validation in the product

Super-admin (`MEDORA_SUPER_ADMIN`) with facility header:

- `GET /admin/system-health` — DB reachability, JWT/MFA/chart signing **presence** (not values), audit mode label, chart integrity failure count (24h), HTTP 5xx counts, backup-readiness **summary** (`status` + `generatedAt`).
- `GET /admin/backup-readiness` — full checklist for backup policy, retention, restore drill, alerts.

After changing env vars on Railway/Vercel, redeploy the service so the process picks up new values.
