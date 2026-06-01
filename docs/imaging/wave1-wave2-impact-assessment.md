# Wave 1 → Wave 2 Impact Assessment (Phase 2E.5C)

**Phase:** 2E.5C — Part 6 deliverable  
**Date:** 2026-05-31  
**Wave 2 scope (planned):** **61** net-new rows — batches **XR-2** (53), **CT-2** (4), **US-1** (4) per [`enterprise-imaging-wave-plan.md`](enterprise-imaging-wave-plan.md)

---

## 1. Executive conclusion

**No Wave 1 stabilization finding blocks Wave 2 authorization planning.**

Wave 1 production is **stable**, **governed**, and **operationally usable** with documented search-phrase observations. Wave 2 implementation should proceed under existing Gate W2 controls (workbook, staging seed, per-wave sign-off, preflight, idempotent apply).

---

## 2. Findings mapped to Wave 2 batches

| Wave 1 finding | XR-2 (53 rows) | CT-2 (4 rows) | US-1 (4 rows) | Blocks Wave 2? |
|----------------|----------------|---------------|---------------|----------------|
| `lumbar spine xray` empty; `lumbar spine` works | Optional: add alias / `searchText` token `xray` on `XR_LSPINE_*` during XR-2 alias pass | — | — | **No** |
| `ct head with contrast` empty; alias + FR tokens work | — | Optional: alias `ct head with contrast` on `CT_HEAD_W_CONTRAST` in CT-2 alias backlog | — | **No** |
| `radiographie lombaire` empty | Optional FR alias on lumbar XR rows | — | — | **No** |
| Baseline predecessors active (`CT_ABD`, `US_ABD`, `DOPPLER_VEIN`, `CT_CHEST_CTA`) | Unchanged until **2D** retirement | CTA extremity rows must not recreate `CT_CHEST_CTA` | US-1 tuple pass on **existing** codes — align with [`wave1-risk-acceptance-record.md`](wave1-risk-acceptance-record.md) R-W1-D06 | **No** (known policy) |
| `MRI_SPINE` contrast NULL | Regression gate W2-O-12 in Gate W2 | — | — | **No** — **PASS** on prod |
| Billing `PENDING_CPT_REVIEW` on all Wave 1 | W3 deferred; does not block Wave 2 seed | Same | Same | **No** |
| Global duplicate alias strings (pre-Wave 1) | Review during XR-2 alias authoring; do not duplicate | — | — | **No** |

---

## 3. Required changes before Wave 2 implementation

| ID | Change | Required? |
|----|--------|-----------|
| — | *None mandatory from 2E.5C* | — |

---

## 4. Recommended (non-blocking) Wave 2 backlog

| ID | Item | Batch | Owner |
|----|------|-------|-------|
| W2-IMP-01 | Alias: `lumbar spine xray` → `XR_LSPINE_*` (or shared lumbar XR alias) | XR-2 alias pass | Engineering + clinical |
| W2-IMP-02 | Alias: `ct head with contrast` → `CT_HEAD_W_CONTRAST` | CT-2 / alias pass | Engineering |
| W2-IMP-03 | Alias: `radiographie lombaire` → lumbar XR set | XR-2 | Engineering + i18n |
| W2-IMP-04 | Staff one-pager: preferred search phrases for Wave 1 (FR/EN) | Adoption | Product / clinic champion |
| W2-IMP-05 | Re-run `MRI_SPINE` null contrast check in Wave 2 preflight | All waves | Engineering (Gate W2-O-12) |

These are **discoverability** improvements, not catalog corrections.

---

## 5. Wave 2 batch-specific notes

### XR-2 (53 rows)

- Largest cardinality; rollback complexity **high** per wave plan.
- Wave 1 proves seed + classifier FK path at production scale (37 rows).
- Rib subregion pattern (`ANATOMIC_SUBREGION_RIBS`) is validated — reuse for MSK laterality expansion.
- No schema migration required beyond existing `20260902120000_imaging_taxonomy_classifiers`.

### CT-2 (4 rows — CTA extremity)

- Must **not** insert forbidden codes (`CT_CHEST_CTA` recreation, `CT_HEAD` expansion).
- Wave 1 CT head successors (`CT_HEAD_WO_CONTRAST`, `CT_HEAD_W_CONTRAST`) stable; CTA chest remains baseline `CT_CHEST_CTA` until 2D.

### US-1 (4 rows + tuple pass)

- **15 protocol tuples** on legacy `US_*` codes (Gate W2-O-11) — highest workflow touch risk.
- Independent of Wave 1 row count; schedule clinical sign-off before production.
- Wave 1 did not activate US billing or tuple pass.

---

## 6. Authorization interaction

| Gate | Status after 2E.5C |
|------|----------------------|
| Wave 1 production | **COMPLETE** |
| Wave 1 stabilization | **PASS** |
| Enterprise Gate W2 (Waves 2–4) | **OPEN** — planning **authorized**; production apply per wave still needs sign-off |
| Wave 2 implementation start | **READY** on staging — not authorized for production in 2E.5C |

**Statement:** *No Wave 1 findings block Wave 2 authorization planning.*

---

## 7. Recommendation

| Recommendation | Rationale |
|----------------|-----------|
| **RECOMMEND WAVE 2 AUTHORIZATION** | Production inventory and governance **PASS**; order entry **PASS**; search gaps are documented mitigations, not integrity defects |

**RECOMMEND WAVE 2 DELAY** would apply only if: inventory mismatch, `CT_HEAD` reactivation, forbidden code insert, classifier regression on `MRI_SPINE`, or idempotency failure — **none observed**.

---

*Read-only assessment. No implementation.*
