# Provider Ordering Validation

**Program:** Medication Formulation & Strength Completion
**Certification ID:** `MEDUI.MEDICATION_FORMULATION_STRENGTH_COMPLETION`

## Production path

Validator uses `MedicationCatalogService.search` (same API as prescription “Search and add”), including activation gate, ranking, family expansion, and UI-aligned `limit=40`.

## Measured results

| Metric | Value |
|--------|------:|
| Corpus families | 285 |
| Queries exercised | 591 |
| Search pass rate | 98.31% |
| Orderability pass rate | 100% |
| Exact brand ranking pass rate | 100% |
| Hard acceptance | PASS |
| Absent hard-acceptance meds | 0 |

## Ranking rules (summary)

1. Exact brand alias
2. Exact generic/name/code
3. Brand alias token-prefix
4. Generic/name prefix
5–7. Bounded token matches
8. Mid-string contains (disabled for queries ≤3 chars)

## Workflow compatibility

CatalogMedication-first ordering preserved. Pharmacy / MAR / reconciliation linkages unchanged. No patient order/MAR/chart/CDS mutations. Dual-layer products not bulk-activated.
