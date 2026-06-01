# Enterprise Imaging Final Inventory (Phase 2E.9A)

**Phase:** 2E.9A — read-only final inventory  
**Date:** 2026-06-01  
**Environment:** Railway **production**  
**Method:** Read-only SQL + manifest cross-check — **no writes**

**Sources:** [`enterprise-imaging-workbook.csv`](enterprise-imaging-workbook.csv) · [`haiti-imaging-studies.ts`](../../apps/api/prisma/data/haiti-imaging-studies.ts) · Wave 1–4 seed manifests · production validation scripts

---

## 1. Production totals

| Layer | Expected active | Production actual | Result |
|-------|----------------:|------------------:|--------|
| **Total active imaging** | **213** | **213** | **PASS** |
| Haiti baseline (manifest) | **43** | **43** | **PASS** |
| Wave 1 | **37** | **37** | **PASS** |
| Wave 2 | **61** | **61** | **PASS** |
| Wave 3 | **41** | **41** | **PASS** |
| Wave 4 | **31** | **31** | **PASS** |
| **Sum check** | **213** | **43+37+61+41+31** | **PASS** |

*Haiti manifest **44** rows; **43** active (`CT_HEAD` inactive).*

---

## 2. Net-new workbook delivery (170)

| Wave | Batch(es) | Rows | Production active |
|------|-----------|-----:|------------------:|
| **1** | XR-1, CT-1, MRI-1 | **37** | **37** |
| **2** | XR-2, CT-2, US-1 | **61** | **61** |
| **3** | MRI-2, MRA-1, US-2, US-3, FL-1, NM-1 | **41** | **41** |
| **4** | XR-3, CT-3 | **31** | **31** |
| **Total net-new** | | **170** | **170** |

**Delivery:** **170 / 170** — **PASS**

---

## 3. Wave 4 detail (final wave)

| Batch | Rows | Production |
|-------|-----:|-----------:|
| XR-3 | **7** | **7** |
| CT-3 | **24** | **24** |
| **Wave 4 total** | **31** | **31** |
| Wave 4 aliases | **72** | **72** |

---

## 4. Integrity checks

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Duplicate active `code` | **0** | **0** | **PASS** |
| Duplicate active catalog rows | **0** | **0** | **PASS** |
| Orphan classifier FK (broken references) | **0** | **0** | **PASS** |
| Active rows missing `searchText` | **0** | **0** | **PASS** |
| Active rows missing `displayNameEn` | **0** | **0** | **PASS** |
| Active rows missing `displayNameFr` | **0** | **0** | **PASS** |
| All active studies searchable (non-empty index) | **213** | **213** | **PASS** |

---

## 5. Alias inventory (production)

| Scope | Alias rows | Notes |
|-------|----------:|-------|
| Haiti baseline codes | **129** | Includes legacy + tuple aliases |
| Wave 1 codes | **41** | |
| Wave 2 codes | **85** | |
| Wave 3 codes | **86** | |
| Wave 4 codes | **72** | |
| `XR_CHEST` tuple aliases | **3** | Decub + post-intubation (+ baseline) |

*Alias rows are per-code scoped; totals are not additive across waves.*

**US tuple pass (Wave 2):** Protocol/alias mappings applied on baseline `US_ABDOMEN`, `US_PELVIS`, `US_OB_*`, `US_SOFT` (production protocol FKs present where designed).

---

## 6. Haiti baseline reference (43 active)

Representative governance rows:

| Code | Active | Notes |
|------|:------:|-------|
| `CT_HEAD` | **false** | Retired predecessor |
| `CT_ABD` | **true** | Legacy; contrast FK null (accepted) |
| `US_ABD` | **true** | Legacy preserved |
| `DOPPLER_VEIN` | **true** | Canonical LE venous |
| `MRI_SPINE` | **true** | B1B — contrast FK **null** (accepted) |
| `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` | **true** | Legacy; contrast FK null (accepted) |

---

## 7. Optional scope not in production

| Package | Rows | Status |
|---------|-----:|--------|
| **XR-3b** | **+33** | Not deployed (optional parity) |
| **Phase 2D retirement execution** | — | Not executed (separate gate) |

---

*End of enterprise imaging final inventory (Phase 2E.9A).*
