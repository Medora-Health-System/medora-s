# Medication Search Guide / Provider Medication Search Guide

How Medora medication search works and how Knowledge Expansion Wave 2 extends it **without** a new search engine.

Wave 2 catalog CREATE adds active `CatalogMedication` rows + aliases so new EM drugs appear in the existing order composer (`SharedCatalogAutocomplete` → `/catalog/medications/search`). Specialty-pack chips remain an optional filter only.

## Architecture

- **API:** `GET /catalog/medications/search`, `GET /pharmacy/medications/search`
- **Implementation:** Prisma `contains` / insensitive match on name, generic, display, `searchText`, aliases
- **Ranking:** Existing catalog service ranking (favorites / sort priority / match quality)
- **Query expansions:** `buildEnterpriseMedicationSearchQueryExpansions()` in `@medora/shared`
  - Includes formulary / EM expansions **and** `buildMkExpansionWave2SearchQueryExpansions()`

No Elasticsearch / external search cluster.

## Supported query types (Wave 2)

| Input type | Mechanism |
|------------|-----------|
| Generic names | Direct field match + expansions |
| Brand names | `MedicationAlias` + expansion bridges (e.g. Narcan → naloxone) |
| Abbreviations | Pack `searchTokens` + alias upsert (e.g. NTG, amio) |
| Common misspellings | Wave 2 expansion map (e.g. epinephrin → epinephrine) |
| Synonyms | Aliases + expansion pairs (adrenaline / epinephrine) |
| Therapeutic / specialty packs | Optional `specialtyPack` query param + `EM_PACK:` filter |

## Specialty pack filter

Optional query param: `specialtyPack=CARDIOLOGY` (etc.)

Server filters rows whose `searchText` contains `EM_PACK:CARDIOLOGY` (or therapeutic class fallback). Requires prior `medication:wave2:enrich` so markers exist.

## Provider UI

`SharedCatalogAutocomplete` (medication type) shows a compact chip row for the first eight EM packs. Selecting a chip passes `specialtyPack` into existing search hooks — **no order-composer redesign**.

Favorites / recent remain on existing inventory and usage tables.

## Performance

- Expansions are in-memory maps (shared package), not DB joins per token
- Pack filter is a single `contains` predicate
- List endpoints stay paginated / limited (`limit` / min-chars behavior unchanged)
