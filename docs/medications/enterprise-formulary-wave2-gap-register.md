# M1.6D — Enterprise Formulary Wave 2 gap register

**Date:** 2026-06-02  
**Phase:** M1.6D implementation

## Closed by Wave 2

| ID | Gap (M1.6A register) | Wave 2 action |
|----|----------------------|---------------|
| G2-01 | Insulin glargine / lispro absent | CREATE rows |
| G2-02 | Sitagliptin / glyburide absent | CREATE rows |
| G2-03 | Ipratropium / montelukast / fluticasone gap | ENRICH + CREATE |
| G2-04 | Clopidogrel absent | ENRICH |
| G2-05 | Atorvastatin/rosuvastatin (Wave 1) | **Wave 1** — not duplicated |
| G2-06 | SSRI/psychiatry gap (partial) | CREATE quetiapine, aripiprazole, lithium, valproate, trazodone |
| G2-07 | Combined OCP / Depo | ENRICH |
| G2-08 | ER critical (naloxone, epi, propofol, ketamine) | ENRICH |
| G2-09 | ID broad-spectrum (zosyn, linezolid, vanc IV) | ENRICH + CREATE |

## Remaining (future waves)

| ID | Gap | Severity | Defer |
|----|-----|----------|-------|
| G2-R01 | Oncology chemo module | CRITICAL | Wave 4 |
| G2-R02 | HIV antiretrovirals national formulary | HIGH | Wave 3+ |
| G2-R03 | Full vaccine panel duplicates Wave 1 | — | Intentionally Wave 1 only |
| G2-R04 | Provider search cutover (M1.5F) | MEDIUM | Post-wave validation |
| G2-R05 | Multi-facility formulary variance | LOW | Phase 6+ |

## Wave 2 explicit non-goals

- No billing engine redesign
- No claim engine changes
- No pharmacy workflow UI changes
- No automatic activation
- No new Wave 1 medication duplicates
