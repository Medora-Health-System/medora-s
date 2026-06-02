# Enterprise Formulary Wave 1 (M1.6B)

**Phase:** M1.6B — Enterprise Formulary Wave 1  
**Scope:** Anticoagulation, vaccines, chronic care core  
**Activation:** Products seeded **inactive** until explicit activation with billing gate.

## Wave 1 buckets

| Bucket | Count (manifest) | Examples |
|--------|------------------|----------|
| Anticoagulation | 7 | Warfarin/Coumadin, Enoxaparin/Lovenox, DOACs, Heparin (ENRICH) |
| Vaccines | 13 | Influenza, COVID-19, Tdap, MMR, Shingrix, RSV, … |
| Chronic care | 25 | Lisinopril, Metformin, statins, GLP-1, psychiatry, GERD, … |

Manifest source: `packages/shared/src/medication/enterpriseWave1FormularyManifest.ts`

## Canonical chain (per medication)

Each Wave 1 row requires:

- `CatalogMedication`
- `MedicationConcept`
- `MedicationProduct` (linked via `legacyCatalogMedicationId`)
- `MedicationPackage`
- `MedicationAlias` (brand + search terms)
- `MedicationSafetyProfile`
- `MedicationBillingProfile`

Linkage marker on product: `ENTERPRISE_M16B_WAVE1_FORMULARY`

## Seed

```bash
MEDORA_ENABLE_ENTERPRISE_WAVE1_FORMULARY=1 pnpm --filter @medora/api prisma:seed-catalogs
```

Helper: `apps/api/prisma/helpers/seed-enterprise-wave1-formulary.ts`

- **CREATE** — net-new catalog + full chain  
- **ENRICH** — existing Haiti catalog codes (aliases, billing, chain fixup)

## Modes

| Mode | Use |
|------|-----|
| CREATE | Anticoags (except heparin), all vaccines, net-new chronic agents |
| ENRICH | Haiti rows already present (metformin, lisinopril, heparin, …) |

## Next phase

**M1.6C** — Enterprise Search & Alias Expansion
