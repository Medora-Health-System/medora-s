# Wave 4 Rollback Plan (Phase 2E.8A)

**Phase:** 2E.8A — design only  
**Date:** 2026-06-01  
**Scope:** **31** codes from workbook Wave 4 batches XR-3 + CT-3 (or pilot subset if partially deployed)

---

## 1. Principles

- **Soft rollback only** — no hard deletes on `CatalogImagingStudy`, aliases, or clinical orders.
- Deactivate Wave 4 rows with `isActive=false` only.
- **Preserve** Haiti baseline (**43** active + inactive `CT_HEAD`).
- **Preserve** Wave 1 (**37**), Wave 2 (**61**), Wave 3 (**41**).
- **No tuple rollback** in Wave 4 scope (0 legacy protocol mutations in design).
- Classifier FKs on deactivated rows may remain (preferred) or optional FKs nulled on inactive rows only.

---

## 2. Rollback procedures

### 2.1 CatalogImagingStudy

1. Set `isActive=false` for all deployed Wave 4 `catalogCode` values (up to **31**).
2. Verify active catalog returns to **182** (full rollback).

| Rollback scope | Codes deactivated | Active imaging after |
|----------------|------------------:|---------------------:|
| Full Wave 4 | **31** | **182** |
| XR-3 only | **7** | **206** |
| CT-3 only | **24** | **189** |
| CT-3 head subset (example) | **10** | **203** |

### 2.2 ImagingStudyAlias

1. Remove or deactivate aliases whose `catalogImagingStudy` points to Wave 4 codes only.
2. Do not remove Wave 1, Wave 2, Wave 3, or baseline aliases.

### 2.3 Tuple rollback

**Not applicable** — Wave 4 design includes **0** tuple passes on legacy catalog codes.

### 2.4 Classifier rollback

- **Preferred:** leave FKs on inactive Wave 4 rows.
- **Optional:** null optional FKs (`anatomicSubregion`, `protocol`, `viewCount`) on deactivated rows only.
- **Never** change `MRI_SPINE`, Wave 1–3 rows, or Haiti 44-row tuples.

### 2.5 Deployment rollback

1. Revert API build / seed module (`haiti-imaging-wave4.ts` or equivalent) if needed.
2. Run preflight: active imaging **182**, Wave 4 codes absent or inactive.
3. Re-run `wave3-staging-validation.ts` to confirm Wave 3 stabilization intact.

---

## 3. Operational impact

| Area | Impact |
|------|--------|
| New Wave 4 orders | Blocked after rollback |
| Waves 1–3 + baseline orders | Unchanged |
| XR shoulder-girdle search | AC/clavicle/scapula strings may fail until re-seed |
| CT MSK / head search | CT-3 strings may fail until re-seed |
| Billing | None (CPT not active) |

| Risk level | **Medium–High** (31 rows; CT-3 volume; CT vs CTA disambiguation in search) |

---

## 4. Time estimates

| Step | Duration |
|------|----------|
| Deactivate 31 codes | **< 15 min** |
| Alias cleanup | **25–45 min** |
| Deploy revert | **10–20 min** |
| Preflight + Wave 3 regression smoke | **45–60 min** |
| **Total recovery (staging)** | **~2–2.5 hours** |
| **Total recovery (production)** | **~2.5–3.5 hours** |

---

*End of Wave 4 rollback plan (Phase 2E.8A).*
