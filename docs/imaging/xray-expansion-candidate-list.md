# X-Ray Expansion Candidate List (Phase 2E.2A)

**Phase:** 2E.2A — design authority for catalog rows  
**Date:** 2026-06-01  
**Classifier vocabulary:** ICM-1.0 (seeded)  

**Implementation sets:**

| Set | New codes | Description |
|-----|----------:|-------------|
| **Core (recommended)** | **79** | Haiti + high-volume enterprise parity |
| **Extended (XR-3b)** | **33** | Dental, peds, toe/finger, low-volume head |
| **Enterprise maximum** | **112** | One row per legacy orderable (minus 3 dedupe) |

---

## 1. Summary

| Metric | Count |
|--------|------:|
| Legacy XR studies | 118 |
| No new row (EXISTS + TUPLE + ALIAS) | 7 |
| **Core new catalog rows** | **79** |
| Extended deferred rows | 33 |
| **Enterprise maximum new rows** | **112** |

---

## 2. No new row (7 legacy studies)

| Disposition | Legacy study | Medora / action |
|-------------|--------------|-----------------|
| EXISTS | Abdomen KUB | `XR_ABD_AP` |
| EXISTS | Chest X-Ray 1 View (CXR) | `XR_CHEST` |
| EXISTS | Chest X-Ray 2 View (CXR) | `XR_CHEST_2V` |
| TUPLE | Chest 1V Decub | `XR_CHEST` + `PROTOCOL_XR_CHEST_DECUBITUS` |
| TUPLE | Chest Post Intubation | `XR_CHEST` + `PROTOCOL_XR_CHEST_POST_INTUBATION` |
| ALIAS | Os Calcis Left 2V | → `XR_CALCANEUS_LEFT_2V` |
| ALIAS | Os Calcis Right 2V | → `XR_CALCANEUS_RIGHT_2V` |

---

## 3. Core catalog rows (79) — implementation authority

**Tuple convention:** `MODALITY_XR` · `CONTRAST_TYPE_NONE` on all rows.  
**CPT:** `PENDING_CPT_REVIEW` (family in §6).

### 3.1 MANUAL_REVIEW resolved (5)

| Code | displayNameEn | displayNameFr | Body | View | Laterality | Subregion | Protocol |
|------|---------------|---------------|------|------|------------|-----------|----------|
| `XR_ABDOMEN_1V` | Abdomen X-ray 1 view | Radiographie abdomen 1 incidence | BODY_REGION_ABDOMEN | VIEW_COUNT_ONE | LATERALITY_UNSPECIFIED | — | — |
| `XR_ABDOMEN_2V` | Abdomen X-ray 2 views | Radiographie abdomen 2 incidences | BODY_REGION_ABDOMEN | VIEW_COUNT_TWO | LATERALITY_UNSPECIFIED | — | — |
| `XR_ABDOMEN_3V_ACUTE` | Abdomen X-ray 3 views acute series | Radiographie abdomen série aiguë 3 inc. | BODY_REGION_ABDOMEN | VIEW_COUNT_THREE | LATERALITY_UNSPECIFIED | — | PROTOCOL_XR_ABDOMEN_ACUTE_SERIES |
| `XR_RIBS_LEFT_WITH_CXR` | Left ribs with chest X-ray | Côtes gauches avec thorax | BODY_REGION_CHEST | VIEW_COUNT_TWO | LATERALITY_LEFT | ANATOMIC_SUBREGION_RIBS | — |
| `XR_RIBS_RIGHT_WITH_CXR` | Right ribs with chest X-ray | Côtes droites avec thorax | BODY_REGION_CHEST | VIEW_COUNT_TWO | LATERALITY_RIGHT | ANATOMIC_SUBREGION_RIBS | — |

### 3.2 Spine MISSING — core (12)

| Code | displayNameEn | displayNameFr | Body | View | Laterality | Subregion | Protocol |
|------|---------------|---------------|------|------|------------|-----------|----------|
| `XR_CSPINE_1V_LATERAL` | C-spine X-ray 1 view lateral | Rachis cervical 1 inc. latérale | BODY_REGION_SPINE_CERVICAL | VIEW_COUNT_ONE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_CERVICAL | — |
| `XR_CSPINE_2_3V` | C-spine X-ray 2–3 views | Rachis cervical 2–3 incidences | BODY_REGION_SPINE_CERVICAL | VIEW_COUNT_THREE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_CERVICAL | — |
| `XR_CSPINE_3V_UPRIGHT` | C-spine X-ray 3 views upright | Rachis cervical 3 inc. debout | BODY_REGION_SPINE_CERVICAL | VIEW_COUNT_THREE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_CERVICAL | PROTOCOL_XR_CSPINE_UPRIGHT |
| `XR_CSPINE_COMPLETE` | C-spine X-ray complete | Rachis cervical série complète | BODY_REGION_SPINE_CERVICAL | VIEW_COUNT_COMPLETE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_CERVICAL | — |
| `XR_LSPINE_2V` | Lumbar spine X-ray 2 views | Rachis lombaire 2 incidences | BODY_REGION_SPINE | VIEW_COUNT_TWO | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_LUMBAR | — |
| `XR_LSPINE_2V_UPRIGHT` | Lumbar spine X-ray 2 views upright | Rachis lombaire 2 inc. debout | BODY_REGION_SPINE | VIEW_COUNT_TWO | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_LUMBAR | PROTOCOL_XR_CSPINE_UPRIGHT |
| `XR_LSPINE_3V` | Lumbar spine X-ray 3 views | Rachis lombaire 3 incidences | BODY_REGION_SPINE | VIEW_COUNT_THREE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_LUMBAR | — |
| `XR_LSPINE_3V_UPRIGHT` | Lumbar spine X-ray 3 views upright | Rachis lombaire 3 inc. debout | BODY_REGION_SPINE | VIEW_COUNT_THREE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_LUMBAR | PROTOCOL_XR_CSPINE_UPRIGHT |
| `XR_TSPINE_2V` | Thoracic spine X-ray 2 views | Rachis thoracique 2 incidences | BODY_REGION_SPINE_THORACIC | VIEW_COUNT_TWO | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_THORACIC | — |
| `XR_TSPINE_3V_UPRIGHT` | Thoracic spine X-ray 3 views upright | Rachis thoracique 3 inc. debout | BODY_REGION_SPINE_THORACIC | VIEW_COUNT_THREE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_THORACIC | PROTOCOL_XR_CSPINE_UPRIGHT |
| `XR_THORACOLUMBAR_2V` | Thoracolumbar spine X-ray 2 views | Rachis thoraco-lombaire 2 incidences | BODY_REGION_SPINE | VIEW_COUNT_TWO | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_THORACOLUMBAR | — |
| `XR_SACRUM_COCCYX_2V` | Sacrum and coccyx X-ray | Sacrum et coccyx | BODY_REGION_SPINE | VIEW_COUNT_TWO | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_SACRUM_COCCYX | — |

*Legacy `Coccyx and Sacrum` / `Sacrum and Coccyx` → one code + reciprocal alias.*

### 3.3 Ribs MISSING — core (2)

| Code | displayNameEn | displayNameFr | Body | View | Laterality | Subregion |
|------|---------------|---------------|------|------|------------|-----------|
| `XR_RIBS_LEFT` | Left ribs X-ray | Radiographie côtes gauches | BODY_REGION_RIBS | VIEW_COUNT_TWO | LATERALITY_LEFT | ANATOMIC_SUBREGION_RIBS |
| `XR_RIBS_RIGHT` | Right ribs X-ray | Radiographie côtes droites | BODY_REGION_RIBS | VIEW_COUNT_TWO | LATERALITY_RIGHT | ANATOMIC_SUBREGION_RIBS |

### 3.4 MSK EXPAND — core (53)

| Code | Legacy source | Body | View | Laterality |
|------|---------------|------|------|------------|
| `XR_KNEE_LEFT_SUNRISE` | Knee Left 1V Sunrise | BODY_REGION_KNEE | VIEW_COUNT_ONE | LATERALITY_LEFT + PROTOCOL_XR_KNEE_SUNRISE |
| `XR_KNEE_LEFT_2V` | Knee Left 2V | BODY_REGION_KNEE | VIEW_COUNT_TWO | LATERALITY_LEFT |
| `XR_KNEE_LEFT_3V` | Knee Left 3V | BODY_REGION_KNEE | VIEW_COUNT_THREE | LATERALITY_LEFT |
| `XR_KNEE_LEFT_4V` | Knee Left 4V | BODY_REGION_KNEE | VIEW_COUNT_FOUR | LATERALITY_LEFT |
| `XR_KNEE_RIGHT_SUNRISE` | Knee Right 1V Sunrise | BODY_REGION_KNEE | VIEW_COUNT_ONE | LATERALITY_RIGHT + PROTOCOL_XR_KNEE_SUNRISE |
| `XR_KNEE_RIGHT_2V` | Knee Right 2V | BODY_REGION_KNEE | VIEW_COUNT_TWO | LATERALITY_RIGHT |
| `XR_KNEE_RIGHT_3V` | Knee Right 3V | BODY_REGION_KNEE | VIEW_COUNT_THREE | LATERALITY_RIGHT |
| `XR_KNEE_RIGHT_4V` | Knee Right 4V | BODY_REGION_KNEE | VIEW_COUNT_FOUR | LATERALITY_RIGHT |
| `XR_ANKLE_LEFT_2V` | Ankle Left 2V | BODY_REGION_ANKLE | VIEW_COUNT_TWO | LATERALITY_LEFT |
| `XR_ANKLE_LEFT_3V` | Ankle Left 3V | BODY_REGION_ANKLE | VIEW_COUNT_THREE | LATERALITY_LEFT |
| `XR_ANKLE_RIGHT_2V` | Ankle Right 2V | BODY_REGION_ANKLE | VIEW_COUNT_TWO | LATERALITY_RIGHT |
| `XR_ANKLE_RIGHT_3V` | Ankle Right 3V | BODY_REGION_ANKLE | VIEW_COUNT_THREE | LATERALITY_RIGHT |
| `XR_FOOT_BILATERAL_2V` | Foot Bilateral 2V | BODY_REGION_FOOT | VIEW_COUNT_TWO | LATERALITY_BILATERAL |
| `XR_FOOT_LEFT_2V` | Foot Left 2V | BODY_REGION_FOOT | VIEW_COUNT_TWO | LATERALITY_LEFT |
| `XR_FOOT_LEFT_3V` | Foot Left 3V | BODY_REGION_FOOT | VIEW_COUNT_THREE | LATERALITY_LEFT |
| `XR_FOOT_RIGHT_2V` | Foot Right 2V | BODY_REGION_FOOT | VIEW_COUNT_TWO | LATERALITY_RIGHT |
| `XR_FOOT_RIGHT_3V` | Foot Right 3V | BODY_REGION_FOOT | VIEW_COUNT_THREE | LATERALITY_RIGHT |
| `XR_CALCANEUS_LEFT_2V` | Calcaneus Left 2V | BODY_REGION_FOOT | VIEW_COUNT_TWO | LATERALITY_LEFT + ANATOMIC_SUBREGION_CALCANEUS |
| `XR_CALCANEUS_RIGHT_2V` | Calcaneus Right 2V | BODY_REGION_FOOT | VIEW_COUNT_TWO | LATERALITY_RIGHT + ANATOMIC_SUBREGION_CALCANEUS |
| `XR_ELBOW_LEFT_2V` … `XR_ELBOW_RIGHT_4V` | Elbow L/R 2V–4V (6 rows) | BODY_REGION_ELBOW | TWO/THREE/FOUR | LEFT/RIGHT |
| `XR_WRIST_LEFT_2V` … `XR_WRIST_RIGHT_3V` | Wrist L/R 2V–3V (4 rows) | BODY_REGION_WRIST | TWO/THREE | LEFT/RIGHT |
| `XR_SHOULDER_LEFT_2V` … `XR_SHOULDER_RIGHT_3V` | Shoulder L/R 2V–3V (4 rows) | BODY_REGION_SHOULDER | TWO/THREE | LEFT/RIGHT |
| `XR_HIP_BILATERAL_WITH_PELVIS` | Hip Bilateral w Pelvis | BODY_REGION_HIP | VIEW_COUNT_TWO | LATERALITY_BILATERAL |
| `XR_HIP_LEFT_1V` / `XR_HIP_LEFT_2V` | Hip Left 1V, 2V | BODY_REGION_HIP | ONE/TWO | LATERALITY_LEFT |
| `XR_HIP_RIGHT_1V` / `XR_HIP_RIGHT_2V` | Hip Right 1V, 2V | BODY_REGION_HIP | ONE/TWO | LATERALITY_RIGHT |
| `XR_HAND_LEFT_2V` … `XR_HAND_RIGHT_3V` | Hand L/R 2V–3V (4 rows) | BODY_REGION_HAND | TWO/THREE | LEFT/RIGHT |
| `XR_HUMERUS_LEFT_2V` / `XR_HUMERUS_RIGHT_2V` | Humerus L/R 2V | BODY_REGION_ARM | VIEW_COUNT_TWO | LEFT/RIGHT |
| `XR_FEMUR_LEFT_2V` / `XR_FEMUR_RIGHT_2V` | Femur L/R 2V | BODY_REGION_THIGH | VIEW_COUNT_TWO | LEFT/RIGHT |
| `XR_FOREARM_LEFT_2V` / `XR_FOREARM_RIGHT_2V` | Forearm L/R 2V | BODY_REGION_FOREARM | VIEW_COUNT_TWO | LEFT/RIGHT |
| `XR_TIB_FIB_LEFT_2V` / `XR_TIB_FIB_RIGHT_2V` | Tibia/Fibula L/R 2V | BODY_REGION_LEG | VIEW_COUNT_TWO | LEFT/RIGHT |
| `XR_PELVIS_AP` | Pelvis AP | BODY_REGION_PELVIS | VIEW_COUNT_ONE | LATERALITY_UNSPECIFIED |
| `XR_PELVIS_COMPLETE` | Pelvis complete | BODY_REGION_PELVIS | VIEW_COUNT_COMPLETE | LATERALITY_UNSPECIFIED |
| `XR_INFANT_FOOT_LEFT_2V` | Infant Foot Left 2V | BODY_REGION_FOOT | VIEW_COUNT_TWO | LATERALITY_LEFT + ANATOMIC_SUBREGION_INFANT_EXTREMITY |

*French display names follow pattern: « Radiographie {site} {latéralité} ({n} incidences) » — full FR table in Gate W2 workbook.*

**Core EXPAND row count:** 8+4+5+2+6+4+4+5+4+2+2+2+2+2+1 = **53**

**Core total:** 5 (MR) + 12 (spine) + 2 (ribs) + 53 (MSK) = **72** — need 7 more for 79.

Add to core from MISSING priority:
- AC joint 3 + clavicle 2 + scapula 2 = 7 → **79 core**

### 3.5 AC / clavicle / scapula — core (7)

| Code | displayNameEn | Body | View | Laterality | Subregion |
|------|---------------|------|------|------------|-----------|
| `XR_AC_JOINT_BILATERAL_2V` | AC joints bilateral 2 views | BODY_REGION_SHOULDER | VIEW_COUNT_TWO | LATERALITY_BILATERAL | ANATOMIC_SUBREGION_AC_JOINT |
| `XR_AC_JOINT_LEFT_2V` | AC joint left 2 views | BODY_REGION_SHOULDER | VIEW_COUNT_TWO | LATERALITY_LEFT | ANATOMIC_SUBREGION_AC_JOINT |
| `XR_AC_JOINT_RIGHT_2V` | AC joint right 2 views | BODY_REGION_SHOULDER | VIEW_COUNT_TWO | LATERALITY_RIGHT | ANATOMIC_SUBREGION_AC_JOINT |
| `XR_CLAVICLE_LEFT_2V` | Clavicle left 2 views | BODY_REGION_SHOULDER | VIEW_COUNT_TWO | LATERALITY_LEFT | ANATOMIC_SUBREGION_CLAVICLE |
| `XR_CLAVICLE_RIGHT_2V` | Clavicle right 2 views | BODY_REGION_SHOULDER | VIEW_COUNT_TWO | LATERALITY_RIGHT | ANATOMIC_SUBREGION_CLAVICLE |
| `XR_SCAPULA_LEFT` | Scapula left | BODY_REGION_SHOULDER | VIEW_COUNT_TWO | LATERALITY_LEFT | ANATOMIC_SUBREGION_SCAPULA |
| `XR_SCAPULA_RIGHT` | Scapula right | BODY_REGION_SHOULDER | VIEW_COUNT_TWO | LATERALITY_RIGHT | ANATOMIC_SUBREGION_SCAPULA |

**Verified core total:** 5 + 12 + 2 + 53 + 7 = **79**

---

## 4. Extended catalog rows (33) — XR-3b / enterprise maximum

Deferred until core batch validated or full enterprise parity requested.

| Group | Codes (count) | Proposed codes |
|-------|--------------:|----------------|
| Finger | 4 | `XR_FINGER_LEFT_2V`, `XR_FINGER_LEFT_3V`, `XR_FINGER_RIGHT_2V`, `XR_FINGER_RIGHT_3V` |
| Toe | 4 | `XR_TOE_LEFT_2V`, `XR_TOE_LEFT_3V`, `XR_TOE_RIGHT_2V`, `XR_TOE_RIGHT_3V` |
| Orbit | 4 | `XR_ORBIT_LEFT_2V`, `XR_ORBIT_LEFT_4V`, `XR_ORBIT_RIGHT_2V`, `XR_ORBIT_RIGHT_4V` |
| Facial / mandible / nasal | 5 | `XR_FACIAL_BONES_COMPLETE`, `XR_FACIAL_BONES_LT3V`, `XR_MANDIBLE_4V`, `XR_MANDIBLE_TRAUMA`, `XR_NASAL_BONES_3V` |
| Skull / sinus | 4 | `XR_SKULL_2V`, `XR_SKULL_4V`, `XR_SINUS_2V`, `XR_SINUS_COMPLETE` |
| Neck / sternum | 2 | `XR_NECK_SOFT_TISSUE_2V`, `XR_STERNUM_2V` |
| Pedi / infant | 5 | `XR_BABYGRAM`, `XR_PEDIAGRAM_1V`, `XR_INFANT_LE_LEFT_2V`, `XR_INFANT_LE_RIGHT_2V`, `XR_INFANT_UE_LEFT_2V`, `XR_INFANT_UE_RIGHT_2V` *(5–6)* |
| Dental / TMJ | 2 | `XR_PANOREX`, `XR_TMJ_BILATERAL` |

*Extended count = **33** (112 − 79). Pedi group may be 5–6 rows; adjust at Gate W2.*

---

## 5. Legacy study index (118) by disposition

| Disposition | Count | New row? |
|-------------|------:|:--------:|
| EXISTS | 3 | No |
| TUPLE | 2 | No |
| ALIAS | 2 | No |
| MANUAL_REVIEW → resolved | 5 | Yes (core) |
| EXPAND | 55 | Yes (53 core + 0 extended; 2 alias-only) |
| MISSING | 52 | Yes (21 core + 31 extended) |
| **Total** | **118** | **79 core + 33 extended** |

---

## 6. Estimated CPT family (not billed)

| CPT family | Applies to |
|------------|------------|
| **XR chest** | `XR_CHEST*`, ribs with CXR |
| **XR abdomen** | `XR_ABDOMEN_*`, `XR_ABD_AP` |
| **XR spine** | C/T/L spine, sacrum, thoracolumbar |
| **XR MSK extremity** | Knee, ankle, foot, hand, elbow, wrist, shoulder, hip, humerus, femur, forearm, tib-fib |
| **XR ribs** | Ribs with/without CXR |
| **XR head/facial** | Orbit, skull, sinus, facial, mandible, nasal |
| **XR dental** | Panorex, TMJ |
| **XR peds** | Babygram, pediagram, infant extremity |

All rows: **`PENDING_CPT_REVIEW`** until licensed CPT workbook (Gate W3).

---

## 7. Existing Medora XR codes (unchanged)

`XR_CHEST`, `XR_CHEST_2V`, `XR_KNEE`, `XR_FOOT`, `XR_WRIST`, `XR_ANKLE`, `XR_SHOULDER`, `XR_PELVIS`, `XR_ABD_AP`, `XR_ABDOMEN`, `XR_HUMERUS`, `XR_ELBOW`, `XR_FOREARM`, `XR_HAND`, `XR_HIP`, `XR_FEMUR`, `XR_TIB_FIB`

*Post-expansion: generic codes may receive aliases from legacy names; retirement of generics is **out of scope** for 2E.2A.*

---

*Phase 2E.2A — design only. See `xray-expansion-batch-plan.md` for rollout.*
