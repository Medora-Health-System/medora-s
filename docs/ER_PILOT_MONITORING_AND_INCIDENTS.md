# Medora-S — Pilot Monitoring & Incident Classification

Operational reference for **what to look at**, **what queries to run**, and **how to classify incidents** during the controlled ER pilot.

> **Scope.** Lightweight, no new observability platform. Uses what is already shipped: `admin/system-health`, `admin/backup-readiness`, `admin/export-monitoring`, `admin/roi-monitoring/summary`, and direct SQL on `AuditLog`.

---

## 1. Ship-shipped admin endpoints (the operator’s front page)

All endpoints below require `MEDORA_SUPER_ADMIN` (platform operator) role and a valid facility header.

| Endpoint | Source | Purpose |
|---|---|---|
| `GET admin/system-health` | `admin-system-health.controller.ts` → `system-health.service.ts` | Overall status, alert webhook config, DB reachable, recent 5xx, recent failed exports, recent critical alerts. |
| `GET admin/backup-readiness` | `admin-backup-readiness.controller.ts` → `backup-readiness.service.ts` | Backup policy confirmed, retention policy confirmed, last restore drill timestamp, env-derived flags. |
| `GET admin/export-monitoring` | `admin-export-monitoring.controller.ts` | External billing automation health, recent failed exports. |
| `POST admin/export-monitoring/retry` | same | Manual retry for the most recent failed billing export. |
| `GET admin/roi-monitoring/summary` | `admin-roi-monitoring.controller.ts` | Aggregate ROI counts by status / type / delivery, no PHI. |

Daily and weekly cadence for these is in `ER_PILOT_OPERATIONS_SOP.md` § 10 and § 11.

---

## 2. Daily green-light criteria

Before clinic opens (or at the start of the operator’s shift), all of the following must be true:

- [ ] `admin/system-health.status === "healthy"`.
- [ ] `admin/system-health.metrics.databaseReachable === true`.
- [ ] `admin/system-health.metrics.recent5xxCount` — within historical baseline.
- [ ] `admin/backup-readiness.status === "ready"` (or `attention` with documented justification).
- [ ] `admin/export-monitoring` — no new failures since last check.
- [ ] `admin/roi-monitoring/summary` — no `APPROVED` ROI requests sitting unfulfilled longer than the agreed SLA.

If any item is red, classify the incident (§ 4) and proceed.

---

## 3. Direct monitoring queries (when the dashboards aren’t enough)

Run these against production read-only when needed. **Never** edit `AuditLog`.

### 3.1 Critical audit events in the last 24h

```sql
SELECT "createdAt", action, "entityType", "entityId", "userId"
FROM "AuditLog"
WHERE "critical" = true
  AND "createdAt" > now() - INTERVAL '24 hours'
ORDER BY "createdAt" DESC
LIMIT 200;
```

> Look especially for: `RECORD_EXPORT_INTEGRITY_FAILURE`, `BREAK_GLASS_*`, any unexpected `ROI_REQUEST_*` in the middle of the night.

### 3.2 Integrity failures (any history)

```sql
SELECT "createdAt", "facilityId", "entityType", "entityId", metadata
FROM "AuditLog"
WHERE action = 'RECORD_EXPORT_INTEGRITY_FAILURE'
ORDER BY "createdAt" DESC
LIMIT 50;
```

If non-empty and **not** explained by a recent secret rotation, this is **SEV-1** (§ 4).

### 3.3 ROI lifecycle visibility (no PHI)

```sql
SELECT status, count(*)
FROM "ChartRoiRequest"
GROUP BY status;
```

```sql
SELECT id, "facilityId", "requestType", status, "createdAt", "approvedAt", "fulfilledAt"
FROM "ChartRoiRequest"
WHERE "createdAt" > now() - INTERVAL '14 days'
ORDER BY "createdAt" DESC;
```

### 3.4 Recently created chart export snapshots

```sql
SELECT id, "facilityId", "encounterId", "createdAt",
       "manifestVersion",
       ("manifestSignature" IS NOT NULL) AS signed
FROM "EncounterChartExport"
ORDER BY "createdAt" DESC
LIMIT 20;
```

### 3.5 Recent 5xx volume (rough)

If a structured logging sink is wired up via `MEDORA_ALERT_WEBHOOK_URL`, prefer that. Otherwise, Railway logs filtered by HTTP status are the source of truth; capture spikes by hour rather than absolute counts.

### 3.6 Auth anomalies

```sql
SELECT "createdAt", action, "userId", metadata
FROM "AuditLog"
WHERE action IN ('LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'REFRESH_FAILED')
  AND "createdAt" > now() - INTERVAL '24 hours'
ORDER BY "createdAt" DESC
LIMIT 200;
```

> A spike in `LOGIN_FAILED` for one user can indicate stolen credential attempts; rotate passwords / lock accounts per local policy.

---

## 4. Incident classification

Incidents are classified by **clinical impact** and **data-integrity impact**, not by component.

### 4.1 SEV-1 — clinic-wide, immediate paper fallback

| Example | Why SEV-1 |
|---|---|
| `AUDIT_FAILURE_MODE=fail_closed` blocking multiple users (audit DB outage) | Stops legally-significant actions; risk of unsafe documentation. |
| `RECORD_EXPORT_INTEGRITY_FAILURE` with no recent secret rotation | Possible tampering/corruption of medico-legal artifacts. |
| Postgres outage / DB restore failure | Clinical workflow blocked; patient safety + data integrity at risk. |
| ROI exposure risk (e.g. PHI surfaced to wrong user) | Regulatory event. |
| Facility isolation failure (a user sees another facility’s data) | Tenant boundary breach. |
| API down ≥ 15 minutes during clinical hours | Continuous patient flow impact. |

**Response**

- Declare paper fallback (`ER_PILOT_DOWNTIME_RUNBOOK.md` § 7).
- Page **clinical lead + ops on-call + compliance contact** immediately.
- Freeze deploys.
- Capture timestamps, screenshots, audit row IDs.
- Post-incident review **mandatory** within 5 business days.

### 4.2 SEV-2 — partial impairment, time-bounded paper for affected flows

| Example | Why SEV-2 |
|---|---|
| Single user 503 with `AUDIT_WRITE_FAILED_BLOCKED_ACTION` | Local audit problem; blast radius small but non-trivial. |
| Multiple consecutive failed billing exports | Operational, not clinical, but compliance-visible. |
| Persistent UI degradation on one device class (browser-specific bug) | Some clinicians can’t work; others can. |
| Duplicate MAR concern (suspected race) | Medication safety signal; needs investigation. |
| Delayed critical result acknowledgment without alerting | Process gap; no clinical harm yet but worth fixing. |

**Response**

- Affected flow goes paper.
- Page **ops on-call + clinical lead**.
- Compliance informed if data-integrity adjacent.
- Fix during current shift if safe; otherwise schedule maintenance window.

### 4.3 SEV-3 — single user / cosmetic / low-risk

| Example | Why SEV-3 |
|---|---|
| Single browser/session failure resolved by re-login | Already-handled per `ER_PILOT_DOWNTIME_RUNBOOK.md` § 5. |
| French copy ambiguity | UX, not safety. |
| Minor UI defect on a non-critical screen | Quality-of-life. |
| Single failed nightly export retried successfully | Routine ops. |

**Response**

- Fix in next sprint or via routine deploy.
- Logged in deploy log.
- No paging.

---

## 5. Lightweight alerting today

`SystemHealthService` already surfaces:

- `metrics.recentCriticalAlertsCount` — count of critical operational alerts in the rolling window.
- `metrics.recentFailedExportsCount` — count of failed external billing exports.
- `metrics.recent5xxCount` — recent 5xx audit signal.
- `alertStatus` — webhook reachability summary.

If `MEDORA_ALERT_WEBHOOK_URL` is set:

- Critical alerts emit to the webhook (e.g. Slack / PagerDuty inbound).
- A test alert can be sent via `POST admin/system-health/test-alert` to confirm wiring.

If the webhook is **not** set, the daily cadence (§ 2) is the only line of defense — keep the cadence strict.

---

## 6. PHI safety in monitoring

By design:

- `admin/roi-monitoring/summary` returns **only** `facilityId` plus aggregate counts by status / type / delivery method.
- Audit metadata for ROI and chart export contains **only** stable IDs and enums (verified in `chart-roi.audit-phi-safety.spec.ts` and integrity tests).
- Manual SQL queries above intentionally do **not** select free-text or clinical fields.

If a monitoring query starts returning PHI, treat as a **regression**, freeze deploys, and revert.

---

## 7. Post-incident review template

For every SEV-1 and SEV-2:

- **Title**:
- **Date / time** (start / detected / mitigated / resolved):
- **Class**: SEV-1 / SEV-2
- **Impact**: clinical, data, compliance, ops
- **Detection**: dashboard / staff report / audit query
- **Root cause**:
- **Fix**:
- **Action items** (owner + due date):
- **Documentation updated?** (`ER_PILOT_DOWNTIME_RUNBOOK.md` / `ER_PILOT_OPERATIONS_SOP.md` / `DEPLOYMENT_RUNBOOK.md` / this doc)

Filed with the compliance contact and reviewed in the next pilot status meeting.
