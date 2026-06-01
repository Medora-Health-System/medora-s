# Imaging Taxonomy Workbook Design

**Phase:** 3D (audit + design only)  
**Status:** Authoritative workbook specification — **not populated or implemented**  
**Inputs:** Phase 3A–3C imaging taxonomy documents; `haiti-imaging-studies.ts` (44 rows)

---

## 1. Purpose

This document defines the **enterprise imaging taxonomy workbook** — the single governance artifact that drives:

| Consumer | Use |
|----------|-----|
| `CatalogImagingStudy` seed / expansion | Stable `code`, display names, `isActive` |
| `TermClassifier` assignment | Seven-dimension tuple per catalog row |
| Phase 2C/2D duplicate retirement | Predecessor → successor, alias transfer |
| Phase 2E enterprise catalog expansion | ~100–150 target rows from 267 legacy studies |
| Localization | Curated EN/FR display names |
| Billing governance | CPT readiness without auto-assignment |
| Search governance | Aliases, shortcuts, classifier search eligibility |

**Artifact name (future):** `docs/imaging/imaging-taxonomy-workbook.csv` (or `.xlsx` with locked schema tab)

**Population rule:** One workbook row per **legacy study** (267 rows) **plus** one row per **Medora-only catalog code** not driven by a legacy name (currently 0). Medora retirement predecessors remain in workbook until cutover complete.

---

## 2. Workbook schema (Part 1)

### 2.1 Required columns

| # | Column | Type | Required | Validation | Notes |
|---|--------|------|----------|------------|-------|
| 1 | **Legacy Study** | string | Yes* | Exact Phase 3A string or `MEDORA_NATIVE` | *Required for legacy-sourced rows; `MEDORA_NATIVE` for codes with no legacy orderable |
| 2 | **Canonical Code** | string | Yes | `^[A-Z0-9_]+$`, unique | Stable identity; never rename after orders |
| 3 | **Display Name EN** | string | Yes | English clinical text only | No French tokens |
| 4 | **Display Name FR** | string | Yes | French clinical text only | Product UI language |
| 5 | **MODALITY** | enum | Yes | `TermClassifier` code in `MODALITY` domain | e.g. `MODALITY_XR`, `MODALITY_CTA` *(proposed)* |
| 6 | **BODY_REGION** | enum | Yes | `BODY_REGION_*` code | Coarse anatomical anchor |
| 7 | **LATERALITY** | enum | Yes | `LATERALITY_*` or empty → `LATERALITY_UNSPECIFIED` | Left/Right/Bilateral/Unspecified |
| 8 | **ANATOMIC_SUBREGION** | enum | No | `ANATOMIC_SUBREGION_*` or empty | Spine level, digit, orbit, etc. |
| 9 | **CONTRAST_TYPE** | enum | No | `CONTRAST_TYPE_*` or empty | Required for CT/MRI/CTA when contrast is orderable |
| 10 | **VIEW_COUNT** | enum | No | `VIEW_COUNT_*` or empty | Required when legacy name encodes views |
| 11 | **PROTOCOL** | enum | No | `PROTOCOL_*` or empty | FAST, trauma CAP, OB phase, NM tracer, etc. |
| 12 | **Coverage Status** | enum | Yes | `FULL` \| `PARTIAL` \| `MISSING` \| `NATIVE` | Legacy→Medora fit (see §2.3) |
| 13 | **Billing Status** | enum | Yes | See §2.4 | No CPT values in workbook until licensed |
| 14 | **Retirement Candidate** | enum | Yes | `YES` \| `NO` \| `RETIRED` | Predecessor eligible for Phase 2C/2D |
| 15 | **Successor Code** | string | No | Valid `Canonical Code` or empty | Required when Retirement Candidate = `YES` |
| 16 | **Manual Review Required** | enum | Yes | `YES` \| `NO` | Blocks seed/backfill when `YES` without sign-off |

### 2.2 Recommended governance columns (optional but strongly advised)

| Column | Purpose |
|--------|---------|
| `Workbook Row ID` | Stable `WB-0001` for audit references |
| `Modality Family` | Legacy family (X-Ray, CT, CTA, MRI, …) for filtering |
| `Catalog Action` | `KEEP` \| `NEW` \| `RETIRE` \| `MERGE` |
| `isActive` | Target active flag post-cutover |
| `Legacy Aliases` | Pipe-separated legacy search synonyms → `ImagingStudyAlias` |
| `Classifier Aliases` | Pipe-separated tokens → `TermClassifierAlias` |
| `Example CPT` | **Reference only** — not wired to billing until licensed |
| `CPT Conflict Flag` | `NONE` \| `DUPLICATE` \| `CONTRAST_AMBIGUOUS` \| `MULTI_LINE` |
| `Normalization Notes` | Free text; links to Phase 3A/3B rules |
| `Sign-off By` / `Sign-off Date` | Clinical + billing approval |

### 2.3 Coverage Status definitions

| Value | Meaning |
|-------|---------|
| **FULL** | Legacy study maps to active Medora code with matching clinical intent |
| **PARTIAL** | Related Medora code exists; missing laterality, views, contrast, protocol, or subregion as separate legacy orderable |
| **MISSING** | No reasonable Medora catalog row — requires `Catalog Action = NEW` in Phase 2E |
| **NATIVE** | Medora catalog row with no legacy orderable equivalent (e.g. post-retirement successor-only naming) |

**Pre-audited source:** `legacy-vs-medora-coverage.md` (267 legacy rows).

### 2.4 Billing Status definitions

| Value | Meaning | Repository signal |
|-------|---------|-----------------|
| **KNOWN_CPT_EXAMPLE** | Example CPT in `IMAGING_CODE_TO_CPT` (not licensed) | 20/44 codes today |
| **UNKNOWN_CPT** | No example CPT mapping | 24/44 codes today |
| **PENDING_CPT_REVIEW** | Listed in `imaging-cpt-mapping-review.ts` | 44/44 codes today |
| **CPT_CONFLICT** | Shares example CPT with another active code or contrast mismatch | See gap analysis |
| **NOT_BILLABLE** | Clinical-only / pending site policy | e.g. FAST until site review |

**Rule:** Workbook records status only — **no billing seed changes** in Phase 3D.

### 2.5 Classifier tuple validation rules

1. **Normalization order:** MODALITY → BODY_REGION → ANATOMIC_SUBREGION → LATERALITY → VIEW_COUNT → CONTRAST_TYPE → PROTOCOL (`imaging-normalization-rules.md`).
2. **CTA rows:** `MODALITY` must be `MODALITY_CTA` *(proposed)* even if legacy seed string is `CT`.
3. **Generic MSK XR:** `LATERALITY = LATERALITY_UNSPECIFIED` unless legacy name encodes side → separate workbook row or explicit laterality.
4. **Contrast on CT/MRI:** empty contrast → `Manual Review Required = YES` unless explicitly WO/W/WWO in code or legacy name.
5. **Duplicate tuple policy:** Same tuple + different CPT intent → **separate Canonical Code** rows (Phase 3B hybrid strategy).
6. **Retirement rows:** Predecessor and successor rows must have **identical clinical tuple** or documented exception in `Normalization Notes`.

### 2.6 Workbook → repository mapping

| Workbook column | Repository target |
|-----------------|-------------------|
| Canonical Code | `CatalogImagingStudy.code` |
| Display Name EN / FR | `displayNameEn`, `displayNameFr` |
| MODALITY … PROTOCOL | `TermClassifier` FK columns (7 total after 3C-M1) |
| Legacy Aliases | `ImagingStudyAlias` + `searchText` enrichment |
| Retirement Candidate + Successor | `imaging-catalog-successor-map.ts` + retirement scripts |
| Billing Status | `imaging-cpt-mapping-review.ts` + future licensed import |
| isActive | `CatalogImagingStudy.isActive` |

---

## 3. Current 44-row catalog mapping (Part 2)

**Source:** `apps/api/prisma/data/haiti-imaging-studies.ts`  
**Active:** 43 | **Inactive:** 1 (`CT_HEAD`)  
**Classifier vocabulary:** Phase 2B.2 seeded domains only; `LATERALITY`, `ANATOMIC_SUBREGION`, `PROTOCOL` are **proposed** (Phase 3C).

**Legend:** ✓ = deterministic now | ⚠ = manual review | — = null/ not applicable | \* = proposed classifier not yet seeded

### 3.1 Summary statistics

| Metric | Count |
|--------|------:|
| Rows with full 4-FK tuple determinable today | 35 |
| Rows missing contrast (manual review list) | 9 |
| Rows with view count assigned | 1 |
| Rows with proposed laterality ≠ UNSPECIFIED | 0 |
| Rows with proposed protocol | 5 |
| Rows with proposed anatomic subregion | 3 |
| Retirement candidates (successor map) | 5 |
| Additional duplicate pair (not in map) | 1 (`XR_ABDOMEN` ↔ `XR_ABD_AP`) |
| Duplicate FR display names | 3 pairs |
| Example CPT known | 20 |
| Pending CPT review | 44 |

### 3.2 Full row mapping

| Code | Active | Legacy Study (representative) | MODALITY | BODY_REGION | LATERALITY* | ANATOMIC_SUBREGION* | CONTRAST | VIEW | PROTOCOL* | Manual Review | Retirement | Successor |
|------|:------:|------------------------------|----------|-------------|-------------|---------------------|----------|------|-----------|:-------------:|:----------:|-----------|
| `XR_CHEST` | ✓ | Chest X-Ray 1 View (CXR) | MODALITY_XR ✓ | BODY_REGION_CHEST ✓ | LATERALITY_UNSPECIFIED | — | — | VIEW_COUNT_ONE* | — | NO | NO | — |
| `XR_CHEST_2V` | ✓ | Chest X-Ray 2 View (CXR) | MODALITY_XR ✓ | BODY_REGION_CHEST ✓ | LATERALITY_UNSPECIFIED | — | — | VIEW_COUNT_TWO ✓ | — | NO | NO | — |
| `XR_KNEE` | ✓ | Knee Left 2V (partial) | MODALITY_XR ✓ | BODY_REGION_KNEE ✓ | LATERALITY_UNSPECIFIED | — | — | VIEW_COUNT_ONE* | — | YES | NO | — |
| `XR_FOOT` | ✓ | Foot Left 2V (partial) | MODALITY_XR ✓ | BODY_REGION_FOOT ✓ | LATERALITY_UNSPECIFIED | — | — | VIEW_COUNT_ONE* | — | YES | NO | — |
| `XR_WRIST` | ✓ | *(generic MSK)* | MODALITY_XR ✓ | BODY_REGION_WRIST ✓ | LATERALITY_UNSPECIFIED | — | — | VIEW_COUNT_ONE* | — | YES | NO | — |
| `XR_ANKLE` | ✓ | Ankle Left 2V (partial) | MODALITY_XR ✓ | BODY_REGION_ANKLE ✓ | LATERALITY_UNSPECIFIED | — | — | VIEW_COUNT_ONE* | — | YES | NO | — |
| `XR_SHOULDER` | ✓ | *(generic MSK)* | MODALITY_XR ✓ | BODY_REGION_SHOULDER ✓ | LATERALITY_UNSPECIFIED | — | — | VIEW_COUNT_ONE* | — | YES | NO | — |
| `XR_PELVIS` | ✓ | Pelvis AP (partial) | MODALITY_XR ✓ | BODY_REGION_PELVIS ✓ | LATERALITY_UNSPECIFIED | — | — | VIEW_COUNT_ONE* | — | YES | NO | — |
| `XR_ABD_AP` | ✓ | Abdomen KUB | MODALITY_XR ✓ | BODY_REGION_ABDOMEN ✓ | LATERALITY_UNSPECIFIED | — | — | VIEW_COUNT_ONE ✓ | — | NO | NO | — |
| `XR_ABDOMEN` | ✓ | Abdomen 1V (partial) | MODALITY_XR ✓ | BODY_REGION_ABDOMEN ✓ | LATERALITY_UNSPECIFIED | — | — | VIEW_COUNT_ONE* | — | YES | ⚠ INDIVIDUAL | — |
| `XR_HUMERUS` | ✓ | Humerus Left 2V (partial) | MODALITY_XR ✓ | BODY_REGION_ARM ✓ | LATERALITY_UNSPECIFIED | — | — | VIEW_COUNT_ONE* | — | YES | NO | — |
| `XR_ELBOW` | ✓ | Elbow Left 2V (partial) | MODALITY_XR ✓ | BODY_REGION_ELBOW ✓ | LATERALITY_UNSPECIFIED | — | — | VIEW_COUNT_ONE* | — | YES | NO | — |
| `XR_FOREARM` | ✓ | Forearm Left 2V (partial) | MODALITY_XR ✓ | BODY_REGION_FOREARM ✓ | LATERALITY_UNSPECIFIED | — | — | VIEW_COUNT_ONE* | — | YES | NO | — |
| `XR_HAND` | ✓ | Hand Left 2V (partial) | MODALITY_XR ✓ | BODY_REGION_HAND ✓ | LATERALITY_UNSPECIFIED | — | — | VIEW_COUNT_ONE* | — | YES | NO | — |
| `XR_HIP` | ✓ | Hip Left 2V (partial) | MODALITY_XR ✓ | BODY_REGION_HIP ✓ | LATERALITY_UNSPECIFIED | — | — | VIEW_COUNT_ONE* | — | YES | NO | — |
| `XR_FEMUR` | ✓ | Femur Left 2V (partial) | MODALITY_XR ✓ | BODY_REGION_THIGH ✓ | LATERALITY_UNSPECIFIED | — | — | VIEW_COUNT_ONE* | — | YES | NO | — |
| `XR_TIB_FIB` | ✓ | Tibia/Fibula (partial) | MODALITY_XR ✓ | BODY_REGION_LEG ✓ | LATERALITY_UNSPECIFIED | — | — | VIEW_COUNT_ONE* | — | YES | NO | — |
| `US_ABD` | ✓ | *(legacy abdomen US)* | MODALITY_US ✓ | BODY_REGION_ABDOMEN ✓ | LATERALITY_UNSPECIFIED | — | — | — | — | YES | YES | `US_ABDOMEN` |
| `US_ABDOMEN` | ✓ | *(successor)* | MODALITY_US ✓ | BODY_REGION_ABDOMEN ✓ | LATERALITY_UNSPECIFIED | — | — | — | — | YES | NO | — |
| `US_OB` | ✓ | US OB (generic) | MODALITY_US ✓ | BODY_REGION_OBSTETRICAL ✓ | LATERALITY_UNSPECIFIED | — | — | — | — | YES | NO | — |
| `US_OB_FIRST` | ✓ | US OB <14 Weeks | MODALITY_US ✓ | BODY_REGION_OBSTETRICAL ✓ | LATERALITY_UNSPECIFIED | — | — | — | PROTOCOL_US_OB_FIRST_TRIMESTER* | YES | NO | — |
| `US_OB_GROWTH` | ✓ | US OB >14 Weeks / growth | MODALITY_US ✓ | BODY_REGION_OBSTETRICAL ✓ | LATERALITY_UNSPECIFIED | — | — | — | PROTOCOL_US_OB_LATE_TRIMESTER* | YES | NO | — |
| `US_RENAL` | ✓ | US Renal | MODALITY_US ✓ | BODY_REGION_KIDNEY ✓ | LATERALITY_UNSPECIFIED | — | — | — | — | YES | NO | — |
| `US_SOFT` | ✓ | US Soft Tissue | MODALITY_US ✓ | BODY_REGION_SOFT_TISSUE ✓ | LATERALITY_UNSPECIFIED | — | — | — | — | YES | NO | — |
| `US_FAST` | ✓ | FAST | MODALITY_US ✓ | BODY_REGION_ABDOMEN ✓ | LATERALITY_UNSPECIFIED | — | — | — | PROTOCOL_US_FAST* | YES | NO | — |
| `US_RUQ_GALLBLADDER` | ✓ | US RUQ / gallbladder | MODALITY_US ✓ | BODY_REGION_ABDOMEN_RUQ ✓ | LATERALITY_UNSPECIFIED | — | — | — | — | YES | NO | — |
| `US_PELVIS` | ✓ | US Pelvis | MODALITY_US ✓ | BODY_REGION_PELVIS ✓ | LATERALITY_UNSPECIFIED | — | — | — | — | YES | NO | — |
| `US_SCROTUM_TESTICULAR` | ✓ | US Scrotum | MODALITY_US ✓ | BODY_REGION_SCROTUM ✓ | LATERALITY_UNSPECIFIED | — | — | — | — | YES | NO | — |
| `DOPPLER_VEIN` | ✓ | US LE Venous Doppler (legacy) | MODALITY_US ✓ | BODY_REGION_LOWER_EXTREMITY ✓ | LATERALITY_UNSPECIFIED | — | — | — | PROTOCOL_US_DOPPLER_VENOUS* | YES | YES | `US_VENOUS_DOPPLER_LE` |
| `US_VENOUS_DOPPLER_LE` | ✓ | US LE Venous Doppler | MODALITY_US ✓ | BODY_REGION_LOWER_EXTREMITY ✓ | LATERALITY_UNSPECIFIED | — | — | — | PROTOCOL_US_DOPPLER_VENOUS* | YES | NO | — |
| `CT_HEAD` | ✗ | CT Head (legacy) | MODALITY_CT ✓ | BODY_REGION_HEAD ✓ | LATERALITY_UNSPECIFIED | — | ⚠ | — | — | YES | RETIRED | `CT_HEAD_WO_CONTRAST` |
| `CT_HEAD_WO_CONTRAST` | ✓ | CT Head wo IV Contrast | MODALITY_CT ✓ | BODY_REGION_HEAD ✓ | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_WITHOUT ✓ | — | — | YES | NO | — |
| `CT_ABD` | ✓ | CT Abdomen/Pelvis (legacy) | MODALITY_CT ✓ | BODY_REGION_ABDOMEN ✓ | LATERALITY_UNSPECIFIED | — | ⚠ | — | — | YES | YES | `CT_ABDOMEN_PELVIS` |
| `CT_ABDOMEN_PELVIS` | ✓ | CT Abdomen/Pelvis | MODALITY_CT ✓ | BODY_REGION_ABDOMEN_PELVIS ✓ | LATERALITY_UNSPECIFIED | — | ⚠ | — | — | YES | NO | — |
| `CT_CHEST` | ✓ | CT Chest | MODALITY_CT ✓ | BODY_REGION_CHEST ✓ | LATERALITY_UNSPECIFIED | — | ⚠ | — | — | YES | NO | — |
| `CT_CHEST_CTA` | ✓ | CTA Chest (legacy code) | MODALITY_CTA* | BODY_REGION_CHEST ✓ | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_ANGIOGRAPHIC ✓ | — | PROTOCOL_CTA_CHEST_STANDARD* | YES | YES | `CTA_CHEST` |
| `CTA_CHEST` | ✓ | CTA Chest | MODALITY_CTA* | BODY_REGION_CHEST ✓ | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_ANGIOGRAPHIC ✓ | — | PROTOCOL_CTA_CHEST_STANDARD* | YES | NO | — |
| `CTA_HEAD_NECK` | ✓ | CTA Head/Neck | MODALITY_CTA* | BODY_REGION_HEAD_NECK ✓ | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_ANGIOGRAPHIC ✓ | — | — | YES | NO | — |
| `CTA_ABDOMEN_PELVIS` | ✓ | CTA Abdomen/Pelvis | MODALITY_CTA* | BODY_REGION_ABDOMEN_PELVIS ✓ | LATERALITY_UNSPECIFIED | — | CONTRAST_TYPE_ANGIOGRAPHIC ✓ | — | — | YES | NO | — |
| `CT_CERVICAL_SPINE` | ✓ | CT C-Spine | MODALITY_CT ✓ | BODY_REGION_SPINE_CERVICAL ✓ | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_CERVICAL* | ⚠ | — | — | YES | NO | — |
| `CT_SPINE_LUMBAR` | ✓ | CT L-Spine | MODALITY_CT ✓ | BODY_REGION_SPINE ✓ | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_LUMBAR* | ⚠ | — | — | YES | NO | — |
| `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` | ✓ | CT CAP Trauma | MODALITY_CT ✓ | BODY_REGION_CHEST_ABDOMEN_PELVIS ✓ | LATERALITY_UNSPECIFIED | — | ⚠ | — | PROTOCOL_CT_CAP_TRAUMA* | YES | NO | — |
| `MRI_BRAIN` | ✓ | MRI Head | MODALITY_MRI ✓ | BODY_REGION_HEAD ✓ | LATERALITY_UNSPECIFIED | — | ⚠ | — | — | YES | NO | — |
| `MRI_SPINE` | ✓ | MRI Spine | MODALITY_MRI ✓ | BODY_REGION_SPINE ✓ | LATERALITY_UNSPECIFIED | — | ⚠ | — | — | YES | NO | — |

### 3.3 Missing classifier values (44-row gap list)

| Gap | Affected rows | Resolution |
|-----|---------------|------------|
| **LATERALITY domain not seeded** | All 44 | Phase 3C-S2 seed |
| **ANATOMIC_SUBREGION domain not seeded** | 3 spine CT rows + future expansion | Phase 3C-S2 seed |
| **PROTOCOL domain not seeded** | FAST, OB×2, Doppler×2, CTA chest, CAP trauma | Phase 3C-S2 seed |
| **MODALITY_CTA not seeded** | 4 CTA rows (+ legacy `CT_CHEST_CTA`) | Phase 3C-S1 seed |
| **VIEW_COUNT_ONE / UNSPECIFIED not seeded** | 16 generic XR rows | Phase 3C-S1 seed |
| **CONTRAST_TYPE_WITH / WWO / NONE not seeded** | CT/MRI ambiguous rows | Phase 3C-S1 seed + clinical review |
| **Contrast FK empty (manual review)** | 9 CT/MRI codes | Workbook sign-off before backfill |
| **Laterality unspecified on side-specific legacy** | All generic MSK XR (16 rows) | Phase 2E expansion or accept PARTIAL coverage |

### 3.4 Manual review requirements (44 rows)

| Category | Codes | Reason |
|----------|-------|--------|
| **Contrast semantics** | `CT_HEAD`, `CT_ABD`, `CT_CHEST`, `CT_SPINE_LUMBAR`, `CT_CERVICAL_SPINE`, `CT_ABDOMEN_PELVIS`, `CT_CHEST_ABDOMEN_PELVIS_TRAUMA`, `MRI_BRAIN`, `MRI_SPINE` | In `CONTRAST_MANUAL_REVIEW_IMAGING_CODES` |
| **Retirement alignment** | `CT_HEAD`, `CT_ABD`, `US_ABD`, `DOPPLER_VEIN`, `CT_CHEST_CTA` | Successor tuple + billing + search must align |
| **Duplicate abdomen XR** | `XR_ABDOMEN`, `XR_ABD_AP` | Overlapping aliases (`kub`, `asp`); not in successor map |
| **Billing protocol** | `US_FAST`, `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` | Site policy / multi-CPT |
| **Generic MSK laterality** | 16 XR MSK codes | Enterprise parity vs row explosion |
| **All rows CPT** | All 44 | `pending_license` in review queue |

---

## 4. Localization governance (Part 4)

### 4.1 Rules

| Field | Language | Enforcement |
|-------|----------|-------------|
| `Display Name EN` | English only | No French diacritics or French anatomical terms as primary |
| `Display Name FR` | French only | Product UI; no English parentheticals except accepted acronyms (CT, IRM, FAST) |
| Classifier labels | Bilingual in `TermClassifierLabel` | Workbook stores **codes** only; labels maintained in MRV seed |
| Legacy Study | English (Phase 3A capture) | Reference column; not shown in product UI |
| `name` (legacy seed field) | French internal | Deprecated for UI; workbook drives `displayNameFr` |

### 4.2 Current catalog audit (44 rows)

| Check | Result |
|-------|--------|
| Missing `displayNameEn` | **0** |
| Missing `displayNameFr` | **0** |
| English in FR column | **0 violations** |
| French in EN column | **0 violations** |
| Mixed-language single field | **0 violations** |
| Duplicate FR display (active pairs) | **3** — see §4.3 |
| Duplicate EN display (active pairs) | **2** — see §4.3 |
| Acceptable acronym in FR | FAST, TDM, IRM, CTA — **allowed** |

### 4.3 Duplicate translation pairs (governance action required)

| FR text | Codes | Workbook action |
|---------|-------|-----------------|
| Échographie abdominale | `US_ABD`, `US_ABDOMEN` | Retire `US_ABD`; differentiate or accept duplicate on successor only |
| Scanner abdomen/pelvis | `CT_ABD`, `CT_ABDOMEN_PELVIS` | Retire `CT_ABD`; successor retains label |
| Doppler veineux membres inférieurs | `DOPPLER_VEIN`, `US_VENOUS_DOPPLER_LE` | Retire `DOPPLER_VEIN` |
| Angioscanner thoracique (near) | `CT_CHEST_CTA`, `CTA_CHEST` | Retire `CT_CHEST_CTA`; unify on `CTA_CHEST` |
| Abdominal X-ray (EN) | `XR_ABDOMEN`, `XR_ABD_AP` | Differentiate: KUB vs generic abdomen in workbook EN/FR |

### 4.4 Workbook localization columns (future)

Add derived validation columns (not user-facing):

- `EN Language Check` — pass/fail
- `FR Language Check` — pass/fail
- `Duplicate FR Key` — hash of normalized FR text
- `Duplicate EN Key` — hash of normalized EN text

---

## 5. Billing governance (Part 5)

### 5.1 Current state

| Bucket | Count | Notes |
|--------|------:|-------|
| Example CPT in `IMAGING_CODE_TO_CPT` | 20 | Reference only — not licensed |
| No example CPT | 24 | All CTA, most expansion-era rows, MRI, etc. |
| `pending_license` review queue | 44 | 100% of catalog |
| Billing uses classifiers | 0 | Guarded by tests |

### 5.2 Workbook billing column mapping

| Workbook `Billing Status` | When to use |
|---------------------------|-------------|
| `KNOWN_CPT_EXAMPLE` | Code appears in `IMAGING_CODE_TO_CPT` |
| `UNKNOWN_CPT` | Active code, no example mapping |
| `PENDING_CPT_REVIEW` | Default for all rows until licensed import |
| `CPT_CONFLICT` | See §5.3 |
| `NOT_BILLABLE` | Site decision (e.g. FAST screening) |

### 5.3 Potential CPT conflicts (no billing changes)

| Conflict | Codes | Issue |
|----------|-------|-------|
| Shared example CPT | `CT_HEAD` / `CT_HEAD_WO_CONTRAST` → 70450 | Retirement resolves to single active code |
| Shared example CPT | `US_ABD` / `US_ABDOMEN` → 76700 | Retirement resolves |
| Shared example CPT | `DOPPLER_VEIN` / `US_VENOUS_DOPPLER_LE` → 93971 | Retirement resolves |
| Contrast mismatch | `CT_ABD` example 74177 (w contrast) vs name "abdomen/pelvis" ambiguous | Successor `CT_ABDOMEN_PELVIS` has no example CPT |
| No licensed CTA CPT | `CTA_CHEST`, `CTA_HEAD_NECK`, `CTA_ABDOMEN_PELVIS`, `CT_CHEST_CTA` | All pending; blocks CTA retirement billing parity |
| Multi-line trauma | `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` | Pan-scan may need multiple CPT lines |
| View-sensitive XR | `XR_KNEE` example 73560 "1–2 views" vs generic code | Laterality/view expansion may change CPT |

---

## 6. Duplicate governance (Part 6)

### 6.1 Retirement candidates (from `imaging-catalog-successor-map.ts`)

| Predecessor | Successor | Tier | Manual Review | Alias candidates |
|-------------|-----------|------|:-------------:|------------------|
| `US_ABD` | `US_ABDOMEN` | A (batch-safe) | NO | `echo abdomen`, legacy US abdomen strings |
| `DOPPLER_VEIN` | `US_VENOUS_DOPPLER_LE` | Individual | NO | `doppler` — **global alias collision risk** |
| `CT_HEAD` | `CT_HEAD_WO_CONTRAST` | Individual | YES | `ct head`, trauma order set, search shortcut |
| `CT_ABD` | `CT_ABDOMEN_PELVIS` | Individual | YES | `ct abdomen`, order-set fallback |
| `CT_CHEST_CTA` | `CTA_CHEST` | Individual | NO | `cta thorax`, `pe protocol` — overlap with successor |

### 6.2 Additional duplicate pairs (workbook must govern)

| Pair | Relationship | Canonical candidate | Workbook action |
|------|--------------|-------------------|-----------------|
| `XR_ABDOMEN` ↔ `XR_ABD_AP` | Overlapping abdomen XR; shared aliases | **Both remain** until clinical decision | `Manual Review Required = YES`; not in successor map |
| `US_OB` ↔ `US_OB_FIRST` / `US_OB_GROWTH` | Generic vs trimester-specific | **All three** — protocol dimension distinguishes | PROTOCOL classifiers; no retirement |
| `CT_CHEST` ↔ `CT_CHEST_CTA` / `CTA_CHEST` | Non-angio vs angio chest | **Separate codes** | MODALITY + PROTOCOL + CONTRAST |

### 6.3 Alias governance model

| Alias type | Owner column in workbook | Transfer on retirement |
|------------|-------------------------|------------------------|
| Legacy display synonyms | `Legacy Aliases` → `ImagingStudyAlias` | Phase 2C alias transfer scripts |
| Search shortcuts | `Classifier Aliases` + code map | Successor-only post-cutover |
| Classifier vocabulary | MRV seed (not per-row) | N/A |

**Canonical candidate rule:** The **successor code** (or sole active code in a pair) is canonical; predecessors marked `Retirement Candidate = YES`.

---

## 7. Workbook maintenance workflow

```
Legacy inventory (267)
        ↓
Normalize per imaging-normalization-rules.md
        ↓
Assign Coverage Status (FULL/PARTIAL/MISSING)
        ↓
Map to Canonical Code (existing or NEW_*)
        ↓
Fill classifier tuple (7 dimensions)
        ↓
Set Billing Status + Manual Review flags
        ↓
Clinical sign-off → Radiology sign-off → Billing sign-off
        ↓
Export to seed maps + backfill maps + retirement maps
```

**Versioning:** Workbook carries `Workbook Version` header (e.g. `3D.1`); changes append-only with change log tab.

---

*Phase 3D — design only. Workbook not populated.*
