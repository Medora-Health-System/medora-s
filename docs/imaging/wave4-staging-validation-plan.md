# Wave 4 Staging Validation Plan (Phase 2E.8A)

**Phase:** 2E.8A — design only  
**Date:** 2026-06-01  
**Baseline:** **182** active imaging (production) → **213** after full Wave 4 seed on staging (`182 + 31`)  
**Pilot subset (optional):** e.g. XR-3 only (**7**) → **189** active; partial CT-3 deferral per signed matrix

---

## 1. Validation domains

### 1.1 Catalog validation

| Test | Expected (full) | Pass criteria |
|------|-----------------|---------------|
| Wave 4 manifest rows | **31** | Exact match to workbook |
| Active Wave 4 rows after seed | **31** (or pilot subset) | `isActive=true` |
| Total active imaging | **213** (full) | 182 + 31 |
| Batch counts | XR-3 **7** · CT-3 **24** | Per batch |
| Duplicate `code` (global) | **0** new | Preflight query |
| Forbidden inserts | **0** | No `CT_HEAD`, `CT_ABD`, `DOPPLER_VEIN`, `US_ABD`, `CT_CHEST_CTA` |
| Wave 1 / Wave 2 / Wave 3 unchanged | **37** + **61** + **41** active | Count + spot FK |
| Haiti baseline unchanged | **43** active (+ inactive `CT_HEAD`) | Count policy |

**FAIL examples:** active count ≠ 213; any Wave 4 code missing; forbidden code created; Wave 3 count drops below 41.

---

### 1.2 Alias validation

| Test | Expected | Pass criteria |
|------|----------|---------------|
| Wave 4 alias rows created | ~45–70 (est.) | Within plan or documented delta |
| Workbook REQUIRED aliases | **0** codes | N/A unless promoted |
| No alias to retired codes | — | Audit query |
| No new global duplicate alias conflicts | **0** new vs pre-seed | Compare baseline |
| CT aliases must not point at `CTA_*` codes incorrectly | — | Modality audit |

**FAIL examples:** alias on `CT_HEAD`; new global duplicate mapping two unrelated codes.

---

### 1.3 Classifier validation

| Test | Expected | Pass criteria |
|------|----------|---------------|
| Modality / body / contrast / laterality | **31/31** set | FK not null |
| View count (XR-3 only) | **7/7** `VIEW_COUNT_TWO` | FK set |
| View count (CT-3) | null FK | NOT_APPLICABLE |
| Protocol where workbook specifies | **1/1** (`CT_BRAIN_PERFUSION`) | `PROTOCOL_CT_BRAIN_PERFUSION` |
| Anatomic subregion | per workbook | XR-3 7/7; CT-3 per head/MSK table |
| `MRI_SPINE` unchanged | contrast FK **null** | B1B regression |
| `CT_HEAD` unchanged | inactive | No reactivation |
| Seed idempotent | 2nd run | 0 new rows; 0 new aliases |

**FAIL examples:** any required FK null; `MRI_SPINE` contrast set; `CT_HEAD` active.

---

### 1.4 Search validation (smoke)

| Query | Expected hit (any) | Family |
|-------|-------------------|--------|
| `ac joint` / `articulation AC` | `XR_AC_JOINT_*` | XR-3 |
| `clavicle` / `clavicule` | `XR_CLAVICLE_*` | XR-3 |
| `scapula` / `scapula gauche` | `XR_SCAPULA_*` | XR-3 |
| `ct sinus` / `TDM sinus` | `CT_SINUSES_WO_CONTRAST` | CT-3 |
| `ct orbit` / `orbites` | `CT_ORBITS_WO_CONTRAST` | CT-3 |
| `soft tissue neck` / `parties molles du cou` | `CT_STN_*` | CT-3 |
| `ct knee left` / `TDM genou gauche` | `CT_KNEE_LEFT_WO_CONTRAST` | CT-3 |
| `ct perfusion` / `perfusion cérébrale` | `CT_BRAIN_PERFUSION` | CT-3 |
| `ct head` | no `CT_HEAD` | Regression |

**FAIL examples:** empty results for all rows above when aliases authored; `CT_HEAD` in results.

---

### 1.5 CT vs CTA disambiguation

| Test | Pass criteria |
|------|---------------|
| `CTA_LOWER_EXTREMITY_*` still **4** active (Wave 2) | Unchanged |
| New `CT_LOWER_EXTREMITY_*` tagged `MODALITY_CT` | Not `MODALITY_CTA` |
| Search `angioscanner` does not return plain CT MSK rows | Label/modality audit |
| `CTA_CHEST` / `CTA_HEAD_NECK` unchanged | Wave 1/2 regression |

---

### 1.6 Governance regression

| Test | Expected | Pass criteria |
|------|----------|---------------|
| `CT_HEAD` inactive | **false** | Unchanged |
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** | B1B |
| Forbidden codes absent | — | Audit |
| No Phase 2D retirement executed | — | N/A in 2E.8B |
| Wave 3 smokes still pass | MRI/MRA/US/FL/NM samples | Subset re-run |

---

## 2. Staging script expectations (2E.8B)

Implement `wave4-staging-validation.ts` mirroring Wave 3:

| Check category | Min. checks (est.) |
|----------------|-------------------:|
| Inventory counts | **8** |
| Batch breakdown | **2** |
| Classifier completeness | **4** |
| Governance | **6** |
| Search smokes | **6–8** |
| Idempotency | **2** |
| **Total** | **~19–22** |

**Pre-deploy aggregate `pass:false`:** Expected when Wave 4 codes not yet seeded (same pattern as Wave 3).

---

## 3. Expected production after validation (reference)

| Environment | Active imaging |
|-------------|---------------:|
| Staging (full Wave 4) | **213** |
| Production (today) | **182** |
| Production (post–Wave 4, future) | **213** |

---

## 4. Verdict criteria (2E.8C preflight, future)

| Outcome | Condition |
|---------|-----------|
| **PASS** | All mandatory checks green; 213 active (full scope) |
| **PASS WITH OBSERVATIONS** | Pilot subset deployed; documented deferrals |
| **FAIL** | Count drift, forbidden code, governance regression, idempotency break |

---

*End of Wave 4 staging validation plan (Phase 2E.8A).*
