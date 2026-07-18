# Phase 17 — Safety Monitoring

## Tracked metrics

Eligible / active recommendations, facilities, authorized & trained providers, advisory exposures, unique encounters, acknowledgement / dismissal / disagreement rates, provider reasons, confidence distribution, evidence coverage, stability, time-to-dismiss, workflow impact, safety events, automatic & manual suspensions, unauthorized exposure attempts, version drift attempts, order/MAR/chart mutation counts, enterprise activation attempts.

**Mutation counts must remain zero.**

## Persistence

- `MedicationRecommendationPilotExposure`
- `MedicationRecommendationPilotSafetyEvent`
- `MedicationRecommendationPilotMonitoringSnapshot`
- `MedicationRecommendationPilotAuditEvent`

## Admin views

Active pilot monitoring, advisory exposure analytics, provider feedback, safety events, version integrity, evidence currency, audit history.

## CLI

```bash
pnpm --filter @medora/api medication:phase17:pilot:monitor
pnpm --filter @medora/api medication:phase17:safety-check
```
