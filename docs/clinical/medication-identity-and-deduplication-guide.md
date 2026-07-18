# Medication Identity and Deduplication Guide

## Identity model

| Level | Key | Notes |
|-------|-----|-------|
| Runtime orderable row | `CatalogMedication.code` | Unique; used by orders/pharmacy/MAR today |
| Canonical ingredient family | Normalized generic name + stable concept code | `EM_W2C_{SLUG}` / `ENT_W4_{SLUG}` |
| Variant | Strength + form + route under one concept | Not a new concept |
| Alias | Brand / synonym / abbreviation | Never a new concept |

## Wave 2 classification outcomes

- `NEW_CANONICAL_CONCEPT`
- `EXISTING_CONCEPT_NEW_VARIANT`
- `EXISTING_CONCEPT_NEW_SYNONYM`
- `DUPLICATE_REJECTED`
- `CONFLICT_REQUIRES_REVIEW`
- `SOURCE_INSUFFICIENT`
- `OUT_OF_SCOPE`

Ambiguous identity → fail closed / conflict report. No silent merges of uncertain rows.

## Known hazard

Historical `MedicationConcept` pollution (many acetaminophen fixture rows). Wave 2 uses stable `EM_W2C_*` codes and reconcile for indication-split shells that incorrectly shared a genericName.
