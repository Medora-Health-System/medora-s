# Wave 3 Rollback Plan (Phase 2E.7A)

**Phase:** 2E.7A — design only  
**Date:** 2026-06-01  
**Scope:** **41** codes from workbook Wave 3 batches (or pilot subset if partially deployed)

---

## 1. Principles

- **No hard deletes** on `CatalogImagingStudy`, aliases, or clinical orders.
- Deactivate Wave 3 rows with `isActive=false` only.
- **Do not mutate** Wave 1 (**37**), Wave 2 (**61**), or Haiti baseline (**43** active + inactive `CT_HEAD`).
- **No US tuple rollback** in Wave 3 scope (Wave 2 tuple pass remains on legacy codes).
- Classifier FKs on deactivated rows may remain (preferred) or optional FKs nulled on inactive rows only.

---

## 2. Rollback procedures

### 2.1 CatalogImagingStudy

1. Set `isActive=false` for all deployed Wave 3 `catalogCode` values (up to **41**).
2. Verify active catalog returns to **141** (full rollback) or pilot baseline (partial rollback).

| Rollback scope | Codes deactivated | Active imaging after |
|----------------|------------------:|---------------------:|
| Full Wave 3 | **41** | **141** |
| Pilot minimum only | **18** | **141** (if only pilot was seeded) |
| Single batch (e.g. NM-1) | **5** | **177** |

### 2.2 ImagingStudyAlias

1. Remove or deactivate aliases whose `catalogImagingStudy` points to Wave 3 codes only.
2. Do not remove Wave 1, Wave 2, or baseline aliases.

### 2.3 Tuple rollback

**Not applicable** — Wave 3 design includes **0** tuple passes on legacy catalog codes.

If a future hotfix incorrectly mutates legacy US protocol FKs during Wave 3 deploy, revert using Wave 2 tuple rollback manifest only.

### 2.4 Classifier rollback

- **Preferred:** leave FKs on inactive Wave 3 rows.
- **Optional:** null optional FKs (`anatomicSubregion`, `protocol`) on deactivated rows only.
- **Never** change `MRI_SPINE`, `MRI_BRAIN`, Wave 1/2 rows, or Haiti 44-row tuples.

### 2.5 Deployment rollback

1. Revert API build / seed module (`haiti-imaging-wave3.ts` or equivalent) if needed.
2. Run preflight: active imaging **141**, Wave 3 codes absent or inactive.
3. Re-run `wave2-staging-validation.ts` to confirm Wave 2 stabilization intact.

---

## 3. Operational impact

| Area | Impact |
|------|--------|
| New Wave 3 orders | Blocked after rollback |
| Wave 1 + Wave 2 + baseline orders | Unchanged |
| Modality filters (MRA/FL/NM) | Empty or reduced until re-seed |
| Search | Wave 3 strings may fail until aliases removed |
| Billing | None (CPT not active) |

| Risk level | **Medium** (41 rows; new modalities MRA/FL/NM; lower alias/tuple surface than Wave 2) |

---

## 4. Time estimates

| Step | Duration |
|------|----------|
| Deactivate 41 codes | **< 15 min** |
| Alias cleanup | **20–40 min** |
| Deploy revert | **10–20 min** |
| Preflight + Wave 2 regression smoke | **45–60 min** |
| **Total recovery (staging)** | **~2 hours** |
| **Total recovery (production)** | **~2.5–3 hours** |

---

*No rollback executed in 2E.7A.*
