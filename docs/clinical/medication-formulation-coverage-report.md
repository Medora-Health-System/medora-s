# Formulation Coverage Report

**Program:** Medication Formulation & Strength Completion
**Certification ID:** `MEDUI.MEDICATION_FORMULATION_STRENGTH_COMPLETION`

## Measured coverage

| Metric | Baseline | After completion |
|--------|--------:|-----------------:|
| Active catalog rows | 10657 | **10739** |
| Distinct generics | 5206 | **5206** |
| Distinct formulations (generic\|strength\|form\|route) | 9970 | **10052** |
| Generics with multiple strengths | 4120 | **4129** |
| Generics with single strength | 1086 | **1077** |
| Formulations created (this program) | — | **82** |

## Source policy

- Approved enterprise / Wave 2 / Wave 3 formulary manifests only
- Existing generics only (no new concept families)
- Wave 4 placeholder strengths not used
- No fabricated strengths, dosage forms, or routes

## Net change

+82 CatalogMedication rows (`dataSourceLabel=MEDORA_FORMULATION_COMPLETION`) completing clinically common variants for 61 existing generics.
