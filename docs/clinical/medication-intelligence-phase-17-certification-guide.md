# Phase 17 — Certification Guide

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_17_CONTROLLED_PILOT_QUALIFICATION_SAFETY_MONITORING_LIMITED_CLINICAL_ADVISORY`

## Decisions

| Decision | When |
|----------|------|
| `..._CERTIFIED_CONTROLLED_PILOT` | Valid active pilot + all safeguards pass |
| `..._CERTIFIED_PILOT_READY_NOT_ACTIVATED` | Platform ready; no active pilot |
| `..._CERTIFIED_CONTINUE_SHADOW_ONLY` | Phase 16 safe; qualification not met |
| `..._NOT_CERTIFIED` | Any constitutional breach |

A continue-shadow-only or pilot-ready-not-activated outcome is acceptable and preferred over unsafe activation. Do not fabricate pilot evidence.

## Assertions

Phase 16 remains certified; provenance-based engine; Wave 1 scope; acetaminophen excluded; facility/provider/definition/time authorization; version pinning; enterprise blocked; order-from-recommendation impossible; mutation counts zero; automatic suspension works; idempotent artifacts.

## Commands

```bash
pnpm --filter @medora/api medication:phase17:qualification
pnpm --filter @medora/api medication:phase17:readiness
PHASE17_IDEMPOTENCY_CHECK=1 pnpm --filter @medora/api medication:phase17:certify
```

## Artifacts

Under `apps/api/prisma/medications/audit-summaries/`:

- `medication-phase17-readiness.json`
- `medication-phase17-qualification.json`
- `medication-phase17-controlled-pilot-certification.json`
- `medication-phase17-controlled-pilot-certification-summary.json`
- `medication-phase17-controlled-pilot-certification.md`
