# Phase 17 — Pilot Qualification

A recommendation definition becomes pilot-eligible only when **all** critical criteria pass. Failure remains **shadow-only**.

## Criteria (minimum)

- Lifecycle = `SHADOW_RECOMMENDATION`
- Wave 1 family (acetaminophen / identity-blocked excluded)
- Authoritative provenance complete
- Expert review approved and current
- No unresolved critical evidence conflict
- Shadow evaluation count ≥ governed minimum
- Confidence ≥ governed minimum
- Evidence completeness / coverage acceptable (limitations allowed)
- False-positive / false-negative review complete (counts tracked)
- No constitutional violations in shadow mode
- Order / MAR / chart mutation counts = 0
- Recommendation version immutable for pilot pin
- Evidence not stale; reviewer credentials valid
- Facility prerequisites, provider training config, suspension + audit operational

## Governed thresholds

Documented in `PHASE17_QUALIFICATION_THRESHOLDS` (shared):

| Threshold | Default |
|-----------|---------|
| `minShadowEvaluationCount` | 1 |
| `minConfidenceScore` | 40 |
| `minEvidenceCompleteness` | 20 |
| Mutation / conflict / violation maxima | 0 |

Do not invent clinically arbitrary thresholds outside this governed config.

## Decisions

- `PILOT_ELIGIBLE`
- `PILOT_ELIGIBLE_WITH_LIMITATIONS`
- `CONTINUE_SHADOW_ONLY`
- `NOT_ELIGIBLE`

## CLI

```bash
pnpm --filter @medora/api medication:phase17:qualification
pnpm --filter @medora/api medication:phase17:readiness
```

Qualification does **not** activate a pilot.
