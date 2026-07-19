# Medication Completeness Report

**Program:** Medication Formulation & Strength Completion
**Certification ID:** `MEDUI.MEDICATION_FORMULATION_STRENGTH_COMPLETION`
**Decision:** `MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFIED`

## Scope

Provider-facing availability so clinicians can search and order common US medications (brand/generic, supported strengths/forms/routes). Not Phase 19. Not an expansion wave. Not dual-layer bulk activation.

## Authoritative measured evidence (universal benchmark)

| Metric | Value |
|--------|------:|
| Benchmark families | **5301** |
| Family search success | **100%** |
| Expected orderability | **100%** |
| Exact brand ranking | **100%** |
| Exact generic ranking | **100%** |
| COMPLETE families | **5301** |
| MISSING_FAMILY | **0** |
| Second APPLY (aliases) | **0** |
| Hard acceptance (Biktarvy + Jardiance) | **PASS** |

See [medication-universal-common-orderability-report.md](./medication-universal-common-orderability-report.md).

## Catalog snapshot (supporting)

| Metric | Value |
|--------|------:|
| Distinct generics | 5206 |
| Active catalog rows | 10739 |
| Distinct formulations | 10052 |
| Distinct strengths | 762 |
| Distinct dosage forms | 96 |
| Distinct routes | 33 |
| Formulations created (prior formulation program) | 82 |

## Hard acceptance examples (not the project scope)

| Query | Result |
|-------|--------|
| Jardiance / jard / jar | Jardiance (Empagliflozin) 10 mg + 25 mg; tirzepatide does not outrank |
| Empagliflozin | Empagliflozin family with 10 mg + 25 mg |
| Biktarvy / bikt | Biktarvy combo family searchable and orderable |

## Safety

No patient-order, MAR, chart, or CDS mutations. No fabricated RxCUI/NDC. No bulk dual-layer activation. Migration: none. Production deploy: not performed by certification.
