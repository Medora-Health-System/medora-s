# Ultrasound Expansion Governance (Phase 2E.2D)

**Phase:** 2E.2D — audit + design only  
**Date:** 2026-06-01  
**Prerequisites:** 2E.1–2E.2C complete; Gate W1 closed; 3C-B1 classifier backfill complete  

**Authority:** `enterprise-imaging-expansion-inventory.md`, `legacy-vs-medora-coverage.md`, `imaging-classifier-manifest.md` (ICM-1.0), retirement mapping in `imaging-classifier-backfill-mapping-44.md`  

---

## 1. Executive summary

| Metric | Count |
|--------|------:|
| **Ultrasound legacy studies** | **53** |
| **New catalog rows (design)** | **17** |
| **No new row** (EXISTS + ALIAS + PARTIAL tuple) | **36** |
| **MANUAL_REVIEW** (deferred / pilot) | **8** |

**Existing active US catalog (Haiti 44 slice):** `US_ABDOMEN`, `US_RUQ_GALLBLADDER`, `US_RENAL`, `US_PELVIS`, `US_SCROTUM_TESTICULAR`, `US_OB_FIRST`, `US_OB_GROWTH`, `US_SOFT`, `US_FAST`, `US_VENOUS_DOPPLER_LE` (+ predecessors `US_ABD`, `US_OB`, `DOPPLER_VEIN` still in seed — **do not** duplicate on expansion).

---

## 2. Part 1 — Ultrasound inventory (53 legacy studies)

### 2.1 Counts by 2E.2D disposition

| Category | Count | New row? |
|----------|------:|:--------:|
| **EXISTS_IN_MEDORA** | 11 | No |
| **PARTIAL_MATCH** | 15 | No *(protocol / tuple on existing)* |
| **ALIAS** | 2 | No |
| **MISSING** | 17 | **Yes** |
| **SUCCESSOR** | 0 | — |
| **MANUAL_REVIEW** | 8 | No *(Gate W2 / pilot defer)* |
| **Total** | **53** | **17** |

| Phase 3A tier | Count |
|---------------|------:|
| FULL | 11 |
| PARTIAL | 14 |
| MISSING | 28 |

*2E.2D reclassifies `US Trans/Endo` from Phase 3A MISSING → **PARTIAL_MATCH** (pelvis transvaginal protocol on `US_PELVIS`).*

### 2.2 Full legacy register

| # | Legacy study | Phase 3A | 2E.2D disposition | Medora / proposed |
|---|--------------|----------|-------------------|-------------------|
| 1 | US Abdomen Complete | FULL | **EXISTS_IN_MEDORA** | `US_ABDOMEN` |
| 2 | US Abdomen Limited | PARTIAL | **PARTIAL_MATCH** | `US_ABDOMEN` + `PROTOCOL_US_ABDOMEN_LIMITED` |
| 3 | US Aorta | MISSING | **MISSING** | `US_AORTA` |
| 4 | US Axilla | MISSING | **MANUAL_REVIEW** | Pilot defer |
| 5 | US Bladder | MISSING | **MISSING** | `US_BLADDER` |
| 6 | US Breast Bilateral | MISSING | **MISSING** | `US_BREAST_BILATERAL` |
| 7 | US Breast Left | MISSING | **MISSING** | `US_BREAST_LEFT` |
| 8 | US Breast Right | MISSING | **MISSING** | `US_BREAST_RIGHT` |
| 9 | US Buttocks | MISSING | **MANUAL_REVIEW** | Pilot defer |
| 10 | US Carotid Duplex | MISSING | **MISSING** | `US_CAROTID_DUPLEX` |
| 11 | US Chest | MISSING | **MISSING** | `US_CHEST` |
| 12 | US Duplex Limited Abdomen/Pelvis/Scrotal | PARTIAL | **PARTIAL_MATCH** | `US_PELVIS` / `US_SCROTUM_TESTICULAR` + limited duplex tuple |
| 13 | US Gallbladder | FULL | **EXISTS_IN_MEDORA** | `US_RUQ_GALLBLADDER` |
| 14 | US Groin | MISSING | **MANUAL_REVIEW** | Pilot defer |
| 15 | US Groin Left PSA | MISSING | **MANUAL_REVIEW** | Pilot defer |
| 16 | US Groin Right PSA | MISSING | **MANUAL_REVIEW** | Pilot defer |
| 17 | US Groin Bilateral PSA | MISSING | **MANUAL_REVIEW** | Pilot defer |
| 18 | US Liver | PARTIAL | **ALIAS** | `US_RUQ_GALLBLADDER` |
| 19 | US Lower Back | MISSING | **MANUAL_REVIEW** | Pilot defer |
| 20 | US LE Bilateral Arterial Doppler | MISSING | **MISSING** | `US_ARTERIAL_DOPPLER_LE_BILATERAL` |
| 21 | US LE Bilateral Venous Doppler | FULL | **EXISTS_IN_MEDORA** | `US_VENOUS_DOPPLER_LE` |
| 22 | US LE Left Arterial Doppler | MISSING | **MISSING** | `US_ARTERIAL_DOPPLER_LE_LEFT` |
| 23 | US LE Left Venous Doppler | FULL | **EXISTS_IN_MEDORA** | `US_VENOUS_DOPPLER_LE` |
| 24 | US LE Right Arterial Doppler | MISSING | **MISSING** | `US_ARTERIAL_DOPPLER_LE_RIGHT` |
| 25 | US LE Right Venous Doppler | FULL | **EXISTS_IN_MEDORA** | `US_VENOUS_DOPPLER_LE` |
| 26 | US LE Unilateral Venous Doppler | FULL | **EXISTS_IN_MEDORA** | `US_VENOUS_DOPPLER_LE` |
| 27 | US Neck / Head Soft Tissue | PARTIAL | **PARTIAL_MATCH** | `US_SOFT` + `PROTOCOL_US_NECK_THYROID` *(or `US_THYROID` when ordered as thyroid)* |
| 28 | US OB <14 Weeks Limited | PARTIAL | **PARTIAL_MATCH** | `US_OB_FIRST` + `PROTOCOL_US_OB_FIRST_TRIMESTER_LIMITED` |
| 29 | US OB <14 Weeks Single Gestation | PARTIAL | **PARTIAL_MATCH** | `US_OB_FIRST` + `PROTOCOL_US_OB_FIRST_TRIMESTER` |
| 30 | US OB <14 Weeks Transvaginal | PARTIAL | **PARTIAL_MATCH** | `US_OB_FIRST` + `PROTOCOL_US_OB_FIRST_TRIMESTER_TV` |
| 31 | US OB >14 Weeks Limited | PARTIAL | **PARTIAL_MATCH** | `US_OB_GROWTH` + `PROTOCOL_US_OB_LATE_TRIMESTER_LIMITED` |
| 32 | US OB >14 Weeks Limited Portable | PARTIAL | **PARTIAL_MATCH** | `US_OB_GROWTH` + `PROTOCOL_US_OB_LATE_TRIMESTER_PORTABLE` |
| 33 | US OB >14 Weeks Single Gestation | PARTIAL | **PARTIAL_MATCH** | `US_OB_GROWTH` + `PROTOCOL_US_OB_LATE_TRIMESTER` |
| 34 | US OB >14 Weeks Transvaginal | PARTIAL | **PARTIAL_MATCH** | `US_OB_GROWTH` + `PROTOCOL_US_OB_LATE_TRIMESTER` *(TV phase)* |
| 35 | US OB Biophysical Profile without NST | PARTIAL | **PARTIAL_MATCH** | `US_OB_GROWTH` + `PROTOCOL_US_OB_BPP` |
| 36 | US Pelvic Doppler | PARTIAL | **PARTIAL_MATCH** | `US_PELVIS` + `PROTOCOL_US_PELVIS_DOPPLER` |
| 37 | US Pelvis | FULL | **EXISTS_IN_MEDORA** | `US_PELVIS` |
| 38 | US Pelvis Limited | PARTIAL | **PARTIAL_MATCH** | `US_PELVIS` *(limited exam alias)* |
| 39 | US Pelvis with Trans/Endo | PARTIAL | **PARTIAL_MATCH** | `US_PELVIS` + `PROTOCOL_US_PELVIS_TRANSVAGINAL` |
| 40 | US Renal Complete | FULL | **EXISTS_IN_MEDORA** | `US_RENAL` |
| 41 | US RUQ | FULL | **EXISTS_IN_MEDORA** | `US_RUQ_GALLBLADDER` |
| 42 | US Scrotum/Contents | FULL | **EXISTS_IN_MEDORA** | `US_SCROTUM_TESTICULAR` |
| 43 | US Soft Tissue | FULL | **EXISTS_IN_MEDORA** | `US_SOFT` |
| 44 | US Thyroid / Neck | MISSING | **MISSING** | `US_THYROID` |
| 45 | US Trans/Endo | MISSING | **PARTIAL_MATCH** | `US_PELVIS` + `PROTOCOL_US_PELVIS_TRANSVAGINAL` |
| 46 | US Upper Back | MISSING | **MANUAL_REVIEW** | Pilot defer |
| 47 | US UE Bilateral Arterial Doppler | MISSING | **MISSING** | `US_ARTERIAL_DOPPLER_UE_BILATERAL` |
| 48 | US UE Bilateral Venous Doppler | MISSING | **MISSING** | `US_VENOUS_DOPPLER_UE_BILATERAL` |
| 49 | US UE Left Arterial Doppler | MISSING | **MISSING** | `US_ARTERIAL_DOPPLER_UE_LEFT` |
| 50 | US UE Left Venous Doppler | MISSING | **MISSING** | `US_VENOUS_DOPPLER_UE_LEFT` |
| 51 | US UE Right Arterial Doppler | MISSING | **MISSING** | `US_ARTERIAL_DOPPLER_UE_RIGHT` |
| 52 | US UE Right Venous Doppler | MISSING | **MISSING** | `US_VENOUS_DOPPLER_UE_RIGHT` |
| 53 | US UE Unilateral Venous Doppler | MISSING | **ALIAS** | `US_VENOUS_DOPPLER_UE_LEFT` / `US_VENOUS_DOPPLER_UE_RIGHT` *(side at order)* |

---

## 3. Part 3 — Doppler governance

### 3.1 Category strategy

| Doppler category | Legacy rows | Disposition | Catalog target |
|------------------|------------:|-------------|----------------|
| **Venous — lower extremity** | 4 FULL + 1 EXISTS pattern | **KEEP DISTINCT** *(existing)* | `US_VENOUS_DOPPLER_LE` — **no** new LE venous rows |
| **Venous — upper extremity** | 4 MISSING + 1 ALIAS | **KEEP DISTINCT** *(new)* | `US_VENOUS_DOPPLER_UE_*` (3 codes + unilateral alias) |
| **Arterial — lower extremity** | 3 MISSING | **KEEP DISTINCT** *(new)* | `US_ARTERIAL_DOPPLER_LE_*` |
| **Arterial — upper extremity** | 3 MISSING | **KEEP DISTINCT** *(new)* | `US_ARTERIAL_DOPPLER_UE_*` |
| **Carotid duplex** | 1 MISSING | **KEEP DISTINCT** *(new)* | `US_CAROTID_DUPLEX` |
| **Renal Doppler** | 0 legacy | **N/A** | No legacy study; **do not** invent without clinical sign-off |
| **Pelvic Doppler** | 1 PARTIAL | **ALIAS / TUPLE** | `US_PELVIS` + `PROTOCOL_US_PELVIS_DOPPLER` — **not** a competing Doppler catalog row |

### 3.2 Retirement / successor consistency

| Predecessor (catalog) | Successor | Expansion rule | Status |
|----------------------|-----------|----------------|--------|
| `DOPPLER_VEIN` | `US_VENOUS_DOPPLER_LE` | **Forbidden:** new `DOPPLER_VEIN` or duplicate LE venous code | **PASS** |
| `US_ABD` | `US_ABDOMEN` | **Forbidden:** new `US_ABD` abdomen row | **PASS** |
| `US_OB` | `US_OB_FIRST` / `US_OB_GROWTH` | Use OB protocol tuples; **no** generic `US_OB` expansion | **PASS** |

**No SUCCESSOR** rows among the 53 legacy studies (successors apply to **catalog predecessors**, not legacy names).

### 3.3 Carotid vs CTA

`US_CAROTID_DUPLEX` uses `MODALITY_US` + `PROTOCOL_US_DOPPLER_ARTERIAL` (primary) — distinct from `CTA_HEAD_NECK` (`MODALITY_CTA`).

---

## 4. Part 4 — Duplicate safety

| Check | Result |
|-------|--------|
| No duplicate US codes (17 proposed) | **PASS** — unique codes |
| No duplicate Doppler rows vs `US_VENOUS_DOPPLER_LE` | **PASS** — LE venous not re-added |
| No new `DOPPLER_VEIN` | **PASS** |
| No new `US_ABD` | **PASS** |
| No successor violations | **PASS** |
| No retirement conflicts | **PASS** — expansion does not reactivate predecessors as canonical |

### Duplicate-risk matrix

| ID | Risk | Mitigation |
|----|------|------------|
| U1 | LE venous lateral splits vs `US_VENOUS_DOPPLER_LE` | Laterality via alias/search; optional Gate W2 LE left/right codes **deferred** |
| U2 | Carotid duplex vs `CTA_HEAD_NECK` | Modality + protocol separation |
| U3 | Pelvic Doppler vs `US_VENOUS_DOPPLER_LE` | Pelvic protocol on `US_PELVIS` only |
| U4 | Thyroid vs `US_SOFT` neck | `US_THYROID` + neck protocol on `US_SOFT` |
| U5 | `US_Liver` alias vs `US_RUQ_GALLBLADDER` | Alias only — no `US_LIVER` code |

---

## 5. Part 6 — Implementation readiness

| Gate | Status |
|------|--------|
| Gate W1 | **CLOSED** |
| Gate W2 (US slice) | **OPEN** |
| 3C-B1 classifiers on 44 rows | **CLOSED** |
| French labels (17 rows) | **NOT READY** |
| Licensed CPT | **NOT READY** |

| Scope | Verdict |
|-------|---------|
| **2E.2D design** | **SAFE** |
| **2E.2D implementation** | **NOT SAFE** |

### Blockers

1. Gate W2 workbook slice + clinical sign-off (OB tuple + Doppler)  
2. French `displayNameFr` for 17 rows  
3. Staging seed + classifier FK backfill  
4. Billing review (all 17 rows `PENDING_CPT_REVIEW`)  
5. MANUAL_REVIEW queue (8 studies) — pilot scope or Phase 2E.2D-b  
6. Tuple/protocol pass on existing rows (0 inserts) — must complete before or with US-1  
7. Search alias authoring *(out of design scope; required before production UX)*  

---

## 6. Cross-references

| Document | Role |
|----------|------|
| `ultrasound-expansion-candidate-list.md` | 17-row matrix |
| `ultrasound-expansion-batch-plan.md` | US-1 / US-2 / US-3 |

---

*Audit only — no implementation.*
