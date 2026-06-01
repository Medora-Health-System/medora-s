# Wave 4 Billing Package (Phase 2E.8A)

**Phase:** 2E.8A — design only  
**Date:** 2026-06-01  
**Scope:** **31** Wave 4 catalog rows (XR-3 + CT-3)  
**Gate:** Billing activation remains **Gate W3** (out of scope for catalog seed)

---

## 1. Summary

| State | Count |
|-------|------:|
| **billing-review** (`PENDING_CPT_REVIEW`) | **31** |
| **billing-ready** (CPT assigned in workbook) | **0** |
| **billing-deferred** (Gate W3 — no `billingCodeDefault` at seed) | **31** |

| Metric | Value |
|--------|------:|
| **Billing review count** | **31** |
| **Billing ready count** | **0** |
| **Billing deferred count** | **31** |

**Expected (2E.8A):** **31** rows · **31** `PENDING_CPT_REVIEW` · **0** billing-ready — **PASS**

---

## 2. Per-batch billing status

| Batch | Rows | billingStatus (all rows) |
|-------|-----:|--------------------------|
| XR-3 | 7 | PENDING_CPT_REVIEW |
| CT-3 | 24 | PENDING_CPT_REVIEW |

---

## 3. High-review CT-3 rows (planning flags)

| Code | Note |
|------|------|
| `CT_BRAIN_PERFUSION` | Perfusion CPT complexity (enterprise D4) |
| `CT_MAXILLOFACIAL_W_IV_CONTRAST` | Contrast variant — distinct from wo |
| `CT_STN_W_WO_CONTRAST` | w/wo split — billing pair review |
| MSK extremity set (13 rows) | Volume; may defer at Haiti pilot |

*Flags do not block staging seed; Gate W3 required before billing activation.*

---

## 4. Verification

| Check | Result |
|-------|--------|
| No CPT collision (two active codes → same billed CPT at seed) | **PASS** — no CPT assigned |
| No duplicate billing mappings in workbook | **PASS** |
| No retirement billing conflict | **PASS** |
| Wave 4 seed must not set `billingCodeDefault` | **Required at 2E.8B** |
| Consistent with Waves 1–3 deferral policy | **PASS** |

---

*No billing DB writes in 2E.8A.*
