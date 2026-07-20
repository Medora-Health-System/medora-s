# Provider-Facing Medication Benchmark Guide

## Versions

| Tier | Source | Version key |
|------|--------|-------------|
| Critical | `MEDICATION_PROVIDER_CLINICAL_CORPUS` | `permanent-medication-benchmark-1.0.0` |
| Full | Universal common-medication benchmark JSON | `universal-common-medication-benchmark-1.0.0` |
| Deployment | Hard-acceptance subset of critical | same as critical |

## Rules

- Approved Medora curated / FDA NDC brand enrichment / existing corpus only
- Do not invent strengths, brands, or RxCUIs
- Do not shrink the benchmark to hide failures
- Removals require documented reason + review trail

## Family fields (logical)

`benchmarkFamilyId`, `canonicalGenericName`, `commonBrandNames`, `commonSearchTerms`,
`expectedStrengths`, `expectedOrderability`, `requiredForED`, `clinicalDomains`,
`hardAcceptance`, `source`, `sourceVersion`, optional `intentionalExclusion`
