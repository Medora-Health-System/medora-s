# Enterprise Chart Completion Certification — Stage B2

**Certification ID:** `MEDUI.ENTERPRISE_CHART_COMPLETION_CERTIFICATION_ENGINE_STAGE_B2`

## Decision

`ENTERPRISE_CHART_CERTIFICATION_STAGE_B2_CERTIFIED_WITH_REVIEW_ITEMS`

- `certificationStage`: `B2`
- `certificationAuthority`: `ADVISORY`
- `coverageStatus`: `PARTIAL`
- Migration: **NO**

Stage B2 extends the Stage B1 server-owned endpoint. It does **not** replace disposition-readiness, close-check, or My Incomplete Charts inclusion.

Deploy as: **YES — WITH REVIEW ITEMS** (advisory only).

## Source map corrections vs prior audit

1. Unified `Order` / `OrderItem` / `Result` — no LabOrder/ImagingOrder tables.
2. **Order/result mutations do not bump `Encounter.version`.** Stage B2 uses a deterministic `diagnosticRevision` (max related timestamps) with a bounded recheck.
3. No durable send-out / post-departure follow-up ownership model — evaluated only when fixture/context flags are present; otherwise limitation informational item.
4. No Result amendment model — amended re-review not authoritative.
5. ECG: CARE `OrderItem` + `EncounterClinicalDocumentationEntry` cards (`ecg_12_lead_documentation`, `rhythm_strip_documentation`). No dedicated ECG Result model → ECG **PARTIALLY_EVALUATED**.

## Endpoint

Same route: `GET /encounters/:id/chart-certification`

- When `ENTERPRISE_CHART_CERTIFICATION_STAGE_B2` is ON, server runs B1 + B2 evaluators and returns stage `B2`.
- B2 ON implies B1 foundation (does not require B1 flag).
- Facility-scoped; read-only; no chart mutation.

## Feature flag

`enterpriseChartCertificationStageB2`

- `ENTERPRISE_CHART_CERTIFICATION_STAGE_B2`
- `NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B2`
- Default: **OFF**

## Evaluated modules (advisory)

| Module | Authority |
|--------|-----------|
| Orders | `STAGE_B2_ADVISORY` |
| Laboratory | `STAGE_B2_ADVISORY` |
| Imaging | `STAGE_B2_ADVISORY` |
| ECG | `PARTIALLY_EVALUATED` |
| Result review / critical ack | `STAGE_B2_ADVISORY` |

## Explicitly unevaluated after B2

Medication orders, MAR, infusions, procedures, clinical pathways, full reassessment.

## Stage B2 synthetic engineering benchmark (measured)

Label: **Stage B2 synthetic engineering benchmark** (not clinician-validated).

| Metric | Value |
|--------|-------|
| Cases | 45 |
| True positives | 21 |
| False positives | 0 |
| False negatives | 0 |
| Precision | 1.00 |
| Recall | 1.00 |
| Exact-set match | 1.00 |
| Duplicate rate | 0 |
| Evaluator error → false READY | 0 |
| Cross-facility leakage | 0 (facility-scoped load) |
| Live DB p50/p95 | not measured in this release |

No module met selected-module authoritative gates (live performance, clinician review, amendment model, durable follow-up).

## Commands

```bash
pnpm chart-certification:b2:validate:unit
pnpm chart-certification:b2:validate:critical
pnpm chart-certification:b2:validate:full
pnpm chart-certification:b1:validate:critical
```

## Review items

1. No durable send-out follow-up registry — do not invent; keep partial.
2. ECG signature state not durable — partial evaluation.
3. Result amendments not modeled — re-review after amendment not authoritative.
4. Live endpoint latency with large order sets not measured.
5. Refusal/not-performed signals are context flags until structured fields exist on OrderItem.
