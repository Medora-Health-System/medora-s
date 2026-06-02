# Enterprise Wave 1 — Governance (M1.6B)

Uses existing **M1.3** medication governance framework (controlled, high-alert, LASA, pharmacy verification, witness, double-check).

## Applied per bucket

| Bucket | High-alert | Witness | Double-check | Pharmacy verify |
|--------|------------|---------|--------------|-----------------|
| Anticoagulation (oral) | Yes | Yes | Warfarin: Yes | Yes |
| Anticoagulation (parenteral) | Yes | Yes | No | Yes |
| Vaccines | No | No | No | Yes |
| Chronic care (default) | No* | No | No | No |

\* Exceptions: levothyroxine (high-alert), semaglutide/tirzepatide (high-alert + pharmacy verify).

## Catalog flags

Governance is written to:

- `CatalogMedication` (`isControlled`, `requiresWitness`, `requiresDoubleSign`, …)
- `MedicationSafetyProfile` on concept (mirrors high-alert / witness / LASA group when set)

## Controlled substances

Wave 1 anticoag and vaccines are **not** scheduled controlled substances in this manifest. Controlled schedules are not applied unless explicitly set in manifest `governance.controlledSchedule`.

## LASA

No new LASA groups introduced in Wave 1 seed. Existing `seedLasaMedicationGovernance` continues to apply to Haiti overlap rows.

## Activation state

Products seed with:

- `isActive: false`
- `governanceStatus: REVIEW_REQUIRED`
- Marker `ENTERPRISE_M16B_WAVE1_FORMULARY` in `governanceNotes`

Do not activate without billing gate PASS (see `enterprise-wave1-billing-readiness.md`).
