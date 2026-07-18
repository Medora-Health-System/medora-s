# Medication Knowledge Expansion Wave 2 — Architecture Audit

**Program:** Medication Knowledge Expansion (content) — not Medication Intelligence Phase 19
**Scope:** Emergency Medicine Catalog Expansion
**Date:** 2026-07-18

## Verdict

Canonical write path is known. **No schema migration required.**
Do **not** create a parallel medication model.
Do **not** use specialty-pack enrich CLI as the CREATE pipeline.

## Systems of record

| Concern | System of record |
|---------|------------------|
| Provider search / order / pharmacy / MAR binding (today) | `CatalogMedication` (+ `MedicationAlias`, `searchText`) |
| Canonical identity (governance) | `MedicationConcept` |
| Orderable strength/form/route variant | `MedicationProduct` (+ `MedicationConcentration`, route) |
| Package / NDC unit | `MedicationPackage` |
| Facility formulary | `FacilityFormularyItem` → package |
| Recommendations | `familyKey` / `canonicalConceptId` (separate from catalog availability) |

`OrderItem.catalogItemId` remains the clinical runtime key. Product/package FKs on orders are dual-layer / future.

## Live baseline (measured — not hardcoded)

Captured by Wave 2 baseline tooling against the local database (see audit-summaries artifact). At audit time:

| Metric | Value |
|--------|------:|
| CatalogMedication total | 1042 |
| CatalogMedication active | 969 |
| Distinct normalized catalog generics | 242 |
| MedicationAlias | 3091 |
| MedicationConcept total | 1377 |
| MedicationConcept active | 14 |
| Distinct concept generics | 679 |
| MedicationProduct | 1429 |
| MedicationPackage | 1428 |
| Products linked via `legacyCatalogMedicationId` | 236 |
| FacilityFormularyItem | 898 |
| MedicationSearchAlias | 466 |
| RxNorm-mapped concepts | 1 |
| RxNorm staging concepts | 33 |
| Orders using catalog medications | 3942 |
| MedicationAdministration rows | 956 |
| Duplicate CatalogMedication.code | 0 |

### Integrity note (canonical pollution)

`MedicationConcept` contains heavy duplicate pollution (hundreds of acetaminophen / test concepts). **Net-new Wave 2 identity** is therefore defined against:

1. Normalized `CatalogMedication.genericName` (primary provider identity set)
2. Stable Wave 2 concept codes `EM_W2C_{SLUG}` (idempotent canonical create)
3. Existing Wave 4 concept codes `ENT_W4_{SLUG}` when present

Do not silently merge ambiguous rows into polluted concept IDs.

## Terminology / external sources

| Source | Status |
|--------|--------|
| RxNorm | Staging/review present; **not** a complete local catalog; almost no verified mappings |
| NDC | Optional on catalog/package; **do not fabricate** |
| DailyMed | Mentioned in provenance docs; **no importer tables** |
| First Databank | **Not licensed / not integrated** |

## Existing CREATE write path (reuse)

Enterprise formulary seed pattern (`seed-enterprise-wave4-ed-hospital-formulary.ts` / `seed-enterprise-medication-manifest.ts`):

1. Upsert `CatalogMedication` by stable `code`
2. Upsert `MedicationAlias`
3. Create inactive `MedicationConcept` → `MedicationProduct` → `MedicationPackage` linked by `legacyCatalogMedicationId`
4. Activation / formulary / recommendations remain separate gates

Knowledge Expansion Wave 2 specialty-pack enrich (`medication:wave2:enrich`) only tags existing rows — **not** net-new CREATE.

## Migration

**Not required** — schema already represents concepts, products, packages, aliases, search, formulary, evidence.

## Duplicate / integrity risks

- Fuzzy name matching can mis-tag (enrich path) — CREATE uses stable codes + normalized generic keys
- Concept table pollution — avoid attaching new products to random acetaminophen concept rows
- Creating products without catalog linkage leaves orphans invisible to providers
- Fabricating RxNorm/NDC/HCPCS would poison billing/terminology — Wave 2 leaves those null/unmapped when unknown

## Recommended expansion method

Idempotent importer: **AUDIT → DRY_RUN → APPLY → VERIFY → REPORT**
Manifest-driven candidates → CatalogMedication-first CREATE → optional inactive dual-layer link → optional specialty-pack enrich → certify actual counts.
