# CT / CTA Expansion Candidate List (Phase 2E.2B)

**Phase:** 2E.2B — design authority for catalog rows  
**Date:** 2026-06-01  
**Classifier vocabulary:** ICM-1.0  

| Metric | CT | CTA | Total |
|--------|---:|----:|------:|
| Legacy studies | 43 | 12 | 55 |
| **New catalog rows** | **31** | **4** | **35** |

**View count:** NOT_APPLICABLE (null FK) on all CT/CTA rows unless noted.

---

## 1. No new row (20 legacy studies)

See `ct-cta-expansion-governance.md` §2.3–2.7 (EXISTS, SUCCESSOR, ALIAS, TUPLE, MANUAL_REVIEW resolved).

---

## 2. New CT catalog rows (31)

### 2.1 EXPAND — contrast & pelvis (7)

| Code | displayNameEn | displayNameFr | Modality | Body | Contrast* | Laterality | Subregion | Protocol |
|------|---------------|---------------|----------|------|---------|------------|-----------|----------|
| `CT_HEAD_W_CONTRAST` | CT head with IV contrast | TDM tête avec contraste IV | MODALITY_CT | BODY_REGION_HEAD | IV | LATERALITY_UNSPECIFIED | — | — |
| `CT_CHEST_W_IV_CONTRAST` | CT chest with IV contrast | TDM thorax avec contraste IV | MODALITY_CT | BODY_REGION_CHEST | IV | LATERALITY_UNSPECIFIED | — | — |
| `CT_CHEST_W_WO_CONTRAST` | CT chest with and without IV contrast | TDM thorax avec et sans contraste IV | MODALITY_CT | BODY_REGION_CHEST | IV_ORAL† | LATERALITY_UNSPECIFIED | — | — |
| `CT_ABDOMEN_PELVIS_W_IV_CONTRAST` | CT abdomen/pelvis with IV contrast | TDM abdomen/pelvis avec contraste IV | MODALITY_CT | BODY_REGION_ABDOMEN_PELVIS | IV | LATERALITY_UNSPECIFIED | — | — |
| `CT_ABDOMEN_PELVIS_W_WO_CONTRAST` | CT abdomen/pelvis with and without IV contrast | TDM abdomen/pelvis avec et sans contraste IV | MODALITY_CT | BODY_REGION_ABDOMEN_PELVIS | IV_ORAL† | LATERALITY_UNSPECIFIED | — | — |
| `CT_PELVIS_WO_CONTRAST` | CT pelvis without IV contrast | TDM pelvis sans contraste IV | MODALITY_CT | BODY_REGION_PELVIS | NONE | LATERALITY_UNSPECIFIED | — | — |
| `CT_PELVIS_W_WO_CONTRAST` | CT pelvis with and without IV contrast | TDM pelvis avec et sans contraste IV | MODALITY_CT | BODY_REGION_PELVIS | IV_ORAL† | LATERALITY_UNSPECIFIED | — | — |

\* **IV** = `CONTRAST_TYPE_WITH`; **NONE** = `CONTRAST_TYPE_WITHOUT`; **IV_ORAL†** = `CONTRAST_TYPE_WITH_AND_WITHOUT` (design label CONTRAST_IV_ORAL).  
*Legacy `CT Soft Tissue Neck` → alias to `CT_STN_WO_CONTRAST` (not a separate code).*

**EXPAND subtotal:** **7**

### 2.2 MISSING — anatomy & protocols (24)

| Code | displayNameEn | displayNameFr | Modality | Body | Contrast | Laterality | Subregion | Protocol |
|------|---------------|---------------|----------|------|----------|------------|-----------|----------|
| `CT_BRAIN_PERFUSION` | CT brain perfusion | TDM perfusion cérébrale | MODALITY_CT | BODY_REGION_HEAD | NONE | LATERALITY_UNSPECIFIED | — | PROTOCOL_CT_BRAIN_PERFUSION |
| `CT_FACIAL_WO_CONTRAST` | CT facial bones without contrast | TDM os faciaux sans contraste | MODALITY_CT | BODY_REGION_FACE | NONE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_FACIAL_BONES | — |
| `CT_MAXILLOFACIAL_WO_CONTRAST` | CT maxillofacial without contrast | TDM maxillo-facial sans contraste | MODALITY_CT | BODY_REGION_FACE | NONE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_FACIAL_BONES | — |
| `CT_MAXILLOFACIAL_W_IV_CONTRAST` | CT maxillofacial with IV contrast | TDM maxillo-facial avec contraste IV | MODALITY_CT | BODY_REGION_FACE | IV | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_FACIAL_BONES | — |
| `CT_ORBITS_WO_CONTRAST` | CT orbits without contrast | TDM orbites sans contraste | MODALITY_CT | BODY_REGION_HEAD | NONE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_ORBIT | — |
| `CT_SINUSES_WO_CONTRAST` | CT sinuses without contrast | TDM sinus sans contraste | MODALITY_CT | BODY_REGION_SINUS | NONE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SINUS | — |
| `CT_STN_WO_CONTRAST` | CT soft tissue neck without contrast | TDM parties molles du cou sans contraste | MODALITY_CT | BODY_REGION_HEAD_NECK | NONE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_NECK_SOFT_TISSUE | — |
| `CT_STN_W_IV_CONTRAST` | CT soft tissue neck with IV contrast | TDM parties molles du cou avec contraste IV | MODALITY_CT | BODY_REGION_HEAD_NECK | IV | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_NECK_SOFT_TISSUE | — |
| `CT_STN_W_WO_CONTRAST` | CT soft tissue neck with and without IV contrast | TDM parties molles du cou avec et sans contraste IV | MODALITY_CT | BODY_REGION_HEAD_NECK | IV_ORAL† | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_NECK_SOFT_TISSUE | — |
| `CT_TSPINE_WO_CONTRAST` | CT thoracic spine without contrast | TDM rachis thoracique sans contraste | MODALITY_CT | BODY_REGION_SPINE_THORACIC | NONE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_THORACIC | — |
| `CT_FOOT_LEFT_WO_CONTRAST` | CT foot left without contrast | TDM pied gauche sans contraste | MODALITY_CT | BODY_REGION_FOOT | NONE | LATERALITY_LEFT | — | — |
| `CT_FOOT_RIGHT_WO_CONTRAST` | CT foot right without contrast | TDM pied droit sans contraste | MODALITY_CT | BODY_REGION_FOOT | NONE | LATERALITY_RIGHT | — | — |
| `CT_HIP_LEFT_WO_CONTRAST` | CT hip left without contrast | TDM hanche gauche sans contraste | MODALITY_CT | BODY_REGION_HIP | NONE | LATERALITY_LEFT | — | — |
| `CT_HIP_RIGHT_WO_CONTRAST` | CT hip right without contrast | TDM hanche droite sans contraste | MODALITY_CT | BODY_REGION_HIP | NONE | LATERALITY_RIGHT | — | — |
| `CT_KNEE_LEFT_WO_CONTRAST` | CT knee left without contrast | TDM genou gauche sans contraste | MODALITY_CT | BODY_REGION_KNEE | NONE | LATERALITY_LEFT | — | — |
| `CT_KNEE_RIGHT_WO_CONTRAST` | CT knee right without contrast | TDM genou droit sans contraste | MODALITY_CT | BODY_REGION_KNEE | NONE | LATERALITY_RIGHT | — | — |
| `CT_LOWER_EXTREMITY_LEFT_W_IV_CONTRAST` | CT lower extremity left with IV contrast | TDM membre inférieur gauche avec contraste IV | MODALITY_CT | BODY_REGION_LOWER_EXTREMITY | IV | LATERALITY_LEFT | — | — |
| `CT_LOWER_EXTREMITY_LEFT_WO_CONTRAST` | CT lower extremity left without contrast | TDM membre inférieur gauche sans contraste | MODALITY_CT | BODY_REGION_LOWER_EXTREMITY | NONE | LATERALITY_LEFT | — | — |
| `CT_LOWER_EXTREMITY_RIGHT_W_IV_CONTRAST` | CT lower extremity right with IV contrast | TDM membre inférieur droit avec contraste IV | MODALITY_CT | BODY_REGION_LOWER_EXTREMITY | IV | LATERALITY_RIGHT | — | — |
| `CT_LOWER_EXTREMITY_RIGHT_WO_CONTRAST` | CT lower extremity right without contrast | TDM membre inférieur droit sans contraste | MODALITY_CT | BODY_REGION_LOWER_EXTREMITY | NONE | LATERALITY_RIGHT | — | — |
| `CT_UPPER_EXTREMITY_LEFT_W_IV_CONTRAST` | CT upper extremity left with IV contrast | TDM membre supérieur gauche avec contraste IV | MODALITY_CT | BODY_REGION_UPPER_EXTREMITY | IV | LATERALITY_LEFT | — | — |
| `CT_UPPER_EXTREMITY_LEFT_WO_CONTRAST` | CT upper extremity left without contrast | TDM membre supérieur gauche sans contraste | MODALITY_CT | BODY_REGION_UPPER_EXTREMITY | NONE | LATERALITY_LEFT | — | — |
| `CT_UPPER_EXTREMITY_RIGHT_W_IV_CONTRAST` | CT upper extremity right with IV contrast | TDM membre supérieur droit avec contraste IV | MODALITY_CT | BODY_REGION_UPPER_EXTREMITY | IV | LATERALITY_RIGHT | — | — |
| `CT_UPPER_EXTREMITY_RIGHT_WO_CONTRAST` | CT upper extremity right without contrast | TDM membre supérieur droit sans contraste | MODALITY_CT | BODY_REGION_UPPER_EXTREMITY | NONE | LATERALITY_RIGHT | — | — |

**MISSING subtotal:** **24**

**CT new-row total:** **7 + 24 = 31**

### 2.3 Contrast count on new CT rows (31)

| Design label | ICM code | Rows |
|--------------|----------|-----:|
| CONTRAST_IV | `CONTRAST_TYPE_WITH` | 10 |
| CONTRAST_IV_ORAL | `CONTRAST_TYPE_WITH_AND_WITHOUT` | 4 |
| CONTRAST_NONE | `CONTRAST_TYPE_WITHOUT` | 17 |
| CONTRAST_ORAL | — | 0 |
| CONTRAST_UNSPECIFIED | null FK | 0 |

### 2.4 Estimated CPT family (all `PENDING_CPT_REVIEW`)

| Family | Codes |
|--------|-------|
| CT head | `CT_HEAD_W_CONTRAST`, `CT_BRAIN_PERFUSION` |
| CT chest | `CT_CHEST_W_*` |
| CT abdomen/pelvis | `CT_ABDOMEN_PELVIS_W_*`, `CT_PELVIS_*` |
| CT spine | `CT_TSPINE_WO_CONTRAST` |
| CT MSK extremity | Foot, hip, knee, LE, UE |
| CT face/neck | Facial, maxillofacial, orbits, sinuses, STN |

---

## 3. New CTA catalog rows (4)

| Code | displayNameEn | displayNameFr | Modality | Body | Contrast | Laterality | Subregion | Protocol |
|------|---------------|---------------|----------|------|----------|------------|-----------|----------|
| `CTA_LOWER_EXTREMITY_LEFT` | CTA lower extremity left | Angioscanner membre inférieur gauche | MODALITY_CTA | BODY_REGION_LOWER_EXTREMITY | ANGIO | LATERALITY_LEFT | — | — |
| `CTA_LOWER_EXTREMITY_RIGHT` | CTA lower extremity right | Angioscanner membre inférieur droit | MODALITY_CTA | BODY_REGION_LOWER_EXTREMITY | ANGIO | LATERALITY_RIGHT | — | — |
| `CTA_UPPER_EXTREMITY_LEFT` | CTA upper extremity left | Angioscanner membre supérieur gauche | MODALITY_CTA | BODY_REGION_UPPER_EXTREMITY | ANGIO | LATERALITY_LEFT | — | — |
| `CTA_UPPER_EXTREMITY_RIGHT` | CTA upper extremity right | Angioscanner membre supérieur droit | MODALITY_CTA | BODY_REGION_UPPER_EXTREMITY | ANGIO | LATERALITY_RIGHT | — | — |

**ANGIO** = `CONTRAST_TYPE_ANGIOGRAPHIC` (design label; not CONTRAST_IV).

### 3.1 Existing CTA rows (unchanged — governance compliance)

| Code | Legacy coverage |
|------|-----------------|
| `CTA_CHEST` | Chest CTA, reconstruction alias, triple rule-out protocol |
| `CTA_HEAD_NECK` | Head and neck, COW alias, circle of Willis alias |
| `CTA_ABDOMEN_PELVIS` | Abdominal angio, aorta recon/runoff protocols |

---

## 4. Complete candidate matrix (summary)

| Batch | CT codes | CTA codes |
|-------|--------:|---------:|
| CT-1 Core contrast | 7 | 0 |
| CT-2 CTA extremity | 0 | 4 |
| CT-3 Advanced anatomy | 24 | 0 |
| **Total** | **31** | **4** |

---

## 5. Existing Medora CT/CTA (reference — no change in 2E.2B design)

| Code | Active | Notes |
|------|:------:|-------|
| `CT_HEAD` | ✗ | Retired → `CT_HEAD_WO_CONTRAST` |
| `CT_HEAD_WO_CONTRAST` | ✓ | Successor |
| `CT_ABD` | ✓ | Predecessor → `CT_ABDOMEN_PELVIS` |
| `CT_ABDOMEN_PELVIS` | ✓ | |
| `CT_CHEST` | ✓ | WITHOUT contrast classifier |
| `CT_CHEST_CTA` | ✓ | Predecessor → `CTA_CHEST` |
| `CT_CERVICAL_SPINE` | ✓ | |
| `CT_SPINE_LUMBAR` | ✓ | |
| `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` | ✓ | Intentional null contrast (B1B) |
| `CTA_CHEST` | ✓ | |
| `CTA_HEAD_NECK` | ✓ | |
| `CTA_ABDOMEN_PELVIS` | ✓ | |

---

*Phase 2E.2B — design only. See `ct-cta-expansion-batch-plan.md`.*
