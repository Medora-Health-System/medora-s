# Wave 2 — Emergency Medicine Catalog Guide

**Certification ID:** `MEDUI.MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_EMERGENCY_MEDICINE_CATALOG`
**Program key:** `EM_KNOWLEDGE_EXPANSION_WAVE2_CATALOG_V1`

## Objective

Materially increase medications providers can search, select, and order in Medora for emergency care — without redesigning engines.

## Write path

1. Curated candidates: `apps/api/prisma/medications/wave2/data/em-wave2-catalog-candidates.json`
2. Importer: `medication:wave2:catalog:{audit|dry-run|apply|verify|report}`
3. Identity reconcile: `medication:wave2:catalog:reconcile` (merge indication-split concept shells)
4. Optional specialty-pack enrich: `medication:wave2:enrich` (search organization only)
5. Certify: `medication:wave2:catalog:certify`

## What is created

| Layer | Behavior |
|-------|----------|
| `CatalogMedication` | Active runtime rows (searchable / orderable) |
| `MedicationAlias` | Brands / abbreviations / pack markers |
| `MedicationConcept` | Inactive `EM_W2C_*` identity (no fabricated RxNorm) |
| `MedicationProduct` / `Package` | Linked via `legacyCatalogMedicationId`; inactive governance; **NDC null** |

## What is never done

- Fabricate RxNorm / NDC / black-box / dosing protocols
- Auto-place orders / MAR / chart mutations
- Activate recommendations or production CDS
- Create Medication Intelligence Phase 19

## Measured outcome (local)

See certification summary artifact. Net-new concepts are measured as the delta in distinct normalized `CatalogMedication.genericName` values — never padded to 750.
