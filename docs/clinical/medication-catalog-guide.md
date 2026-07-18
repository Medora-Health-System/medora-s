# Medication Catalog Guide

Operational guide for Medora’s medication catalog layers. Complements Medication Knowledge Expansion Wave 2.

## Dual-layer model (do not duplicate)

| Layer | Models | Role |
|-------|--------|------|
| **Runtime** | `CatalogMedication`, `MedicationAlias` | Search, order composer, pharmacy, MAR binding |
| **Canonical** | `MedicationConcept` → `MedicationProduct` → `MedicationPackage` | Governance, RxNorm staging, formulary readiness |

Ordering and MAR continue to use the **runtime** catalog unless a separately certified cutover says otherwise.

## Identity rules

- Stable `CatalogMedication.code` (unique)
- Prefer `genericName` + `displayNameEn` / `displayNameFr` for display
- Aliases live in `MedicationAlias` (brand, abbreviation, synonym)
- Search denormalization: `searchText` (bounded string; includes pack markers after Wave 2 enrich)
- Acetaminophen identity remains **blocked** for recommendation/knowledge resolution programs

## Wave 2 enrichment (content only)

Wave 2 tags matching runtime rows with:

- Specialty pack markers: `EM_PACK:{PACK}`
- Search tokens (abbreviations / synonyms) appended into `searchText`
- Alias rows for common ED abbreviations

It does **not**:

- Create a parallel master table
- Auto-activate inactive products for clinical use
- Bypass evidence or recommendation governance

## Formulary vs knowledge expansion

| Program | Purpose |
|---------|---------|
| Enterprise Formulary Waves 1–4 | Curated formulary manifests / activation prep |
| Medication Knowledge Expansion Wave 2 | EM specialty **packs** + search organization on existing catalog |

## CLI

```bash
pnpm --filter @medora/api medication:wave2:enrich
pnpm --filter @medora/api medication:wave2:coverage
```

Artifacts: `apps/api/prisma/medications/audit-summaries/medication-knowledge-expansion-wave2-*.json`
