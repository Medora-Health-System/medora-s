# Medication Knowledge Expansion Wave 3 — Certification Report

**Certification ID:** `MEDUI.MEDICATION_KNOWLEDGE_EXPANSION_WAVE_3_IMPORT_DRIVEN_COMPREHENSIVE_FORMULARY`

**Decision:** `MEDICATION_KNOWLEDGE_EXPANSION_WAVE_3_CERTIFIED`

## Measured results (local DB)

| Metric | Value |
|--------|------:|
| Baseline catalog | 2875 |
| Baseline distinct generics | 958 |
| Source candidates (conceptKeys) | 1102 |
| Net-new distinct generics | 1048 |
| Final distinct generics | 2006 |
| Catalog after APPLY | 4759 |
| Catalog delta | 1884 |
| Wave 3 products | 1098 |
| Duplicate EM_W3C groups | 0 |
| Orphan Wave 3 variants | 0 |
| Migration required | NO |
| Certification idempotent | YES |

## Safety

No order / MAR / chart / recommendation / production CDS / enterprise activation mutations.

## Commands

See `medication-import-operations-guide.md`. Artifacts under `apps/api/prisma/medications/audit-summaries/medication-knowledge-expansion-wave3-*`.
