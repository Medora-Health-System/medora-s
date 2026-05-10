# Medora-S — Deployment Runbook

Operational steps for promoting changes to staging or production during the pilot. Companion to `ER_PILOT_OPERATIONS_SOP.md` (governance) and `docs/OPS.md` (DB/migration rules).

> **Honest scope.** Deployment is **manual, single-region** (Railway API + Postgres, Vercel web). There is no blue/green, no canary, no automated rollback. Safety comes from disciplined verify + ordered apply.

---

## 1. Roles for any deploy

- **Author** — wrote the change.
- **Reviewer** — separate person who approved on PR.
- **Operator** — ops on-call who runs the promote.

Author and operator may be the same person only outside clinical hours and only for low-risk changes (UI text fix, doc edit). Schema/auth/audit changes always require a separate operator.

---

## 2. Pre-deploy verify checklist (must pass)

Run from repo root before promoting anything to production:

- [ ] `pnpm run verify:api`
- [ ] `pnpm run verify:web`
- [ ] `pnpm --filter @medora/web build`
- [ ] Targeted Jest for the touched module(s).
- [ ] If a Prisma change was made:
  - [ ] `pnpm --filter @medora/api exec prisma validate`
  - [ ] `pnpm --filter @medora/api exec prisma generate`
  - [ ] Latest migration prefix is **strictly greater** than every prior migration (`prisma-migrations.mdc`).
- [ ] Git status clean; commit SHA captured.

If any check fails: **do not promote**. Fix or revert.

---

## 3. Required env vars (production)

Canonical table with rotation notes: **`docs/ENV_PRODUCTION_CHECKLIST.md`**. Summarised here for deploy ordering.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Railway-managed. |
| `JWT_ACCESS_SECRET` | yes | Auth fails to boot otherwise. |
| `JWT_REFRESH_SECRET` | yes | Same; also used for MFA grant JWTs — rotation signs everyone out and invalidates in-flight MFA tokens. |
| `JWT_ACCESS_TTL` | optional | Default `8h`. |
| `JWT_REFRESH_TTL` | optional | Default `14d`. |
| `TOKEN_ISSUER` | optional | Default `medora-s`. |
| `NODE_ENV` | yes | `production` for prod. |
| `CORS_ORIGINS` | **yes** | Allowed browser origins (Vercel app); see `apps/api/src/config/cors-origins.ts`. |
| `AUDIT_FAILURE_MODE` | recommended | `fail_closed` for pilot production. |
| `CHART_EXPORT_SIGNING_SECRET` | **yes in production** | Required to create or read signed chart export snapshots. Without it in prod, snapshot creation fails closed and signed-row reads fail integrity. **Rotation** without dual-key support breaks verification of older rows — plan with compliance. |
| `MFA_SECRET_ENCRYPTION_KEY` | **yes in production** | Base64-encoded 32-byte key; see `apps/api/src/auth/mfa/mfa-encryption.util.ts`. **Rotation** without a migration path makes stored MFA secrets unreadable — users must re-enrol or ops runs a documented migration. |
| `RESET_PASSWORD_BASE_URL` | yes if reset flow used | Must match the public web origin used in emails/links. |
| `MEDORA_BACKUP_POLICY_CONFIRMED` | yes | `true` once policy signed off. |
| `MEDORA_DATA_RETENTION_POLICY_CONFIRMED` | yes | `true` once policy signed off. |
| `MEDORA_LAST_RESTORE_DRILL_AT` | yes during pilot | ISO timestamp; updated after each successful drill. |
| `MEDORA_ALERT_WEBHOOK_URL` | recommended | Receives operator alerts. |
| `MEDORA_ALERT_ENABLED` | optional | Default on. |
| `MEDORA_EXTERNAL_BILLING_*` | feature-dependent | Only if external billing automation is part of pilot. |
| `API_URL` / `MEDORA_API_URL` (Vercel) | **yes** | Next.js BFF target for Railway API; see `apps/web/src/lib/server/resolveApiUrl.ts`. |

`GET admin/system-health` reports **whether** critical secrets are configured (never values), audit failure mode label, recent chart export integrity failure count (24h), and a **summary** of backup-readiness (`status` + `generatedAt`). Full backup checklist remains `GET admin/backup-readiness`.

---

## 3.1 Secret and signing key rotation (pilot)

- **JWT pair** — Schedule a maintenance window; expect mass sign-out and MFA re-prompts. Update Railway (API) and any other verifier simultaneously. Never rotate one secret at a time across environments that share sessions.
- **`CHART_EXPORT_SIGNING_SECRET`** — MVP assumes a single active secret. Rotating it without restoring the old value on a clone will make historical signed snapshots fail integrity checks. Coordinate with compliance; mirror the **exact** production value on restore drills (`ER_RESTORE_DRILL_CHECKLIST.md` §0).
- **`MFA_SECRET_ENCRYPTION_KEY`** — Do **not** change in production without a written migration (decrypt with old / re-encrypt with new, or force global MFA re-enrol). Otherwise TOTP verification fails for all enrolled users.
- **Database** — Railway point-in-time / backups are out-of-band; restore procedure is in `ER_RESTORE_DRILL_CHECKLIST.md`. Never `migrate rollback` in prod without architecture review (`§ 5` below).

---

## 4. Deploy ordering

For any change that includes both API and web work, the order is:

1. **Migrations** (if any) — run **standalone** against production DB:
   ```bash
   DATABASE_URL="<Railway DATABASE_URL>" \
     pnpm --filter @medora/api exec prisma migrate deploy
   DATABASE_URL="<Railway DATABASE_URL>" \
     pnpm --filter @medora/api exec prisma migrate status
   ```
   API runtime must **not** auto-run `migrate deploy` on boot (`docs/OPS.md`). Hosts/PaaS start commands stay `node dist/main.js`.
2. **API service** (Railway) — deploy the API service to the new commit SHA. Confirm `/health` returns 200.
3. **Web service** (Vercel) — promote the matching deployment.
4. **Smoke tests** — `ER_PILOT_DOWNTIME_RUNBOOK.md` § 9.1.

For web-only changes, skip steps 1 and 2.

For API-only changes without migrations, skip step 1.

---

## 5. Rollback ordering

If a deploy causes a regression:

1. **Web** — promote the prior Vercel deployment back to production. (Web rollback is fast and rarely involves data.)
2. **API** — redeploy the prior commit SHA on Railway.
3. **Migrations** — **do not rollback automatically**. Schema rollback requires:
   - confirming whether the new schema is forward-compatible with the prior API code,
   - or planning a reverse migration (additive only — destructive rollbacks are out of scope during pilot).
4. **DB restore** — only as a last resort and only via `ER_RESTORE_DRILL_CHECKLIST.md`-style procedure. Restoring overwrites data created since the backup.

Rollbacks require the same operator discipline as deploys (§ 1).

---

## 6. Coordinated deploy when both API and web change

Example: an API endpoint shape changes and the web consumer changes with it.

1. Make API change **backward-compatible** when possible (additive fields, opt-in flags).
2. If not possible: deploy API first, then web within minutes; communicate with charge nurse so brief 4xx errors during overlap are recognised as deploy noise, not incidents.
3. If the new web depends on a new field guaranteed to exist post-deploy, document it on the PR.

For pilot, **prefer additive API changes** so web rollback alone covers most failure modes.

---

## 7. Maintenance window definition

A maintenance window is:

- Outside clinical operating hours.
- Communicated to clinical lead at least 24 hours in advance.
- ≤ 30 minutes for low-risk changes; longer windows require sponsor sign-off.
- Bounded by a **rollback time** committed up front.

Schema migrations and any auth/RBAC/audit/export changes go in maintenance windows by default.

---

## 8. Health checks

After any deploy, before declaring success:

- API: `GET /health` returns 200.
- API: log-spot for boot completion.
- Web: home page loads, login works.
- One CLOSED encounter chart snapshot read in JSON.
- One CLOSED encounter chart snapshot read in HTML.
- `admin/system-health` and `admin/backup-readiness` look reasonable for super-admin.

If any check fails: **rollback** (§ 5).

---

## 9. Incident-driven deploys

Sometimes a deploy is the response to an active incident (SEV-1 or SEV-2). Even then:

- Ops on-call must run the verify checklist (§ 2) — there is no “skip verify” during incidents.
- Clinical lead is notified before the promote.
- Post-incident, a written deploy log entry is required.

Bypassing verify or the maintenance-window rule is acceptable only with **written sponsor + compliance** sign-off, captured in the incident log.

---

## 10. Deploy log

Each deploy produces one log entry:

```
date: 2026-05-10
operator: <name>
commit: <SHA>
type: API | WEB | MIGRATION | API+WEB
risk: LOW | MEDIUM | HIGH
verify-passed: yes
migration-applied: yes/no
post-deploy-smoke: pass/fail
notes: <free text — e.g. linked PR, incident ref>
```

Stored in the pilot operations log. Reviewed weekly (`ER_PILOT_OPERATIONS_SOP.md` § 11).
