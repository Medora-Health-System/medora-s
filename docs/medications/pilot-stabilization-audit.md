# M1.6G — Enterprise Pilot Stabilization Audit

**Date:** 2026-06-02  
**Phase:** M1.6G (read-only audit)  
**Scope:** M1.6F pilot activation + rollback framework

---

## Executive summary

The M1.6F pilot framework is **structurally sound** for a **single-medication, dry-run-first** activation. Staging confirms 12/12 Tranche A meds ready, 0 activated, 134 enterprise meds inactive. **No medications were activated during this audit.**

| Verdict | Value |
|---------|-------|
| **READY TO ACTIVATE FIRST MEDICATION** | **YES (conditional)** |
| **SAFE / NOT SAFE** | **SAFE (conditional)** |

**Conditions:** explicit `MEDORA_ENTERPRISE_PILOT_CATALOG_CODES` (one code), dry-run first, pharmacy sign-off, no flag-only bulk run.

---

## Part 1 — Activation workflow audit

### Files reviewed

- `apps/api/prisma/helpers/seed-enterprise-formulary-pilot-activation.ts`
- `packages/shared/src/medication/enterpriseFormularyPilotValidation.ts`
- `apps/api/src/medication-master/enterprise-formulary-pilot.constants.ts`
- `apps/api/prisma/seed-catalogs.ts` (pilot flag wiring)
- `apps/api/src/medication-master/enterprise-formulary-pilot-activation.spec.ts`

### Guards in place

| Guard | Implementation | Result |
|-------|----------------|--------|
| Tranche A manifest only | `ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_BY_CODE` | Non-tranche codes rejected |
| Eligibility classification | Excludes controlled, high-alert, LASA, injectables, anticoag | 12/12 eligible |
| Pre-activation validation | `validateEnterprisePilotActivationCandidate` blocking issues | Chain, billing, safety, alias |
| Bulk limit | Throws if `catalogCodes.length > 15` | Test covered |
| Double activation | Skip if pilot marker + `isActive` | Idempotent skip |
| Order search block | Refuses if `orderSearchEnabled` already true | M1.5F protection |
| Billing/MAR off | `buildPilotActivationNotes` sets `billingEnabled=false`, `marEnabled=false`, `orderSearchEnabled=false` | Explicit |

### Findings

| Question | Answer |
|----------|--------|
| Can activation occur incorrectly? | **Low risk** if single code + dry-run; **elevated** if flag set without `MEDORA_ENTERPRISE_PILOT_CATALOG_CODES` (defaults to **all 12**) |
| Can validation be bypassed? | **No** — blocking issues skip activation per row |
| Can activation occur twice? | **No** for active+pilot marker; re-run increments `alreadyActivated` |
| Can more than requested activate? | **No** — only iterates `requestedCodes`; max 15 |

### Gap (operational)

Seed path **does not** invoke `MedicationProductActivationGovernanceService` or `AuditService` — activation is operational seed, not UI governance workflow. Acceptable for pilot if operator documents runs; future M1.6H may wire audit events.

---

## Part 2 — Rollback audit

### Behavior verified (code + unit test)

| Check | Result |
|-------|--------|
| Idempotent rollback | Second rollback on stripped marker → 0 products found (safe) |
| Repeated rollback | No error; `rolledBack=0` when no pilot markers |
| Partial rollback | `catalogCodes` filter supported |
| Enterprise markers preserved | `stripEnterpriseFormularyPilotGovernanceLines` removes only pilot lines |
| Billing profiles preserved | Rollback does not touch `MedicationBillingProfile` |
| Search runtime cleared | `orderSearchEnabled=false` on rollback merge |
| Governance restored | `REVIEW_REQUIRED`, `isActive=false` |

### Gap

Rollback does not delete `FacilityFormularyItem` — sets `isOnFormulary=false` (correct; preserves FK history).

---

## Part 3 — Billing safety audit

| Check | Staging | Code |
|-------|---------|------|
| `requiresManualReview` on enterprise profiles | **134/134 true** | Not modified by activate/rollback |
| `billingEnabled` runtime flag | **0** | Explicitly `false` on activate |
| Billing profile HCPCS/NDC | Intact | No writes in pilot helpers |
| Wave 1 billing gate | Applies at UI enable-billing path | Pilot seed does not call enable-billing |

**Can activation accidentally enable billing?** **No.**  
**Can activation bypass manual review?** **No** — profile flag unchanged; billing runtime stays false.

---

## Part 4 — Governance audit

| Check | Result |
|-------|--------|
| Pre-activation `REVIEW_REQUIRED` | 134/134 enterprise; 12/12 Tranche A |
| Controlled/high-alert in Tranche A | 0 (manifest enforced) |
| Post-activation status | `ACTIVATION_APPROVED` (pilot only) |
| UI governance bypass | Seed path bypasses service — **documented operational risk** |
| Audit events | **Not emitted** by seed helper |

**Can governance be bypassed?** Tranche safety rules **cannot** be bypassed (validation blocks). Formal UI approval workflow **can** be bypassed via seed flag — mitigated by requiring explicit env vars + dry-run.

---

## Part 5 — Search audit

| Check | Staging |
|-------|---------|
| `orderSearchEnabled` on enterprise products | **0** |
| Pilot activation sets order search | **false** (code + test) |
| Provider canonical gate | Requires `orderSearchEnabled` — **blocked** post-pilot activate |
| Alias coverage Tranche A | 12/12 with ≥1 alias |
| Non-pilot exposure via pilot run | **No** — only requested catalog codes touched |

Legacy `CatalogMedication` search remains available (pre-existing; M1.5F deferred). Pilot does not enable canonical provider search cutover.

---

## Part 6 — Concurrency audit

| Scenario | Risk | Mitigation |
|----------|------|------------|
| Simultaneous activations (2 seed runs) | **MEDIUM** | No row locks; `FacilityFormularyItem` unique `(facilityId, packageId)` prevents dup FFI |
| Simultaneous rollbacks | **LOW** | Idempotent state transitions |
| Activation during rollback | **MEDIUM** | No transaction isolation across products; ops should serialize |
| Multiple administrators | **MEDIUM** | Require change control; single catalog code per run |

**Recommendation:** Serialize pilot ops; one medication at a time on staging before production.

---

## Part 7 — Dashboard audit

`auditEnterpriseFormularyPilotTrancheA()` on Railway staging (2026-06-02):

| Field | Value | Expected |
|-------|------:|----------|
| trancheTotal | 12 | 12 |
| pilotEligible | 12 | 12 |
| activatedCount | 0 | 0 |
| pendingReviewCount | 12 | 12 |
| blockedCount | 0 | 0 |
| activationReadinessPct | 100 | 100 |
| rollbackReadinessPct | 100 | 100 |

**Dashboard accurate** against live SQL counts.

---

## Part 8 — Staging validation

| Metric | Count |
|--------|------:|
| Wave 1 markers | 45 |
| Wave 2 markers | 89 |
| Enterprise total | 134 |
| Enterprise active | **0** |
| Pilot marker | **0** |
| Tranche A pending (`REVIEW_REQUIRED`, inactive) | **12** |
| Billing manual review profiles | 134 |
| Billing runtime enabled | 0 |
| Order search runtime enabled | 0 |

---

## Part 10 — Readiness scores (0–100)

| Score | Value | Notes |
|-------|------:|-------|
| Activation safety | **88** | −12: default-all-12 if env omits codes; no audit trail |
| Rollback safety | **95** | Solid idempotency; minor concurrency gap |
| Billing safety | **98** | Explicit off flags; profiles untouched |
| Governance safety | **85** | Seed bypasses UI service; tranche rules enforced |
| Search safety | **96** | orderSearch hard-false; legacy catalog unchanged |
| Concurrency safety | **72** | No distributed lock |
| Pilot readiness | **94** | Staging 100% chain/billing/alias |
| **Overall stabilization readiness** | **90** | Weighted composite |

---

## Part 11 — Final decision

| Question | Answer |
|----------|--------|
| **READY TO ACTIVATE FIRST MEDICATION** | **YES (conditional)** |
| **SAFE / NOT SAFE** | **SAFE (conditional)** |
| Migration required? | **NO** |
| Seed required? | **YES** (opt-in activation flag only) |

### Remaining blockers

1. **Operational:** Must not run `MEDORA_ENABLE_ENTERPRISE_FORMULARY_PILOT_ACTIVATION=1` without explicit single `MEDORA_ENTERPRISE_PILOT_CATALOG_CODES`.
2. **Process:** Dry-run mandatory before live activate.
3. **Governance:** No AuditService events on seed path — document operator + note in env.
4. **Concurrency:** Serialize staging pilot attempts.

### Recommended first activation sequence

1. `AMLODIPINE_5_MG_COMPRIME_ORAL` (dry-run → live → verify → optional rollback drill)
2. `METFORMIN_500`
3. `OMEPRAZOLE_20`
4. `LOSARTAN_50` / `LISINOPRIL_10`
5. Remaining Tranche A one at a time

---

## Recommended next phase

**M1.6H — First Pilot Medication Activation (staging)** — single med, dry-run verified, rollback drill completed.
