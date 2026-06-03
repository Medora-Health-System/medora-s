# M1.6G — Pilot Stabilization Readiness

**Date:** 2026-06-02  
**Environment:** Railway staging verified

---

## Stabilization posture

| Layer | Status |
|-------|--------|
| Enterprise formulary (134) | Seeded, inactive, billing-profiled |
| Tranche A framework | Implemented, tested |
| Tranche A data readiness | **100%** on staging |
| Activations performed | **0** |
| Rollback tested (unit) | **Yes** |
| Rollback tested (staging) | **Not yet** (nothing to roll back) |

---

## Readiness scores

| Dimension | Score |
|-----------|------:|
| Activation safety | 88 |
| Rollback safety | 95 |
| Billing safety | 98 |
| Governance safety | 85 |
| Search safety | 96 |
| Concurrency safety | 72 |
| Pilot readiness | 94 |
| **Overall stabilization** | **90** |

---

## Pre-first-activation checklist

- [ ] Confirm staging counts: 134 enterprise, 12 Tranche A pending, 0 active
- [ ] Run `auditEnterpriseFormularyPilotTrancheA()` — expect activationReadinessPct=100
- [ ] Dry-run single code:
  ```bash
  MEDORA_ENABLE_ENTERPRISE_FORMULARY_PILOT_ACTIVATION=1 \
  MEDORA_ENTERPRISE_PILOT_DRY_RUN=1 \
  MEDORA_ENTERPRISE_PILOT_CATALOG_CODES="AMLODIPINE_5_MG_COMPRIME_ORAL" \
  MEDORA_ENTERPRISE_PILOT_NOTE="M1.6G dry-run — amlodipine" \
  MEDORA_ENTERPRISE_PILOT_ACTIVATED_BY="pharmacy-lead" \
  pnpm --filter @medora/api run prisma:seed-catalogs
  ```
- [ ] Pharmacy/clinical sign-off
- [ ] Live activate **one** code (remove `DRY_RUN`)
- [ ] Verify SQL: 1 pilot marker, 1 active, orderSearch=false, billingEnabled=false
- [ ] Optional: rollback drill on staging
- [ ] Production only after staging green

---

## What first activation will change

| Field | Before | After (1 med) |
|-------|--------|---------------|
| Product `isActive` | false | true (1 row) |
| Concept `isActive` | false | true (1 row) |
| `governanceStatus` | REVIEW_REQUIRED | ACTIVATION_APPROVED |
| Pilot marker | absent | `ENTERPRISE_M16F_TRANCHE_A_PILOT` |
| `orderSearchEnabled` | false | **false** (unchanged) |
| `billingEnabled` | false | **false** (unchanged) |
| Billing `requiresManualReview` | true | **true** (unchanged) |

---

## Verdict

**SAFE (conditional)** to proceed with **first single-medication** staging activation after dry-run and explicit catalog code.
