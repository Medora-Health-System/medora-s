# Wave 1 Implementation Inventory (Phase W2.2)

**Phase:** W2.2 — final implementation authorization (design only)  
**Date:** 2026-06-01  
**Source of truth:** [`enterprise-imaging-workbook.csv`](enterprise-imaging-workbook.csv) — filter `wave=1`  
**Derived fields:** `implementationBatch` ∈ {`XR-1`, `CT-1`, `MRI-1`} from workbook column (not from planning docs alone)  

---

## 1. Summary (workbook-derived)

| Batch (`implementationBatch`) | Rows |
|------------------------------|-----:|
| **XR-1** | **19** |
| **CT-1** | **7** |
| **MRI-1** | **11** |
| **Total Wave 1** | **37** |

| Audit | Result |
|-------|--------|
| Duplicate `catalogCode` | **0** |
| Duplicate `displayNameEn` | **0** |
| Duplicate `displayNameFr` | **0** |
| Forbidden codes (`CT_HEAD`, `CT_ABD`, `DOPPLER_VEIN`, …) | **0** in Wave 1 |
| Retirement conflict (new row reactivates retired) | **PASS** |
| Successor violation | **PASS** |

---

## 2. Complete Wave 1 register (37 rows)

### XR-1 (19)

| catalogCode | displayNameEn | displayNameFr | Modality | Body | Contrast | View | Laterality | Subregion | Protocol | Billing | Alias |
|-------------|---------------|---------------|----------|------|----------|------|------------|-----------|----------|---------|-------|
| XR_ABDOMEN_1V | Abdomen X-ray 1 view | Radiographie abdomen 1 incidence | MODALITY_XR | BODY_REGION_ABDOMEN | CONTRAST_TYPE_NONE | VIEW_COUNT_ONE | LATERALITY_UNSPECIFIED | — | — | PENDING_CPT_REVIEW | OPTIONAL |
| XR_ABDOMEN_2V | Abdomen X-ray 2 views | Radiographie abdomen 2 incidences | MODALITY_XR | BODY_REGION_ABDOMEN | CONTRAST_TYPE_NONE | VIEW_COUNT_TWO | LATERALITY_UNSPECIFIED | — | — | PENDING_CPT_REVIEW | OPTIONAL |
| XR_ABDOMEN_3V_ACUTE | Abdomen X-ray 3 views acute series | Radiographie abdomen série aiguë 3 inc. | MODALITY_XR | BODY_REGION_ABDOMEN | CONTRAST_TYPE_NONE | VIEW_COUNT_THREE | LATERALITY_UNSPECIFIED | — | PROTOCOL_XR_ABDOMEN_ACUTE_SERIES | PENDING_CPT_REVIEW | OPTIONAL |
| XR_RIBS_LEFT_WITH_CXR | Left ribs with chest X-ray | Côtes gauches avec thorax | MODALITY_XR | BODY_REGION_CHEST | CONTRAST_TYPE_NONE | VIEW_COUNT_TWO | LATERALITY_LEFT | ANATOMIC_SUBREGION_RIBS | — | PENDING_CPT_REVIEW | OPTIONAL |
| XR_RIBS_RIGHT_WITH_CXR | Right ribs with chest X-ray | Côtes droites avec thorax | MODALITY_XR | BODY_REGION_CHEST | CONTRAST_TYPE_NONE | VIEW_COUNT_TWO | LATERALITY_RIGHT | ANATOMIC_SUBREGION_RIBS | — | PENDING_CPT_REVIEW | OPTIONAL |
| XR_CSPINE_1V_LATERAL | C-spine X-ray 1 view lateral | Rachis cervical 1 inc. latérale | MODALITY_XR | BODY_REGION_SPINE_CERVICAL | CONTRAST_TYPE_NONE | VIEW_COUNT_ONE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_CERVICAL | — | PENDING_CPT_REVIEW | OPTIONAL |
| XR_CSPINE_2_3V | C-spine X-ray 2–3 views | Rachis cervical 2–3 incidences | MODALITY_XR | BODY_REGION_SPINE_CERVICAL | CONTRAST_TYPE_NONE | VIEW_COUNT_THREE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_CERVICAL | — | PENDING_CPT_REVIEW | OPTIONAL |
| XR_CSPINE_3V_UPRIGHT | C-spine X-ray 3 views upright | Rachis cervical 3 inc. debout | MODALITY_XR | BODY_REGION_SPINE_CERVICAL | CONTRAST_TYPE_NONE | VIEW_COUNT_THREE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_CERVICAL | PROTOCOL_XR_CSPINE_UPRIGHT | PENDING_CPT_REVIEW | OPTIONAL |
| XR_CSPINE_COMPLETE | C-spine X-ray complete | Rachis cervical série complète | MODALITY_XR | BODY_REGION_SPINE_CERVICAL | CONTRAST_TYPE_NONE | VIEW_COUNT_COMPLETE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_CERVICAL | — | PENDING_CPT_REVIEW | OPTIONAL |
| XR_LSPINE_2V | Lumbar spine X-ray 2 views | Rachis lombaire 2 incidences | MODALITY_XR | BODY_REGION_SPINE | CONTRAST_TYPE_NONE | VIEW_COUNT_TWO | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_LUMBAR | — | PENDING_CPT_REVIEW | OPTIONAL |
| XR_LSPINE_2V_UPRIGHT | Lumbar spine X-ray 2 views upright | Rachis lombaire 2 inc. debout | MODALITY_XR | BODY_REGION_SPINE | CONTRAST_TYPE_NONE | VIEW_COUNT_TWO | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_LUMBAR | PROTOCOL_XR_CSPINE_UPRIGHT | PENDING_CPT_REVIEW | OPTIONAL |
| XR_LSPINE_3V | Lumbar spine X-ray 3 views | Rachis lombaire 3 incidences | MODALITY_XR | BODY_REGION_SPINE | CONTRAST_TYPE_NONE | VIEW_COUNT_THREE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_LUMBAR | — | PENDING_CPT_REVIEW | OPTIONAL |
| XR_LSPINE_3V_UPRIGHT | Lumbar spine X-ray 3 views upright | Rachis lombaire 3 inc. debout | MODALITY_XR | BODY_REGION_SPINE | CONTRAST_TYPE_NONE | VIEW_COUNT_THREE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_LUMBAR | PROTOCOL_XR_CSPINE_UPRIGHT | PENDING_CPT_REVIEW | OPTIONAL |
| XR_TSPINE_2V | Thoracic spine X-ray 2 views | Rachis thoracique 2 incidences | MODALITY_XR | BODY_REGION_SPINE_THORACIC | CONTRAST_TYPE_NONE | VIEW_COUNT_TWO | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_THORACIC | — | PENDING_CPT_REVIEW | OPTIONAL |
| XR_TSPINE_3V_UPRIGHT | Thoracic spine X-ray 3 views upright | Rachis thoracique 3 inc. debout | MODALITY_XR | BODY_REGION_SPINE_THORACIC | CONTRAST_TYPE_NONE | VIEW_COUNT_THREE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_THORACIC | PROTOCOL_XR_CSPINE_UPRIGHT | PENDING_CPT_REVIEW | OPTIONAL |
| XR_THORACOLUMBAR_2V | Thoracolumbar spine X-ray 2 views | Rachis thoraco-lombaire 2 incidences | MODALITY_XR | BODY_REGION_SPINE | CONTRAST_TYPE_NONE | VIEW_COUNT_TWO | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_LUMBAR | — | PENDING_CPT_REVIEW | OPTIONAL |
| XR_SACRUM_COCCYX_2V | Sacrum and coccyx X-ray | Sacrum et coccyx | MODALITY_XR | BODY_REGION_SPINE | CONTRAST_TYPE_NONE | VIEW_COUNT_TWO | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_SACRUM_COCCYX | — | PENDING_CPT_REVIEW | **REQUIRED** |
| XR_RIBS_LEFT | Left ribs X-ray | Radiographie côtes gauches | MODALITY_XR | BODY_REGION_RIBS | CONTRAST_TYPE_NONE | VIEW_COUNT_TWO | LATERALITY_LEFT | — † | — | PENDING_CPT_REVIEW | OPTIONAL |
| XR_RIBS_RIGHT | Right ribs X-ray | Radiographie côtes droites | MODALITY_XR | BODY_REGION_RIBS | CONTRAST_TYPE_NONE | VIEW_COUNT_TWO | LATERALITY_RIGHT | — † | — | PENDING_CPT_REVIEW | OPTIONAL |

† *Workbook leaves subregion empty; 2E.4A should set `ANATOMIC_SUBREGION_RIBS` (ICM-1.0 seeded).*

### CT-1 (7)

| catalogCode | displayNameEn | displayNameFr | Modality | Body | Contrast | Laterality | Billing | Alias | retirementImpact |
|-------------|---------------|---------------|----------|------|----------|------------|---------|-------|------------------|
| CT_HEAD_W_CONTRAST | CT head with IV contrast | TDM tête avec contraste IV | MODALITY_CT | BODY_REGION_HEAD | CONTRAST_TYPE_WITH | LATERALITY_UNSPECIFIED | PENDING_CPT_REVIEW | OPTIONAL | AVOID_CT_HEAD |
| CT_CHEST_W_IV_CONTRAST | CT chest with IV contrast | TDM thorax avec contraste IV | MODALITY_CT | BODY_REGION_CHEST | CONTRAST_TYPE_WITH | LATERALITY_UNSPECIFIED | PENDING_CPT_REVIEW | OPTIONAL | AVOID_CT_ABD |
| CT_CHEST_W_WO_CONTRAST | CT chest with and without IV contrast | TDM thorax avec et sans contraste IV | MODALITY_CT | BODY_REGION_CHEST | CONTRAST_TYPE_WITH_AND_WITHOUT | LATERALITY_UNSPECIFIED | PENDING_CPT_REVIEW | OPTIONAL | AVOID_CT_ABD |
| CT_ABDOMEN_PELVIS_W_IV_CONTRAST | CT abdomen/pelvis with IV contrast | TDM abdomen/pelvis avec contraste IV | MODALITY_CT | BODY_REGION_ABDOMEN_PELVIS | CONTRAST_TYPE_WITH | LATERALITY_UNSPECIFIED | PENDING_CPT_REVIEW | OPTIONAL | AVOID_CT_ABD |
| CT_ABDOMEN_PELVIS_W_WO_CONTRAST | CT abdomen/pelvis with and without IV contrast | TDM abdomen/pelvis avec et sans contraste IV | MODALITY_CT | BODY_REGION_ABDOMEN_PELVIS | CONTRAST_TYPE_WITH_AND_WITHOUT | LATERALITY_UNSPECIFIED | PENDING_CPT_REVIEW | OPTIONAL | AVOID_CT_ABD |
| CT_PELVIS_WO_CONTRAST | CT pelvis without IV contrast | TDM pelvis sans contraste IV | MODALITY_CT | BODY_REGION_PELVIS | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | PENDING_CPT_REVIEW | OPTIONAL | AVOID_CT_ABD |
| CT_PELVIS_W_WO_CONTRAST | CT pelvis with and without IV contrast | TDM pelvis avec et sans contraste IV | MODALITY_CT | BODY_REGION_PELVIS | CONTRAST_TYPE_WITH_AND_WITHOUT | LATERALITY_UNSPECIFIED | PENDING_CPT_REVIEW | OPTIONAL | AVOID_CT_ABD |

*View count: empty (NOT_APPLICABLE). `successorImpact` on MRI rows only in workbook.*

### MRI-1 (11)

| catalogCode | displayNameEn | displayNameFr | Modality | Body | Contrast | Laterality | Subregion | Billing | Alias | successorImpact |
|-------------|---------------|---------------|----------|------|----------|------------|-----------|---------|-------|-------------------|
| MRI_BRAIN_W_CONTRAST | MRI brain with contrast | IRM cérébrale avec contraste | MODALITY_MRI | BODY_REGION_HEAD | CONTRAST_TYPE_WITH | LATERALITY_UNSPECIFIED | — | PENDING_CPT_REVIEW | OPTIONAL | PRESERVE_MRI_SPINE_NULL |
| MRI_BRAIN_W_WO_CONTRAST | MRI brain with and without contrast | IRM cérébrale avec et sans contraste | MODALITY_MRI | BODY_REGION_HEAD | CONTRAST_TYPE_WITH_AND_WITHOUT | LATERALITY_UNSPECIFIED | — | PENDING_CPT_REVIEW | OPTIONAL | PRESERVE_MRI_SPINE_NULL |
| MRI_CSPINE_WO_CONTRAST | MRI cervical spine without contrast | IRM rachis cervical sans contraste | MODALITY_MRI | BODY_REGION_SPINE_CERVICAL | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_CERVICAL | PENDING_CPT_REVIEW | OPTIONAL | PRESERVE_MRI_SPINE_NULL |
| MRI_CSPINE_W_CONTRAST | MRI cervical spine with contrast | IRM rachis cervical avec contraste | MODALITY_MRI | BODY_REGION_SPINE_CERVICAL | CONTRAST_TYPE_WITH | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_CERVICAL | PENDING_CPT_REVIEW | OPTIONAL | PRESERVE_MRI_SPINE_NULL |
| MRI_CSPINE_W_WO_CONTRAST | MRI cervical spine with and without contrast | IRM rachis cervical avec et sans contraste | MODALITY_MRI | BODY_REGION_SPINE_CERVICAL | CONTRAST_TYPE_WITH_AND_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_CERVICAL | PENDING_CPT_REVIEW | OPTIONAL | PRESERVE_MRI_SPINE_NULL |
| MRI_LSPINE_WO_CONTRAST | MRI lumbar spine without contrast | IRM rachis lombaire sans contraste | MODALITY_MRI | BODY_REGION_SPINE | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_LUMBAR | PENDING_CPT_REVIEW | OPTIONAL | PRESERVE_MRI_SPINE_NULL |
| MRI_LSPINE_W_CONTRAST | MRI lumbar spine with contrast | IRM rachis lombaire avec contraste | MODALITY_MRI | BODY_REGION_SPINE | CONTRAST_TYPE_WITH | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_LUMBAR | PENDING_CPT_REVIEW | OPTIONAL | PRESERVE_MRI_SPINE_NULL |
| MRI_LSPINE_W_WO_CONTRAST | MRI lumbar spine with and without contrast | IRM rachis lombaire avec et sans contraste | MODALITY_MRI | BODY_REGION_SPINE | CONTRAST_TYPE_WITH_AND_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_LUMBAR | PENDING_CPT_REVIEW | OPTIONAL | PRESERVE_MRI_SPINE_NULL |
| MRI_TSPINE_WO_CONTRAST | MRI thoracic spine without contrast | IRM rachis thoracique sans contraste | MODALITY_MRI | BODY_REGION_SPINE_THORACIC | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_THORACIC | PENDING_CPT_REVIEW | OPTIONAL | PRESERVE_MRI_SPINE_NULL |
| MRI_TSPINE_W_CONTRAST | MRI thoracic spine with contrast | IRM rachis thoracique avec contraste | MODALITY_MRI | BODY_REGION_SPINE_THORACIC | CONTRAST_TYPE_WITH | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_THORACIC | PENDING_CPT_REVIEW | OPTIONAL | PRESERVE_MRI_SPINE_NULL |
| MRI_TSPINE_W_WO_CONTRAST | MRI thoracic spine with and without contrast | IRM rachis thoracique avec et sans contraste | MODALITY_MRI | BODY_REGION_SPINE_THORACIC | CONTRAST_TYPE_WITH_AND_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_THORACIC | PENDING_CPT_REVIEW | OPTIONAL | PRESERVE_MRI_SPINE_NULL |

---

## 3. Wave assignment verification

| Check | Result |
|-------|--------|
| All 37 rows have `wave=1` | **PASS** |
| `implementationBatch` matches batch column | **PASS** (19+7+11) |
| No Wave 1 row with `wave` ≠ 1 | **PASS** |

---

*Machine-readable: `enterprise-imaging-workbook.csv` rows where `wave=1`.*
