# Wave 3 Billing Package (Phase 2E.7A)

**Phase:** 2E.7A — design only  
**Date:** 2026-06-01  
**Scope:** **41** Wave 3 catalog rows  
**Gate:** Billing activation remains **Gate W3** (out of scope for catalog seed)

---

## 1. Summary

| State | Count |
|-------|------:|
| **billing-review** (`PENDING_CPT_REVIEW`) | **41** |
| **billing-ready** (CPT assigned in workbook) | **0** |
| **billing-deferred** (Gate W3 — no `billingCodeDefault` at seed) | **41** |

| Metric | Value |
|--------|------:|
| **Billing review count** | **41** |
| **Billing ready count** | **0** |
| **Billing deferred count** | **41** |

---

## 2. Per-batch billing status

| Batch | Rows | billingStatus (all rows) |
|-------|-----:|--------------------------|
| MRI-2 | 14 | PENDING_CPT_REVIEW |
| MRA-1 | 5 | PENDING_CPT_REVIEW |
| US-2 | 10 | PENDING_CPT_REVIEW |
| US-3 | 3 | PENDING_CPT_REVIEW |
| FL-1 | 4 | PENDING_CPT_REVIEW |
| NM-1 | 5 | PENDING_CPT_REVIEW |

---

## 3. Verification

| Check | Result |
|-------|--------|
| No CPT collision (two active codes → same billed CPT at seed) | **PASS** — no CPT assigned |
| No duplicate billing mappings in workbook | **PASS** |
| No retirement billing conflict | **PASS** — no rows with `retirementImpact` |
| Wave 3 seed must not set `billingCodeDefault` | **Required at 2E.7B** |
| Distinct from Wave 1/2 billing deferral policy | **PASS** — consistent with Waves 1–2 |

---

## 4. Implementation rules (2E.7B)

1. Seed all **41** rows with `billingCodeDefault = null` (or equivalent deferred state).
2. Do **not** activate Haiti CPT table links in Wave 3 staging without Gate W3 sign-off.
3. Order entry may display studies; billing engine remains unchanged.

---

*No billing DB writes in 2E.7A.*
