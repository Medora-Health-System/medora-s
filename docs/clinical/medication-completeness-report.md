# Medication Completeness Report

**Program:** Medication Formulation & Strength Completion
**Certification ID:** `MEDUI.MEDICATION_FORMULATION_STRENGTH_COMPLETION`

## Scope

Provider-facing availability for medications already in Medora, plus remediation of search ranking/display gaps. Not Phase 19. Not an expansion wave. Not dual-layer bulk activation.

## Why prior certification was insufficient

Internal counts and a 15-family probe did not match prescription UI behavior (Jardiance family/display, `jar` ranking, Biktarvy search).

## Measured catalog (final)

| Metric | Value |
|--------|------:|
| Distinct generics | 5206 |
| Active catalog rows | 10739 |
| Distinct formulations | 10052 |
| Distinct strengths | 762 |
| Distinct dosage forms | 96 |
| Distinct routes | 33 |
| Formulations created (program) | 82 |
| Provider corpus families | 285 |
| Corpus queries | 591 |
| Corpus search pass rate | **98.31%** |
| Orderability pass rate | **100%** |
| Exact brand ranking pass rate | **100%** |
| Hard acceptance (Biktarvy + Jardiance) | **PASS** |

## Hard acceptance (production search path, limit 40)

| Query | Result |
|-------|--------|
| Jardiance / jard / jar | Jardiance (Empagliflozin) 10 mg + 25 mg; tirzepatide does not outrank |
| Empagliflozin | Empagliflozin family with 10 mg + 25 mg |
| Biktarvy / bikt | Biktarvy (Bictegravir Emtricitabine Tenofovir Alafenamide) 50 mg/200 mg/25 mg |
| bictegravir / ingredient terms | Combo family searchable |

## Outstanding gaps

Corpus search failures remain for some brand aliases / INN spellings without approved catalog rows (examples: certain legacy brand names). These are review items, not hard-acceptance failures.
