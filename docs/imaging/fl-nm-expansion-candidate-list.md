# Fluoroscopy & Nuclear Medicine Expansion Candidate List (Phase 2E.2E)

**Phase:** 2E.2E — design authority  
**Date:** 2026-06-01  
**Classifier vocabulary:** ICM-1.0  

---

## 1. Summary

| Metric | FL | NM | Total |
|--------|---:|---:|------:|
| Legacy studies | 4 | 5 | **9** |
| **New catalog rows** | **4** | **5** | **9** |

**Standard tuple (all 9 rows):**

| Field | Value |
|-------|--------|
| Modality | `MODALITY_FL` or `MODALITY_NM` |
| Contrast | `CONTRAST_TYPE_NONE` |
| View count | NOT_APPLICABLE |
| Laterality | `LATERALITY_UNSPECIFIED` |

---

## 2. Part 2 — Fluoroscopy candidate matrix (4 rows) — FL-1

| Code | Legacy study | displayNameEn | displayNameFr | Modality | Body region | Contrast | Laterality | Anatomic subregion | Protocol |
|------|--------------|---------------|---------------|----------|-------------|----------|------------|--------------------|----------|
| `FL_ESOPHAGRAM` | Swallow Esophagram | Esophagram | Œsophagogramme | MODALITY_FL | BODY_REGION_ABDOMEN | CONTRAST_TYPE_NONE | LATERALITY_UNSPECIFIED | — | PROTOCOL_FL_ESOPHAGRAM |
| `FL_LINE_PLACEMENT` | Line Placement Fluoro | Fluoroscopic line placement | Pose de ligne sous fluoroscopie | MODALITY_FL | BODY_REGION_CHEST | CONTRAST_TYPE_NONE | LATERALITY_UNSPECIFIED | — | PROTOCOL_FL_LINE_PLACEMENT |
| `FL_TUBE_PLACEMENT` | Tube Placement Fluoroscopy | Fluoroscopic tube placement | Pose de sonde sous fluoroscopie | MODALITY_FL | BODY_REGION_ABDOMEN | CONTRAST_TYPE_NONE | LATERALITY_UNSPECIFIED | — | PROTOCOL_FL_TUBE_PLACEMENT |
| `FL_LUMBAR_PUNCTURE` | Lumbar Puncture wo Fluoro | Lumbar puncture (fluoroscopic guidance) | Ponction lombaire (guidage fluoroscopique) | MODALITY_FL | BODY_REGION_SPINE | CONTRAST_TYPE_NONE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_SPINE_LUMBAR | PROTOCOL_FL_LUMBAR_PUNCTURE |

*Legacy name “wo Fluoro” denotes clinical wording; catalog row is still `MODALITY_FL` with `PROTOCOL_FL_LUMBAR_PUNCTURE`.*

### FL classifier tuple summary

| Code | Modality | Body | Contrast | View | Laterality | Subregion | Protocol |
|------|----------|------|----------|------|------------|-----------|----------|
| `FL_ESOPHAGRAM` | FL | ABDOMEN | NONE | — | UNSPECIFIED | — | FL_ESOPHAGRAM |
| `FL_LINE_PLACEMENT` | FL | CHEST | NONE | — | UNSPECIFIED | — | FL_LINE_PLACEMENT |
| `FL_TUBE_PLACEMENT` | FL | ABDOMEN | NONE | — | UNSPECIFIED | — | FL_TUBE_PLACEMENT |
| `FL_LUMBAR_PUNCTURE` | FL | SPINE | NONE | — | UNSPECIFIED | SPINE_LUMBAR | FL_LUMBAR_PUNCTURE |

---

## 3. Part 3 — Nuclear medicine candidate matrix (5 rows) — NM-1

| Code | Legacy study | displayNameEn | displayNameFr | Modality | Body region | Contrast | Laterality | Anatomic subregion | Protocol |
|------|--------------|---------------|---------------|----------|-------------|----------|------------|--------------------|----------|
| `NM_HIDA` | HIDA Scan | HIDA scan | Scintigraphie HIDA | MODALITY_NM | BODY_REGION_HEPATOBILIARY | CONTRAST_TYPE_NONE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_BILIARY | PROTOCOL_NM_HIDA |
| `NM_GB_EMPTYING` | Gallbladder Emptying Study RP | Gallbladder emptying study | Étude d'évacuation vésiculaire | MODALITY_NM | BODY_REGION_HEPATOBILIARY | CONTRAST_TYPE_NONE | LATERALITY_UNSPECIFIED | ANATOMIC_SUBREGION_BILIARY | PROTOCOL_NM_GALLBLADDER_EMPTYING |
| `NM_VQ_PERFUSION` | VQ Scan Perfusion | V/Q scan — perfusion | Scintigraphie V/Q — perfusion | MODALITY_NM | BODY_REGION_CHEST | CONTRAST_TYPE_NONE | LATERALITY_UNSPECIFIED | — | PROTOCOL_NM_VQ_PERFUSION |
| `NM_VQ_VENTILATION` | VQ Scan Ventilation | V/Q scan — ventilation | Scintigraphie V/Q — ventilation | MODALITY_NM | BODY_REGION_CHEST | CONTRAST_TYPE_NONE | LATERALITY_UNSPECIFIED | — | PROTOCOL_NM_VQ_VENTILATION |
| `NM_VQ_COMBINED` | Lung Scan Perfusion/Ventilation RP | V/Q scan — combined perfusion/ventilation | Scintigraphie V/Q — perfusion et ventilation | MODALITY_NM | BODY_REGION_CHEST | CONTRAST_TYPE_NONE | LATERALITY_UNSPECIFIED | — | PROTOCOL_NM_VQ_COMBINED |

### NM classifier tuple summary

| Code | Modality | Body | Contrast | View | Laterality | Subregion | Protocol |
|------|----------|------|----------|------|------------|-----------|----------|
| `NM_HIDA` | NM | HEPATOBILIARY | NONE | — | UNSPECIFIED | BILIARY | NM_HIDA |
| `NM_GB_EMPTYING` | NM | HEPATOBILIARY | NONE | — | UNSPECIFIED | BILIARY | NM_GALLBLADDER_EMPTYING |
| `NM_VQ_PERFUSION` | NM | CHEST | NONE | — | UNSPECIFIED | — | NM_VQ_PERFUSION |
| `NM_VQ_VENTILATION` | NM | CHEST | NONE | — | UNSPECIFIED | — | NM_VQ_VENTILATION |
| `NM_VQ_COMBINED` | NM | CHEST | NONE | — | UNSPECIFIED | — | NM_VQ_COMBINED |

---

## 4. Absorbed — none

No EXISTS, ALIAS, SUCCESSOR, or PARTIAL tuple rows for FL/NM in the Haiti 44 catalog.

---

## 5. CPT

All **9** new rows: `PENDING_CPT_REVIEW` (Gate W3).

---

*See `fl-nm-expansion-governance.md` and `fl-nm-expansion-batch-plan.md`.*
