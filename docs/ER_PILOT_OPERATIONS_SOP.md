# Medora-S — ER Pilot Operations SOP

Operational standard operating procedure for the controlled freestanding ER pilot. Companion to:

- `ER_PILOT_DOWNTIME_RUNBOOK.md`
- `ER_RESTORE_DRILL_CHECKLIST.md`
- `DEPLOYMENT_RUNBOOK.md`
- `ER_PILOT_SCOPE_AND_CONSTRAINTS.md`
- `OBSERVATION_PRODUCT_READINESS.md` (observation / short-stay productization & pilot checklist — Phase 13D)

This SOP is **operational and human-process oriented**. It does not describe new product features.

---

## 1. Roles

| Role | Responsibility |
|---|---|
| **Pilot sponsor** | Final go / no-go for go-live and pilot scope changes. |
| **Clinical lead** | Pilot clinical decisions, paper-fallback authority. |
| **Charge nurse super-user** | First responder for clinical UX issues; daily monitoring. |
| **Ops on-call (Medora operator)** | Railway/Vercel/env vars, deploys, incidents. Carries the escalation pager. |
| **Compliance contact** | Audit, ROI, integrity events; sign-off on drills and incidents. |

The pilot binder pinned at the charge nurse station lists current names and phone numbers; the binder is operationally authoritative — this doc lists the **roles** and **rules**, not the people.

---

## 2. Deployment freeze rules during the pilot

A. **No production deploys during clinical hours** unless the deploy is to mitigate an active SEV-1 or SEV-2.

B. **No DDL / Prisma migration during clinical hours** under any circumstance. Migrations run only in a planned maintenance window with the clinical lead notified at least 24 hours in advance.

C. **One deploy at a time.** API and web are deployed in coordinated order (see `DEPLOYMENT_RUNBOOK.md`). Concurrent deploys by different operators are forbidden.

D. **Deploy freeze around clinical events**: no deploys within 30 minutes of shift change either side. The charge nurse confirms “quiet” before ops on-call promotes a deploy.

E. **Hotfix exception**: an active SEV-1 may bypass freeze rules with explicit verbal sign-off from the **clinical lead** and the **compliance contact** (recorded in the incident log).

---

## 3. Change management

| Type | Required approvals | Notes |
|---|---|---|
| UI text fix (no schema, no API change) | Ops on-call self-approves; tag clinical lead before promote. | Verify `pnpm run verify:web` and `pnpm --filter @medora/web build` pass. |
| API logic change (no schema) | Ops on-call + clinical lead. | Verify `pnpm run verify:api` and targeted Jest. |
| **Schema change / new Prisma migration** | Ops on-call + compliance contact + clinical lead. | Must be **additive** during pilot (per `prisma-migrations.mdc`); destructive migrations are out of scope. |
| **Auth / RBAC / facility-isolation change** | Ops on-call + compliance contact + sponsor. | High blast radius; runs only in maintenance window. |
| **Audit / chart export / ROI / signing change** | Ops on-call + compliance contact + sponsor. | Same. Verify with integrity drill (§ 8). |

Every promote is recorded in the **deploy log** (date, commit SHA, who, why, verify checklist passed).

---

## 4. Who may deploy

Only the named **ops on-call** and a designated **secondary operator**. No clinical staff has Railway or Vercel deploy access.

If the primary ops on-call is unreachable, the secondary operator may act with explicit clinical-lead acknowledgement (recorded). Any other person attempting a deploy is a process violation and must be reverted.

---

## 5. Migration approval workflow

1. **Author** writes the migration following `prisma-migrations.mdc` (unique strictly-greater timestamp prefix; additive; reviewed locally).
2. **Verify** locally:
   ```bash
   pnpm --filter @medora/api exec prisma validate
   pnpm --filter @medora/api exec prisma generate
   pnpm run verify:api
   pnpm run verify:web
   pnpm --filter @medora/web build
   ```
   Plus targeted Jest for the touched module.
3. **Drill** (recommended): apply against a clone of production (`ER_RESTORE_DRILL_CHECKLIST.md` § 3) to confirm clean apply.
4. **Approve**: ops on-call + compliance contact + clinical lead.
5. **Maintenance window**: schedule outside clinical hours with at least 24 hours’ notice.
6. **Apply**:
   ```bash
   DATABASE_URL="<Railway DATABASE_URL>" \
     pnpm --filter @medora/api exec prisma migrate deploy
   DATABASE_URL="<Railway DATABASE_URL>" \
     pnpm --filter @medora/api exec prisma migrate status
   ```
   API runtime must **not** auto-run migrations on start (`docs/OPS.md`). The release order is **migrate → deploy API**.
7. **Smoke test** (`ER_PILOT_DOWNTIME_RUNBOOK.md` § 9.1).

---

## 6. Secret rotation process

Pilot-relevant secrets:

- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `CHART_EXPORT_SIGNING_SECRET`
- `MEDORA_ALERT_WEBHOOK_URL`
- DB credentials (Railway-managed)

### `JWT_*` rotation

- Rotating these **invalidates all active sessions**. Schedule in maintenance window. Clinical lead notified.
- Set new value on API service → restart → all users must log in again.

### `CHART_EXPORT_SIGNING_SECRET` rotation

- **Rotation invalidates every existing signed snapshot signature** (signature scheme is single-key MVP per `apps/api/src/encounters/chart-export-signature.util.ts`). Existing snapshots will throw `RECORD_EXPORT_INTEGRITY_MISMATCH` until the secret is restored or a re-sign workflow is built (not in scope today).
- Therefore: rotate **only** under one of:
  1. Suspected secret compromise (incident-driven).
  2. Planned cutover where prior snapshots are re-signed by a tool (build that tool first; out of scope for the pilot).
- Process during pilot:
  - Open SEV-1.
  - Decide **whether to rotate** with sponsor + compliance contact. Document the decision rationale in the incident log.
  - If rotating, communicate to clinical lead that **prior snapshot reads will fail** until further action.

### Alert webhook rotation

- Low blast radius. Update env var → restart → send a test alert from `admin/system-health/test-alert`.

---

## 7. Audit failure escalation

The audit pipeline is `apps/api/src/common/services/audit.service.ts`.

| Symptom | Class | Action |
|---|---|---|
| Single user 503 with `AUDIT_WRITE_FAILED_BLOCKED_ACTION` on a critical action | SEV-2 | Capture timestamp + user; check Postgres health; retry. |
| Multiple users 503 across actions | SEV-1 | Treat as audit DB outage. Stop using legally-significant features (snapshot create, ROI fulfill). Switch affected flows to paper. |
| Structured log shows `audit_log_write_failed` repeatedly under `best_effort` | SEV-2 | Audit rows being silently lost. Investigate and consider switching to `fail_closed` if not already. |

Compliance contact is informed for any audit incident lasting longer than 15 minutes or affecting more than one user.

---

## 8. Integrity failure escalation

Triggered when `getSnapshot` rejects a snapshot with `RECORD_EXPORT_INTEGRITY_MISMATCH` and writes a `RECORD_EXPORT_INTEGRITY_FAILURE` audit (`apps/api/src/encounters/chart-export.service.ts`).

| Cause | Class | Action |
|---|---|---|
| Single snapshot fails after secret rotation (expected when rotation has happened) | SEV-2 | Restore the prior secret; confirm snapshots verify; postmortem. |
| Snapshot fails and the secret has **not** been rotated (suggests data tampering or storage corruption) | **SEV-1** | Freeze any export-related workflow for the affected facility. Capture row IDs. Compliance contact notified immediately. Restore drill comparison may be required. |
| ROI workflow fulfillment fails because linked snapshot fails verify | SEV-1 | Same as above. ROI request stays in `APPROVED` (terminal-state guards are tested in `chart-roi.terminal-state.spec.ts`); do not retry blindly. |

**Never** edit `EncounterChartExport.manifestJson` or `manifestHash` to “fix” an integrity failure. Doing so is the very tampering the integrity check is designed to detect; it produces an unrecoverable, evidentially-broken snapshot.

---

## 9. Failed export escalation

Covers `EXTERNAL_BILLING_EXPORT` automation and ED rapport CSV exports surfaced via `admin/export-monitoring`.

| Symptom | Class | Action |
|---|---|---|
| Single failed nightly billing export | SEV-3 | Use `POST admin/export-monitoring/retry` (super-admin); document in deploy log. |
| Multiple consecutive failures | SEV-2 | Investigate vendor webhook reachability; check `MEDORA_EXTERNAL_BILLING_VENDOR_WEBHOOK_URL`. |
| Export-related audit shows PHI in metadata | SEV-1 | Should never happen by design (`AdminExportMonitoringService`); treat as a code regression. Block deploys until reverted. |

---

## 10. Daily monitoring cadence

Run by ops on-call **once per clinical day**, before clinic opens (or first thing in the shift):

1. Login as super-admin.
2. `admin/system-health` → status `healthy`.
3. `admin/backup-readiness` → status `ready` (or `attention` with a known reason); `restore_drill` not stale beyond 180 days.
4. `admin/export-monitoring` → no recent failures in last 48 h.
5. `admin/roi-monitoring/summary` → review pending counts; clear with ADMIN if queue is unattended.
6. Spot-check error rate (Railway logs / external aggregator if configured).

Result of each daily check is recorded in the pilot operations log (one line per day).

---

## 11. Weekly monitoring cadence

Run by ops on-call **plus** compliance contact **once per week**:

1. Confirm at least one Railway backup created in the last 7 days.
2. Confirm `MEDORA_LAST_RESTORE_DRILL_AT` is within policy window.
3. Sample 5 audit rows from the prior week from `RECORD_EXPORT`, `ROI_REQUEST_FULFILL`, and `RECORD_EXPORT_INTEGRITY_FAILURE` (if any) — confirm metadata is PHI-safe.
4. Review `AuditLog` for any `BREAK_GLASS_*` events; reconcile with clinical justification.
5. Walk the deploy log: any deploys outside maintenance windows must be explained.

---

## 12. Shift handoff recommendations

At every shift change:

- Outgoing charge nurse summarises any in-progress encounter weirdness, paper artifacts in flight, or unfulfilled critical results to incoming charge nurse.
- Outgoing ops on-call (if changing) hands off the pager and any open SEV-2/3 tickets to incoming.
- The pilot operations log gets a short "handoff" entry signed by both nurses (paper).

---

## 13. Stale-session guidance

Medora-S enforces **single active session per user** (`apps/api/src/auth/auth.service.ts → revokeAllUserSessions` at login). Logging in elsewhere revokes the current refresh token.

Operational implications for staff:

- Workstations should be **dedicated** to one role/account during the shift. Don’t share Medora accounts.
- A user who logs in on a second device should expect the first device to error out — that’s by design.
- If a user is unexpectedly logged out mid-shift, follow `ER_PILOT_DOWNTIME_RUNBOOK.md` § 5 and report a SEV-3 if it happens to multiple users (possible session-store issue).

---

## 14. Single-session login behavior

Same source of truth as § 13:

- New login revokes prior refresh sessions.
- A stolen access token is bounded by `JWT_ACCESS_TTL` (default `8h` per `auth.service.ts`).
- A stolen refresh token is bounded by `JWT_REFRESH_TTL` (default `14d`) **and** by the next login on any device.
- Compromise response: rotate `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET` (§ 6) and force a global re-login.

---

## 15. Documentation hygiene

- All operational SOP documents live under `docs/`.
- Updates to this SOP require ops on-call + compliance contact sign-off in the commit message body.
- Versioning: this SOP is updated as a **single living document**; date the change in the commit, do not maintain old versions in-tree.
