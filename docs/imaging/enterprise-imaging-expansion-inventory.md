# Enterprise Imaging Expansion Inventory (Phase 2E.1)

**Phase:** 2E.1 — enterprise imaging expansion inventory mapping  
**Mode:** Audit + design only — **no catalog inserts, code, seeds, or migrations**  
**Date:** 2026-06-01  
**Prerequisites (stated):** Phase 2C complete; Phase 3C complete; classifier backfill applied; Gate W1 closed  

**Authoritative row-level mapping:** `legacy-vs-medora-coverage.md` (267 legacy studies)  
**Current Medora catalog:** `haiti-imaging-studies.ts` — **44** rows (**43** active)  
**Classifier vocabulary:** ICM-1.0 (**141** imaging classifiers; 3C-S1/S2 applied)

---

## 1. Executive summary

| Metric | Count |
|--------|------:|
| **Total legacy studies (normalized)** | **267** |
| **Medora catalog rows (current)** | **44** (43 active) |
| **Legacy → existing code (FULL)** | **23** |
| **Legacy → partial match (PARTIAL)** | **107** |
| **Legacy → no match (MISSING)** | **137** |
| **Net-new catalog codes (2E target, clustered)** | **62–97** |
| **Target active catalog post-2E** | **~105–140** |

---

## 2. Part 1 — Inventory normalization

### 2.1 Source reconciliation

| Source | Rows | Status |
|--------|------:|--------|
| User / product-owner legacy list (2E.1 input) | 267 | Matches `legacy-imaging-inventory.md` |
| `legacy-vs-medora-coverage.md` | 267 | **Authoritative** per-study mapping |
| `imaging-taxonomy-workbook-population.md` | 267 | Disposition rollup (EXPAND / TUPLE / ALIAS) |

### 2.2 Normalization key

Each legacy study is normalized to:

| Attribute | Rule |
|-----------|------|
| `legacyDisplayName` | Exact UI string (preserved) |
| `modalityFamily` | XR \| CT \| CTA \| MRI \| MRA \| US \| NM \| FL |
| `normalizedSlug` | Lowercase, punctuation-stripped key for dedupe |
| `variantFlags` | `laterality`, `viewCount`, `contrast`, `protocol`, `bilat` |

### 2.3 Duplicates and aliases (within legacy list)

| Type | Examples | 2E disposition |
|------|----------|----------------|
| **Exact duplicate naming** | `Coccyx and Sacrum` / `Sacrum and Coccyx` | Single canonical code + alias |
| **Synonym body site** | `Calcaneus Left 2V` / `Os Calcis Left 2V` | Single code (`XR_CALCANEUS_LEFT_2V`) + alias |
| **Legacy → Medora alias** | `US Liver` → `US_RUQ_GALLBLADDER` | **ALIAS** — no new row |
| **Legacy → successor** | `CT Head wo IV Contrast` → `CT_HEAD_WO_CONTRAST` | **EXISTS** — not `CT_HEAD` retired row |
| **CTA chest variants** | `CTA Chest w Reconstruction`, `CTA Chest Triple Rule Out` | **EXISTS** on `CTA_CHEST` (protocol/tuple) |

### 2.4 Multi-view / laterality / contrast / protocol variants

Legacy encodes variants as **separate orderables** (enterprise pattern). Medora Haiti catalog uses **generic body-region codes** with `LATERALITY_UNSPECIFIED` and `VIEW_COUNT_UNSPECIFIED` for most MSK XR.

| Variant class | Legacy rows (approx.) | Medora today |
|---------------|----------------------:|--------------|
| XR laterality (L/R/Bilat) | ~70 | Not split |
| XR view count (1V–4V, Complete) | ~90 | 2 codes with explicit views (`XR_CHEST`, `XR_CHEST_2V`, `XR_ABD_AP`) |
| CT contrast (w / wo / w&wo) | ~18 | Mostly unsplit (`CT_CHEST`, `CT_ABDOMEN_PELVIS`) |
| MRI contrast + spine level | ~20 | `MRI_BRAIN`, generic `MRI_SPINE` |
| US OB protocol splits | ~10 | `US_OB_FIRST`, `US_OB_GROWTH` (partial) |
| CTA protocol (runoff, COW, recon) | ~6 | `CTA_CHEST`, `CTA_HEAD_NECK`, `CTA_ABDOMEN_PELVIS` |

### 2.5 Retired / successor studies (catalog-level — Phase 2C / 2D)

Do **not** create expansion rows that resurrect retired predecessors.

| Medora code | Status | Successor | Legacy must not |
|-------------|--------|-----------|-----------------|
| `CT_HEAD` | **RETIRED** (inactive) | `CT_HEAD_WO_CONTRAST` | Re-add `CT_HEAD` as active expansion |
| `CT_ABD` | Predecessor (active until 2D) | `CT_ABDOMEN_PELVIS` | Add parallel `CT_ABD` expansion |
| `US_ABD` | Predecessor | `US_ABDOMEN` | Add duplicate abdomen US |
| `DOPPLER_VEIN` | Predecessor | `US_VENOUS_DOPPLER_LE` | Add duplicate Doppler |
| `CT_CHEST_CTA` | Predecessor | `CTA_CHEST` | Add duplicate chest CTA |

---

## 3. Part 2 — Coverage analysis (267 legacy studies)

### 3.1 Phase 3A tier (rollup)

| Tier | Count | 2E.1 classification |
|------|------:|---------------------|
| **FULL** | 23 | **EXISTS_IN_MEDORA** |
| **PARTIAL** | 107 | **PARTIAL_MATCH** (sub-disposition below) |
| **MISSING** | 137 | **MISSING** |
| **Total** | **267** | |

### 3.2 Phase 2E.1 disposition (107 PARTIAL sub-classified)

| Disposition | Legacy rows | Requires new `CatalogImagingStudy`? |
|-------------|------------:|:-------------------------------------:|
| **EXPAND** | 76 | **Yes** — new canonical code |
| **TUPLE_VARIANT** | 19 | **No** — classifier + alias on existing code |
| **ALIAS** | 2 | **No** — `ImagingStudyAlias` only |
| **MANUAL_REVIEW** | 10 | **TBD** — clinical/billing before code vs tuple |
| **Total PARTIAL** | **107** | |

### 3.3 Extended classification (all 267)

| Classification | Legacy rows | Notes |
|----------------|------------:|-------|
| **EXISTS_IN_MEDORA** | **23** | No new catalog row |
| **PARTIAL_MATCH** (tuple/alias only) | **21** | 19 TUPLE + 2 ALIAS |
| **PARTIAL_MATCH** (EXPAND) | **76** | New code required |
| **MISSING** | **137** | New code required |
| **SUCCESSOR_REQUIRED** | **~8** | Map to successor via alias; **no** new row (see §2.5) |
| **RETIRED_TARGET** | **0** | No legacy row should map to active `CT_HEAD` |

**Legacy rows driving net-new catalog creation:** **137 + 76 = 213**  
**After clustering (dedupe laterality/CPT):** **62–97** net-new codes

### 3.4 Modality family distribution (267 legacy)

| Family | Legacy rows | FULL | PARTIAL | MISSING |
|--------|------------:|-----:|--------:|--------:|
| **XR** | 118 | 3 | 62 | 53 |
| **CT** | 43 | 4 | 14 | 25 |
| **CTA** | 12 | 3 | 5 | 4 |
| **MRI** | 27 | 1 | 12 | 14 |
| **MRA** | 5 | 0 | 0 | 5 |
| **US** | 53 | 12 | 14 | 27 |
| **NM** | 5 | 0 | 0 | 5 |
| **FL** | 4 | 0 | 0 | 4 |
| **Total** | **267** | **23** | **107** | **137** |

---

## 4. Part 3 — Enterprise expansion candidates

### 4.1 Net-new catalog code estimate

| Source | Legacy rows | Net-new codes (clustered) |
|--------|------------:|--------------------------:|
| MISSING | 137 | 72–86 |
| PARTIAL → EXPAND | 76 | 18–28 |
| **Total** | **213** | **62–97** |

### 4.2 Representative candidates (sample — full matrix in `legacy-vs-medora-coverage.md`)

| Proposed code | displayNameEn | displayNameFr (draft) | Modality | Body region | View | Laterality | Contrast | Protocol |
|---------------|---------------|----------------------|----------|-------------|------|------------|----------|----------|
| `XR_KNEE_LEFT_3V` | Knee X-ray Left 3 views | Radiographie genou gauche (3 inc.) | MODALITY_XR | BODY_REGION_KNEE | VIEW_COUNT_THREE | LATERALITY_LEFT | CONTRAST_TYPE_NONE | — |
| `XR_CSPINE_COMPLETE` | Cervical spine X-ray complete | Radiographie rachis cervical complète | MODALITY_XR | BODY_REGION_SPINE_CERVICAL | VIEW_COUNT_COMPLETE | LATERALITY_UNSPECIFIED | CONTRAST_TYPE_NONE | — |
| `CT_HEAD_W_CONTRAST` | CT head with IV contrast | TDM tête avec contraste IV | MODALITY_CT | BODY_REGION_HEAD | — | LATERALITY_UNSPECIFIED | CONTRAST_TYPE_WITH | — |
| `CT_CHEST_W_CONTRAST` | CT chest with IV contrast | TDM thorax avec contraste IV | MODALITY_CT | BODY_REGION_CHEST | — | LATERALITY_UNSPECIFIED | CONTRAST_TYPE_WITH | — |
| `CT_TSPINE_WO_CONTRAST` | CT thoracic spine without contrast | TDM rachis thoracique sans contraste | MODALITY_CT | BODY_REGION_SPINE | — | LATERALITY_UNSPECIFIED | CONTRAST_TYPE_WITHOUT | ANATOMIC_SUBREGION_SPINE_THORACIC |
| `MRI_KNEE_LEFT` | MRI knee left | IRM genou gauche | MODALITY_MRI | BODY_REGION_KNEE | — | LATERALITY_LEFT | CONTRAST_TYPE_WITHOUT | — |
| `MRI_SPINE_LUMBAR_WO_CONTRAST` | MRI lumbar spine without contrast | IRM rachis lombaire sans contraste | MODALITY_MRI | BODY_REGION_SPINE | — | LATERALITY_UNSPECIFIED | CONTRAST_TYPE_WITHOUT | ANATOMIC_SUBREGION_SPINE_LUMBAR |
| `MRA_CAROTID_WO_CONTRAST` | MRA carotid without contrast | ARM carotides sans contraste | MODALITY_MRA | BODY_REGION_HEAD_NECK | — | LATERALITY_UNSPECIFIED | CONTRAST_TYPE_WITHOUT | PROTOCOL_MRA_CAROTID |
| `US_BREAST_BILATERAL` | Breast ultrasound bilateral | Échographie mammaire bilatérale | MODALITY_US | BODY_REGION_BREAST | — | LATERALITY_BILATERAL | CONTRAST_TYPE_NONE | — |
| `US_THYROID` | Thyroid ultrasound | Échographie thyroïde | MODALITY_US | BODY_REGION_THYROID | — | LATERALITY_UNSPECIFIED | CONTRAST_TYPE_NONE | — |
| `CTA_LE_LEFT` | CTA lower extremity left | Angioscanner membre inférieur gauche | MODALITY_CTA | BODY_REGION_LOWER_EXTREMITY | — | LATERALITY_LEFT | CONTRAST_TYPE_ANGIOGRAPHIC | — |
| `NM_HIDA` | HIDA scan | Scintigraphie HIDA | MODALITY_NM | BODY_REGION_HEPATOBILIARY | — | LATERALITY_UNSPECIFIED | CONTRAST_TYPE_NONE | PROTOCOL_NM_HIDA |
| `FL_ESOPHAGRAM` | Esophagram | Œsophagogramme | MODALITY_FL | BODY_REGION_ESOPHAGUS | — | LATERALITY_UNSPECIFIED | CONTRAST_TYPE_NONE | PROTOCOL_FL_SWALLOW |

**Final expansion candidate count (catalog rows to add):** **62–97** (governance estimate; Gate W2 sign-off required per row batch)

---

## 5. Part 4 — Duplicate governance (Phase 2C / 2D compatibility)

| Rule | Enforcement |
|------|-------------|
| No active `CT_HEAD` expansion | Legacy head CT maps to `CT_HEAD_WO_CONTRAST` / contrast splits — **not** retired code |
| No duplicate `CT_ABD` | Legacy abdomen CT → `CT_ABDOMEN_PELVIS` + contrast EXPAND rows |
| No duplicate Doppler | Venous LE Doppler → `US_VENOUS_DOPPLER_LE` + side EXPAND if needed |
| No duplicate chest CTA | `CT_CHEST_CTA` predecessor → `CTA_CHEST` only |
| CTA Triple Rule Out | **Protocol** on `CTA_CHEST` — not a competing catalog row |
| XR abdomen 1V/2V/3V vs KUB | **MANUAL_REVIEW** — resolve `XR_ABDOMEN` vs `XR_ABD_AP` before batch 2E.2A |

**Violations if ignored:** duplicate orderables, broken successor billing, search collision with retired codes.

---

## 6. Part 5 — Modality expansion summary

### 6.1 Legacy vs Medora modality coverage

| Modality | Legacy rows | Medora codes today | Missing family in catalog? |
|----------|------------:|-------------------:|:----------------------------:|
| **XR** | 118 | 17 XR codes | No — under-specified tuples |
| **CT** | 43 | 9 CT (+ trauma CAP) | No — contrast/MSK gaps |
| **CTA** | 12 | 3 CTA | No — LE/UE CTA missing |
| **MRI** | 27 | 2 MRI | No — spine/MSK/contrast gaps |
| **MRA** | 5 | **0** | **Yes** — entire family absent |
| **US** | 53 | 14 US | No — breast/thyroid/UE Doppler gaps |
| **NM** | 5 | **0** | **Yes** — entire family absent |
| **FL** | 4 | **0** | **Yes** — entire family absent |

### 6.2 Classifier vocabulary readiness

| Domain | ICM-1.0 codes | 2E need |
|--------|-------------:|---------|
| MODALITY | 8 (incl. NM, FL, MRA, CTA) | Seeded — ready for new rows |
| BODY_REGION | 42 | Ready; may need 2E additions for ribs/TMJ/pedi |
| VIEW_COUNT | 6 | Ready for XR expansion |
| LATERALITY | 4 | Required for EXPAND rows |
| CONTRAST_TYPE | 5 | Required for CT/MRI expansion |
| PROTOCOL | 40 | Required for CTA/US/NM/FL variants |

---

## 7. Current Medora catalog (44 codes — EXISTS baseline)

Active Haiti catalog codes (post–3C-B1 classifier backfill):  
`XR_CHEST`, `XR_CHEST_2V`, `XR_KNEE`, `XR_FOOT`, `XR_WRIST`, `XR_ANKLE`, `XR_SHOULDER`, `XR_PELVIS`, `XR_ABD_AP`, `XR_ABDOMEN`, `XR_HUMERUS`, `XR_ELBOW`, `XR_FOREARM`, `XR_HAND`, `XR_HIP`, `XR_FEMUR`, `XR_TIB_FIB`,  
`US_ABD`, `US_ABDOMEN`, `US_OB`, `US_OB_FIRST`, `US_OB_GROWTH`, `US_RENAL`, `US_SOFT`, `US_FAST`, `US_RUQ_GALLBLADDER`, `US_PELVIS`, `US_SCROTUM_TESTICULAR`, `DOPPLER_VEIN`, `US_VENOUS_DOPPLER_LE`,  
`CT_HEAD` *(inactive)*, `CT_HEAD_WO_CONTRAST`, `CT_ABD`, `CT_ABDOMEN_PELVIS`, `CT_CHEST`, `CT_CHEST_CTA`, `CT_CERVICAL_SPINE`, `CT_SPINE_LUMBAR`, `CT_CHEST_ABDOMEN_PELVIS_TRAUMA`,  
`CTA_CHEST`, `CTA_HEAD_NECK`, `CTA_ABDOMEN_PELVIS`,  
`MRI_BRAIN`, `MRI_SPINE`.

---

## 8. Cross-references

| Document | Role |
|----------|------|
| `enterprise-imaging-expansion-gap-analysis.md` | Gap detail + risk |
| `enterprise-imaging-expansion-roadmap.md` | Batch plan 2E.2A–2E |
| `legacy-vs-medora-coverage.md` | Row-level FULL/PARTIAL/MISSING |
| `imaging-taxonomy-workbook-readiness.md` | Gate W2 criteria |

---

*Phase 2E.1 — audit only. No implementation.*
