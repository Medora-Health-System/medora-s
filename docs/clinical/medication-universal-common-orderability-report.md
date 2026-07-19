# Universal Common Medication Orderability

**Certification ID:** `MEDUI.MEDICATION_FORMULATION_STRENGTH_COMPLETION`
**Program:** Universal Common Medication Orderability Completion
**Authoritative evidence:** provider-facing search path over the universal US common-medication benchmark

## Product question

Can a provider search for and order every common medication represented in the approved US clinical benchmark, including its common brand/generic names and clinically relevant supported variants?

## Measured answer

**YES** — on the universal benchmark (measured):

| Metric | Value |
|--------|------:|
| Benchmark families | **5301** |
| Family search success | **100%** |
| Expected orderability | **100%** |
| Exact brand ranking | **100%** |
| Exact generic ranking | **100%** |
| COMPLETE families | **5301** |
| MISSING_FAMILY | **0** |
| Partial / hidden / non-orderable | **0** |
| Second APPLY aliases created | **0** (idempotent) |
| Order / MAR / chart mutations | **0** |

Biktarvy and Jardiance remain hard-acceptance examples and pass; they are not the sole evidence.

## Benchmark

- **File:** `apps/api/prisma/medications/universal-completion/data/medora-universal-common-medication-benchmark.json`
- **Version:** `universal-common-medication-benchmark-1.0.0`
- **Sources (approved only):** Medora-curated Wave2/Wave3/Wave4 candidate manifests; brand enrichment from local FDA NDC Directory (`FDA_NDC_LOCAL`) where available
- **Unit of count:** medication families (not NDCs/packages)
- **Coverage:** generics, brands, fixed-dose combinations, oral/injectable/inhaled/topical/ophthalmic/otic/rectal/transdermal/sublingual, common hospital products, across ~40 clinical domains

## Provider path (source of truth)

Validation uses the same ranking/normalization gates as production:

- `MedicationCatalogService` search semantics (snapshot mirror for batch measurement)
- active / formulary / governance gates
- exact-family sibling expansion
- result limit with exact-generic strength diversification (prevents combination products from hiding sibling strengths)

## Completion work (CatalogMedication-first)

- Brand / core-INN aliases and `searchText` enrichment for matching active catalog rows
- Exact-generic family prioritization before result-limit truncation
- Brand-rank token normalization for parenthetical FDA-style brand strings (e.g. `Zemdri (plazomicin)`)
- No fabricated RxCUI/NDC/strength/form/route
- No bulk dual-layer activation; no CDS activation; no patient-order mutations

## Certification decision

Full certification requires universal benchmark **100%** search and expected orderability. That threshold is met.

See audit artifacts:

- `medication-universal-common-orderability-validation.json`
- `medication-universal-common-orderability-apply-idempotent.json`
- `medication-formulation-strength-completion-certification.json`
