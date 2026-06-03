# M1.6G — Pilot Stabilization Risk Register

**Date:** 2026-06-02  
**Scope:** M1.6F pilot activation + rollback on 134 enterprise / 12 Tranche A

---

## CRITICAL

| ID | Risk | Domain | Status | Mitigation |
|----|------|--------|--------|------------|
| R-C01 | Flag enabled without `MEDORA_ENTERPRISE_PILOT_CATALOG_CODES` activates **all 12** Tranche A meds | Activation | **Open** | **Always** set single catalog code; never run flag alone |
| R-C02 | Operator skips dry-run | Operational | **Open** | Mandatory `MEDORA_ENTERPRISE_PILOT_DRY_RUN=1` first |

---

## HIGH

| ID | Risk | Domain | Status | Mitigation |
|----|------|--------|--------|------------|
| R-H01 | Seed path bypasses `MedicationProductActivationGovernanceService` — no AuditService events | Governance | **Open** | Document operator + env note; future audit wiring |
| R-H02 | Concurrent seed runs without row locks | Concurrency | **Open** | Serialize pilot ops; one med at a time |
| R-H03 | Billing enable attempted separately without pharmacist review | Billing | **Open** | Do not enable billing until manual review cleared (separate workflow) |

---

## MEDIUM

| ID | Risk | Domain | Status | Mitigation |
|----|------|--------|--------|------------|
| R-M01 | Legacy catalog search still finds meds (M1.5F not cut over) | Search | **Accepted** | Expected; canonical provider search still gated |
| R-M02 | Activated product + inactive concept edge case if manual DB edit | Canonical | **Monitoring** | Pilot uses transactional concept+product activate |
| R-M03 | Rollback not yet exercised on staging | Rollback | **Open** | Run rollback drill after first staging activation |
| R-M04 | `FacilityFormularyItem` remains with `isOnFormulary=false` after rollback | Operational | **Accepted** | By design; preserves history |

---

## LOW

| ID | Risk | Domain | Status | Mitigation |
|----|------|--------|--------|------------|
| R-L01 | Pilot marker merge idempotent — duplicate lines on re-activate attempt | Activation | **Closed** | merge helper dedupes |
| R-L02 | Bulk >15 refused | Activation | **Closed** | Unit test |
| R-L03 | orderSearchEnabled pre-set blocks activation | Search | **Closed** | Validation refuses |
| R-L04 | Dashboard undercounts if chain snapshot missing in activate result | Dashboard | **Accepted** | Full audit function queries DB |

---

## Risk summary

| Severity | Open | Closed/Accepted |
|----------|-----:|----------------:|
| CRITICAL | 2 | 0 |
| HIGH | 3 | 0 |
| MEDIUM | 3 | 1 |
| LOW | 1 | 3 |

**Overall:** No CRITICAL **data integrity** defects. CRITICAL items are **operational guardrails** — addressable via runbook discipline.

---

## Cross-domain safety matrix

| Domain | Can pilot break it? | Evidence |
|--------|----------------------|----------|
| Billing | No accidental enable | `billingEnabled=false`; profiles untouched |
| Governance | Tranche rules enforced | Validation blocks unsafe rows |
| Search | No canonical cutover | `orderSearchEnabled=false` |
| Canonical | Chain preserved on rollback | Legacy link + wave markers kept |
| Activation | Controlled scope | Explicit catalog codes only |
