# Provider Ordering Validation

**Program:** Medication Formulation & Strength Completion
**Certification ID:** `MEDUI.MEDICATION_FORMULATION_STRENGTH_COMPLETION`

## Authoritative evidence

The **universal common-medication benchmark** (5301 families) is the certification source of truth for provider search + orderability completion.

See: [medication-universal-common-orderability-report.md](./medication-universal-common-orderability-report.md)

| Metric | Value |
|--------|------:|
| Universal benchmark families | **5301** |
| Universal search pass rate | **100%** |
| Universal orderability pass rate | **100%** |
| Exact brand ranking | **100%** |
| Exact generic ranking | **100%** |
| Hard acceptance (Biktarvy / Jardiance) | **PASS** |

## Secondary probe corpus (legacy)

Smaller hand-curated probe retained for regression continuity:

| Metric | Value |
|--------|------:|
| Corpus families | 285 |
| Queries exercised | 591 |
| Search pass rate | ~98.6% (secondary; not the certification gate) |
| Orderability pass rate | 100% |
| Exact brand ranking pass rate | 100% |

## Production path

Validator uses `MedicationCatalogService` search semantics (same API as prescription “Search and add”), including activation gate, ranking, family expansion, exact-generic strength prioritization, and UI-aligned `limit=40`.

## Ranking rules (summary)

1. Exact brand alias
2. Exact generic/name/code
3. Brand alias token-prefix
4. Generic/name prefix
5–7. Bounded token matches
8. Mid-string contains (disabled for queries ≤3 chars)

Exact-generic family rows are retained before combination-product crowding under the result limit.

## Workflow compatibility

CatalogMedication-first ordering preserved. Pharmacy / MAR / reconciliation linkages unchanged. No patient order/MAR/chart/CDS mutations. Dual-layer products not bulk-activated.
