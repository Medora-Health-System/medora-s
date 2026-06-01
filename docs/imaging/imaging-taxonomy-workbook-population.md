# Imaging Taxonomy Workbook Population

**Phase:** 3D.2 (audit-only)  
**Status:** Authoritative audit-level population — **not implemented**  
**Sources:** Phase 3D workbook design; `legacy-vs-medora-coverage.md` (267 rows); `haiti-imaging-studies.ts` (44 rows)

---

## 1. Population summary

| Metric | Count |
|--------|------:|
| Legacy studies (workbook source rows) | 267 |
| Current `CatalogImagingStudy` rows | 44 (43 active) |
| FULL legacy → existing code | 23 |
| PARTIAL legacy → existing code | 107 |
| MISSING legacy → new code required | 137 |
| Medora-native rows (no legacy name) | 0 |
| **Workbook rows at audit level** | **267 legacy + 44 catalog-native audit rows** |

**Net-new canonical codes (expansion estimate):** **62–97** (after clustering; see §5)  
**Target active catalog post-2E:** **105–140 rows**

---

## 2. Part 1 — Current 44-row catalog workbook draft

**Convention:** `—` = null FK. Proposed classifiers marked with `*` (not yet seeded). `MR=YES` = manual review required before backfill.

### 2.1 Complete classifier tuple assignment

| Canonical Code | Active | MODALITY | BODY_REGION | LATERALITY | ANATOMIC_SUBREGION | CONTRAST_TYPE | VIEW_COUNT | PROTOCOL |
|----------------|:------:|----------|-------------|------------|-------------------|---------------|------------|----------|
| `XR_CHEST` | ✓ | MODALITY_XR | BODY_REGION_CHEST | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | VIEW_COUNT_ONE* | — |
| `XR_CHEST_2V` | ✓ | MODALITY_XR | BODY_REGION_CHEST | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | VIEW_COUNT_TWO | — |
| `XR_KNEE` | ✓ | MODALITY_XR | BODY_REGION_KNEE | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | VIEW_COUNT_ONE* | — |
| `XR_FOOT` | ✓ | MODALITY_XR | BODY_REGION_FOOT | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | VIEW_COUNT_ONE* | — |
| `XR_WRIST` | ✓ | MODALITY_XR | BODY_REGION_WRIST | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | VIEW_COUNT_ONE* | — |
| `XR_ANKLE` | ✓ | MODALITY_XR | BODY_REGION_ANKLE | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | VIEW_COUNT_ONE* | — |
| `XR_SHOULDER` | ✓ | MODALITY_XR | BODY_REGION_SHOULDER | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | VIEW_COUNT_ONE* | — |
| `XR_PELVIS` | ✓ | MODALITY_XR | BODY_REGION_PELVIS | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | VIEW_COUNT_ONE* | — |
| `XR_ABD_AP` | ✓ | MODALITY_XR | BODY_REGION_ABDOMEN | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | VIEW_COUNT_ONE* | — |
| `XR_ABDOMEN` | ✓ | MODALITY_XR | BODY_REGION_ABDOMEN | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | VIEW_COUNT_ONE* | — |
| `XR_HUMERUS` | ✓ | MODALITY_XR | BODY_REGION_ARM | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | VIEW_COUNT_ONE* | — |
| `XR_ELBOW` | ✓ | MODALITY_XR | BODY_REGION_ELBOW | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | VIEW_COUNT_ONE* | — |
| `XR_FOREARM` | ✓ | MODALITY_XR | BODY_REGION_FOREARM | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | VIEW_COUNT_ONE* | — |
| `XR_HAND` | ✓ | MODALITY_XR | BODY_REGION_HAND | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | VIEW_COUNT_ONE* | — |
| `XR_HIP` | ✓ | MODALITY_XR | BODY_REGION_HIP | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | VIEW_COUNT_ONE* | — |
| `XR_FEMUR` | ✓ | MODALITY_XR | BODY_REGION_THIGH | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | VIEW_COUNT_ONE* | — |
| `XR_TIB_FIB` | ✓ | MODALITY_XR | BODY_REGION_LEG | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | VIEW_COUNT_ONE* | — |
| `US_ABD` | ✓ | MODALITY_US | BODY_REGION_ABDOMEN | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | — | — |
| `US_ABDOMEN` | ✓ | MODALITY_US | BODY_REGION_ABDOMEN | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | — | — |
| `US_OB` | ✓ | MODALITY_US | BODY_REGION_OBSTETRICAL | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | — | — |
| `US_OB_FIRST` | ✓ | MODALITY_US | BODY_REGION_OBSTETRICAL | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | — | PROTOCOL_US_OB_FIRST_TRIMESTER* |
| `US_OB_GROWTH` | ✓ | MODALITY_US | BODY_REGION_OBSTETRICAL | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | — | PROTOCOL_US_OB_LATE_TRIMESTER* |
| `US_RENAL` | ✓ | MODALITY_US | BODY_REGION_KIDNEY | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | — | — |
| `US_SOFT` | ✓ | MODALITY_US | BODY_REGION_SOFT_TISSUE | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | — | — |
| `US_FAST` | ✓ | MODALITY_US | BODY_REGION_ABDOMEN | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | — | PROTOCOL_US_FAST* |
| `US_RUQ_GALLBLADDER` | ✓ | MODALITY_US | BODY_REGION_ABDOMEN_RUQ | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | — | — |
| `US_PELVIS` | ✓ | MODALITY_US | BODY_REGION_PELVIS | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | — | — |
| `US_SCROTUM_TESTICULAR` | ✓ | MODALITY_US | BODY_REGION_SCROTUM | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | — | — |
| `DOPPLER_VEIN` | ✓ | MODALITY_US | BODY_REGION_LOWER_EXTREMITY | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | — | PROTOCOL_US_DOPPLER_VENOUS* |
| `US_VENOUS_DOPPLER_LE` | ✓ | MODALITY_US | BODY_REGION_LOWER_EXTREMITY | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_NONE* | — | PROTOCOL_US_DOPPLER_VENOUS* |
| `CT_HEAD` | ✗ | MODALITY_CT | BODY_REGION_HEAD | LATERALITY_UNSPECIFIED | — | — | — | — |
| `CT_HEAD_WO_CONTRAST` | ✓ | MODALITY_CT | BODY_REGION_HEAD | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_WITHOUT | — | — |
| `CT_ABD` | ✓ | MODALITY_CT | BODY_REGION_ABDOMEN | LATERALITY_UNSPECIFIED | — | — | — | — |
| `CT_ABDOMEN_PELVIS` | ✓ | MODALITY_CT | BODY_REGION_ABDOMEN_PELVIS | LATERALITY_UNSPECIFIED | — | — | — | — |
| `CT_CHEST` | ✓ | MODALITY_CT | BODY_REGION_CHEST | LATERALITY_UNSPECIFIED | — | — | — | — |
| `CT_CHEST_CTA` | ✓ | MODALITY_CTA* | BODY_REGION_CHEST | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_ANGIOGRAPHIC | — | PROTOCOL_CTA_CHEST_STANDARD* |
| `CTA_CHEST` | ✓ | MODALITY_CTA* | BODY_REGION_CHEST | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_ANGIOGRAPHIC | — | PROTOCOL_CTA_CHEST_STANDARD* |
| `CTA_HEAD_NECK` | ✓ | MODALITY_CTA* | BODY_REGION_HEAD_NECK | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_ANGIOGRAPHIC | — | — |
| `CTA_ABDOMEN_PELVIS` | ✓ | MODALITY_CTA* | BODY_REGION_ABDOMEN_PELVIS | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_ANGIOGRAPHIC | — | — |
| `CT_CERVICAL_SPINE` | ✓ | MODALITY_CT | BODY_REGION_SPINE_CERVICAL | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_CERVICAL* | — | — | — |
| `CT_SPINE_LUMBAR` | ✓ | MODALITY_CT | BODY_REGION_SPINE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_LUMBAR* | — | — | — |
| `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` | ✓ | MODALITY_CT | BODY_REGION_CHEST_ABDOMEN_PELVIS | LATERALITY_UNSPECIFIED | — | — | — | PROTOCOL_CT_CAP_TRAUMA* |
| `MRI_BRAIN` | ✓ | MODALITY_MRI | BODY_REGION_HEAD | LATERALITY_UNSPECIFIED | — | — | — | — |
| `MRI_SPINE` | ✓ | MODALITY_MRI | BODY_REGION_SPINE | LATERALITY_UNSPECIFIED | — | — | — | — |

### 2.2 44-row governance columns (audit draft)

| Code | Coverage | Billing Status | Retirement | Successor | MR |
|------|----------|----------------|:----------:|-----------|:--:|
| `XR_CHEST` | NATIVE | KNOWN_CPT_EXAMPLE | NO | — | NO |
| `XR_CHEST_2V` | NATIVE | KNOWN_CPT_EXAMPLE | NO | — | NO |
| `XR_KNEE` | NATIVE | KNOWN_CPT_EXAMPLE | NO | — | YES |
| `XR_FOOT` | NATIVE | KNOWN_CPT_EXAMPLE | NO | — | YES |
| `XR_WRIST` | NATIVE | KNOWN_CPT_EXAMPLE | NO | — | YES |
| `XR_ANKLE` | NATIVE | KNOWN_CPT_EXAMPLE | NO | — | YES |
| `XR_SHOULDER` | NATIVE | KNOWN_CPT_EXAMPLE | NO | — | YES |
| `XR_PELVIS` | NATIVE | KNOWN_CPT_EXAMPLE | NO | — | YES |
| `XR_ABD_AP` | FULL | KNOWN_CPT_EXAMPLE | NO | — | NO |
| `XR_ABDOMEN` | PARTIAL | UNKNOWN_CPT | NO | — | YES |
| `XR_HUMERUS`–`XR_TIB_FIB` (8 MSK) | NATIVE | UNKNOWN_CPT | NO | — | YES |
| `US_ABD` | PARTIAL | KNOWN_CPT_EXAMPLE | YES | `US_ABDOMEN` | YES |
| `US_ABDOMEN` | FULL | KNOWN_CPT_EXAMPLE | NO | — | YES |
| `US_OB` | PARTIAL | KNOWN_CPT_EXAMPLE | NO | — | YES |
| `US_OB_FIRST` | FULL | UNKNOWN_CPT | NO | — | YES |
| `US_OB_GROWTH` | PARTIAL | UNKNOWN_CPT | NO | — | YES |
| `US_RENAL` | FULL | KNOWN_CPT_EXAMPLE | NO | — | YES |
| `US_SOFT` | FULL | UNKNOWN_CPT | NO | — | YES |
| `US_FAST` | FULL | UNKNOWN_CPT | NO | — | YES |
| `US_RUQ_GALLBLADDER` | FULL | UNKNOWN_CPT | NO | — | YES |
| `US_PELVIS` | FULL | UNKNOWN_CPT | NO | — | YES |
| `US_SCROTUM_TESTICULAR` | FULL | UNKNOWN_CPT | NO | — | YES |
| `DOPPLER_VEIN` | PARTIAL | KNOWN_CPT_EXAMPLE | YES | `US_VENOUS_DOPPLER_LE` | YES |
| `US_VENOUS_DOPPLER_LE` | FULL | KNOWN_CPT_EXAMPLE | NO | — | YES |
| `CT_HEAD` | PARTIAL | KNOWN_CPT_EXAMPLE | RETIRED | `CT_HEAD_WO_CONTRAST` | YES |
| `CT_HEAD_WO_CONTRAST` | FULL | KNOWN_CPT_EXAMPLE | NO | — | YES |
| `CT_ABD` | PARTIAL | KNOWN_CPT_EXAMPLE | YES | `CT_ABDOMEN_PELVIS` | YES |
| `CT_ABDOMEN_PELVIS` | PARTIAL | UNKNOWN_CPT | NO | — | YES |
| `CT_CHEST` | FULL | KNOWN_CPT_EXAMPLE | NO | — | YES |
| `CT_CHEST_CTA` | PARTIAL | UNKNOWN_CPT | YES | `CTA_CHEST` | YES |
| `CTA_CHEST` | FULL | UNKNOWN_CPT | NO | — | YES |
| `CTA_HEAD_NECK` | FULL | UNKNOWN_CPT | NO | — | YES |
| `CTA_ABDOMEN_PELVIS` | PARTIAL | UNKNOWN_CPT | NO | — | YES |
| `CT_CERVICAL_SPINE` | FULL | UNKNOWN_CPT | NO | — | YES |
| `CT_SPINE_LUMBAR` | FULL | KNOWN_CPT_EXAMPLE | NO | — | YES |
| `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` | PARTIAL | UNKNOWN_CPT | NO | — | YES |
| `MRI_BRAIN` | FULL | UNKNOWN_CPT | NO | — | YES |
| `MRI_SPINE` | PARTIAL | UNKNOWN_CPT | NO | — | YES |

**44-row manual review total:** **34 rows** with `MR=YES` (9 contrast-empty CT/MRI + 16 generic MSK XR policy + 5 retirement + 3 duplicate/billing + 1 XR abdomen pair)

---

## 3. Part 2 — Legacy inventory (267 rows)

**Authoritative source:** `legacy-vs-medora-coverage.md` (row-level mapping).

### 3.1 Coverage totals

| Coverage | Count | Canonical destination |
|----------|------:|----------------------|
| **FULL** | 23 | Existing Medora code (no new row) |
| **PARTIAL** | 107 | Existing code + disposition (§4) |
| **MISSING** | 137 | New canonical code required (§5) |
| **Total** | **267** | |

### 3.2 FULL rows (23) — canonical destination

| Legacy Study | Canonical Code |
|--------------|----------------|
| Abdomen KUB | `XR_ABD_AP` |
| Chest X-Ray 1 View (CXR) | `XR_CHEST` |
| Chest X-Ray 2 View (CXR) | `XR_CHEST_2V` |
| CT C-Spine wo IV Contrast | `CT_CERVICAL_SPINE` |
| CT Chest wo IV Contrast | `CT_CHEST` |
| CT Head wo IV Contrast | `CT_HEAD_WO_CONTRAST` |
| CT Head w&wo IV Contrast | `CT_HEAD_WO_CONTRAST` |
| CT L-Spine wo IV Contrast | `CT_SPINE_LUMBAR` |
| CTA Chest w Reconstruction | `CTA_CHEST` |
| CTA Chest Triple Rule Out | `CTA_CHEST` |
| CTA Head and Neck | `CTA_HEAD_NECK` |
| MRI Head wo Contrast | `MRI_BRAIN` |
| US Abdomen Complete | `US_ABDOMEN` |
| US Gallbladder | `US_RUQ_GALLBLADDER` |
| US Lower Extremity Bilateral Venous Doppler | `US_VENOUS_DOPPLER_LE` |
| US Lower Extremity Left Venous Doppler | `US_VENOUS_DOPPLER_LE` |
| US Lower Extremity Right Venous Doppler | `US_VENOUS_DOPPLER_LE` |
| US Lower Extremity Unilateral Venous Doppler | `US_VENOUS_DOPPLER_LE` |
| US Pelvis | `US_PELVIS` |
| US Renal Complete | `US_RENAL` |
| US RUQ | `US_RUQ_GALLBLADDER` |
| US Scrotum/Contents | `US_SCROTUM_TESTICULAR` |
| US Soft Tissue | `US_SOFT` |
| FAST | `US_FAST` |

*23 FULL rows — authoritative list from `legacy-vs-medora-coverage.md`.*

### 3.3 Legacy → canonical rollup

| Destination type | Legacy rows |
|------------------|------------:|
| Map to existing 44 codes (FULL + PARTIAL best-match) | 130 |
| Require net-new canonical code (MISSING + EXPAND disposition) | 137 + 76 = 213 legacy rows |
| Collapse to shared new codes (clustered) | 213 → **62–97** new codes |

---

## 4. Part 3 — PARTIAL coverage analysis (107 rows)

### 4.1 Disposition summary

| Disposition | Count | Meaning |
|-------------|------:|---------|
| **EXPAND** | 76 | New canonical code required (laterality, view, contrast, or region split) |
| **TUPLE_VARIANT** | 19 | Existing code; fill classifier tuple + alias |
| **ALIAS** | 2 | Existing code; add `ImagingStudyAlias` only |
| **RETIRE** | 0 | *(Predecessors handled at catalog-row level, not legacy-row level)* |
| **MANUAL_REVIEW** | 10 | Clinical/billing decision before disposition |
| **Total** | **107** | |

### 4.2 Disposition rules applied

| Pattern | Disposition | Rationale |
|---------|-------------|-----------|
| XR MSK with Left/Right/Bilat or *V view | **EXPAND** | Enterprise legacy treats as distinct orderables; CPT may differ |
| XR chest decub / post intubation | **TUPLE_VARIANT** | Protocol classifier on `XR_CHEST` |
| XR abdomen 1V/2V/3V (non-KUB) | **MANUAL_REVIEW** | `XR_ABDOMEN` vs `XR_ABD_AP` duplicate |
| Ribs with CXR | **MANUAL_REVIEW** | Combo study — single vs multi code |
| CT contrast w / w&wo variants | **EXPAND** | CPT-driven separate rows (`imaging-normalization-rules.md` §7) |
| CT wo contrast matching existing WO code | **ALIAS** | Maps to existing WO row |
| CT Chest HR | **MANUAL_REVIEW** | HR protocol vs standard chest CT |
| MRI contrast / limited variants | **EXPAND** | Separate rows per contrast phase |
| MRI spine C/T/L region | **EXPAND** | Subregion split from generic `MRI_SPINE` |
| CTA triple rule-out / reconstruction (FULL legacy) | **TUPLE_VARIANT** | Protocol on `CTA_CHEST` |
| CTA runoff / COW / carotid recon | **MANUAL_REVIEW** | Protocol vs separate code |
| US OB limited / TV / portable / BPP | **TUPLE_VARIANT** | Protocol on `US_OB_FIRST` / `US_OB_GROWTH` |
| US Liver → RUQ | **ALIAS** | Synonym alias |
| US venous doppler side variants (PARTIAL label) | **ALIAS** | Maps to `US_VENOUS_DOPPLER_LE` (FULL siblings exist) |

### 4.3 MANUAL_REVIEW PARTIAL studies (10)

| Legacy Study | Best-match code | Issue |
|--------------|-----------------|-------|
| Abdomen 1V | `XR_ABDOMEN` | Duplicate vs `XR_ABD_AP` |
| Abdomen 2V | `XR_ABDOMEN` | Duplicate vs `XR_ABD_AP` |
| Abdomen 3V Acute Series | `XR_ABDOMEN` | Duplicate + acute protocol |
| Ribs Left with CXR | `XR_CHEST` | Combined study billing |
| Ribs Right with CXR | `XR_CHEST` | Combined study billing |
| CT Chest HR | `CT_CHEST` | HR protocol CPT |
| CTA Abdominal Aorta w Reconstructions | `CTA_ABDOMEN_PELVIS` | Runoff/recon vs standard CTA |
| CTA Abdominal Aorta w Runoff | `CTA_ABDOMEN_PELVIS` | Runoff CPT |
| CTA COW / Carotids w Reconstructions | `CTA_HEAD_NECK` | COW vs head/neck bundle |
| CTA Head Circle of Willis w Reconstructions | `CTA_HEAD_NECK` | COW specificity |

### 4.4 TUPLE_VARIANT examples (19 rows — no new code)

Representative legacy studies absorbed via classifier + alias:

- Chest 1V Decub → `XR_CHEST` + `PROTOCOL_XR_CHEST_DECUBITUS`
- Chest Post Intubation → `XR_CHEST` + `PROTOCOL_XR_CHEST_POST_INTUBATION`
- US OB <14 Weeks Transvaginal → `US_OB_FIRST` + `PROTOCOL_US_OB_FIRST_TRIMESTER_TV`
- US OB Biophysical Profile → `US_OB_GROWTH` + `PROTOCOL_US_OB_BPP`
- US Pelvis with Trans/Endo → `US_PELVIS` + `PROTOCOL_US_PELVIS_TRANSVAGINAL`
- CT Angiogram Abdomen → `CTA_ABDOMEN_PELVIS` (tuple refinement)
- CT Abdomen/Pelvis wo IV Contrast → `CT_ABDOMEN_PELVIS` + `CONTRAST_TYPE_WITHOUT` *(after EXPAND contrast rows)*

### 4.5 EXPAND examples by family (76 rows)

| Family | EXPAND count | Example legacy → proposed new code |
|--------|-------------:|--------------------------------------|
| X-Ray | 58 | `Knee Left 3V` → `XR_KNEE_LEFT_3V` |
| CT | 11 | `CT Head w IV Contrast` → `CT_HEAD_W_CONTRAST` |
| MRI | 11 | `MRI L-Spine wo Contrast` → `MRI_SPINE_LUMBAR_WO_CONTRAST` |
| CTA | 0 | *(MANUAL_REVIEW or TUPLE)* |
| Ultrasound | 0 | *(TUPLE or ALIAS)* |

---

## 5. Part 4 — MISSING studies (137 rows)

### 5.1 Summary

| Question | Answer |
|----------|--------|
| **New Canonical Code Required?** | **Yes — 137/137** (no reasonable existing row) |
| **Existing Canonical Code Possible?** | **No** — by definition of MISSING tier |
| **Manual CPT Review Required?** | **Yes — 137/137** (all `PENDING_CPT_REVIEW`) |
| **Localization Required?** | **Yes — 137/137** (`displayNameEn` + `displayNameFr` not authored) |

### 5.2 MISSING by family

| Family | Count | Representative new codes (proposed) |
|--------|------:|-------------------------------------|
| X-Ray | 53 | `XR_CSPINE_2V`, `XR_LSPINE_3V`, `XR_RIBS_LEFT`, `XR_ORBIT_LEFT_2V`, `XR_FINGER_LEFT_2V` |
| Ultrasound | 27 | `US_BREAST_BILATERAL`, `US_CAROTID_DUPLEX`, `US_THYROID`, `US_UE_ARTERIAL_DOPPLER_LEFT` |
| CT | 25 | `CT_TSPINE_WO_CONTRAST`, `CT_FACIAL_WO_CONTRAST`, `CT_KNEE_LEFT_WO_CONTRAST`, `CT_STN_WO_CONTRAST` |
| MRI | 14 | `MRI_KNEE_LEFT`, `MRI_PELVIS`, `MRI_SELLA`, `MRI_CHOLANGIOGRAM` |
| MRA | 5 | `MRA_BRAIN`, `MRA_CAROTID_WO_CONTRAST`, `MRA_LE_LEFT_W_CONTRAST` |
| Nuclear Medicine | 5 | `NM_HIDA`, `NM_VQ_PERFUSION`, `NM_VQ_VENTILATION`, `NM_GB_EMPTYING` |
| CTA | 4 | `CTA_LE_LEFT`, `CTA_LE_RIGHT`, `CTA_UE_LEFT`, `CTA_UE_RIGHT` |
| Fluoroscopy | 4 | `FL_ESOPHAGRAM`, `FL_TUBE_PLACEMENT`, `FL_LINE_PLACEMENT`, `FL_LUMBAR_PUNCTURE` |

### 5.3 MISSING clustering (dedupe estimate)

| Metric | Count |
|--------|------:|
| Legacy MISSING rows | 137 |
| Side-neutral dedupe clusters | 86 |
| Side-specific (Left/Right in name) | 63 |
| Bilateral in name | 8 |

**Net-new codes from MISSING (audit estimate):** **72–86** (one code per cluster; side encoded via `LATERALITY` where CPT allows)

### 5.4 Expansion count rollup

| Source | Net-new codes (estimate) |
|--------|-------------------------:|
| MISSING clusters | 72–86 |
| PARTIAL EXPAND (CT/MRI contrast + XR side/view) | 18–28 |
| **Total net-new** | **62–97** *(overlap removed)* |
| **Target active catalog** | **105–140** *(43 current − 5 retired + new)* |

---

## 6. Manual review counts (audit totals)

| Scope | Count |
|-------|------:|
| 44-row catalog (`MR=YES`) | 34 |
| PARTIAL legacy (`MANUAL_REVIEW` disposition) | 10 |
| MISSING legacy (CPT + localization) | 137 |
| **Unique governance queue (deduped)** | **~145** |

---

## 7. Cross-reference

| Artifact | Role |
|----------|------|
| `legacy-vs-medora-coverage.md` | Row-level FULL/PARTIAL/MISSING for all 267 |
| `imaging-taxonomy-classifier-catalog.md` | Proposed classifier inventories + exact counts |
| `imaging-taxonomy-expansion-readiness.md` | Phase gate readiness + SAFE/NOT SAFE |

---

*Phase 3D.2 — audit only. No CSV file materialized; mappings authoritative at documentation level.*
