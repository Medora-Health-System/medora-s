# Runtime Provider Medication Availability Remediation

**Certification ID:** `MEDUI.MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_COMPLETION`

## Root cause (one sentence)

Prior completion work APPLY’d and certified against **local** Postgres while the Wayne Urgent Care provider UI reads **Railway production** Postgres.

## Fix implemented

1. Proven discrepancy with redacted local vs production DB counts and live `MedicationCatalogService.search` probes
2. Production APPLY of approved Wave 2 + Wave 3 curated catalogs + formulation completion
3. Runtime hard-acceptance + 40-family clinical gap inventory against Wayne facility
4. New certification that rejects snapshot-bypass / local-only evidence

## Measured after remediation (production)

| Check | Result |
|-------|--------|
| `jard` / Jardiance | 10 mg + 25 mg |
| Biktarvy / Biktar / bikt | Orderable 50/200/25 mg tablet |
| Clinical inventory (40 families) | 100% search + orderability |
| Orders / MAR / chart / CDS mutations | 0 |

## Remaining gaps

- Expand production inventory beyond the representative 40-family sample
- Retry universal alias APPLY after proxy connection drops
- Optional Wave 4 APPLY on production
- Polish short-query ranking (`jard` vs Estriol noise)

See also: [medication-runtime-availability-root-cause-audit.md](./medication-runtime-availability-root-cause-audit.md)
