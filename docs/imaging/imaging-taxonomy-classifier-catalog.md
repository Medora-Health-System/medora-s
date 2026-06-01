# Imaging Taxonomy Classifier Catalog

**Phase:** 3D.2 (audit-only)  
**Purpose:** Proposed `TermClassifier` inventories required to support workbook population  
**Baseline seeded today:** MODALITY 4, BODY_REGION 28, VIEW_COUNT 1, CONTRAST_TYPE 2

---

## 1. Executive summary — exact counts

| Domain | Seeded today | Proposed additions | **Proposed total** |
|--------|-------------:|-------------------:|-------------------:|
| **MODALITY** | 4 | 4 | **8** |
| **BODY_REGION** | 28 | 14 | **42** |
| **VIEW_COUNT** | 1 | 5 | **6** |
| **CONTRAST_TYPE** | 2 | 3 | **5** |
| **LATERALITY** | 0 | 4 | **4** |
| **ANATOMIC_SUBREGION** | 0 | 36 | **36** |
| **PROTOCOL** | 0 | 40 | **40** |
| **Grand total (imaging domains)** | **35** | **106** | **141** |

*LAB_CATEGORY (16) excluded — lab-only domain.*

---

## 2. LATERALITY — 4 codes

| Code | EN label | FR label |
|------|----------|----------|
| `LATERALITY_LEFT` | Left | Gauche |
| `LATERALITY_RIGHT` | Right | Droit |
| `LATERALITY_BILATERAL` | Bilateral | Bilatéral |
| `LATERALITY_UNSPECIFIED` | Unspecified | Non précisé |

**Workbook usage:** Required on all catalog rows. Generic MSK XR rows use `UNSPECIFIED` until EXPAND adds side-specific codes.

---

## 3. ANATOMIC_SUBREGION — 36 codes

### 3.1 Spine (5)

| Code | EN | FR |
|------|----|----|
| `ANATOMIC_SUBREGION_SPINE_CERVICAL` | Cervical spine | Rachis cervical |
| `ANATOMIC_SUBREGION_SPINE_THORACIC` | Thoracic spine | Rachis thoracique |
| `ANATOMIC_SUBREGION_SPINE_LUMBAR` | Lumbar spine | Rachis lombaire |
| `ANATOMIC_SUBREGION_SPINE_SACRUM_COCCYX` | Sacrum / coccyx | Sacrum / coccyx |
| `ANATOMIC_SUBREGION_SPINE_THORACOLUMBAR` | Thoracolumbar spine | Rachis thoraco-lombaire |

### 3.2 Head / face / neck (8)

| Code | EN | FR |
|------|----|----|
| `ANATOMIC_SUBREGION_ORBIT` | Orbit | Orbite |
| `ANATOMIC_SUBREGION_SINUS` | Paranasal sinuses | Sinus |
| `ANATOMIC_SUBREGION_SKULL` | Skull | Crâne |
| `ANATOMIC_SUBREGION_FACIAL_BONES` | Facial bones | Os faciaux |
| `ANATOMIC_SUBREGION_MANDIBLE` | Mandible | Mandibule |
| `ANATOMIC_SUBREGION_NASAL_BONES` | Nasal bones | Os nasaux |
| `ANATOMIC_SUBREGION_TMJ` | Temporomandibular joint | ATM |
| `ANATOMIC_SUBREGION_NECK_SOFT_TISSUE` | Neck soft tissue | Tissus mous du cou |

### 3.3 Chest wall / shoulder girdle (5)

| Code | EN | FR |
|------|----|----|
| `ANATOMIC_SUBREGION_RIBS` | Ribs | Côtes |
| `ANATOMIC_SUBREGION_STERNUM` | Sternum | Sternum |
| `ANATOMIC_SUBREGION_CLAVICLE` | Clavicle | Clavicule |
| `ANATOMIC_SUBREGION_SCAPULA` | Scapula | Scapula |
| `ANATOMIC_SUBREGION_AC_JOINT` | Acromioclavicular joint | Articulation acromio-claviculaire |

### 3.4 Digits / foot (4)

| Code | EN | FR |
|------|----|----|
| `ANATOMIC_SUBREGION_FINGER` | Finger | Doigt |
| `ANATOMIC_SUBREGION_TOE` | Toe | Orteil |
| `ANATOMIC_SUBREGION_CALCANEUS` | Calcaneus | Calcanéus |
| `ANATOMIC_SUBREGION_PANOREX` | Panoramic dental | Panoramique dentaire |

### 3.5 Vascular / specialty (5)

| Code | EN | FR |
|------|----|----|
| `ANATOMIC_SUBREGION_AORTA` | Aorta | Aorte |
| `ANATOMIC_SUBREGION_CAROTID` | Carotid | Carotide |
| `ANATOMIC_SUBREGION_CIRCLE_OF_WILLIS` | Circle of Willis | Polygone de Willis |
| `ANATOMIC_SUBREGION_SELLA` | Sella turcica | Selle turcique |
| `ANATOMIC_SUBREGION_BILIARY` | Biliary tree | Voies biliaires |

### 3.6 Whole-extremity / infant (4)

| Code | EN | FR |
|------|----|----|
| `ANATOMIC_SUBREGION_UPPER_EXTREMITY_WHOLE` | Whole upper extremity | Membre supérieur complet |
| `ANATOMIC_SUBREGION_LOWER_EXTREMITY_WHOLE` | Whole lower extremity | Membre inférieur complet |
| `ANATOMIC_SUBREGION_INFANT_WHOLE_BODY` | Infant whole body | Corps entier nourrisson |
| `ANATOMIC_SUBREGION_INFANT_EXTREMITY` | Infant extremity | Extrémité nourrisson |

### 3.7 Other soft tissue (5)

| Code | EN | FR |
|------|----|----|
| `ANATOMIC_SUBREGION_BREAST` | Breast | Sein |
| `ANATOMIC_SUBREGION_THYROID` | Thyroid | Thyroïde |
| `ANATOMIC_SUBREGION_BLADDER` | Bladder | Vessie |
| `ANATOMIC_SUBREGION_GROIN` | Groin | Aine |
| `ANATOMIC_SUBREGION_AXILLA` | Axilla | Aisselle |

**Count verification:** 5 + 8 + 5 + 4 + 5 + 4 + 5 = **36**

---

## 4. PROTOCOL — 40 codes

### 4.1 X-Ray (5)

| Code | Legacy driver |
|------|---------------|
| `PROTOCOL_XR_CHEST_POST_INTUBATION` | Chest Post Intubation |
| `PROTOCOL_XR_CHEST_DECUBITUS` | Chest 1V Decub |
| `PROTOCOL_XR_KNEE_SUNRISE` | Knee *V Sunrise |
| `PROTOCOL_XR_CSPINE_UPRIGHT` | C-Spine 3V Upright |
| `PROTOCOL_XR_ABDOMEN_ACUTE_SERIES` | Abdomen 3V Acute Series |

### 4.2 CT (3)

| Code | Legacy driver |
|------|---------------|
| `PROTOCOL_CT_CAP_TRAUMA` | CT CAP / trauma pan-scan |
| `PROTOCOL_CT_CHEST_HR` | CT Chest HR |
| `PROTOCOL_CT_BRAIN_PERFUSION` | CT Brain Perfusion |

### 4.3 CTA (8)

| Code | Legacy driver |
|------|---------------|
| `PROTOCOL_CTA_CHEST_STANDARD` | CTA Chest |
| `PROTOCOL_CTA_CHEST_TRIPLE_RULE_OUT` | CTA Chest Triple Rule Out |
| `PROTOCOL_CTA_CHEST_RECONSTRUCTION` | CTA Chest w Reconstruction |
| `PROTOCOL_CTA_ABDOMINAL_AORTA` | CTA Abdominal Aorta |
| `PROTOCOL_CTA_ABDOMINAL_AORTA_RUNOFF` | CTA Abdominal Aorta w Runoff |
| `PROTOCOL_CTA_HEAD` | CTA Head |
| `PROTOCOL_CTA_COW` | Circle of Willis |
| `PROTOCOL_CTA_CAROTID` | CTA COW / Carotids |

### 4.4 Ultrasound (14)

| Code | Legacy driver |
|------|---------------|
| `PROTOCOL_US_FAST` | FAST |
| `PROTOCOL_US_OB_FIRST_TRIMESTER` | US OB <14 Weeks |
| `PROTOCOL_US_OB_FIRST_TRIMESTER_LIMITED` | US OB <14 Weeks Limited |
| `PROTOCOL_US_OB_FIRST_TRIMESTER_TV` | US OB <14 Weeks Transvaginal |
| `PROTOCOL_US_OB_LATE_TRIMESTER` | US OB >14 Weeks |
| `PROTOCOL_US_OB_LATE_TRIMESTER_LIMITED` | US OB >14 Weeks Limited |
| `PROTOCOL_US_OB_LATE_TRIMESTER_PORTABLE` | US OB >14 Weeks Limited Portable |
| `PROTOCOL_US_OB_BPP` | Biophysical Profile |
| `PROTOCOL_US_DOPPLER_VENOUS` | Venous Doppler |
| `PROTOCOL_US_DOPPLER_ARTERIAL` | Arterial Doppler |
| `PROTOCOL_US_PELVIS_TRANSVAGINAL` | US Pelvis with Trans/Endo |
| `PROTOCOL_US_PELVIS_DOPPLER` | US Pelvic Doppler |
| `PROTOCOL_US_ABDOMEN_LIMITED` | US Abdomen Limited |
| `PROTOCOL_US_NECK_THYROID` | US Thyroid / Neck |

### 4.5 MRI (1)

| Code | Legacy driver |
|------|---------------|
| `PROTOCOL_MRI_CHOLANGIOGRAM` | MRI Cholangiogram |

### 4.6 Nuclear Medicine (5)

| Code | Legacy driver |
|------|---------------|
| `PROTOCOL_NM_HIDA` | HIDA Scan |
| `PROTOCOL_NM_VQ_PERFUSION` | VQ Scan Perfusion |
| `PROTOCOL_NM_VQ_VENTILATION` | VQ Scan Ventilation |
| `PROTOCOL_NM_VQ_COMBINED` | Lung Scan Perfusion/Ventilation |
| `PROTOCOL_NM_GALLBLADDER_EMPTYING` | Gallbladder Emptying Study |

### 4.7 Fluoroscopy (4)

| Code | Legacy driver |
|------|---------------|
| `PROTOCOL_FL_ESOPHAGRAM` | Swallow Esophagram |
| `PROTOCOL_FL_TUBE_PLACEMENT` | Tube Placement Fluoroscopy |
| `PROTOCOL_FL_LINE_PLACEMENT` | Line Placement Fluoro |
| `PROTOCOL_FL_LUMBAR_PUNCTURE` | Lumbar Puncture wo Fluoro |

### 4.8 US Doppler (2) — counted in US section above

*PROTOCOL_US_DOPPLER_VENOUS and PROTOCOL_US_DOPPLER_ARTERIAL included in §4.4.*

**Count verification:** 5 + 3 + 8 + 14 + 1 + 5 + 4 = **40**

---

## 5. Expanded existing domains

### 5.1 MODALITY — +4 (total 8)

| Code | EN | FR |
|------|----|----|
| `MODALITY_CTA` | CT angiography | Angioscanner |
| `MODALITY_MRA` | MR angiography | ARM |
| `MODALITY_NM` | Nuclear medicine | Médecine nucléaire |
| `MODALITY_FL` | Fluoroscopy | Fluoroscopie |

*Existing: `MODALITY_XR`, `MODALITY_US`, `MODALITY_CT`, `MODALITY_MRI`*

### 5.2 VIEW_COUNT — +5 (total 6)

| Code | EN | FR |
|------|----|----|
| `VIEW_COUNT_ONE` | One view | Une incidence |
| `VIEW_COUNT_TWO` | Two views | Deux incidences *(seeded)* |
| `VIEW_COUNT_THREE` | Three views | Trois incidences |
| `VIEW_COUNT_FOUR` | Four views | Quatre incidences |
| `VIEW_COUNT_COMPLETE` | Complete series | Série complète |

*Note: `VIEW_COUNT_UNSPECIFIED` deferred — use null FK or `VIEW_COUNT_ONE` default per workbook row policy.*

### 5.3 CONTRAST_TYPE — +3 (total 5)

| Code | EN | FR |
|------|----|----|
| `CONTRAST_TYPE_WITHOUT` | Without contrast | Sans contraste *(seeded)* |
| `CONTRAST_TYPE_WITH` | With contrast | Avec contraste |
| `CONTRAST_TYPE_WITH_AND_WITHOUT` | With and without contrast | Avec et sans contraste |
| `CONTRAST_TYPE_ANGIOGRAPHIC` | Angiographic / CTA | Angiographique *(seeded)* |
| `CONTRAST_TYPE_NONE` | None (non-contrast modality) | Aucun |

### 5.4 BODY_REGION — +14 (total 42)

| Code | EN | FR | Legacy driver |
|------|----|----|---------------|
| `BODY_REGION_BREAST` | Breast | Sein | US Breast * |
| `BODY_REGION_THYROID` | Thyroid | Thyroïde | US Thyroid / Neck |
| `BODY_REGION_BLADDER` | Bladder | Vessie | US Bladder |
| `BODY_REGION_GROIN` | Groin | Aine | US Groin * |
| `BODY_REGION_AXILLA` | Axilla | Aisselle | US Axilla |
| `BODY_REGION_AORTA` | Aorta | Aorte | US Aorta, CTA aorta |
| `BODY_REGION_UPPER_EXTREMITY` | Upper extremity | Membre supérieur | UE Doppler/CT/MRI |
| `BODY_REGION_NECK` | Neck | Cou | STN, soft tissue neck |
| `BODY_REGION_FACE` | Face | Face | Facial bones, mandible |
| `BODY_REGION_SINUS` | Sinuses | Sinus | Sinus XR/CT |
| `BODY_REGION_RIBS` | Ribs | Côtes | Ribs XR |
| `BODY_REGION_STERNUM` | Sternum | Sternum | Sternum XR |
| `BODY_REGION_SPINE_THORACIC` | Thoracic spine | Rachis thoracique | T-Spine *(or subregion)* |
| `BODY_REGION_HEPATOBILIARY` | Hepatobiliary | Hépatobiliaire | HIDA, cholangiogram |

*28 existing BODY_REGION codes unchanged.*

---

## 6. Domain count manifest (for `MRV_CLASSIFIER_DOMAIN_COUNTS`)

```typescript
// Proposed Phase 3C-S1/S2 manifest (audit-only — not applied)
{
  MODALITY: 8,
  BODY_REGION: 42,
  VIEW_COUNT: 6,
  CONTRAST_TYPE: 5,
  LATERALITY: 4,
  ANATOMIC_SUBREGION: 36,
  PROTOCOL: 40,
  LAB_CATEGORY: 16,  // unchanged
}
```

**Imaging-only classifier rows:** 141  
**All TermClassifier rows (incl. lab):** 157

---

## 7. Workbook row → classifier usage forecast

| Classifier domain | 44-row catalog usage | Post-expansion usage |
|-------------------|---------------------:|---------------------:|
| MODALITY | 44/44 | ~140/140 |
| BODY_REGION | 44/44 | ~140/140 |
| LATERALITY | 44/44 (all UNSPECIFIED today) | ~140/140 |
| ANATOMIC_SUBREGION | 3/44 | ~55/140 |
| CONTRAST_TYPE | 5/44 | ~45/140 |
| VIEW_COUNT | 2/44 | ~70/140 |
| PROTOCOL | 8/44 | ~35/140 |

---

## 8. Seeding sequence (reference)

| Batch | Domains | New codes |
|-------|---------|----------:|
| 3C-S1a | MODALITY, VIEW_COUNT, CONTRAST_TYPE | 12 |
| 3C-S1b | BODY_REGION expansions | 14 |
| 3C-S2a | LATERALITY | 4 |
| 3C-S2b | ANATOMIC_SUBREGION | 36 |
| 3C-S2c | PROTOCOL | 40 |

---

*Phase 3D.2 — audit only. Classifier codes proposed; not seeded.*
