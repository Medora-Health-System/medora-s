# Medora-S — ER Restore Drill Checklist

End-to-end checklist for performing a **restore drill** on a clone of production. Required before pilot go-live and at least every 180 days during the pilot (`backup-readiness.service.ts → MEDORA_LAST_RESTORE_DRILL_AT`, stale &gt; 180d → `warn`, &gt; 365d → louder warn).

> **Scope.** Covers Postgres on Railway only. Vercel web is stateless — redeploying the same git commit is the “restore”. Object storage / file uploads are not in scope (Medora-S stores attachments inline as base64 in `Result.resultData` per `apps/api/src/results/results.service.ts`).

> **Never restore directly over production unless you intend to.** Drills always run against a **clone**.

Full production variable list and rotation warnings: **`docs/ENV_PRODUCTION_CHECKLIST.md`**.

---

## 0. Pre-drill inputs

| Input | Source | Required? |
|---|---|---|
| Production `DATABASE_URL` | Railway prod env | Read-only — needed only if extracting a logical export. |
| Production `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Railway prod env | Mirror into clone env to validate sessions issued against prod. |
| Production `CHART_EXPORT_SIGNING_SECRET` | Railway prod env | **Mirror exactly** into clone env. Without it, signed snapshots will fail integrity verification (`apps/api/src/encounters/chart-export-signature.util.ts`). |
| Production `AUDIT_FAILURE_MODE` | Railway prod env | Mirror to test the same enforcement. |
| Latest Railway backup timestamp | Railway dashboard | Confirm RPO. |
| Repo at the deployed commit SHA | git | For migration parity. |

Sign-off required for each: **Ops on-call** + **Compliance contact**.

---

## 1. Backup verification (Railway)

- [ ] Open Railway → Postgres → **Backups**.
- [ ] Confirm at least one **scheduled** backup within the configured retention window.
- [ ] Confirm backup retention period matches `MEDORA_BACKUP_POLICY_CONFIRMED` policy.
- [ ] Note the timestamp of the backup that will be restored (label clearly in the drill log).

If no backup is present or backups are off, **stop**: configure backups and return to step 1 next drill cycle.

---

## 2. Create restore target (clone)

- [ ] Create a **new** Postgres instance in Railway (separate project or branch DB) — do **not** restore into the prod instance.
- [ ] Restore the chosen backup into the new instance.
- [ ] Capture the **new** `DATABASE_URL` for the clone.

---

## 3. Migration parity validation

From the repo at the deployed commit:

```bash
DATABASE_URL="<clone DATABASE_URL>" \
  pnpm --filter @medora/api exec prisma migrate status
```

- [ ] Output reports **no pending** migrations (or only forward-compatible additive migrations matched against the deployed code).
- [ ] No "drift detected" warnings.

If pending migrations are listed, decide:

- **Drill is just verifying backups** → leave as-is, document.
- **Drill is verifying full restore + roll-forward** → run:

```bash
DATABASE_URL="<clone DATABASE_URL>" \
  pnpm --filter @medora/api exec prisma migrate deploy
```

- [ ] `migrate deploy` completes without error.
- [ ] `migrate status` is now clean.

---

## 4. Bring up the API against the clone

- [ ] Mirror env vars into clone API service:
  - `DATABASE_URL` → clone
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `TOKEN_ISSUER` → match production
  - `CHART_EXPORT_SIGNING_SECRET` → match production
  - `AUDIT_FAILURE_MODE` → match production
  - `NODE_ENV=production` if testing prod behavior
- [ ] Deploy API image at the prod commit SHA.
- [ ] `GET /health` returns 200.
- [ ] Login as a known seed/test user succeeds.

> Do **not** point a production web frontend at the clone. Use a separate Vercel preview or `localhost` web pointed at the clone API for drill traffic.

---

## 5. Snapshot integrity verification

Goal: prove that immutable chart export snapshots survived the restore and still verify under the **same** signing secret.

- [ ] In the clone, list a few recently-created `EncounterChartExport` rows (e.g. top 5 by `createdAt`):
  ```sql
  SELECT id, "facilityId", "encounterId", "manifestVersion", "manifestSignature" IS NOT NULL AS signed
  FROM "EncounterChartExport"
  ORDER BY "createdAt" DESC
  LIMIT 5;
  ```
- [ ] For each snapshot, call the API: `GET /encounters/:encounterId/chart-export/snapshots/:snapshotId?format=json`.
- [ ] **Expect 200**. Verify response body contains the manifest.
- [ ] Repeat with `?format=html` — expect 200 and HTML payload.
- [ ] **Negative test (mandatory)**: temporarily set `CHART_EXPORT_SIGNING_SECRET` on the clone API to a wrong value, restart, retry one signed snapshot.
  - [ ] Expect HTTP 500 with body `RECORD_EXPORT_INTEGRITY_MISMATCH`.
  - [ ] Expect a fresh `RECORD_EXPORT_INTEGRITY_FAILURE` audit row in `AuditLog` (PHI-safe metadata).
  - [ ] Restore the correct secret; confirm the snapshot reads cleanly again.

If any signed snapshot fails to verify with the correct production secret on the clone, **stop** — secret mismatch or content drift; raise SEV-1.

---

## 6. ROI verification

- [ ] Login as facility ADMIN on the clone web (or call API directly).
- [ ] List ROI requests via `GET /roi-requests`.
- [ ] For one fulfilled request, call `GET /roi-requests/:id/snapshot-document?format=json`.
  - [ ] Expect 200 with `{ snapshot, manifest }`.
- [ ] Confirm a `ROI_EXPORT_VIEW` row appears in `AuditLog` after the call.

---

## 7. Audit log continuity

- [ ] `SELECT count(*) FROM "AuditLog";` on clone matches expectations vs production at backup time (allow +/- few rows for in-flight at backup).
- [ ] Spot-check one `RECORD_EXPORT` row and one `ROI_REQUEST_FULFILL` row exist for known cases.
- [ ] Confirm `AuditLog.metadata` does **not** contain raw PHI for export/ROI rows (sample 5 rows manually — names, MRN, DOB, clinical text must be absent).

---

## 8. Smoke tests (clinical surface)

Login as test users with role coverage; perform read-only operations only. Do not pollute clone state if you intend to compare it again.

- [ ] Trackboard loads, returns rows.
- [ ] Open one OPEN encounter — read MAR, results, vitals, chart preview.
- [ ] Open one CLOSED encounter — read chart, list snapshots.
- [ ] Open one snapshot in JSON, then in HTML.
- [ ] Open `admin/system-health` and `admin/backup-readiness` (super-admin).

---

## 9. Rollback (drill teardown)

The drill leaves the clone alongside production. Do **not** swap the clone with production.

- [ ] Tear down the clone Postgres and clone API service in Railway after drill completion **or** preserve for forensic comparison if a real incident is ongoing.
- [ ] If env vars were temporarily mirrored into a shared service, reset them.

If you discover during the drill that **production** is corrupted, switch to **incident mode** — see `ER_PILOT_OPERATIONS_SOP.md` § Incident escalation.

---

## 10. Sign-off

| Item | Result | Notes |
|---|---|---|
| Backup present and within retention | pass / fail |  |
| Migration parity verified | pass / fail |  |
| API boots against clone | pass / fail |  |
| Snapshot integrity verified | pass / fail |  |
| ROI snapshot retrieval verified | pass / fail |  |
| Audit log continuity verified | pass / fail |  |
| Smoke tests pass | pass / fail |  |
| Drill completed without altering production | pass / fail |  |

After **all pass**:

- [ ] Update `MEDORA_LAST_RESTORE_DRILL_AT` (production) to the **drill date** (ISO 8601).
- [ ] File the drill log with the compliance contact.
- [ ] If any `fail`, do **not** advance pilot phase — open a SEV-2 (or SEV-1 if integrity verification failed).

Signatures (paper or e-signature):

- Ops on-call: __________________________   Date: __________
- Compliance contact: ___________________   Date: __________
- Clinical lead (optional but recommended): _______________   Date: __________
