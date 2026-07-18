# Medication Knowledge Expansion Wave 2 — Guide (index)

Primary catalog expansion docs:

- [`medication-knowledge-expansion-wave-2-em-catalog-guide.md`](./medication-knowledge-expansion-wave-2-em-catalog-guide.md)
- [`medication-knowledge-expansion-wave-2-certification-report.md`](./medication-knowledge-expansion-wave-2-certification-report.md)
- [`medication-knowledge-expansion-program.md`](./medication-knowledge-expansion-program.md)

**Catalog certification ID:** `MEDUI.MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_EMERGENCY_MEDICINE_CATALOG`

Specialty-pack search organization (enrich-only) remains available under `medication:wave2:enrich` and does **not** create net-new masters.

---

## Legacy note — specialty-pack foundation

**Foundation certification ID:** `MEDUI.MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_EMERGENCY_MEDICINE_FOUNDATION`
**Implementation ID:** `MEDUI.MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_EM_SPECIALTY_PACKS`
**Program key:** `EM_KNOWLEDGE_EXPANSION_WAVE2_V1`

Medication Intelligence (Phases 15–18) is complete. Wave 2 **expands clinical content** for emergency medicine — it does **not** redesign engines, governance, recommendation architecture, or create a second medication model.

## Architectural audit (concise)

| Capability | Existing home | Wave 2 action |
|------------|---------------|---------------|
| Runtime medication master | `CatalogMedication` (+ `MedicationAlias`, `searchText`) | **ENRICH** pack markers + aliases |
| Canonical identity | `MedicationConcept` → `Product` → `Package` | Reuse; no new master |
| RxNorm | Staging / review pipeline (Phase 7+) | Reuse; no new import engine |
| Search | Prisma `contains` + ranking + `buildEnterpriseMedicationSearchQueryExpansions()` | Add Wave 2 expansions + optional `specialtyPack` filter |
| Order composer | `CreateOrderModal` / `SharedCatalogAutocomplete` | Compact specialty chips only |
| Favorites / recent | `InventoryItem.isFavorite`, `FacilityMedicationUsage` | Reuse unchanged |
| Pharmacy / MAR linkage | Existing catalog FKs and order paths | Untouched |
| Recommendations | Phase 16–18 engines | Untouched; no order-from-recommendation |
| Evidence | Existing safety/knowledge registrations | Reuse; never bypass provenance |
| Audit / certification | `prisma/medications/audit/*` | New Wave 2 certifier pattern |

**Migration required:** **NO** — content + search organization only.

**Naming note:** Distinct from **Enterprise Formulary Wave 2** (`enterpriseWave2FormularyManifest`). This program is **Medication Knowledge Expansion Wave 2** (EM specialty packs).

## Specialty packs (15)

Cardiology · Pulmonary · Neurology · Infectious Disease · Trauma · Toxicology · Endocrine · OB · Pediatrics · Ophthalmology · ENT · Urology · Gastroenterology · Allergy · Psychiatry

Pack marker in `searchText`: `EM_PACK:{PACK_KEY}` (e.g. `EM_PACK:CARDIOLOGY`).

Acetaminophen / paracetamol remain **excluded** (identity blocked).

## Safety defaults (fail-closed)

- Clinical activation OFF
- Enterprise Active OFF
- Production CDS OFF
- Order-from-recommendation OFF
- No second medication master
- No unsupported metadata invention

## Commands

```bash
pnpm --filter @medora/shared build
pnpm --filter @medora/api medication:wave2:enrich
pnpm --filter @medora/api medication:wave2:coverage
pnpm --filter @medora/api medication:wave2:certify
```

Dry-run enrich: `pnpm --filter @medora/api medication:wave2:enrich -- --dry-run`

## Related guides

- [Medication Catalog Guide](./medication-catalog-guide.md)
- [Medication Search Guide](./medication-search-guide.md)
- [Medication Metadata Guide](./medication-metadata-guide.md)
- [Medication Intelligence Roadmap](./medication-intelligence-roadmap.md)
