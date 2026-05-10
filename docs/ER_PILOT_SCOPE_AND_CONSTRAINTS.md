# Medora-S — ER Pilot Scope & Constraints

Honest description of what Medora-S supports, what it does **not** support, and the operational requirements for a controlled freestanding ER pilot.

> **Tone.** This document is intentionally conservative. It does **not** describe future roadmap features as if they exist today.

---

## 1. Pilot definition

- **One clinic** (one freestanding ER), single facility row in `Facility`.
- **Single-region** Railway + Vercel deployment.
- **Supervised go-live**: a clinical lead and a charge-nurse super-user are physically present for the first week, daily for the second week, then on-call.
- **Bounded patient volume** during ramp-up (§ 8).

The pilot is **clinically supervised**; the system is not advertised as a replacement for a fully-validated tertiary EMR.

---

## 2. Supported workflows (system-supported)

| Workflow | Notes |
|---|---|
| Patient registration & lookup | Local MRN enforced; cross-facility access blocked by `RolesGuard`. |
| Trackboard & worklists | Compact MedoraCard-based UI. |
| Encounter open / document / close / sign | Append-only history; post-close mutation is rejected by `assertEncounterNotSigned` / `assertEncounterOpenForClinicalMutation`. |
| Vitals capture | Phase 1 module. |
| Lab / imaging order lifecycle | Order, result, verify, acknowledge — only on OPEN encounters. |
| Medication administration record (MAR) | Includes deduplication window, allergy banner on chart, signed-encounter lock. |
| Immutable chart export snapshot | CLOSED-only; SHA-256 + HMAC-SHA256 (when `CHART_EXPORT_SIGNING_SECRET` set); audited views. |
| Release of Information (ROI) | Facility-ADMIN-only workflow; PHI-safe audit metadata; terminal-state guards. |
| Single-active-session login | Login revokes prior refresh sessions per user. |
| Role-based access | Facility-scoped `RolesGuard` enforcement. |
| Platform monitoring (super-admin) | `admin/system-health`, `admin/backup-readiness`, `admin/export-monitoring`, `admin/roi-monitoring/summary`. |

---

## 3. Workflows **not yet** supported

These are explicitly **out of scope** for the pilot. Treat any clinic request for them as **paper-only** or **deferred**.

- **Offline mode / disconnected operation.** No service worker, no local cache of clinical state, no sync. An internet outage means paper fallback (`ER_PILOT_DOWNTIME_RUNBOOK.md`).
- **Multi-region / HA failover.** A single Railway region is the only deployment.
- **Real-time streaming, websockets, push.** No live notifications between users.
- **Automated re-signing of chart export snapshots after secret rotation.** Rotating `CHART_EXPORT_SIGNING_SECRET` invalidates prior signed snapshots until a re-sign tool is built.
- **Post-close result entry.** Once an encounter is CLOSED, results cannot be appended through normal flows; SOP requires a paper addendum (`ER_PILOT_DOWNTIME_RUNBOOK.md` § 8).
- **Bulk PHI export to external systems.** External billing automation is a controlled exception, gated by env flags and audited.
- **Multi-facility deployment.** Out of scope per `phase-lock.mdc` (Phase 6).
- **Analytics dashboards / national platform.** Out of scope per `phase-lock.mdc` (Phase 5/7).
- **HL7 / FHIR interoperability.** Not implemented.
- **PHI-aware patient portal / patient-facing mobile.** Not implemented.
- **Self-service password reset over SMS / email.** Use admin reset.
- **Clinical decision support / order-set engines.** Not implemented.

If a clinic asks for a feature on this list, the answer is *not yet*, not *we’ll turn it on*.

---

## 4. Known operational limitations

- **Single-session enforcement** (`auth.service.ts`): a second login revokes the first session’s refresh token. Sharing accounts across devices will cause unexpected logouts.
- **Audit `fail_closed` mode**: when configured, an unhealthy audit DB **blocks** legally-significant actions with HTTP 503. This is a feature, but staff must be trained to recognise it.
- **Chart export integrity**: any tampering or signing-secret mismatch causes integrity failure on read. Ops must protect `CHART_EXPORT_SIGNING_SECRET` like any other production secret.
- **Result attachments**: stored inline in `Result.resultData`. Large attachments increase row size — keep PDFs / images reasonable in size.
- **No background job framework**: scheduled work is via cron/Railway-scheduler (when configured); failure visibility is via `admin/export-monitoring` and structured logs.
- **No native multi-tenant isolation in DB**: facility scoping is enforced at the application layer through `RolesGuard` and explicit `facilityId` filters. Trust the guard, don’t bypass it.
- **No fine-grained per-record ACLs**: access is by role within a facility.
- **No rate limiting** beyond what Railway/Vercel provide.

---

## 5. Late-result SOP requirement

The pilot **must adopt a late-result SOP** before go-live:

- Lab/imaging results that arrive after their encounter is CLOSED are **not** entered into Medora through normal flows.
- The clinic agrees in writing on:
  - Who calls the ordering provider.
  - How the paper result is filed.
  - How a clinical note addendum is created in Medora referencing the paper result.
- The SOP is reviewed weekly during the pilot.

Without this SOP, late results will be ambiguous and unsafe.

---

## 6. Supervised go-live requirement

- **Day 0 — Day 7**: clinical lead and charge-nurse super-user **on-site** during all clinical hours. Ops on-call available within 30 minutes.
- **Day 8 — Day 30**: at least one super-user on-site each shift; ops on-call within 1 hour.
- **Day 30+**: regular operations; daily monitoring cadence (`ER_PILOT_OPERATIONS_SOP.md` § 10) becomes the routine.

Clinical incidents (SEV-1, SEV-2) escalate to the clinical lead immediately regardless of phase.

---

## 7. Restore-drill requirement

A successful **restore drill** (`ER_RESTORE_DRILL_CHECKLIST.md`) is a **prerequisite** to go-live. Subsequent drills run at least every **180 days** during the pilot. `MEDORA_LAST_RESTORE_DRILL_AT` reflects the most recent drill timestamp; the backup-readiness check downgrades to `attention` past 180 days and louder past 365 days (`apps/api/src/admin/backup-readiness.service.ts`).

Skipping the pre-go-live drill is a **NOT READY** condition.

---

## 8. Recommended patient volume

Conservative ramp during pilot:

| Phase | Window | Cap (per shift) | Rationale |
|---|---|---|---|
| Soft start | Day 0 – Day 7 | ≤ 10 | Train staff; surface UX issues. |
| Controlled | Day 8 – Day 30 | ≤ 25 | Confirm performance and integrity practices. |
| Steady | Day 30+ | clinic-determined, with operational review | Adjusted based on monitoring + post-incident reviews. |

Volume caps are **operational**, not technical limits — Medora-S can handle higher volumes from a code path standpoint, but the supervised go-live model demands manageable load.

---

## 9. Recommended staffing (Medora-related)

- **Clinical lead** (provider) accountable for clinical workflows in Medora.
- **Charge nurse super-user** per shift, trained in the paper fallback and the daily monitoring view.
- **Ops on-call** rotation with at least 2 named people; pager carried 24/7 during the first 30 days.
- **Compliance contact** reachable within 24 hours for audit/integrity/ROI events.

Roles can overlap, but no role can be vacant during clinical hours.

---

## 10. What "ready" means for go-live

All of the following are required:

- [ ] All migrations through the deployed code applied; `migrate status` clean.
- [ ] `CHART_EXPORT_SIGNING_SECRET` set in production and protected.
- [ ] `AUDIT_FAILURE_MODE=fail_closed` in production (or explicit sponsor sign-off if `best_effort` is chosen).
- [ ] `MEDORA_BACKUP_POLICY_CONFIRMED=true`.
- [ ] `MEDORA_DATA_RETENTION_POLICY_CONFIRMED=true`.
- [ ] `MEDORA_LAST_RESTORE_DRILL_AT` reflects a drill within 180 days.
- [ ] `admin/system-health` is `healthy`.
- [ ] `admin/backup-readiness` is `ready` (or `attention` with documented justification).
- [ ] `ER_PILOT_DOWNTIME_RUNBOOK.md` printed and pinned at the charge nurse station.
- [ ] `ER_RESTORE_DRILL_CHECKLIST.md` last run signed off.
- [ ] `ER_PILOT_OPERATIONS_SOP.md` reviewed by clinical lead, ops on-call, compliance contact.
- [ ] Late-result SOP signed off by the clinic.
- [ ] Pilot binder up to date with current names and phone numbers for all roles.

If any item is missing, the verdict is **NOT READY** for go-live.
