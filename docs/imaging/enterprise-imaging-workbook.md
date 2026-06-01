# Enterprise Imaging Workbook (Phase W2.1)

**Phase:** W2.1 — implementation authority workbook  
**Date:** 2026-06-01  
**Status:** `WORKBOOK_DRAFT` — Gate W2 **OPEN**  
**Machine-readable:** [`enterprise-imaging-workbook.csv`](enterprise-imaging-workbook.csv)  

---

## 1. Purpose

Single authoritative inventory of **170** net-new `CatalogImagingStudy` rows from phases 2E.2A–2E.2E, with classifier tuples, wave assignment, billing status, alias/retirement flags, and French labels.

**Out of scope for this workbook:** 44 existing Haiti rows (W1), XR-3b optional (+33), tuple-only passes (0 inserts), Phase 2D retirement execution.

---

## 2. Summary

| Metric | Value |
|--------|------:|
| **Total workbook rows** | **170** |
| **Expected catalog after apply** | **214** (44 + 170) |
| **Wave 1** | **37** |
| **Wave 2** | **61** |
| **Wave 3** | **41** |
| **Wave 4** | **31** |
| **Billing** | All `PENDING_CPT_REVIEW` |
| **Status** | All `WORKBOOK_DRAFT` |

### 2.1 By modality (net-new rows)

| Modality | Rows |
|----------|-----:|
| XR | 79 |
| CT | 31 |
| CTA | 4 |
| MRI | 25 |
| MRA | 5 |
| US | 17 |
| FL | 4 |
| NM | 5 |
| **Total** | **170** |

### 2.2 By implementation batch

| Batch | Rows | Wave |
|-------|-----:|:----:|
| XR-1 | 19 | 1 |
| CT-1 | 7 | 1 |
| MRI-1 | 11 | 1 |
| XR-2 | 53 | 2 |
| CT-2 | 4 | 2 |
| US-1 | 4 | 2 |
| MRI-2 | 14 | 3 |
| MRA-1 | 5 | 3 |
| US-2 | 10 | 3 |
| US-3 | 3 | 3 |
| FL-1 | 4 | 3 |
| NM-1 | 5 | 3 |
| XR-3 | 7 | 4 |
| CT-3 | 24 | 4 |

---

## 3. Column definitions

| Column | Description |
|--------|-------------|
| `catalogCode` | Unique stable code (UPPER_SNAKE) |
| `displayNameEn` | English orderable label |
| `displayNameFr` | French product label |
| `modality` | `MODALITY_*` classifier code |
| `bodyRegion` | `BODY_REGION_*` |
| `contrastType` | `CONTRAST_TYPE_*` (or angiographic for CTA) |
| `viewCount` | `VIEW_COUNT_*` (XR only; empty otherwise) |
| `laterality` | `LATERALITY_*` |
| `anatomicSubregion` | `ANATOMIC_SUBREGION_*` or empty |
| `protocol` | `PROTOCOL_*` or empty |
| `wave` | 1–4 rollout wave |
| `status` | `WORKBOOK_DRAFT` until Gate W2 wave sign-off |
| `billingStatus` | `PENDING_CPT_REVIEW` until Gate W3 |
| `aliasRequired` | `REQUIRED` \| `OPTIONAL` \| `NO_ALIAS` |
| `retirementImpact` | `NONE` \| `AVOID_*` predecessor guard |
| `successorImpact` | `NONE` \| governance note (e.g. preserve `MRI_SPINE` null) |
| `implementationBatch` | Batch ID (XR-1, CT-1, …) |

---

## 4. Governance guards (workbook-wide)

| Rule | Enforcement |
|------|-------------|
| No `CT_HEAD` | Absent from workbook |
| No `CT_ABD` | Absent; use `CT_ABDOMEN_PELVIS_*` |
| No `DOPPLER_VEIN` | Absent; LE venous stays on `US_VENOUS_DOPPLER_LE` |
| No `US_ABD` | Absent; use `US_ABDOMEN` / new US rows |
| `MRI_SPINE` | **Not** in workbook — B1B null preserved on existing row |

---

## 5. Optional appendix — XR-3b (not in CSV)

**33** extended XR rows deferred per `xray-expansion-candidate-list.md` §4. Add separate workbook slice if enterprise parity required.

---

## 6. Cross-references

| Document | Role |
|----------|------|
| `enterprise-imaging-alias-package.md` | Alias inventory |
| `enterprise-imaging-fr-translation-audit.md` | FR readiness |
| `enterprise-imaging-w2-authorization.md` | Gate W2 closure audit |
| `enterprise-imaging-wave-plan.md` | Wave rollout |

---

*W2.1 — workbook only; no catalog apply.*
