# Medication Metadata Guide

Which medication metadata fields Medora supports today, and Wave 2 rules for populating them.

## Principle

**Only populate fields that already exist** (or that can be added without inventing a parallel concept). Wave 2 does **not** invent unsupported clinical metadata columns.

## Runtime catalog (`CatalogMedication`) — supported today

| Field | Notes |
|-------|-------|
| `genericName` | Preferred identity string for matching |
| `displayNameEn` / `displayNameFr` | UI labels |
| `name` | Legacy / compat display |
| `dosageForm`, `strength`, `route` | Formulation basics |
| `therapeuticClass` | Class / grouping hint |
| `searchText` | Denormalized search index (Wave 2 pack markers + tokens) |
| `isEssential`, `isControlled`, `controlledSchedule` | Formulary / control flags |
| `requiresWitness`, `requiresDoubleSign` | Admin safety flags |
| `administrationType` | INFUSION / PUSH / ORAL / … |
| `ndc11` / `ndcDisplay` | Package-ish billing helpers (optional) |
| `billingCodeDefault`, `billingUnitType` | Billing suggestions only |

Related: `MedicationAlias` for brand / synonym / abbreviation strings.

## Canonical layer — richer product metadata

Clinical depth (indications, contraindications, pregnancy, renal/hepatic, monitoring, etc.) lives primarily in **governed knowledge / evidence** tables and product governance — not as free-text dumps on every runtime row.

Wave 2 **reuses** existing evidence registration and knowledge population paths. It does **not** bypass provenance or invent a second evidence store.

## Intentionally not invented in Wave 2

Do not add ad hoc columns for:

- Black-box warning blobs without an existing model
- Pregnancy category letters without schema support
- Infusion compatibility matrices without an existing table
- Free-text “indications” on `CatalogMedication` that duplicate recommendation/evidence engines

When a field is absent, leave it null and expand later through the governed knowledge pipeline.

## Wave 2 metadata practice

1. Match existing `CatalogMedication` rows by generic / name / searchText
2. Append pack markers + search tokens to `searchText`
3. Upsert short aliases
4. Leave clinical narrative / evidence to existing registration tables

Acetaminophen remains out of pack family lists.
