# Wave 2 Rollback Plan (Phase 2E.6A)

**Phase:** 2E.6A — design only  
**Date:** 2026-05-31  
**Scope:** **61** codes from workbook `wave=2`

---

## 1. Principles

- **No hard deletes** on `CatalogImagingStudy`, aliases, or orders.
- Deactivate Wave 2 rows with `isActive=false` only.
- **Do not mutate** Wave 1 (**37**) or Haiti baseline (**44** + inactive `CT_HEAD`).
- US tuple pass on legacy codes: revert protocol FKs only if tuple deploy failed (documented list of 15).

---

## 2. Rollback procedures

### 2.1 CatalogImagingStudy

1. Set `isActive=false` for all 61 Wave 2 `catalogCode` values.
2. Verify active catalog returns to **80** (43 + 37 Wave 1).

### 2.2 ImagingStudyAlias

1. Remove or deactivate aliases whose `catalogImagingStudy` points to Wave 2 codes only.
2. Do not remove Wave 1 or baseline aliases.

### 2.3 Classifier rollback

- **Preferred:** leave FKs on inactive Wave 2 rows.
- **Optional:** null optional FKs on deactivated rows only.
- **Never** change `MRI_SPINE`, Wave 1 rows, or W1 44-row tuples.

### 2.4 US tuple rollback

1. If tuple pass applied protocol classifiers to legacy `US_*` codes, revert those FKs per rollback manifest.
2. Do not deactivate baseline `US_ABDOMEN`, `US_OB_*`, etc.

### 2.5 Deployment rollback

1. Revert API build / seed module if needed.
2. Run preflight: active imaging **80**, Wave 2 codes absent or inactive.

---

## 3. Runtime impact

| Area | Impact |
|------|--------|
| New Wave 2 orders | Blocked after rollback |
| Wave 1 + baseline orders | Unchanged |
| Search | Wave 2 strings may fail until aliases removed |
| Billing | None (CPT not active) |

---

## 4. Time estimates

| Step | Duration |
|------|----------|
| Deactivate 61 codes | **< 10 min** |
| Alias cleanup | **20–40 min** |
| US tuple revert (if needed) | **30–60 min** |
| Deploy revert | **10–20 min** |
| Preflight + smoke | **45–90 min** |
| **Total recovery (staging)** | **~2–3 hours** |
| **Total recovery (production)** | **~3–4 hours** (higher risk — XR-2 cardinality) |

| Risk level | **High** (61 rows + optional US tuple; largest rollback since Wave 1) |

---

*No rollback executed in 2E.6A.*
