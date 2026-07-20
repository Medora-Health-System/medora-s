# Enterprise Chart Completion Certification — Stage B1

**Certification ID:** `MEDUI.ENTERPRISE_CHART_COMPLETION_CERTIFICATION_ENGINE_STAGE_B1`

## Decision

`ENTERPRISE_CHART_CERTIFICATION_STAGE_B1_CERTIFIED_WITH_REVIEW_ITEMS`

- `certificationStage`: `B1`
- `certificationAuthority`: `ADVISORY`
- `coverageStatus`: `PARTIAL`
- Migration: **NO**

Stage B1 is a **server-owned advisory** foundation. It does **not** replace disposition-readiness, close-check, or My Incomplete Charts lifecycle inclusion.

Deploy as: **YES — WITH REVIEW ITEMS** (advisory only; no Stage B1 module meets selected-module authoritative gates).

## Endpoint

`GET /encounters/:id/chart-certification`

- Authenticated, role-gated, facility-scoped (JWT facility; client facility ID is not trusted alone)
- Read-only; no chart mutation
- Optional `encounterVersion` query — stale version → `coverageStatus: ERROR` (not READY)
- Version recheck after evaluation with one bounded retry

## Feature flag

`enterpriseChartCertificationStageB1`

- `ENTERPRISE_CHART_CERTIFICATION_STAGE_B1`
- `NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B1`
- Default: **OFF**

When ON, Review certification uses `EdChartCertificationB1Panel` (server payload only; no client merge/rebuild).

## Evaluated modules (advisory)

| Module | Authority | Notes |
|--------|-----------|--------|
| Registration | `STAGE_B1_ADVISORY` | Structured identity/DOB/arrival; DOB unknown exception |
| Triage | `STAGE_B1_ADVISORY` | `triageCompleteAt`, ESI, vitals, chief complaint; refusal / direct-to-room exceptions |
| Nursing | `STAGE_B1_ADVISORY` | Multiple note shapes; pain/fall contextual |
| Provider | `STAGE_B1_ADVISORY` | Single unsigned root cause; distinct supervising attestation |
| Disposition documentation | `STAGE_B1_ADVISORY` + established blockers | Path-aware; reuses disposition-readiness |

Established disposition/billing readiness remain `ESTABLISHED_AUTHORITATIVE` workflow sources outside Stage B1 authority promotion.

## Explicitly unevaluated

Orders, lab/imaging/ECG, result acknowledgment, medication orders, MAR, infusions, procedures, clinical pathways, full reassessment.

## Safety

- Only `ESTABLISHED_WORKFLOW` findings may carry blocking effects
- Stage B1 evaluated findings: advisory suggestions only
- Evaluator/load errors → `coverageStatus: ERROR` and null evaluated readiness (never false READY)
- My Incomplete Charts inclusion unchanged (lifecycle + assignment)

## Stage B1 synthetic engineering benchmark (measured)

Label: **Stage B1 synthetic engineering benchmark** (not clinician-validated).

| Metric | Value |
|--------|-------|
| Cases | 28 |
| True positives | 16 |
| False positives | 0 |
| False negatives | 0 |
| Precision | 1.00 |
| Recall | 1.00 |
| Exact-set match | 1.00 |
| Duplicate rate | 0 |
| Stale-result rate | not measured in pure bank (covered by API stale-version test) |
| Cross-facility leakage | 0 (facility-scoped load + denial tests) |
| Evaluator error → false READY | 0 |

Aggregate synthetic metrics are **not** sufficient for selected-module authority. Per-module evidence gates (critical FP/FN, remediation accuracy, live PHI-safe load patterns) are not fully proven for production authority.

## Commands

```bash
pnpm chart-certification:b1:validate:unit
pnpm chart-certification:b1:validate:critical
pnpm chart-certification:b1:validate:full
pnpm chart-certification:b1:validate:performance
```

## Review items

1. Provider note / treatment plan bodies are still loaded server-side to derive presence signals (not returned in the certification payload). Prefer length/presence SQL later.
2. Free-text `providerNote` currently satisfies history/exam signals — may under-report structured PE gaps on live charts.
3. Screening rules remain conservative warnings; not all age/sex-specific screens are modeled.
4. No clinician-reviewed case bank (Stage B4 deferred).
5. Performance targets (p50 ≤500 ms / p95 ≤1500 ms) not measured against a live DB in this release; pure merge is fast.

## Authority

No Stage B1 module meets selected-module authoritative gates in this release.
Established disposition/billing services remain the workflow authority.
