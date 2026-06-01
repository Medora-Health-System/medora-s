# Ultrasound Expansion Candidate List (Phase 2E.2D)

**Phase:** 2E.2D — design authority  
**Date:** 2026-06-01  
**Classifier vocabulary:** ICM-1.0  

---

## 1. Summary

| Metric | Value |
|--------|------:|
| Ultrasound legacy studies | **53** |
| **New catalog rows** | **17** |
| Tuple / alias (no new row) | **36** |
| MANUAL_REVIEW (deferred) | **8** |

**Contrast on all US rows:** `CONTRAST_TYPE_NONE` (not applicable for standard ultrasound).

**View count:** NOT_APPLICABLE on all US rows.

---

## 2. Absorbed — no new row (36)

### 2.1 EXISTS_IN_MEDORA (11)

| Legacy study | Medora code |
|--------------|-------------|
| US Abdomen Complete | `US_ABDOMEN` |
| US Gallbladder | `US_RUQ_GALLBLADDER` |
| US RUQ | `US_RUQ_GALLBLADDER` |
| US Renal Complete | `US_RENAL` |
| US Pelvis | `US_PELVIS` |
| US Scrotum/Contents | `US_SCROTUM_TESTICULAR` |
| US Soft Tissue | `US_SOFT` |
| US LE Bilateral Venous Doppler | `US_VENOUS_DOPPLER_LE` |
| US LE Left Venous Doppler | `US_VENOUS_DOPPLER_LE` |
| US LE Right Venous Doppler | `US_VENOUS_DOPPLER_LE` |
| US LE Unilateral Venous Doppler | `US_VENOUS_DOPPLER_LE` |

### 2.2 ALIAS (2)

| Legacy study | Target |
|--------------|--------|
| US Liver | `US_RUQ_GALLBLADDER` |
| US UE Unilateral Venous Doppler | `US_VENOUS_DOPPLER_UE_LEFT` or `US_VENOUS_DOPPLER_UE_RIGHT` |

### 2.3 PARTIAL_MATCH — protocol / tuple on existing (15)

| Legacy study | Existing code | Protocol (ICM-1.0) |
|--------------|---------------|---------------------|
| US Abdomen Limited | `US_ABDOMEN` | `PROTOCOL_US_ABDOMEN_LIMITED` |
| US Duplex Limited Abdomen/Pelvis/Scrotal | `US_PELVIS` / `US_SCROTUM_TESTICULAR` | Limited duplex tuple *(clinical routing)* |
| US Neck / Head Soft Tissue | `US_SOFT` | `PROTOCOL_US_NECK_THYROID` |
| US OB <14 Weeks Limited | `US_OB_FIRST` | `PROTOCOL_US_OB_FIRST_TRIMESTER_LIMITED` |
| US OB <14 Weeks Single Gestation | `US_OB_FIRST` | `PROTOCOL_US_OB_FIRST_TRIMESTER` |
| US OB <14 Weeks Transvaginal | `US_OB_FIRST` | `PROTOCOL_US_OB_FIRST_TRIMESTER_TV` |
| US OB >14 Weeks Limited | `US_OB_GROWTH` | `PROTOCOL_US_OB_LATE_TRIMESTER_LIMITED` |
| US OB >14 Weeks Limited Portable | `US_OB_GROWTH` | `PROTOCOL_US_OB_LATE_TRIMESTER_PORTABLE` |
| US OB >14 Weeks Single Gestation | `US_OB_GROWTH` | `PROTOCOL_US_OB_LATE_TRIMESTER` |
| US OB >14 Weeks Transvaginal | `US_OB_GROWTH` | `PROTOCOL_US_OB_LATE_TRIMESTER` |
| US OB Biophysical Profile without NST | `US_OB_GROWTH` | `PROTOCOL_US_OB_BPP` |
| US Pelvic Doppler | `US_PELVIS` | `PROTOCOL_US_PELVIS_DOPPLER` |
| US Pelvis Limited | `US_PELVIS` | — *(limited alias)* |
| US Pelvis with Trans/Endo | `US_PELVIS` | `PROTOCOL_US_PELVIS_TRANSVAGINAL` |
| US Trans/Endo | `US_PELVIS` | `PROTOCOL_US_PELVIS_TRANSVAGINAL` |

---

## 3. Complete candidate matrix — 17 new rows

### 3.1 US-1 Core Ultrasound (4 rows)

| Code | displayNameEn | displayNameFr | Modality | Body region | Laterality | Anatomic subregion | Protocol |
|------|---------------|---------------|----------|-------------|------------|--------------------|----------|
| `US_THYROID` | Thyroid ultrasound | Échographie thyroïde | MODALITY_US | BODY_REGION_THYROID | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_THYROID | — |
| `US_AORTA` | Aorta ultrasound | Échographie aorte | MODALITY_US | BODY_REGION_AORTA | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_AORTA | — |
| `US_BLADDER` | Bladder ultrasound | Échographie vessie | MODALITY_US | BODY_REGION_BLADDER | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_BLADDER | — |
| `US_CHEST` | Chest ultrasound | Échographie thorax | MODALITY_US | BODY_REGION_CHEST | LATERALITY_UNSPECIFIED | — | — |

*US-1 also includes the **tuple pass** (15 PARTIAL rows above) — classifier/protocol assignment on existing catalog codes, **0** inserts.*

### 3.2 US-2 Doppler Expansion (10 rows)

| Code | displayNameEn | displayNameFr | Modality | Body region | Laterality | Anatomic subregion | Protocol |
|------|---------------|---------------|----------|-------------|------------|--------------------|----------|
| `US_CAROTID_DUPLEX` | Carotid duplex ultrasound | Échographie duplex carotidienne | MODALITY_US | BODY_REGION_HEAD_NECK | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_CAROTID | PROTOCOL_US_DOPPLER_ARTERIAL |
| `US_ARTERIAL_DOPPLER_LE_BILATERAL` | Lower extremity arterial Doppler bilateral | Doppler artériel membres inférieurs bilatéral | MODALITY_US | BODY_REGION_LOWER_EXTREMITY | LATERALITY_BILATERAL | — | PROTOCOL_US_DOPPLER_ARTERIAL |
| `US_ARTERIAL_DOPPLER_LE_LEFT` | Lower extremity arterial Doppler left | Doppler artériel membre inférieur gauche | MODALITY_US | BODY_REGION_LOWER_EXTREMITY | LATERALITY_LEFT | — | PROTOCOL_US_DOPPLER_ARTERIAL |
| `US_ARTERIAL_DOPPLER_LE_RIGHT` | Lower extremity arterial Doppler right | Doppler artériel membre inférieur droit | MODALITY_US | BODY_REGION_LOWER_EXTREMITY | LATERALITY_RIGHT | — | PROTOCOL_US_DOPPLER_ARTERIAL |
| `US_VENOUS_DOPPLER_UE_BILATERAL` | Upper extremity venous Doppler bilateral | Doppler veineux membres supérieurs bilatéral | MODALITY_US | BODY_REGION_UPPER_EXTREMITY | LATERALITY_BILATERAL | — | PROTOCOL_US_DOPPLER_VENOUS |
| `US_VENOUS_DOPPLER_UE_LEFT` | Upper extremity venous Doppler left | Doppler veineux membre supérieur gauche | MODALITY_US | BODY_REGION_UPPER_EXTREMITY | LATERALITY_LEFT | — | PROTOCOL_US_DOPPLER_VENOUS |
| `US_VENOUS_DOPPLER_UE_RIGHT` | Upper extremity venous Doppler right | Doppler veineux membre supérieur droit | MODALITY_US | BODY_REGION_UPPER_EXTREMITY | LATERALITY_RIGHT | — | PROTOCOL_US_DOPPLER_VENOUS |
| `US_ARTERIAL_DOPPLER_UE_BILATERAL` | Upper extremity arterial Doppler bilateral | Doppler artériel membres supérieurs bilatéral | MODALITY_US | BODY_REGION_UPPER_EXTREMITY | LATERALITY_BILATERAL | — | PROTOCOL_US_DOPPLER_ARTERIAL |
| `US_ARTERIAL_DOPPLER_UE_LEFT` | Upper extremity arterial Doppler left | Doppler artériel membre supérieur gauche | MODALITY_US | BODY_REGION_UPPER_EXTREMITY | LATERALITY_LEFT | — | PROTOCOL_US_DOPPLER_ARTERIAL |
| `US_ARTERIAL_DOPPLER_UE_RIGHT` | Upper extremity arterial Doppler right | Doppler artériel membre supérieur droit | MODALITY_US | BODY_REGION_UPPER_EXTREMITY | LATERALITY_RIGHT | — | PROTOCOL_US_DOPPLER_ARTERIAL |

*Do **not** add `US_VENOUS_DOPPLER_LE_LEFT` / `_RIGHT` — existing `US_VENOUS_DOPPLER_LE` remains canonical for all LE venous legacy FULL matches.*

### 3.3 US-3 Advanced Ultrasound (3 rows)

| Code | displayNameEn | displayNameFr | Modality | Body region | Laterality | Anatomic subregion | Protocol |
|------|---------------|---------------|----------|-------------|------------|--------------------|----------|
| `US_BREAST_BILATERAL` | Breast ultrasound bilateral | Échographie mammaire bilatérale | MODALITY_US | BODY_REGION_BREAST | LATERALITY_BILATERAL | ANATOMIC_SUBREGION_BREAST | — |
| `US_BREAST_LEFT` | Breast ultrasound left | Échographie mammaire gauche | MODALITY_US | BODY_REGION_BREAST | LATERALITY_LEFT | ANATOMIC_SUBREGION_BREAST | — |
| `US_BREAST_RIGHT` | Breast ultrasound right | Échographie mammaire droite | MODALITY_US | BODY_REGION_BREAST | LATERALITY_RIGHT | ANATOMIC_SUBREGION_BREAST | — |

---

## 4. MANUAL_REVIEW — deferred (8 legacy studies)

| Legacy study | Reason |
|--------------|--------|
| US Axilla | Low Haiti pilot priority; `BODY_REGION_AXILLA` available |
| US Buttocks | No body region seed; defer |
| US Groin | Overlap with PSA variants |
| US Groin Left / Right / Bilateral PSA | Specialty PSA workflow — needs clinical policy |
| US Lower Back | No spine US body region; defer |
| US Upper Back | No spine US body region; defer |

*Gate W2 may promote any of these to new rows in a follow-on batch (2E.2D-b).*

---

## 5. Existing catalog — do not duplicate

| Code | Status | Rule |
|------|--------|------|
| `US_VENOUS_DOPPLER_LE` | Active canonical | All LE venous legacy → this code |
| `US_ABDOMEN` | Active canonical | Abdomen complete; limited → protocol |
| `US_ABD` | Predecessor | **No** new `US_ABD` |
| `DOPPLER_VEIN` | Predecessor → `US_VENOUS_DOPPLER_LE` | **No** new `DOPPLER_VEIN` |
| `US_OB_FIRST` / `US_OB_GROWTH` | Active | OB partials → protocols |

---

## 6. CPT

All **17** new rows: `PENDING_CPT_REVIEW` (Gate W3).

---

*See `ultrasound-expansion-governance.md` and `ultrasound-expansion-batch-plan.md`.*
