# Permanent Medication Validation Suite Architecture

See also: [permanent-medication-validation-suite-architecture-audit.md](./permanent-medication-validation-suite-architecture-audit.md)

## Principle

The real provider path (`MedicationCatalogService.search`) is the source of truth.

## Layers

| Layer | Location |
|-------|----------|
| Types / decide / validators (pure) | `packages/shared/src/medication/permanentMedicationValidationSuite.ts` |
| DB runner | `apps/api/prisma/medications/permanent-validation/` |
| Certification | `apps/api/prisma/medications/audit/medication-permanent-validation-suite-certification.ts` |
| CI | `.github/workflows/medication-validation.yml` |

## Tiers

1. **critical** — clinical corpus (hundreds of families), PR/local gate when DB populated
2. **full** — universal 5301-family benchmark
3. **deployment** — hard-acceptance smoke

## Negative proof

Isolated fixture masks Biktarvy brand → expects `MISSING_FAMILY` and nonzero jest failure path (always in CI).
