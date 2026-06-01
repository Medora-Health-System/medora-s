# Wave 3 Implementation Inventory (Phase 2E.7A)

**Phase:** 2E.7A — implementation authorization (design only)  
**Date:** 2026-06-01  
**Source of truth:** [`enterprise-imaging-workbook.csv`](enterprise-imaging-workbook.csv) — filter `implementationBatch` ∈ {MRI-2, MRA-1, US-2, US-3, FL-1, NM-1}  
**Production baseline:** **141** active imaging (43 Haiti + 37 Wave 1 + 61 Wave 2) per [`wave2-production-stabilization-audit.md`](wave2-production-stabilization-audit.md)

**Design inputs:** [`mri-mra-expansion-candidate-list.md`](mri-mra-expansion-candidate-list.md) · [`ultrasound-expansion-candidate-list.md`](ultrasound-expansion-candidate-list.md) · [`fl-nm-expansion-candidate-list.md`](fl-nm-expansion-candidate-list.md) · [`enterprise-imaging-wave-plan.md`](enterprise-imaging-wave-plan.md) §4

---

## 1. Summary

| Batch (`implementationBatch`) | Rows |
|------------------------------|-----:|
| **MRI-2** | **14** |
| **MRA-1** | **5** |
| **US-2** | **10** |
| **US-3** | **3** |
| **FL-1** | **4** |
| **NM-1** | **5** |
| **Total Wave 3** | **41** |

| Audit | Result |
|-------|--------|
| Duplicate `catalogCode` in Wave 3 slice | **0** |
| Duplicate `displayNameEn` | **0** |
| Duplicate `displayNameFr` | **0** |
| Collision with Wave 1 / Wave 2 / Haiti 44 codes | **0** |
| Forbidden codes (`CT_HEAD`, `CT_ABD`, `DOPPLER_VEIN`, `US_ABD`, `CT_CHEST_CTA`) | **0** |
| `retirementImpact` ≠ NONE | **0** (all **NONE**) |
| Successor flags | **10** US-2 rows: `AVOID_DOPPLER_VEIN` (governance — no new `DOPPLER_VEIN`) |
| Projected active after full Wave 3 | **182** (141 + 41) |

---

## 2. Complete Wave 3 register (41 rows)

*Columns: code · EN · FR · billing · alias req. · wave · classifiers (modality / body / contrast / laterality / subregion / protocol)*

### MRI-2 (14)

| catalogCode | displayNameEn | displayNameFr | Billing | Alias | Wave |
|-------------|---------------|---------------|---------|-------|------|
| `MRI_CHOLANGIOGRAM` | MRI cholangiogram | IRM cholangiographie | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `MRI_HIP_BILATERAL_WO_CONTRAST` | MRI hip bilateral without contrast | IRM hanche bilatérale sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `MRI_HIP_LEFT_WO_CONTRAST` | MRI hip left without contrast | IRM hanche gauche sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `MRI_HIP_RIGHT_WO_CONTRAST` | MRI hip right without contrast | IRM hanche droite sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `MRI_KNEE_LEFT` | MRI knee left | IRM genou gauche | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `MRI_KNEE_RIGHT` | MRI knee right | IRM genou droit | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `MRI_LOWER_EXTREMITY_LEFT_W_WO_CONTRAST` | MRI lower extremity left with and without contrast | IRM membre inférieur gauche avec et sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `MRI_LOWER_EXTREMITY_RIGHT_W_WO_CONTRAST` | MRI lower extremity right with and without contrast | IRM membre inférieur droit avec et sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `MRI_PELVIS` | MRI pelvis | IRM pelvis | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `MRI_PELVIS_LIMITED` | MRI pelvis limited | IRM pelvis limitée | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `MRI_SELLA` | MRI sella | IRM selle turcique | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `MRI_UPPER_EXTREMITY_LEFT_WO_CONTRAST` | MRI upper extremity left without contrast | IRM membre supérieur gauche sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `MRI_UPPER_EXTREMITY_RIGHT_WO_CONTRAST` | MRI upper extremity right without contrast | IRM membre supérieur droit sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `MRI_UPPER_EXTREMITY_RIGHT_W_WO_CONTRAST` | MRI upper extremity right with and without contrast | IRM membre supérieur droit avec et sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 3 |

**Classifier package (MRI-2):**

| Code | Modality | Body | Contrast | Laterality | Subregion | Protocol |
|------|----------|------|----------|------------|-----------|----------|
| `MRI_CHOLANGIOGRAM` | MODALITY_MRI | BODY_REGION_HEPATOBILIARY | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_BILIARY | PROTOCOL_MRI_CHOLANGIOGRAM |
| `MRI_HIP_BILATERAL_WO_CONTRAST` | MODALITY_MRI | BODY_REGION_HIP | CONTRAST_TYPE_WITHOUT | LATERALITY_BILATERAL | — | — |
| `MRI_HIP_LEFT_WO_CONTRAST` | MODALITY_MRI | BODY_REGION_HIP | CONTRAST_TYPE_WITHOUT | LATERALITY_LEFT | — | — |
| `MRI_HIP_RIGHT_WO_CONTRAST` | MODALITY_MRI | BODY_REGION_HIP | CONTRAST_TYPE_WITHOUT | LATERALITY_RIGHT | — | — |
| `MRI_KNEE_LEFT` | MODALITY_MRI | BODY_REGION_KNEE | CONTRAST_TYPE_WITHOUT | LATERALITY_LEFT | — | — |
| `MRI_KNEE_RIGHT` | MODALITY_MRI | BODY_REGION_KNEE | CONTRAST_TYPE_WITHOUT | LATERALITY_RIGHT | — | — |
| `MRI_LOWER_EXTREMITY_LEFT_W_WO_CONTRAST` | MODALITY_MRI | BODY_REGION_LOWER_EXTREMITY | CONTRAST_TYPE_WITH_AND_WITHOUT | LATERALITY_LEFT | — | — |
| `MRI_LOWER_EXTREMITY_RIGHT_W_WO_CONTRAST` | MODALITY_MRI | BODY_REGION_LOWER_EXTREMITY | CONTRAST_TYPE_WITH_AND_WITHOUT | LATERALITY_RIGHT | — | — |
| `MRI_PELVIS` | MODALITY_MRI | BODY_REGION_PELVIS | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | — | — |
| `MRI_PELVIS_LIMITED` | MODALITY_MRI | BODY_REGION_PELVIS | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | — | — |
| `MRI_SELLA` | MODALITY_MRI | BODY_REGION_HEAD | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SELLA | — |
| `MRI_UPPER_EXTREMITY_LEFT_WO_CONTRAST` | MODALITY_MRI | BODY_REGION_UPPER_EXTREMITY | CONTRAST_TYPE_WITHOUT | LATERALITY_LEFT | — | — |
| `MRI_UPPER_EXTREMITY_RIGHT_WO_CONTRAST` | MODALITY_MRI | BODY_REGION_UPPER_EXTREMITY | CONTRAST_TYPE_WITHOUT | LATERALITY_RIGHT | — | — |
| `MRI_UPPER_EXTREMITY_RIGHT_W_WO_CONTRAST` | MODALITY_MRI | BODY_REGION_UPPER_EXTREMITY | CONTRAST_TYPE_WITH_AND_WITHOUT | LATERALITY_RIGHT | — | — |

*View count: NOT_APPLICABLE (null FK) on all MRI-2 rows.*

---

### MRA-1 (5)

| catalogCode | displayNameEn | displayNameFr | Billing | Alias | Wave |
|-------------|---------------|---------------|---------|-------|------|
| `MRA_BRAIN` | MRA brain | ARM cérébrale | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `MRA_CAROTID_W_CONTRAST` | MRA carotid with contrast | ARM carotides avec contraste | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `MRA_CAROTID_WO_CONTRAST` | MRA carotid without contrast | ARM carotides sans contraste | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `MRA_LE_LEFT_W_CONTRAST` | MRA lower extremity left with contrast | ARM membre inférieur gauche avec contraste | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `MRA_LE_RIGHT_W_CONTRAST` | MRA lower extremity right with contrast | ARM membre inférieur droit avec contraste | PENDING_CPT_REVIEW | OPTIONAL | 3 |

**Classifier package (MRA-1):**

| Code | Modality | Body | Contrast | Laterality | Subregion | Protocol |
|------|----------|------|----------|------------|-----------|----------|
| `MRA_BRAIN` | MODALITY_MRA | BODY_REGION_HEAD | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | — | — |
| `MRA_CAROTID_W_CONTRAST` | MODALITY_MRA | BODY_REGION_HEAD_NECK | CONTRAST_TYPE_WITH | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_CAROTID | — |
| `MRA_CAROTID_WO_CONTRAST` | MODALITY_MRA | BODY_REGION_HEAD_NECK | CONTRAST_TYPE_WITHOUT | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_CAROTID | — |
| `MRA_LE_LEFT_W_CONTRAST` | MODALITY_MRA | BODY_REGION_LOWER_EXTREMITY | CONTRAST_TYPE_WITH | LATERALITY_LEFT | — | — |
| `MRA_LE_RIGHT_W_CONTRAST` | MODALITY_MRA | BODY_REGION_LOWER_EXTREMITY | CONTRAST_TYPE_WITH | LATERALITY_RIGHT | — | — |

*First production orderables using `MODALITY_MRA` (ICM-1.0 seeded).*

---

### US-2 (10)

| catalogCode | displayNameEn | displayNameFr | Billing | Alias | Wave |
|-------------|---------------|---------------|---------|-------|------|
| `US_CAROTID_DUPLEX` | Carotid duplex ultrasound | Échographie duplex carotidienne | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `US_ARTERIAL_DOPPLER_LE_BILATERAL` | Lower extremity arterial Doppler bilateral | Doppler artériel membres inférieurs bilatéral | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `US_ARTERIAL_DOPPLER_LE_LEFT` | Lower extremity arterial Doppler left | Doppler artériel membre inférieur gauche | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `US_ARTERIAL_DOPPLER_LE_RIGHT` | Lower extremity arterial Doppler right | Doppler artériel membre inférieur droit | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `US_VENOUS_DOPPLER_UE_BILATERAL` | Upper extremity venous Doppler bilateral | Doppler veineux membres supérieurs bilatéral | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `US_VENOUS_DOPPLER_UE_LEFT` | Upper extremity venous Doppler left | Doppler veineux membre supérieur gauche | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `US_VENOUS_DOPPLER_UE_RIGHT` | Upper extremity venous Doppler right | Doppler veineux membre supérieur droit | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `US_ARTERIAL_DOPPLER_UE_BILATERAL` | Upper extremity arterial Doppler bilateral | Doppler artériel membres supérieurs bilatéral | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `US_ARTERIAL_DOPPLER_UE_LEFT` | Upper extremity arterial Doppler left | Doppler artériel membre supérieur gauche | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `US_ARTERIAL_DOPPLER_UE_RIGHT` | Upper extremity arterial Doppler right | Doppler artériel membre supérieur droit | PENDING_CPT_REVIEW | OPTIONAL | 3 |

**Classifier package (US-2):** all `MODALITY_US` · `CONTRAST_TYPE_NONE` · arterial rows → `PROTOCOL_US_DOPPLER_ARTERIAL` · UE venous → `PROTOCOL_US_DOPPLER_VENOUS` · carotid → `ANATOMIC_SUBREGION_CAROTID`.

**Governance:** do **not** add `US_VENOUS_DOPPLER_LE_LEFT`/`_RIGHT` or `DOPPLER_VEIN`; canonical LE venous remains `US_VENOUS_DOPPLER_LE` (Haiti baseline).

---

### US-3 (3)

| catalogCode | displayNameEn | displayNameFr | Billing | Alias | Wave |
|-------------|---------------|---------------|---------|-------|------|
| `US_BREAST_BILATERAL` | Breast ultrasound bilateral | Échographie mammaire bilatérale | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `US_BREAST_LEFT` | Breast ultrasound left | Échographie mammaire gauche | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `US_BREAST_RIGHT` | Breast ultrasound right | Échographie mammaire droite | PENDING_CPT_REVIEW | OPTIONAL | 3 |

**Classifier package:** `MODALITY_US` · `BODY_REGION_BREAST` · `CONTRAST_TYPE_NONE` · lateralities bilateral/left/right · `ANATOMIC_SUBREGION_BREAST`.

---

### FL-1 (4)

| catalogCode | displayNameEn | displayNameFr | Billing | Alias | Wave |
|-------------|---------------|---------------|---------|-------|------|
| `FL_ESOPHAGRAM` | Esophagram | Œsophagogramme | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `FL_LINE_PLACEMENT` | Fluoroscopic line placement | Pose de ligne sous fluoroscopie | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `FL_TUBE_PLACEMENT` | Fluoroscopic tube placement | Pose de sonde sous fluoroscopie | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `FL_LUMBAR_PUNCTURE` | Lumbar puncture (fluoroscopic guidance) | Ponction lombaire (guidage fluoroscopique) | PENDING_CPT_REVIEW | OPTIONAL | 3 |

**Classifier package:** all `MODALITY_FL` · `CONTRAST_TYPE_NONE` · protocols per [`fl-nm-expansion-candidate-list.md`](fl-nm-expansion-candidate-list.md).

*First production orderables using `MODALITY_FL`.*

---

### NM-1 (5)

| catalogCode | displayNameEn | displayNameFr | Billing | Alias | Wave |
|-------------|---------------|---------------|---------|-------|------|
| `NM_HIDA` | HIDA scan | Scintigraphie HIDA | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `NM_GB_EMPTYING` | Gallbladder emptying study | Étude d'évacuation vésiculaire | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `NM_VQ_PERFUSION` | V/Q scan — perfusion | Scintigraphie V/Q — perfusion | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `NM_VQ_VENTILATION` | V/Q scan — ventilation | Scintigraphie V/Q — ventilation | PENDING_CPT_REVIEW | OPTIONAL | 3 |
| `NM_VQ_COMBINED` | V/Q scan — combined perfusion/ventilation | Scintigraphie V/Q — perfusion et ventilation | PENDING_CPT_REVIEW | OPTIONAL | 3 |

**Classifier package:** all `MODALITY_NM` · `CONTRAST_TYPE_NONE` · distinct V/Q protocol classifiers (do not merge perfusion/ventilation/combined).

*First production orderables using `MODALITY_NM`.*

---

## 3. Pilot scope options (product — not inventory reduction in workbook)

| Option | Rows | Active after seed |
|--------|-----:|------------------:|
| **Full Wave 3** | **41** | **182** |
| **Pilot minimum** (MRI-2 + US-2 carotid + LE arterial) | **18** | **159** |
| Defer MRA-1 | −5 | 177 |
| Defer US-3 | −3 | 179 |
| Defer FL-1 | −4 | 178 |
| Defer NM-1 | −5 | 177 |
| Defer US-2 UE subset | −6 | 176 (with full MRI-2) |

*2E.7B may implement full manifest with feature flags or seed modules per signed pilot matrix.*

---

*No catalog DB writes in 2E.7A.*
