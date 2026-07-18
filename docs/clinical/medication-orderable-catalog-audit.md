# Orderable Catalog Audit

**Program:** Medication Orderable Catalog Completion
**Certification ID:** `MEDUI.MEDICATION_ORDERABLE_CATALOG_COMPLETION`

## Architecture

Provider ordering is **CatalogMedication-first**. Dual-layer `MedicationProduct` rows from Waves 2–4 remain inactive by design; the provider search gate preserves inactive linked products so catalogs stay searchable.

## Measured baseline (pre-completion)

| Metric | Value |
|--------|------:|
| CatalogMedication total | 10730 |
| Catalog active | 10657 |
| Distinct generics | 5206 |
| Provider-orderable (shaped) | 10079 |
| Non-orderable clinical | 334 |
| Coverage | 96.79% |
| Aliases | 7765 |
| Brand-like aliases | 7588 |

## Primary blockers (baseline)

- MISSING_STRENGTH
- MISSING_GENERIC
- TEST_OR_NONCLINICAL (excluded from clinical coverage)

## Completion actions

- Derive strength/form from existing name/product/sibling catalog text only
- Propagate brand aliases from Wave 2/3 candidate brands + existing same-generic aliases
- Refresh `searchText` with aliases
- Never fabricate RxNorm/NDC; never bulk-activate dual-layer products
