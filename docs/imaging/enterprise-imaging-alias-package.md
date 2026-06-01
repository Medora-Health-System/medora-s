# Enterprise Imaging Alias Package (Phase W2.1)

**Phase:** W2.1 — design only  
**Date:** 2026-06-01  
**Companion:** [`enterprise-imaging-workbook.csv`](enterprise-imaging-workbook.csv)  

---

## 1. Summary

| Class | Count (est.) | Description |
|-------|-------------:|-------------|
| **ALIAS_REQUIRED** | **42** | Must ship with wave apply for safe legacy search/order |
| **ALIAS_OPTIONAL** | **88** | Recommended; can follow within 30 days post-wave |
| **NO_ALIAS** | **40** | New code only; no legacy string collision |
| **Tuple aliases** (existing codes) | **~25** | 0 new rows — separate tuple pass |
| **Total alias strings (order of magnitude)** | **130–190** | `ImagingStudyAlias` or seed `aliases[]` |

*Search implementation is out of scope for W2.1; aliases are **required for production UX** before go-live.*

---

## 2. ALIAS_REQUIRED (42)

### 2.1 Predecessor / successor (must not order wrong code)

| Legacy / alias string | Target code | Notes |
|----------------------|-------------|-------|
| CT Head *(retired path)* | `CT_HEAD_WO_CONTRAST` | Block `CT_HEAD` |
| CT Abdomen * | `CT_ABDOMEN_PELVIS` / contrast EXPAND | Block `CT_ABD` |
| Doppler vein / DVT leg | `US_VENOUS_DOPPLER_LE` | Block `DOPPLER_VEIN` |
| US Abdomen *(predecessor)* | `US_ABDOMEN` | Block `US_ABD` |
| CTA chest *(old)* | `CTA_CHEST` | Block `CT_CHEST_CTA` |

### 2.2 XR high-traffic (REQUIRED per workbook flag)

| Target code | Example legacy strings |
|-------------|------------------------|
| `XR_SACRUM_COCCYX_2V` | Coccyx and Sacrum; Sacrum and Coccyx |
| `XR_CALCANEUS_LEFT_2V` | Os Calcis Left 2V |
| `XR_CALCANEUS_RIGHT_2V` | Os Calcis Right 2V |
| All **XR-2** MSK EXPAND (53) | Legacy “Knee Left 3V”, “Ankle Right 2V”, etc. *(1–2 aliases per code ≈ 40 strings)* |

### 2.3 CT / CTA

| Target | Legacy |
|--------|--------|
| `CT_STN_WO_CONTRAST` | CT Soft Tissue Neck |
| `CTA_HEAD_NECK` | CTA COW; CTA Carotids w Reconstructions; CTA Head Circle of Willis |
| `CTA_ABDOMEN_PELVIS` | CT Angiogram Abdomen; CTA Abdominal Aorta w Recon / Runoff |

### 2.4 US

| Target | Legacy |
|--------|--------|
| `US_RUQ_GALLBLADDER` | US Liver |
| `US_VENOUS_DOPPLER_UE_LEFT` / `_RIGHT` | US UE Unilateral Venous Doppler |

### 2.5 MRI

| Target | Legacy |
|--------|--------|
| `MRI_BRAIN` | MRI Head wo; MRI Head/Brain Limited; MRI Head w&wo *(wo phase)* |

---

## 3. ALIAS_OPTIONAL (88)

| Group | Count | Examples |
|-------|------:|----------|
| XR-1 spine/ribs | 15 | Regional spine legacy shorthand |
| XR-3 shoulder girdle | 7 | AC / clavicle / scapula variants |
| CT-3 MSK CT | 12 | Extremity CT legacy names |
| MRI-2 MSK | 10 | Knee without “wo” in legacy name |
| US-2 Doppler | 8 | Bilateral vs unilateral wording |
| FL / NM | 9 | Alternate procedure names |
| CTA extremity new codes | 4 | LE/UE angio synonyms |
| Remaining XR-2 | ~23 | Low-volume synonym strings |

---

## 4. NO_ALIAS (40)

New modality introductions and codes with no legacy collision in enterprise inventory:

| Batch | Codes |
|-------|-------|
| FL-1 | All 4 |
| NM-1 | All 5 |
| MRA-1 | All 5 |
| US-1 | `US_AORTA`, `US_BLADDER`, `US_CHEST` (partial) |
| CT-3 | Selected head/face codes with unique legacy labels |
| XR-1 | `XR_ABDOMEN_3V_ACUTE` (unique) |

*Workbook column `aliasRequired=NO_ALIAS` may be applied in CSV revision; current CSV uses REQUIRED/OPTIONAL only.*

---

## 5. Tuple-only aliases (existing 44 — 0 new rows)

| Catalog code | Protocol / alias pass |
|--------------|----------------------|
| `XR_CHEST` | Decub; post-intubation |
| `US_OB_FIRST` / `US_OB_GROWTH` | OB limited, TV, BPP, portable |
| `US_PELVIS` | Transvaginal, pelvic Doppler, limited |
| `US_ABDOMEN` | Limited |
| `US_SOFT` | Neck/thyroid |
| `CTA_CHEST` | Triple rule-out, reconstruction |
| `CTA_ABDOMEN_PELVIS` | Aorta recon, runoff |
| `CT_CHEST` | HR protocol |

**Count:** ~25 legacy studies → **0** catalog inserts.

---

## 6. Duplicate alias audit

| Check | Result |
|-------|--------|
| Same alias → two codes (design) | **PASS** — Os Calcis only on calcaneus codes |
| Alias targets retired `CT_HEAD` | **PASS** — aliases point to `CT_HEAD_WO_CONTRAST` |
| Alias recreates `DOPPLER_VEIN` | **PASS** |

---

*W2.1 — no alias seed execution.*
