# Wave 4 Implementation Inventory (Phase 2E.8A)

**Phase:** 2E.8A — implementation authorization (design only)  
**Date:** 2026-06-01  
**Source of truth:** [`enterprise-imaging-workbook.csv`](enterprise-imaging-workbook.csv) — filter `implementationBatch` ∈ {XR-3, CT-3}  
**Production baseline:** **182** active imaging (43 Haiti + 37 Wave 1 + 61 Wave 2 + 41 Wave 3) per [`wave3-production-stabilization-audit.md`](wave3-production-stabilization-audit.md)

**Design inputs:** [`xray-expansion-candidate-list.md`](xray-expansion-candidate-list.md) §3.5 · [`ct-cta-expansion-batch-plan.md`](ct-cta-expansion-batch-plan.md) §4 · [`enterprise-imaging-wave-plan.md`](enterprise-imaging-wave-plan.md) §5

**Batch counts (authoritative):** **XR-3 = 7** · **CT-3 = 24** · **Total = 31**  
*(Program brief tables that swap XR-3/CT-3 row counts are incorrect; totals and 182→213 projection remain valid.)*

**Out of scope (2E.8A core):** **XR-3b** optional **+33** rows — separate parity package; not in this inventory.

---

## 1. Summary

| Batch (`implementationBatch`) | Rows |
|------------------------------|-----:|
| **XR-3** | **7** |
| **CT-3** | **24** |
| **Total Wave 4 (core)** | **31** |

| Audit | Result |
|-------|--------|
| Duplicate `catalogCode` in Wave 4 slice | **0** |
| Duplicate `displayNameEn` | **0** |
| Duplicate `displayNameFr` | **0** |
| Collision with Wave 1 / Wave 2 / Wave 3 / Haiti 44 codes | **0** |
| Forbidden codes (`CT_HEAD`, `CT_ABD`, `DOPPLER_VEIN`, `US_ABD`, `CT_CHEST_CTA`) | **0** |
| `retirementImpact` ≠ NONE | **0** (all **NONE**) |
| `successorImpact` | **NONE** on all 31 |
| Projected active after full Wave 4 | **213** (182 + 31) |
| Projected active after Wave 4 + XR-3b | **246** (213 + 33) |

---

## 2. Complete Wave 4 register (31 rows)

*Columns: code · EN · FR · billing · alias req. · wave · classifiers (modality / body / contrast / laterality / subregion / protocol / view)*

### XR-3 (7)

| catalogCode | displayNameEn | displayNameFr | Billing | Alias | Wave |
|-------------|---------------|---------------|---------|-------|------|
| `XR_AC_JOINT_BILATERAL_2V` | AC joints X-ray bilateral 2 views | Radiographie articulations AC bilatérales 2 inc. | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `XR_AC_JOINT_LEFT_2V` | AC joint X-ray left 2 views | Radiographie articulation AC gauche 2 inc. | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `XR_AC_JOINT_RIGHT_2V` | AC joint X-ray right 2 views | Radiographie articulation AC droite 2 inc. | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `XR_CLAVICLE_LEFT_2V` | Clavicle X-ray left 2 views | Radiographie clavicule gauche 2 inc. | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `XR_CLAVICLE_RIGHT_2V` | Clavicle X-ray right 2 views | Radiographie clavicule droite 2 inc. | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `XR_SCAPULA_LEFT` | Scapula X-ray left | Radiographie scapula gauche | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `XR_SCAPULA_RIGHT` | Scapula X-ray right | Radiographie scapula droite | PENDING_CPT_REVIEW | OPTIONAL | 4 |

**Classifier package (XR-3):**

| Code | Modality | Body | Contrast | Laterality | Subregion | Protocol | View |
|------|----------|------|----------|------------|-----------|----------|------|
| `XR_AC_JOINT_BILATERAL_2V` | MODALITY_XR | BODY_REGION_SHOULDER | CONTRAST_TYPE_NONE | LATERALITY_BILATERAL | ANATOMIC_SUBREGION_AC_JOINT | — | VIEW_COUNT_TWO |
| `XR_AC_JOINT_LEFT_2V` | MODALITY_XR | BODY_REGION_SHOULDER | CONTRAST_TYPE_NONE | LATERALITY_LEFT | ANATOMIC_SUBREGION_AC_JOINT | — | VIEW_COUNT_TWO |
| `XR_AC_JOINT_RIGHT_2V` | MODALITY_XR | BODY_REGION_SHOULDER | CONTRAST_TYPE_NONE | LATERALITY_RIGHT | ANATOMIC_SUBREGION_AC_JOINT | — | VIEW_COUNT_TWO |
| `XR_CLAVICLE_LEFT_2V` | MODALITY_XR | BODY_REGION_SHOULDER | CONTRAST_TYPE_NONE | LATERALITY_LEFT | ANATOMIC_SUBREGION_CLAVICLE | — | VIEW_COUNT_TWO |
| `XR_CLAVICLE_RIGHT_2V` | MODALITY_XR | BODY_REGION_SHOULDER | CONTRAST_TYPE_NONE | LATERALITY_RIGHT | ANATOMIC_SUBREGION_CLAVICLE | — | VIEW_COUNT_TWO |
| `XR_SCAPULA_LEFT` | MODALITY_XR | BODY_REGION_SHOULDER | CONTRAST_TYPE_NONE | LATERALITY_LEFT | ANATOMIC_SUBREGION_SCAPULA | — | VIEW_COUNT_TWO |
| `XR_SCAPULA_RIGHT` | MODALITY_XR | BODY_REGION_SHOULDER | CONTRAST_TYPE_NONE | LATERALITY_RIGHT | ANATOMIC_SUBREGION_SCAPULA | — | VIEW_COUNT_TWO |

---

### CT-3 (24)

| catalogCode | displayNameEn | displayNameFr | Billing | Alias | Wave |
|-------------|---------------|---------------|---------|-------|------|
| `CT_BRAIN_PERFUSION` | CT brain perfusion | TDM perfusion cérébrale | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_FACIAL_WO_CONTRAST` | CT facial bones without contrast | TDM os faciaux sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_MAXILLOFACIAL_WO_CONTRAST` | CT maxillofacial without contrast | TDM maxillo-facial sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_MAXILLOFACIAL_W_IV_CONTRAST` | CT maxillofacial with IV contrast | TDM maxillo-facial avec contraste IV | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_ORBITS_WO_CONTRAST` | CT orbits without contrast | TDM orbites sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_SINUSES_WO_CONTRAST` | CT sinuses without contrast | TDM sinus sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_STN_WO_CONTRAST` | CT soft tissue neck without contrast | TDM parties molles du cou sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_STN_W_IV_CONTRAST` | CT soft tissue neck with IV contrast | TDM parties molles du cou avec contraste IV | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_STN_W_WO_CONTRAST` | CT soft tissue neck with and without IV contrast | TDM parties molles du cou avec et sans contraste IV | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_TSPINE_WO_CONTRAST` | CT thoracic spine without contrast | TDM rachis thoracique sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_FOOT_LEFT_WO_CONTRAST` | CT foot left without contrast | TDM pied gauche sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_FOOT_RIGHT_WO_CONTRAST` | CT foot right without contrast | TDM pied droit sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_HIP_LEFT_WO_CONTRAST` | CT hip left without contrast | TDM hanche gauche sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_HIP_RIGHT_WO_CONTRAST` | CT hip right without contrast | TDM hanche droite sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_KNEE_LEFT_WO_CONTRAST` | CT knee left without contrast | TDM genou gauche sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_KNEE_RIGHT_WO_CONTRAST` | CT knee right without contrast | TDM genou droit sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_LOWER_EXTREMITY_LEFT_W_IV_CONTRAST` | CT lower extremity left with IV contrast | TDM membre inférieur gauche avec contraste IV | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_LOWER_EXTREMITY_LEFT_WO_CONTRAST` | CT lower extremity left without contrast | TDM membre inférieur gauche sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_LOWER_EXTREMITY_RIGHT_W_IV_CONTRAST` | CT lower extremity right with IV contrast | TDM membre inférieur droit avec contraste IV | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_LOWER_EXTREMITY_RIGHT_WO_CONTRAST` | CT lower extremity right without contrast | TDM membre inférieur droit sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_UPPER_EXTREMITY_LEFT_W_IV_CONTRAST` | CT upper extremity left with IV contrast | TDM membre supérieur gauche avec contraste IV | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_UPPER_EXTREMITY_LEFT_WO_CONTRAST` | CT upper extremity left without contrast | TDM membre supérieur gauche sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_UPPER_EXTREMITY_RIGHT_W_IV_CONTRAST` | CT upper extremity right with IV contrast | TDM membre supérieur droit avec contraste IV | PENDING_CPT_REVIEW | OPTIONAL | 4 |
| `CT_UPPER_EXTREMITY_RIGHT_WO_CONTRAST` | CT upper extremity right without contrast | TDM membre supérieur droit sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 4 |

**Classifier package (CT-3):**

| Code | Modality | Body | Contrast | Laterality | Subregion | Protocol | View |
|------|----------|------|----------|------------|-----------|----------|------|
| `CT_BRAIN_PERFUSION` | MODALITY_CT | BODY_REGION_HEAD | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | — | PROTOCOL_CT_BRAIN_PERFUSION | — |
| `CT_FACIAL_WO_CONTRAST` | MODALITY_CT | BODY_REGION_FACE | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_FACIAL_BONES | — | — |
| `CT_MAXILLOFACIAL_WO_CONTRAST` | MODALITY_CT | BODY_REGION_FACE | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_FACIAL_BONES | — | — |
| `CT_MAXILLOFACIAL_W_IV_CONTRAST` | MODALITY_CT | BODY_REGION_FACE | CONTRAST_TYPE_WITH | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_FACIAL_BONES | — | — |
| `CT_ORBITS_WO_CONTRAST` | MODALITY_CT | BODY_REGION_HEAD | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_ORBIT | — | — |
| `CT_SINUSES_WO_CONTRAST` | MODALITY_CT | BODY_REGION_SINUS | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SINUS | — | — |
| `CT_STN_WO_CONTRAST` | MODALITY_CT | BODY_REGION_HEAD_NECK | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_NECK_SOFT_TISSUE | — | — |
| `CT_STN_W_IV_CONTRAST` | MODALITY_CT | BODY_REGION_HEAD_NECK | CONTRAST_TYPE_WITH | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_NECK_SOFT_TISSUE | — | — |
| `CT_STN_W_WO_CONTRAST` | MODALITY_CT | BODY_REGION_HEAD_NECK | CONTRAST_TYPE_WITH_AND_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_NECK_SOFT_TISSUE | — | — |
| `CT_TSPINE_WO_CONTRAST` | MODALITY_CT | BODY_REGION_SPINE_THORACIC | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_THORACIC | — | — |
| `CT_FOOT_LEFT_WO_CONTRAST` | MODALITY_CT | BODY_REGION_FOOT | CONTRAST_TYPE_WITHOUT | LATERALITY_LEFT | — | — | — |
| `CT_FOOT_RIGHT_WO_CONTRAST` | MODALITY_CT | BODY_REGION_FOOT | CONTRAST_TYPE_WITHOUT | LATERALITY_RIGHT | — | — | — |
| `CT_HIP_LEFT_WO_CONTRAST` | MODALITY_CT | BODY_REGION_HIP | CONTRAST_TYPE_WITHOUT | LATERALITY_LEFT | — | — | — |
| `CT_HIP_RIGHT_WO_CONTRAST` | MODALITY_CT | BODY_REGION_HIP | CONTRAST_TYPE_WITHOUT | LATERALITY_RIGHT | — | — | — |
| `CT_KNEE_LEFT_WO_CONTRAST` | MODALITY_CT | BODY_REGION_KNEE | CONTRAST_TYPE_WITHOUT | LATERALITY_LEFT | — | — | — |
| `CT_KNEE_RIGHT_WO_CONTRAST` | MODALITY_CT | BODY_REGION_KNEE | CONTRAST_TYPE_WITHOUT | LATERALITY_RIGHT | — | — | — |
| `CT_LOWER_EXTREMITY_LEFT_W_IV_CONTRAST` | MODALITY_CT | BODY_REGION_LOWER_EXTREMITY | CONTRAST_TYPE_WITH | LATERALITY_LEFT | — | — | — |
| `CT_LOWER_EXTREMITY_LEFT_WO_CONTRAST` | MODALITY_CT | BODY_REGION_LOWER_EXTREMITY | CONTRAST_TYPE_WITHOUT | LATERALITY_LEFT | — | — | — |
| `CT_LOWER_EXTREMITY_RIGHT_W_IV_CONTRAST` | MODALITY_CT | BODY_REGION_LOWER_EXTREMITY | CONTRAST_TYPE_WITH | LATERALITY_RIGHT | — | — | — |
| `CT_LOWER_EXTREMITY_RIGHT_WO_CONTRAST` | MODALITY_CT | BODY_REGION_LOWER_EXTREMITY | CONTRAST_TYPE_WITHOUT | LATERALITY_RIGHT | — | — | — |
| `CT_UPPER_EXTREMITY_LEFT_W_IV_CONTRAST` | MODALITY_CT | BODY_REGION_UPPER_EXTREMITY | CONTRAST_TYPE_WITH | LATERALITY_LEFT | — | — | — |
| `CT_UPPER_EXTREMITY_LEFT_WO_CONTRAST` | MODALITY_CT | BODY_REGION_UPPER_EXTREMITY | CONTRAST_TYPE_WITHOUT | LATERALITY_LEFT | — | — | — |
| `CT_UPPER_EXTREMITY_RIGHT_W_IV_CONTRAST` | MODALITY_CT | BODY_REGION_UPPER_EXTREMITY | CONTRAST_TYPE_WITH | LATERALITY_RIGHT | — | — | — |
| `CT_UPPER_EXTREMITY_RIGHT_WO_CONTRAST` | MODALITY_CT | BODY_REGION_UPPER_EXTREMITY | CONTRAST_TYPE_WITHOUT | LATERALITY_RIGHT | — | — | — |

*View count: required on XR-3 (7/7); N/A (null FK) on CT-3 (24/24).*

### CT-3 subgroup counts

| Subgroup | Rows |
|----------|-----:|
| Head / face / neck | **10** |
| Thoracic spine | **1** |
| MSK extremity | **13** |
| **Total CT-3** | **24** |

---

## 3. Governance notes (design-time)

| Rule | Wave 4 compliance |
|------|-------------------|
| No `CT_HEAD` expansion | **PASS** — perfusion is `CT_BRAIN_PERFUSION`, not `CT_HEAD` |
| No `CT_ABD` | **PASS** |
| Distinct from Wave 2 `CTA_*` extremity | **PASS** — `MODALITY_CT` vs `MODALITY_CTA` |
| Distinct from Wave 3 MRI MSK | **PASS** — separate codes (`CT_KNEE_*` vs `MRI_KNEE_*`) |
| `MRI_SPINE` B1B | **PASS** — not in Wave 4 slice |

**Pilot deferral (production authorization, future):** Haiti may defer subsets of CT-3 (perfusion, maxillofacial IV, full UE/LE) per [`ct-cta-expansion-batch-plan.md`](ct-cta-expansion-batch-plan.md) — staging may implement full manifest with flags.

---

*End of Wave 4 implementation inventory (Phase 2E.8A).*
