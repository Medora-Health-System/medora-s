# Medora-S — ER Pilot Downtime Runbook

Operational guide for clinic staff and on-call ops during a Medora-S outage.

> **Honest scope.** Medora-S today is a single-region, online-only system on Railway (API + Postgres) and Vercel (web). It does **not** ship with offline mode, multi-region failover, or dual-write replication. This runbook is **operational fallback**, not built-in continuity.

> **Language.** Written in English for ops/dev. Staff-facing notices used during clinic incidents must be in **French** per `french-ui.mdc`.

---

## 0. Roles during downtime

- **Clinical lead on shift** — patient safety, paper triage, downtime decisions.
- **Charge nurse / nursing super-user** — paper MAR + paper vitals.
- **Front desk** — paper registration log.
- **Ops on-call (Medora operator)** — Railway / Vercel / DNS / env vars / restore.
- **Compliance contact** — informed for any incident touching audit, ROI, or chart export integrity.

> Pin a printed copy of this page in the charge nurse station and at the registration desk.

---

## 1. Outage classification (decide first)

| Symptom (what staff see) | Likely cause | First action |
|---|---|---|
| Whole site does not load (any browser) | Vercel outage **or** internet outage | Try **other site** (e.g. `https://www.cloudflare.com`) on same device. If other sites also fail → **internet**. If only Medora fails → **Vercel/web**. |
| Web loads, login fails or app shows API errors | API (Railway) or DB outage | Check Railway dashboard → API + Postgres status. |
| One device only fails | Browser / session / device | See **§5 browser & session failure**. |
| Specific feature only (e.g. chart export 500) | Application bug or integrity issue | Capture screenshot + URL + time. Treat as **incident**. |

**Decide within 5 minutes**: switch to **paper fallback** (§7) if API is unreachable or login is broken for the whole clinic.

---

## 2. Internet outage

**System support**: none — Medora is online-only.

**Workflow**

1. Charge nurse declares paper fallback (§7).
2. Front desk switches to **paper registration log** (§7.1).
3. Clinical staff use **paper MAR / paper triage / paper notes** (§7.2–§7.3).
4. Ops on-call: confirm with carrier, document outage start time, internet restoration ETA.
5. **Do not** keep refreshing — let active sessions persist if any work locally cached pages still show.

**Recovery**

- After internet restored, login fresh on each station.
- Begin **reconciliation** (§9). Do not back-date timestamps in the system; record paper-time as text in clinical notes.

---

## 3. Railway outage (API and/or Postgres)

**System support**: none — single Railway project, single Postgres.

**Indicators**

- API returns 5xx, refresh tokens fail, login fails.
- `admin/system-health` (when reachable) shows `databaseReachable: false` or recent 5xx spike.

**Workflow**

1. Ops on-call: open Railway dashboard, identify whether **API service**, **Postgres**, or both are affected.
2. Communicate to charge nurse → declare paper fallback.
3. **Do not deploy** during a Railway-side incident. **Wait** for Railway status to recover.
4. If only the API service crashed (Postgres healthy), restart the API service from Railway. Confirm by hitting `/health`.
5. If Postgres is unhealthy:
   - Check Railway incident page first.
   - Do **not** restore from backup unless Railway confirms data loss. Premature restore overwrites data created since last backup.
6. Document start time and restoration time.

**Recovery**

- After Railway recovers, force one explicit login on each station (clears any stuck token state).
- Run **post-outage smoke** (§9.1).
- Begin reconciliation (§9).

---

## 4. Vercel outage (web app)

**System support**: none — single Vercel project.

**Indicators**

- Browsers cannot load `https://<medora-web>/...`.
- Vercel dashboard shows project deployment failure or platform incident.

**Workflow**

1. Ops on-call: confirm via Vercel status page.
2. **Do not redeploy** during a Vercel-side incident.
3. If a recent deploy is the suspected cause, **roll back to the prior production deployment** in Vercel UI (Deployments → previous → Promote).
4. If the API is healthy but web is down, no patient data is at risk — Postgres is unaffected. Continue paper fallback for clinical work.

**Recovery**

- After web is back, run smoke (§9.1).
- No reconciliation needed unless a partial deploy left the UI broken; treat as a deploy incident (see `DEPLOYMENT_RUNBOOK.md`).

---

## 5. Browser / session failure (single device)

**Common causes**

- Stale tab after another login (Medora-S enforces **single active session per user** — see `auth.service.ts → revokeAllUserSessions`). Old refresh tokens are revoked at login.
- Cookie purge / incognito.
- Network proxy.

**Workflow**

1. Ask user to **fully log out** (the logout button), close the tab, reopen, **log in again**.
2. If still failing, try another browser or device.
3. If only this user is affected → escalate as **SEV-3** (see incident classification).
4. Front desk: keep the affected user on paper until resolved.

---

## 6. Audit failure mode (`fail_closed`)

Medora-S supports `AUDIT_FAILURE_MODE=fail_closed` (`apps/api/src/common/services/audit.service.ts`). When set, **critical** clinical actions return **HTTP 503** with code `AUDIT_WRITE_FAILED_BLOCKED_ACTION` if the audit row cannot be written.

**What staff see**: a 503 toast/error blocking save (e.g. snapshot creation, ROI fulfill).

**What ops do**

1. Treat as **SEV-1** if multiple users hit it (audit DB likely unhealthy).
2. Check Postgres health on Railway; capture timestamp.
3. Until resolved, **stop using legally-significant features** (chart export snapshot creation, ROI fulfillment).
4. Switch to paper fallback for those flows.
5. Once audit DB is healthy, re-attempt the same actions in app and **document timestamps** of paper events in clinical notes.

If `AUDIT_FAILURE_MODE` is `best_effort` (default), the same audit failure is **silently** absorbed (only structured logs). Pilot recommendation: **use `fail_closed` in production** and accept the 503 blast radius for legally-significant actions.

---

## 7. Paper fallback (clinical operations)

**Always available; never depends on Medora.**

### 7.1 Patient registration fallback

- Pre-printed form: name, DOB, sex, NID/MRN if known, chief complaint, arrival time, triage acuity, allergies known.
- Numbered sequentially per shift; charge nurse keeps the master log.
- After recovery, a designated user enters each paper registration into Medora **without back-dating system fields** — the paper time goes into a structured note.

### 7.2 Medication administration fallback (paper MAR)

- Pre-printed paper MAR with patient identifier, allergy banner, drug, dose, route, time given, performer signature.
- **Allergy check is verbal + paper** during downtime — chart-side allergy banner is unavailable.
- Performer signs each row at administration time.
- After recovery, performer (not a substitute) re-enters the MAR rows in Medora **on the same shift** if possible. The clinical note records “Administration documentée sur papier pendant l’incident du <date>, saisie rétroactive le <date> à <heure>”.

### 7.3 Triage / vitals / provider note fallback

- Standard paper triage and progress note.
- Critical values (e.g. abnormal vitals) flagged with a colored sticker per local clinic SOP.
- Reconcile after recovery (§9).

---

## 8. Result reconciliation after downtime

**Constraint**: results in Medora can only be entered/verified/acknowledged on **OPEN** encounters (`apps/api/src/results/results.service.ts → assertEncounterOpenForClinicalMutation`). The application **does not** support post-close result entry.

**Workflow**

1. If the receiving encounter is **still OPEN** in Medora, enter the lab/imaging result via the normal flow once recovery is complete.
2. If the encounter has **already been CLOSED** during downtime, the result **cannot** be appended through normal clinical paths. Operational SOP:
   - Keep the paper result in the patient’s paper chart.
   - File a structured **clinical note addendum** in Medora referencing the paper result by date/time and provider initials.
   - Out-of-band: notify ordering provider so they can act on the result.
3. **Critical results during downtime** are paged to the ordering provider verbally per existing clinic SOP. Document the verbal handoff in the addendum once Medora is back.

> The pilot SOP (`ER_PILOT_OPERATIONS_SOP.md`) requires a **late-result process** be agreed before pilot start.

---

## 9. Chart reconciliation after downtime

### 9.1 Post-outage smoke (ops, after recovery)

Run **before** clinicians are told the system is back:

1. Login as a non-admin clinical user.
2. Open the trackboard.
3. Open one OPEN encounter (read).
4. Read one MAR list, one result list.
5. Read one closed encounter chart export snapshot in JSON.
6. Read the same snapshot in HTML.
7. Verify `admin/system-health` and `admin/backup-readiness` for the pilot facility.

If any step fails → **do not** declare recovery; continue paper fallback and escalate.

### 9.2 Clinical reconciliation

Charge nurse + clinical lead jointly review every paper artifact created during downtime:

- Paper registrations → Medora registrations (no back-dating system fields).
- Paper triage → Medora triage (system-time at entry; paper-time inside the note text).
- Paper MAR rows → Medora MAR rows by the **original performer** when feasible.
- Paper notes → structured clinical note in Medora.

Discrepancies are flagged in a separate paper log kept with the charge nurse for the post-incident review.

---

## 10. Immutable export reconciliation

**System-supported**

- `EncounterChartExport` snapshots are **created only after** an encounter is **CLOSED** (`chart-export.service.ts → createSnapshot`).
- Each snapshot carries a SHA-256 of the canonical manifest plus, when `CHART_EXPORT_SIGNING_SECRET` is set, an **HMAC-SHA256 signature**. Verification runs on every read; mismatches produce `RECORD_EXPORT_INTEGRITY_MISMATCH` and a critical `RECORD_EXPORT_INTEGRITY_FAILURE` audit (`apps/api/src/encounters/chart-export.service.ts`).

**During downtime**

- Snapshot creation is part of the normal close flow and depends on a healthy DB. If close itself fails during the outage, **defer close until Medora recovers** rather than accepting a partial state.

**After downtime**

- For each encounter that was CLOSED during the outage on paper but **never closed in Medora**, the clinical lead decides whether the encounter is closed in Medora **after** all paper material is reconciled (§9.2). The snapshot then captures the reconciled state.
- For encounters that were already CLOSED in Medora before the outage, no action is needed — their snapshots are unaffected.

**Not supported**

- Re-creating a snapshot retroactively for a date/time during the outage. Snapshots are server-time stamped; this is by design.

---

## 11. ROI considerations during/after downtime

- ROI requests are facility-ADMIN-only and require a fulfilled snapshot to release records (`apps/api/src/roi/chart-roi.service.ts`).
- During downtime, ROI requests **wait**. There is no paper ROI workflow that produces a Medora-signed export.
- After recovery, ADMIN reviews the queue and proceeds normally. Any ROI request created during the outage is timestamped at re-entry time.

---

## 12. Escalation order

1. **Charge nurse on shift** — clinical safety, declares paper fallback.
2. **Clinical lead** — clinical decisions, signs reconciliation log.
3. **Ops on-call (Medora operator)** — Railway, Vercel, env vars, restore.
4. **Compliance contact** — any audit/integrity/ROI exposure or any SEV-1.
5. **Vendor support** — Railway support, Vercel support, with status page links collected by ops.

Phone tree, names, and contact numbers are maintained **outside this repo** in the clinic operations binder. The escalation order itself is fixed by this document.

---

## 13. After the incident

Within 48 hours, complete an incident summary:

- Outage start and end times.
- What system component(s) failed.
- Number of patients seen on paper.
- Reconciliation deltas (rows added retroactively, dropped paper artifacts).
- Any audit/integrity incidents raised.
- Action items for `ER_PILOT_OPERATIONS_SOP.md`.

File the summary with the compliance contact and link from the next pilot status review.
