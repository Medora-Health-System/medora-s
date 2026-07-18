# Phase 18 — Certification Guide

**ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_18_OPERATIONAL_SAFETY_MONITORING_EXPLAINABILITY_REGULATORY_READINESS`

| Decision | When |
|----------|------|
| `…_CERTIFIED_OPERATIONAL_READY` | Sealed versions, ops/quality ready, replay clean |
| `…_CERTIFIED_GOVERNANCE_READY` | Sealed or regulatory evidence present |
| `…_CERTIFIED_MONITORING_READY` | Platform monitors safely without full seal |
| `…_NOT_CERTIFIED` | Constitutional breach (mutations, replay fail, enterprise, etc.) |

```bash
PHASE18_IDEMPOTENCY_CHECK=1 pnpm --filter @medora/api medication:phase18:certify
```
