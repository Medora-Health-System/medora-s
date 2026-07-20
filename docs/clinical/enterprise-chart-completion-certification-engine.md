# Enterprise Chart Completion Certification Engine

**Certification ID:** `MEDUI.ENTERPRISE_CHART_COMPLETION_CERTIFICATION_ENGINE`

## Decision (Stage A — advisory deployment boundary)

`ENTERPRISE_CHART_CERTIFICATION_CERTIFIED_WITH_REVIEW_ITEMS`

Stage A is an **ADVISORY** engineering foundation and chart-review preview. It is **not** a full enterprise module-by-module engine and is **not** approved as:

- a closure-blocking gate
- a discharge-blocking gate
- a billing/coding-blocking gate
- an authoritative “chart incomplete” mark that replaces established lifecycle rules

### Measured Stage A benchmark (honest)

| Metric | Value |
|--------|-------|
| Cases | 3 |
| True positives | 2 |
| False positives | 3 |
| False negatives | 0 |
| Precision | **0.40** |
| Recall | 1.00 |
| Exact-set match | 0% |
| Duplicate rate | 0% |
| Stale-result rate | not measured |

This synthetic benchmark is **insufficient** for clinical accuracy claims. Stage B and Stage C remain required.

## Authority model

Result contract (code-level, no migration):

| Field | Stage A value |
|-------|----------------|
| `certificationStage` | `"A"` |
| `certificationAuthority` | `"ADVISORY"` |
| `coverageStatus` | `"PARTIAL"` |
| `evaluatedModules` | lifecycle snapshot, disposition projection, billing snapshot overlay, dedupe, … |
| `unevaluatedModules` | orders/results lifecycle, MAR, procedures, pathways, contextual vitals, mutation-wide freshness, … |
| `benchmarkStatus` | `STAGE_A_SYNTHETIC_INSUFFICIENT_PRECISION_0_40` |

Deficiency `sourceAuthority`:

| Value | May block actions? |
|-------|--------------------|
| `ESTABLISHED_WORKFLOW` | Yes — disposition readiness / physical departure / established billing snapshot fields |
| `STAGE_A_ADVISORY` | **No** — review suggestions only |

Readiness:

- `authoritativeReadiness` — established workflow only
- `advisoryReadiness` — Stage A suggestions (`providerReviewSuggested`, etc.)
- Legacy `closureReady` / `billingReady` mirror **authoritative** readiness in Stage A (not advisory FPs)

## Safe consumers

| Surface | Role |
|---------|------|
| Review certification panel | Advisory display + established blockers |
| Close-check continue | Gated only by disposition-safety acknowledgement |
| My Incomplete Charts **inclusion** | Lifecycle only (`INCOMPLETE_CHART` / `READY_FOR_CLOSURE`) |
| My Incomplete Charts badges | Lifecycle badges always; Stage A overlays only when flag ON |
| Close / discharge / sign / nursing / billing APIs | Unchanged established services |

## Feature flag

`enterpriseChartCertificationStageA`

Env (default **OFF**):

- `NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_A=true|1`
- `ENTERPRISE_CHART_CERTIFICATION_STAGE_A=true|1`

When OFF: Stage A advisory findings/badge overlays hidden; established workflow unchanged.
When ON: advisory findings visible with partial-coverage labeling; still non-blocking.

## Architecture (current)

```
GET /trackboard (open census)
  → My Incomplete Charts (client lifecycle filter — authoritative inclusion)
  → Review certification panel
       → buildEdClosedEncounterCertification (shared, ADVISORY Stage A)
       → GET /encounters/:id/disposition-readiness (live established readiness)
POST /encounters/:id/close-check → established close rules (not Stage A)
```

## Stage A delivered

1. Semantic dedupe (`chartCertificationDedupe`)
2. Explicit ADVISORY authority + partial coverage contract
3. Source authority separation (established vs Stage A)
4. UI transparency (EN/FR): “Advisory chart review — partial module coverage”
5. Feature-flag rollout control (default OFF)
6. Non-blocking close-review continue path
7. Synthetic benchmark with measured precision 0.40

## Phased plan (remaining)

| Stage | Scope |
|-------|--------|
| **B** | Live evaluators for orders/results/MAR/procedures; vitals context; pathway activation; server detail endpoint |
| **C** | Clinician-reviewed fixture bank; navigation deep-links; i18n for every title; performance SLOs; observability |

## Migration

**NO** for Stage A.

## Commands

```bash
pnpm chart-certification:validate:unit
pnpm --filter @medora/web exec vitest run src/features/emergency/edChartCertificationAdvisoryBoundary.test.ts
```
