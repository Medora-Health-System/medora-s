# M1.6H — Final Pilot Risk Register

**Date:** 2026-06-03  
**Scope:** First controlled enterprise Tranche A pilot (staging → future production planning)  
**Decision reference:** `final-pilot-go-no-go-decision.md`

---

## CRITICAL

| ID | Risk | Status | Mitigation |
|----|------|--------|------------|
| R-C01 | Flag without `MEDORA_ENTERPRISE_PILOT_CATALOG_CODES` bulk-activates | **CLOSED** | M1.6G.1 fail-closed — hard error, zero writes |
| R-C02 | Operator skips dry-run | **CLOSED** | Mandatory in activation runbook; pharmacy gate |
| R-C03 | Rollback env var no-op (not wired) | **CLOSED** | M1.6H.1 wired + staging drill PASS |

**CRITICAL open count: 0** — eligible for **GO**.

---

## HIGH

| ID | Risk | Status | Mitigation |
|----|------|--------|------------|
| R-H01 | Pilot seed bypasses `AuditService` events | **OPEN** | Require `MEDORA_ENTERPRISE_PILOT_NOTE` + `ACTIVATED_BY`; future audit wiring |
| R-H02 | Concurrent pilot seed runs | **OPEN** | Serialize ops; one medication at a time |
| R-H03 | Billing enabled outside pharmacist review | **OPEN** | Do not set `billingEnabled`; profiles stay `requiresManualReview=true` |
| R-H04 | Production activation before staging UAT | **OPEN** | **NO-GO for production** until staging sign-off |

---

## MEDIUM

| ID | Risk | Status | Mitigation |
|----|------|--------|------------|
| R-M01 | Legacy catalog search still finds meds (M1.5F deferred) | **ACCEPTED** | `orderSearchEnabled=false` on pilot activation |
| R-M02 | Manual DB edit desyncs concept/product | **MONITORING** | Transactional activate/rollback in seed |
| R-M03 | Rollback untested on staging | **CLOSED** | M1.6H dry-run + live rollback PASS |
| R-M04 | `FacilityFormularyItem` history after rollback | **ACCEPTED** | `isOnFormulary=false`; row preserved |
| R-M05 | `activatedBy` not code-enforced | **OPEN** | Runbook requires env var on live runs |

---

## LOW

| ID | Risk | Status | Mitigation |
|----|------|--------|------------|
| R-L01 | Pilot marker merge idempotent | **CLOSED** | merge helper |
| R-L02 | Bulk >15 refused | **CLOSED** | validation + tests |
| R-L03 | Pre-set `orderSearchEnabled` blocks activation | **CLOSED** | validation refuses |
| R-L04 | Dashboard snapshot vs DB drift | **ACCEPTED** | use `auditEnterpriseFormularyPilotTrancheA()` for ops |
| R-L05 | Full `prisma:seed-catalogs` runtime (~10 min) | **ACCEPTED** | expect long run; verify tail log lines |

---

## Summary matrix

| Severity | Open | Closed / Accepted |
|----------|-----:|------------------:|
| CRITICAL | **0** | 3 |
| HIGH | 4 | 0 |
| MEDIUM | 2 | 3 |
| LOW | 1 | 4 |

---

## Domain safety (final)

| Domain | Go/No-Go | Evidence |
|--------|----------|----------|
| Billing | **GO** | 134/134 manual review; `billingEnabled=0` enterprise |
| Governance | **GO** | Tranche A only; fail-closed codes |
| Search | **GO** | 0 enterprise `orderSearchEnabled=true`; M1.5F deferred |
| Canonical | **GO** | Chain intact; rollback preserves wave markers |
| Activation | **GO** | Explicit codes; idempotent re-run |
| Rollback | **GO** | Wired + staging verified |
| Operational | **GO (conditional)** | Runbooks + pharmacy sign-off + backup |

---

## Blockers for production pilot (not staging)

1. Staging single-med UAT complete.
2. Pharmacy sign-off on staging behavior.
3. Production `DATABASE_URL` change control + backup.
4. R-H01 audit trail improvement (recommended, not blocking staging GO).
