# MRI / MRA Expansion Candidate List (Phase 2E.2C)

**Phase:** 2E.2C — design authority  
**Date:** 2026-06-01  
**Classifier vocabulary:** ICM-1.0  

---

## 1. Summary

| Metric | MRI | MRA | Total |
|--------|----:|----:|------:|
| Legacy studies | 27 | 5 | 32 |
| **New catalog rows** | **25** | **5** | **30** |
| Core MRI (MRI-1) | 11 | — | 11 |
| Advanced MRI (MRI-2) | 14 | — | 14 |
| Protocol-driven *(new rows)* | 1 | 0 | 1 |
| Protocol-driven *(tuple only)* | 1 | 0 | 0 rows |
| MRA-1 | — | 5 | 5 |

**Row tags:** `CORE` = MRI-1 · `ADVANCED` = MRI-2 · `PROTOCOL` = requires `protocolClassifierId` · `MRA` = MRA-1

---

## 2. Absorbed by existing catalog (no new row)

| Legacy study | Disposition | Target |
|--------------|-------------|--------|
| MRI Head wo Contrast | EXISTS_IN_MEDORA | `MRI_BRAIN` — `CONTRAST_TYPE_WITHOUT` |
| MRI Head/Brain Limited | PARTIAL_MATCH → TUPLE | `MRI_BRAIN` + limited-exam alias/protocol |
| MRI Head w&wo Contrast *(wo phase only)* | PARTIAL_MATCH | wo leg → `MRI_BRAIN` |

---

## 3. Complete MRI candidate matrix (25 rows)

### 3.1 Core MRI — MRI-1 (11 rows)

| Code | Batch | displayNameEn | displayNameFr | Modality | Body | Contrast | Laterality | Subregion | Protocol |
|------|-------|---------------|---------------|----------|------|----------|------------|-----------|----------|
| `MRI_BRAIN_W_CONTRAST` | CORE | MRI brain with contrast | IRM cérébrale avec contraste | MODALITY_MRI | BODY_REGION_HEAD | CONTRAST_TYPE_WITH | LATERALITY_UNSPECIFIED | — | — |
| `MRI_BRAIN_W_WO_CONTRAST` | CORE | MRI brain with and without contrast | IRM cérébrale avec et sans contraste | MODALITY_MRI | BODY_REGION_HEAD | CONTRAST_TYPE_WITH_AND_WITHOUT | LATERALITY_UNSPECIFIED | — | — |
| `MRI_CSPINE_WO_CONTRAST` | CORE | MRI cervical spine without contrast | IRM rachis cervical sans contraste | MODALITY_MRI | BODY_REGION_SPINE_CERVICAL | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_CERVICAL | — |
| `MRI_CSPINE_W_CONTRAST` | CORE | MRI cervical spine with contrast | IRM rachis cervical avec contraste | MODALITY_MRI | BODY_REGION_SPINE_CERVICAL | CONTRAST_TYPE_WITH | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_CERVICAL | — |
| `MRI_CSPINE_W_WO_CONTRAST` | CORE | MRI cervical spine with and without contrast | IRM rachis cervical avec et sans contraste | MODALITY_MRI | BODY_REGION_SPINE_CERVICAL | CONTRAST_TYPE_WITH_AND_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_CERVICAL | — |
| `MRI_LSPINE_WO_CONTRAST` | CORE | MRI lumbar spine without contrast | IRM rachis lombaire sans contraste | MODALITY_MRI | BODY_REGION_SPINE | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_LUMBAR | — |
| `MRI_LSPINE_W_CONTRAST` | CORE | MRI lumbar spine with contrast | IRM rachis lombaire avec contraste | MODALITY_MRI | BODY_REGION_SPINE | CONTRAST_TYPE_WITH | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_LUMBAR | — |
| `MRI_LSPINE_W_WO_CONTRAST` | CORE | MRI lumbar spine with and without contrast | IRM rachis lombaire avec et sans contraste | MODALITY_MRI | BODY_REGION_SPINE | CONTRAST_TYPE_WITH_AND_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_LUMBAR | — |
| `MRI_TSPINE_WO_CONTRAST` | CORE | MRI thoracic spine without contrast | IRM rachis thoracique sans contraste | MODALITY_MRI | BODY_REGION_SPINE_THORACIC | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_THORACIC | — |
| `MRI_TSPINE_W_CONTRAST` | CORE | MRI thoracic spine with contrast | IRM rachis thoracique avec contraste | MODALITY_MRI | BODY_REGION_SPINE_THORACIC | CONTRAST_TYPE_WITH | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_THORACIC | — |
| `MRI_TSPINE_W_WO_CONTRAST` | CORE | MRI thoracic spine with and without contrast | IRM rachis thoracique avec et sans contraste | MODALITY_MRI | BODY_REGION_SPINE_THORACIC | CONTRAST_TYPE_WITH_AND_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_THORACIC | — |

### 3.2 Advanced MRI — MRI-2 (14 rows)

| Code | Batch | displayNameEn | displayNameFr | Modality | Body | Contrast | Laterality | Subregion | Protocol |
|------|-------|---------------|---------------|----------|------|----------|------------|-----------|----------|
| `MRI_CHOLANGIOGRAM` | ADVANCED | MRI cholangiogram | IRM cholangiographie | MODALITY_MRI | BODY_REGION_HEPATOBILIARY | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_BILIARY | PROTOCOL_MRI_CHOLANGIOGRAM |
| `MRI_HIP_BILATERAL_WO_CONTRAST` | ADVANCED | MRI hip bilateral without contrast | IRM hanche bilatérale sans contraste | MODALITY_MRI | BODY_REGION_HIP | CONTRAST_TYPE_WITHOUT | LATERALITY_BILATERAL | — | — |
| `MRI_HIP_LEFT_WO_CONTRAST` | ADVANCED | MRI hip left without contrast | IRM hanche gauche sans contraste | MODALITY_MRI | BODY_REGION_HIP | CONTRAST_TYPE_WITHOUT | LATERALITY_LEFT | — | — |
| `MRI_HIP_RIGHT_WO_CONTRAST` | ADVANCED | MRI hip right without contrast | IRM hanche droite sans contraste | MODALITY_MRI | BODY_REGION_HIP | CONTRAST_TYPE_WITHOUT | LATERALITY_RIGHT | — | — |
| `MRI_KNEE_LEFT` | ADVANCED | MRI knee left | IRM genou gauche | MODALITY_MRI | BODY_REGION_KNEE | CONTRAST_TYPE_WITHOUT | LATERALITY_LEFT | — | — |
| `MRI_KNEE_RIGHT` | ADVANCED | MRI knee right | IRM genou droit | MODALITY_MRI | BODY_REGION_KNEE | CONTRAST_TYPE_WITHOUT | LATERALITY_RIGHT | — | — |
| `MRI_LOWER_EXTREMITY_LEFT_W_WO_CONTRAST` | ADVANCED | MRI lower extremity left with and without contrast | IRM membre inférieur gauche avec et sans contraste | MODALITY_MRI | BODY_REGION_LOWER_EXTREMITY | CONTRAST_TYPE_WITH_AND_WITHOUT | LATERALITY_LEFT | — | — |
| `MRI_LOWER_EXTREMITY_RIGHT_W_WO_CONTRAST` | ADVANCED | MRI lower extremity right with and without contrast | IRM membre inférieur droit avec et sans contraste | MODALITY_MRI | BODY_REGION_LOWER_EXTREMITY | CONTRAST_TYPE_WITH_AND_WITHOUT | LATERALITY_RIGHT | — | — |
| `MRI_PELVIS` | ADVANCED | MRI pelvis | IRM pelvis | MODALITY_MRI | BODY_REGION_PELVIS | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | — | — |
| `MRI_PELVIS_LIMITED` | ADVANCED | MRI pelvis limited | IRM pelvis limitée | MODALITY_MRI | BODY_REGION_PELVIS | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | — | — |
| `MRI_SELLA` | ADVANCED | MRI sella | IRM selle turcique | MODALITY_MRI | BODY_REGION_HEAD | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SELLA | — |
| `MRI_UPPER_EXTREMITY_LEFT_WO_CONTRAST` | ADVANCED | MRI upper extremity left without contrast | IRM membre supérieur gauche sans contraste | MODALITY_MRI | BODY_REGION_UPPER_EXTREMITY | CONTRAST_TYPE_WITHOUT | LATERALITY_LEFT | — | — |
| `MRI_UPPER_EXTREMITY_RIGHT_WO_CONTRAST` | ADVANCED | MRI upper extremity right without contrast | IRM membre supérieur droit sans contraste | MODALITY_MRI | BODY_REGION_UPPER_EXTREMITY | CONTRAST_TYPE_WITHOUT | LATERALITY_RIGHT | — | — |
| `MRI_UPPER_EXTREMITY_RIGHT_W_WO_CONTRAST` | ADVANCED | MRI upper extremity right with and without contrast | IRM membre supérieur droit avec et sans contraste | MODALITY_MRI | BODY_REGION_UPPER_EXTREMITY | CONTRAST_TYPE_WITH_AND_WITHOUT | LATERALITY_RIGHT | — | — |

### 3.3 Protocol-driven rows

| Type | Code / target | Protocol |
|------|---------------|----------|
| **New row (PROTOCOL tag)** | `MRI_CHOLANGIOGRAM` | `PROTOCOL_MRI_CHOLANGIOGRAM` |
| **Tuple only (0 new rows)** | `MRI_BRAIN` | Limited-exam protocol/alias for `MRI Head/Brain Limited` |

**View count:** NOT_APPLICABLE on all MRI/MRA rows.

---

## 4. Complete MRA candidate matrix (5 rows) — MRA-1

| Code | displayNameEn | displayNameFr | Modality | Body | Contrast | Laterality | Subregion | Protocol |
|------|---------------|---------------|----------|------|----------|------------|-----------|----------|
| `MRA_BRAIN` | MRA brain | ARM cérébrale | MODALITY_MRA | BODY_REGION_HEAD | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | — | — |
| `MRA_CAROTID_W_CONTRAST` | MRA carotid with contrast | ARM carotides avec contraste | MODALITY_MRA | BODY_REGION_HEAD_NECK | CONTRAST_TYPE_WITH | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_CAROTID | — |
| `MRA_CAROTID_WO_CONTRAST` | MRA carotid without contrast | ARM carotides sans contraste | MODALITY_MRA | BODY_REGION_HEAD_NECK | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_CAROTID | — |
| `MRA_LE_LEFT_W_CONTRAST` | MRA lower extremity left with contrast | ARM membre inférieur gauche avec contraste | MODALITY_MRA | BODY_REGION_LOWER_EXTREMITY | CONTRAST_TYPE_WITH | LATERALITY_LEFT | — | — |
| `MRA_LE_RIGHT_W_CONTRAST` | MRA lower extremity right with contrast | ARM membre inférieur droit avec contraste | MODALITY_MRA | BODY_REGION_LOWER_EXTREMITY | CONTRAST_TYPE_WITH | LATERALITY_RIGHT | — | — |

| MRA disposition | Count |
|-----------------|------:|
| KEEP DISTINCT | 5 |
| ALIAS | 0 |
| SUCCESSOR | 0 |

---

## 5. Contrast rollup (approved taxonomy)

### 5.1 New rows (30)

| ICM contrast | MRI | MRA | Total |
|--------------|----:|----:|------:|
| `CONTRAST_TYPE_WITHOUT` | 16 | 2 | **18** |
| `CONTRAST_TYPE_WITH` | 5 | 3 | **8** |
| `CONTRAST_TYPE_WITH_AND_WITHOUT` | 4 | 0 | **4** |
| Intentional null *(B1B UNSPECIFIED)* | 0 | 0 | **0** |

### 5.2 Existing (unchanged)

| Code | Contrast FK |
|------|-------------|
| `MRI_BRAIN` | `CONTRAST_TYPE_WITHOUT` |
| `MRI_SPINE` | **null** *(B1B intentional — only UNSPECIFIED in catalog)* |

---

## 6. Existing Medora rows (reference)

| Code | Role in 2E.2C |
|------|----------------|
| `MRI_BRAIN` | Unchanged; anchor for head wo + limited tuple |
| `MRI_SPINE` | Unchanged; B1B null contrast; not retired when regional spine codes added |

---

## 7. CPT

All **30** new rows: `PENDING_CPT_REVIEW` (Gate W3).

---

*See `mri-mra-expansion-governance.md` and `mri-mra-expansion-batch-plan.md`.*
