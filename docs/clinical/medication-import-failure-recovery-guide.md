# Import Failure Recovery Guide

- Malformed files fail before APPLY.
- APPLY uses per-variant transactions; failed variants are recorded, not silently activated.
- Re-run APPLY is idempotent (existing identity matches → zero CREATE).
- Do not `prisma migrate reset`.
- Job artifacts under `audit-summaries/` are the checkpoint of record for Wave 3 file jobs.
