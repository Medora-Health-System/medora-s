# Permanent Medication Validation — Release Remediation

**Date:** 2026-07-20  
**Scope:** Clinical release gate failures from critical (10) and full (29) suites.

## Measured post-remediation results (localhost / Facility A)

| Tier | Families | Queries | Failures | Search | Orderability |
|------|---------:|--------:|---------:|-------:|-------------:|
| Critical | 269 | 559 | 0 | 100% | 100% |
| Full | 5301 | 8349 | 0 | 100% | 100% |
| Deployment | 26 | 64 | 0 | 100% | 100% |

Real `MedicationCatalogService.search` path; snapshot bypass false.

## Validator defects fixed

1. **Tirzepatide / Mounjaro / Zepbound** — Jardiance/empagliflozin ranking rule is scoped to the Jardiance family and `jar`/`jard` prefixes only.
2. **Salt/base equivalence** — `normalizeClinicalIngredientKey` / `clinicalFamilyTokenMatch` accept salt omission (e.g. Amiodarone ↔ Amiodarone Hydrochloride) without accepting unrelated ingredients or wrong combo families.
3. **Product-specific strengths** — family-level `expectedStrengths` apply to generic/INN queries only, not brand/product SKUs.

## Search / alias remediation

Idempotent APPLY:

```bash
pnpm medication:validate:remediate APPLY
```

- Adds verified brand/synonym aliases (Duragesic, Theo-Dur, Principen, Nydrazid, Nucynta, erythropoietin, Canasa, Vandazole, Diclofenac DR, Nicoderm, Basaglar KwikPen, Caverject Impulse, Kayexalate → SPS, combo spaced forms, Rocephin/Zosyn/Levophed/Asacol).
- Deletes polluted brand aliases on wrong generics.
- Strips cocktail protocol brand tokens from unrelated `searchText` (e.g. `rocephin`/`zosyn` on vancomycin empiric packs).
- Combination separator expansion in `expandMedicationSearchQuery` (space / slash / hyphen) plus Augmentin/Entresto/erythropoietin expansions.
- Ranking: synonym expansions used for discovery only; exact brand alias + identity-surface tie-break (Kayexalate vs dextrose cocktail).

**Numbing Cream:** not retained as an alias (ambiguous consumer phrase).

**Duragesic:** alias resolves to active fentanyl family; no fentanyl transdermal patch rows in local catalog (formulation gap noted; brand search no longer empty).

## Benchmark corrections (v1.0.1)

Traceable in `medora-universal-common-medication-benchmark.json` → `benchmarkCorrections`.

| Query / brand removed or adjusted | Classification | Rationale |
|-----------------------------------|----------------|-----------|
| Kali muriaticum | NOT_CLINICALLY_REQUIRED | Homeopathic; not provider-orderable synonym |
| Natrum muriaticum, RESP EASE, Sodium Chloride Normal Salt | NOT_CLINICALLY_REQUIRED | Homeopathic/consumer noise |
| ivometn ivermectin lice treatment, lice treatment dedicated | PRODUCT_QUERY_WRONG | Malformed consumer strings |
| Numbing Cream | NOT_CLINICALLY_REQUIRED | Ambiguous consumer phrase |
| Dopamine 1515 | PRODUCT_QUERY_WRONG | Package-style noise |
| NaCl / KCl expected strengths | BENCHMARK_EXPECTATION_WRONG / UNIT_NORMALIZATION_WRONG | Align to clinic-orderable forms |
| Budesonide / Vancomycin strengths | FORM_MISMATCH / REQUIRES_CLINICAL_REVIEW | Family strengths for generic query; SKUs product-specific |

## Formulation review summary

| Family | Classification | Notes |
|--------|----------------|-------|
| Budesonide | FORM_MISMATCH (validator) | Flexhaler vs Respules strengths must not cross-assert |
| Potassium chloride | UNIT_NORMALIZATION_WRONG | Prefer oral mEq; avoid requiring injectable 2 mEq/mL for all queries |
| Sodium chloride | BENCHMARK_EXPECTATION_WRONG | Prefer 0.9% clinical IV; drop homeopathic brand probes |
| Vancomycin / TYZAVAN | REQUIRES_CLINICAL_REVIEW | TYZAVAN = oral brand; 125 mg oral + 1 g injectable remain generic-family expectations |

## Migration

**NO** — data APPLY only; no Prisma schema change.

## Intentional exclusions

None. All original gate failures were remediated (validator, search/alias, or reviewed benchmark correction).
