# Phase 16 — Certification Guide

Command: `pnpm --filter @medora/api medication:phase16:certify`

Decision values:

- `MEDICATION_INTELLIGENCE_PHASE_16_CERTIFIED_SHADOW_ONLY` (expected)
- `MEDICATION_INTELLIGENCE_PHASE_16_CERTIFIED` (reserved; not used while Pilot/Active blocked)
- `MEDICATION_INTELLIGENCE_PHASE_16_NOT_CERTIFIED`

Artifacts under `apps/api/prisma/medications/audit-summaries/medication-phase16-*`.

Idempotency: set `PHASE16_IDEMPOTENCY_CHECK=1` for dual-run verification.
