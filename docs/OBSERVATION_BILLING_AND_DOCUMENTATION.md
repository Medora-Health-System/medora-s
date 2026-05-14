# Observation billing & documentation (Phase 13C)

## Scope

Medora-S treats **INPATIENT** encounters on the observation / short-stay path as **ER-adjacent, discharge-oriented care** — not enterprise inpatient hospitalization, DRG billing, or utilization review.

Phase 13C adds **additive, computed metadata** only:

- No rename of `EncounterType.INPATIENT` or persisted encounter semantics.
- No new billing codes, DRG logic, or autobilling decisions.
- No mutation of historical chart export snapshots; legacy manifests without `observationStay` still render.

## Observation billing philosophy

- **Operational truth, not claim truth** — LOS and flags describe workflow timing for handoff and export consumers; they do not substitute for coded services or payer rules.
- **Additive JSON fields** — External billing exports and chart manifests gain optional blocks; existing required fields and CSV column contracts are unchanged.
- **Explicit preview** — Open encounters may expose LOS using a clock labeled `preview` so consumers never confuse live duration with final `dischargedAt`.

## Additive export strategy

| Surface | Field / block | Notes |
|--------|----------------|-------|
| External billing JSON | `encounter.observationStay`, `billingReadiness.observationStay` | Same `ObservationStaySummaryForExport` shape from `@medora/shared` |
| External billing CSV | _Unchanged_ | Fixed headers; avoid breaking downstream parsers |
| Chart export JSON/HTML | `encounter.observationStay?` | Optional on **stored** snapshots; always present on newly composed manifests |
| Patient chart summary API | `observationStaySummary`, `observationOperational` | Open INPATIENT gets operational snapshot using trackboard aggregates |

## Observation LOS policy

- **Anchor**: `admittedAt` if set, else `createdAt` (`resolveObservationLosAnchorMs`).
- **End (closed)**: `dischargedAt` when present.
- **End (open / preview)**: `previewNowMs` (e.g. `Date.now()` only when status is OPEN where applicable).
- **Duration**: `Math.max(0, end - anchor)` — no negative intervals.
- **Overnight indicator**: UTC calendar date change between anchor and end — conservative, not facility timezone.
- **≥ 24h flag**: Raw duration ≥ 24h; operational cue only, not “inpatient day” billing.

## Legal / export boundaries

- **Immutable snapshots**: Rows in `EncounterChartExport` are not rewritten. New manifest versions add fields; HTML renderer tolerates missing `observationStay`.
- **ROI / disclosures**: ROI flows that attach chart export snapshots inherit manifest content; no change to ROI permissions or audit semantics.
- **Chart export hash**: New fields change hashes for **new** exports only — expected; historical hashes stay valid for their stored JSON.

## Operational vs legal chart distinctions

- **Legal / signed clinical narrative** remains in existing documentation (`providerNote`, structured summaries, addenda). Phase 13C does **not** auto-generate narratives or diagnoses.
- **Operational blocks** (LOS, reassessment due, boarding phase, etc.) are labeled as operational in the patient chart timeline and in HTML exports where shown.

## Deferred inpatient billing (do not implement in Phase 1)

- DRG / inpatient day counting, room-and-board automation, UB-04 complexity, enterprise UR — **Future phase suggestion — do not implement now** (postponed multi-facility / national billing phases).

## Code map

- Shared: `packages/shared/src/observationOperational.ts` — `computeObservationStaySummaryForExport`, `computeObservationOperationalSnapshot`.
- External billing: `apps/api/src/billing/external-billing-export.service.ts`.
- Chart export: `apps/api/src/encounters/chart-export.service.ts`, `chart-export-html.util.ts`.
- Chart summary: `apps/api/src/patients/chart-summary.service.ts` + `TrackboardService.getOperationalAggregatesForEncounterIds`.
- Web timeline: `apps/web/src/components/patient-chart/EncounterClinicalTimeline.tsx`, `apps/web/src/lib/chartApi.ts`, i18n `encounterClinicalTimeline.*`.
