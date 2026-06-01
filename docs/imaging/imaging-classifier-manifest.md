# Imaging Classifier Manifest

**Phase:** 3C-S0 / 3C-S0A (audit-only)  
**Version:** `ICM-1.0` *(VIEW_COUNT policy resolved — MR-M1)*  
**Status:** Authoritative approval package for 3C-S1 / 3C-S2 / 3C-B1 — **not seeded**  
**Total imaging classifier codes:** **141**

---

## 1. Count verification

| Domain | Seeded today | New in manifest | **Total** |
|--------|-------------:|----------------:|----------:|
| MODALITY | 4 | 4 | **8** |
| BODY_REGION | 28 | 14 | **42** |
| VIEW_COUNT | 1 | 5 | **6** |
| CONTRAST_TYPE | 2 | 3 | **5** |
| LATERALITY | 0 | 4 | **4** |
| ANATOMIC_SUBREGION | 0 | 36 | **36** |
| PROTOCOL | 0 | 40 | **40** |
| **Imaging total** | **35** | **106** | **141** |

*LAB_CATEGORY (16) excluded — lab-only, unchanged.*

---

## 2. MODALITY — 8 codes

| # | Code | EN | FR | Status |
|---|------|----|----|--------|
| 1 | `MODALITY_XR` | X-ray | Radiographie | Seeded |
| 2 | `MODALITY_US` | Ultrasound | Échographie | Seeded |
| 3 | `MODALITY_CT` | CT | Tomodensitométrie | Seeded |
| 4 | `MODALITY_MRI` | MRI | IRM | Seeded |
| 5 | `MODALITY_CTA` | CT angiography | Angioscanner | **New** |
| 6 | `MODALITY_MRA` | MR angiography | ARM | **New** |
| 7 | `MODALITY_NM` | Nuclear medicine | Médecine nucléaire | **New** |
| 8 | `MODALITY_FL` | Fluoroscopy | Fluoroscopie | **New** |

**Reserved (not in ICM-1.0):** `MODALITY_ECHO`, `MODALITY_IR` — future phases.

---

## 3. BODY_REGION — 42 codes

### 3.1 Seeded today (28)

| Code |
|------|
| `BODY_REGION_ABDOMEN` |
| `BODY_REGION_ABDOMEN_PELVIS` |
| `BODY_REGION_ABDOMEN_RUQ` |
| `BODY_REGION_ANKLE` |
| `BODY_REGION_ARM` |
| `BODY_REGION_CHEST` |
| `BODY_REGION_CHEST_ABDOMEN_PELVIS` |
| `BODY_REGION_ELBOW` |
| `BODY_REGION_FOOT` |
| `BODY_REGION_FOREARM` |
| `BODY_REGION_HAND` |
| `BODY_REGION_HEAD` |
| `BODY_REGION_HEAD_NECK` |
| `BODY_REGION_HIP` |
| `BODY_REGION_KIDNEY` |
| `BODY_REGION_KNEE` |
| `BODY_REGION_LEG` |
| `BODY_REGION_LOWER_EXTREMITY` |
| `BODY_REGION_OBSTETRICAL` |
| `BODY_REGION_PELVIS` |
| `BODY_REGION_SCROTUM` |
| `BODY_REGION_SHOULDER` |
| `BODY_REGION_SOFT_TISSUE` |
| `BODY_REGION_SPINE` |
| `BODY_REGION_SPINE_CERVICAL` |
| `BODY_REGION_THIGH` |
| `BODY_REGION_VASCULAR` |
| `BODY_REGION_WRIST` |

### 3.2 New in manifest (14)

| Code | EN | FR |
|------|----|----|
| `BODY_REGION_BREAST` | Breast | Sein |
| `BODY_REGION_THYROID` | Thyroid | Thyroïde |
| `BODY_REGION_BLADDER` | Bladder | Vessie |
| `BODY_REGION_GROIN` | Groin | Aine |
| `BODY_REGION_AXILLA` | Axilla | Aisselle |
| `BODY_REGION_AORTA` | Aorta | Aorte |
| `BODY_REGION_UPPER_EXTREMITY` | Upper extremity | Membre supérieur |
| `BODY_REGION_NECK` | Neck | Cou |
| `BODY_REGION_FACE` | Face | Face |
| `BODY_REGION_SINUS` | Sinuses | Sinus |
| `BODY_REGION_RIBS` | Ribs | Côtes |
| `BODY_REGION_STERNUM` | Sternum | Sternum |
| `BODY_REGION_SPINE_THORACIC` | Thoracic spine | Rachis thoracique |
| `BODY_REGION_HEPATOBILIARY` | Hepatobiliary | Hépatobiliaire |

---

## 4. VIEW_COUNT — 6 codes

### 4.1 Seeded today (1)

| Code | EN | FR |
|------|----|----|
| `VIEW_COUNT_TWO` | Two views | Deux incidences |

### 4.2 New in manifest (5)

| Code | EN | FR |
|------|----|----|
| `VIEW_COUNT_ONE` | One view | Une incidence |
| `VIEW_COUNT_THREE` | Three views | Trois incidences |
| `VIEW_COUNT_FOUR` | Four views | Quatre incidences |
| `VIEW_COUNT_COMPLETE` | Complete series | Série complète |
| `VIEW_COUNT_UNSPECIFIED` | Unspecified view count | Nombre d'incidences non précisé |

*Canonical codes use `ONE`/`TWO`/`THREE`/`FOUR` (not numeric suffixes). Seeded `VIEW_COUNT_TWO` is retained.*

### 4.3 Authoritative VIEW_COUNT policy (Phase 3C-S0A — MR-M1 **RESOLVED**)

**Decision:** **Option A** — include `VIEW_COUNT_UNSPECIFIED` in ICM-1.0.

**Null FK is not a semantic classifier.** Do **not** use null on `viewCountClassifierId` to mean:

| State | Correct representation |
|-------|------------------------|
| Unknown / legacy unspecified XR view count | `VIEW_COUNT_UNSPECIFIED` |
| Generic XR row (views not encoded in catalog code) | `VIEW_COUNT_UNSPECIFIED` |
| Not yet backfilled (pre-3C-B1) | **null** *(transient operational state only)* |
| View count dimension not applicable (non-XR) | **null** *(dimension absent; infer from `MODALITY ≠ XR`)* |

| Situation | `viewCountClassifierId` | Example |
|-----------|-------------------------|---------|
| Legacy/catalog encodes explicit view count | Matching numeric classifier | `XR_CHEST_2V` → `VIEW_COUNT_TWO` |
| Legacy “Complete” series | `VIEW_COUNT_COMPLETE` | C-Spine Complete, Sinus Complete |
| XR row with no encoded view count | `VIEW_COUNT_UNSPECIFIED` | `XR_KNEE`, `XR_ANKLE`, Abdomen KUB |
| Non-XR modality (US, CT, MRI, CTA, NM, FL, MRA) | **null** | All 26 non-XR catalog rows |
| Protocol-only view tokens (Sunrise, Decub) | **null** on view FK; use `PROTOCOL_*` | Knee Sunrise, Chest Decub |

**Rationale:** For X-ray studies, unspecified view count is clinically and operationally distinct from “not applicable.” An explicit `VIEW_COUNT_UNSPECIFIED` code preserves that distinction, supports legacy inventory mapping (16 XR unspecified studies), and avoids conflating operational null (not backfilled) with semantic states. **Do not** default generic MSK XR to `VIEW_COUNT_ONE` — legacy CPT ranges (e.g. knee “1–2 views”) make ONE misleading.

**Rejected options:**

| Option | Verdict | Why rejected |
|--------|---------|--------------|
| B — null FK for unspecified XR | **Rejected** | Collapses unknown, unspecified, and not-yet-backfilled into one state |
| C — add `VIEW_COUNT_NOT_APPLICABLE` | **Rejected** | Non-XR N/A is inferable from modality; no sixth+ code needed |

**Workbook correction (3C-B1):** Replace provisional `VIEW_COUNT_ONE` on generic MSK XR rows with `VIEW_COUNT_UNSPECIFIED`; retain explicit ONE/TWO only when catalog code encodes views.

---

## 5. CONTRAST_TYPE — 5 codes

| # | Code | EN | FR | Status |
|---|------|----|----|--------|
| 1 | `CONTRAST_TYPE_WITHOUT` | Without contrast | Sans produit de contraste | Seeded |
| 2 | `CONTRAST_TYPE_WITH` | With contrast | Avec contraste | **New** |
| 3 | `CONTRAST_TYPE_WITH_AND_WITHOUT` | With and without contrast | Avec et sans contraste | **New** |
| 4 | `CONTRAST_TYPE_ANGIOGRAPHIC` | Angiographic / CTA | Angiographie / CTA | Seeded |
| 5 | `CONTRAST_TYPE_NONE` | None (non-contrast modality) | Aucun | **New** |

**Forbidden (seed guard):** `CONTRAST_TYPE_UNSPECIFIED` — use `CONTRAST_TYPE_NONE` or null FK.

---

## 6. LATERALITY — 4 codes

| # | Code | EN | FR |
|---|------|----|----|
| 1 | `LATERALITY_LEFT` | Left | Gauche |
| 2 | `LATERALITY_RIGHT` | Right | Droit |
| 3 | `LATERALITY_BILATERAL` | Bilateral | Bilatéral |
| 4 | `LATERALITY_UNSPECIFIED` | Unspecified | Non précisé |

---

## 7. ANATOMIC_SUBREGION — 36 codes

### 7.1 Spine (5)

`ANATOMIC_SUBREGION_SPINE_CERVICAL`, `ANATOMIC_SUBREGION_SPINE_THORACIC`, `ANATOMIC_SUBREGION_SPINE_LUMBAR`, `ANATOMIC_SUBREGION_SPINE_SACRUM_COCCYX`, `ANATOMIC_SUBREGION_SPINE_THORACOLUMBAR`

### 7.2 Head / face / neck (8)

`ANATOMIC_SUBREGION_ORBIT`, `ANATOMIC_SUBREGION_SINUS`, `ANATOMIC_SUBREGION_SKULL`, `ANATOMIC_SUBREGION_FACIAL_BONES`, `ANATOMIC_SUBREGION_MANDIBLE`, `ANATOMIC_SUBREGION_NASAL_BONES`, `ANATOMIC_SUBREGION_TMJ`, `ANATOMIC_SUBREGION_NECK_SOFT_TISSUE`

### 7.3 Chest wall / shoulder girdle (5)

`ANATOMIC_SUBREGION_RIBS`, `ANATOMIC_SUBREGION_STERNUM`, `ANATOMIC_SUBREGION_CLAVICLE`, `ANATOMIC_SUBREGION_SCAPULA`, `ANATOMIC_SUBREGION_AC_JOINT`

### 7.4 Digits / foot (4)

`ANATOMIC_SUBREGION_FINGER`, `ANATOMIC_SUBREGION_TOE`, `ANATOMIC_SUBREGION_CALCANEUS`, `ANATOMIC_SUBREGION_PANOREX`

### 7.5 Vascular / specialty (5)

`ANATOMIC_SUBREGION_AORTA`, `ANATOMIC_SUBREGION_CAROTID`, `ANATOMIC_SUBREGION_CIRCLE_OF_WILLIS`, `ANATOMIC_SUBREGION_SELLA`, `ANATOMIC_SUBREGION_BILIARY`

### 7.6 Whole-extremity / infant (4)

`ANATOMIC_SUBREGION_UPPER_EXTREMITY_WHOLE`, `ANATOMIC_SUBREGION_LOWER_EXTREMITY_WHOLE`, `ANATOMIC_SUBREGION_INFANT_WHOLE_BODY`, `ANATOMIC_SUBREGION_INFANT_EXTREMITY`

### 7.7 Other soft tissue (5)

`ANATOMIC_SUBREGION_BREAST`, `ANATOMIC_SUBREGION_THYROID`, `ANATOMIC_SUBREGION_BLADDER`, `ANATOMIC_SUBREGION_GROIN`, `ANATOMIC_SUBREGION_AXILLA`

---

## 8. PROTOCOL — 40 codes

### 8.1 X-Ray (5)

`PROTOCOL_XR_CHEST_POST_INTUBATION`, `PROTOCOL_XR_CHEST_DECUBITUS`, `PROTOCOL_XR_KNEE_SUNRISE`, `PROTOCOL_XR_CSPINE_UPRIGHT`, `PROTOCOL_XR_ABDOMEN_ACUTE_SERIES`

### 8.2 CT (3)

`PROTOCOL_CT_CAP_TRAUMA`, `PROTOCOL_CT_CHEST_HR`, `PROTOCOL_CT_BRAIN_PERFUSION`

### 8.3 CTA (8)

`PROTOCOL_CTA_CHEST_STANDARD`, `PROTOCOL_CTA_CHEST_TRIPLE_RULE_OUT`, `PROTOCOL_CTA_CHEST_RECONSTRUCTION`, `PROTOCOL_CTA_ABDOMINAL_AORTA`, `PROTOCOL_CTA_ABDOMINAL_AORTA_RUNOFF`, `PROTOCOL_CTA_HEAD`, `PROTOCOL_CTA_COW`, `PROTOCOL_CTA_CAROTID`

### 8.4 Ultrasound (14)

`PROTOCOL_US_FAST`, `PROTOCOL_US_OB_FIRST_TRIMESTER`, `PROTOCOL_US_OB_FIRST_TRIMESTER_LIMITED`, `PROTOCOL_US_OB_FIRST_TRIMESTER_TV`, `PROTOCOL_US_OB_LATE_TRIMESTER`, `PROTOCOL_US_OB_LATE_TRIMESTER_LIMITED`, `PROTOCOL_US_OB_LATE_TRIMESTER_PORTABLE`, `PROTOCOL_US_OB_BPP`, `PROTOCOL_US_DOPPLER_VENOUS`, `PROTOCOL_US_DOPPLER_ARTERIAL`, `PROTOCOL_US_PELVIS_TRANSVAGINAL`, `PROTOCOL_US_PELVIS_DOPPLER`, `PROTOCOL_US_ABDOMEN_LIMITED`, `PROTOCOL_US_NECK_THYROID`

### 8.5 MRI (1)

`PROTOCOL_MRI_CHOLANGIOGRAM`

### 8.6 Nuclear Medicine (5)

`PROTOCOL_NM_HIDA`, `PROTOCOL_NM_VQ_PERFUSION`, `PROTOCOL_NM_VQ_VENTILATION`, `PROTOCOL_NM_VQ_COMBINED`, `PROTOCOL_NM_GALLBLADDER_EMPTYING`

### 8.7 Fluoroscopy (4)

`PROTOCOL_FL_ESOPHAGRAM`, `PROTOCOL_FL_TUBE_PLACEMENT`, `PROTOCOL_FL_LINE_PLACEMENT`, `PROTOCOL_FL_LUMBAR_PUNCTURE`

---

## 9. `MRV_CLASSIFIER_DOMAIN_COUNTS` target (post seed)

```typescript
{
  MODALITY: 8,
  BODY_REGION: 42,
  VIEW_COUNT: 6,
  CONTRAST_TYPE: 5,
  LATERALITY: 4,
  ANATOMIC_SUBREGION: 36,
  PROTOCOL: 40,
  LAB_CATEGORY: 16,
}
```

**TermClassifier rows after imaging seed:** **157** total (141 imaging + 16 lab).

---

## 10. Manifest checksum

| Check | Result |
|-------|--------|
| Unique codes within domain | 141/141 ✓ |
| Unique codes globally (prefix disambiguates) | 141/141 ✓ |
| Sum of domain totals | 8+42+6+5+4+36+40 = **141** ✓ |
| All codes ≤ 64 chars | ✓ |
| All domains ≤ 32 chars | ✓ |
| Forbidden `CONTRAST_TYPE_UNSPECIFIED` absent | ✓ |
| `VIEW_COUNT_UNSPECIFIED` present | ✓ |

---

*ICM-1.0 — audit only. MR-M1 resolved 3C-S0A (Option A). Authoritative code list for sign-off.*
