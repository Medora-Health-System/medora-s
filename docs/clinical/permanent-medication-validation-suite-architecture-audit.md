# Permanent Medication Validation Suite — Architecture Audit

**Date:** 2026-07-19
**Program:** Permanent Medication Validation Suite
**Certification ID:** `MEDUI.PERMANENT_MEDICATION_VALIDATION_SUITE`

## Verdict

**Extend** the existing `apps/api/prisma/medications/*` + `@medora/shared` stack.
**Do not** invent a parallel validation framework.
**Do not** use the universal in-memory snapshot as the production gate.

## Current provider path (source of truth)

```
CreateOrderModal → SharedCatalogAutocomplete (limit=40)
  → GET /api/backend/catalog/medications/search
    → OrderCatalogController.searchMedications
      → MedicationCatalogService.search
        → CatalogMedication + MedicationAlias (+ MedicationSearchAlias)
        → activation / formulary gate
        → ranking + family expansion + result limit
```

## Existing validators

| Component | Path | Real `MedicationCatalogService.search`? |
|-----------|------|----------------------------------------|
| Formulation provider-availability | `formulation-completion/medication-provider-availability-validation.ts` | **Yes** |
| Runtime hard probe | `runtime-remediation/probe-provider-search-hard-acceptance.ts` | **Yes** |
| Runtime gap inventory | `runtime-remediation/run-runtime-clinical-gap-inventory.ts` | **Yes** |
| Universal common-orderability | `universal-completion/medication-universal-common-orderability.ts` | **No** (snapshot bypass) |

## Benchmark sources (approved)

| Source | Role |
|--------|------|
| `MEDICATION_PROVIDER_CLINICAL_CORPUS` (~285 families) | Critical / PR tier |
| Universal common-medication benchmark (5301 families) | Full / nightly tier |
| Runtime clinical gap inventory (40 families) | Deployment smoke seed |

## CI today

- `.github/workflows/verify.yml`: typecheck/build + narrow e2e; **no** medication catalog validation
- `pnpm verify`: stability only — **no** medication scripts
- Empty CI Postgres after migrate cannot certify catalog completeness without seed or fixture tests

## Extension plan

1. Shared types, failure classifications, decide\* for permanent suite
2. Reusable validators over real search DTOs
3. CLI tiers: `critical` / `full` / `deployment`
4. Fixture-backed negative regression test (always in CI)
5. Optional DB-backed critical suite when catalog is present
6. Certification `MEDUI.PERMANENT_MEDICATION_VALIDATION_SUITE`
7. Docs + roadmap update

## Migration

**Migration required: NO** — repository-versioned benchmarks + CI artifacts are sufficient.
