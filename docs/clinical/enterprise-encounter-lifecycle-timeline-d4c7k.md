# MEDUI.D4C.7K — Encounter Lifecycle Timeline

## Model

`EncounterLifecycleTransition` is the append-only enterprise lifecycle timeline.

Each row includes:

- encounter / facility / patient
- care setting
- transition type
- previous / new state
- actor + role snapshot
- reason / reason code
- clientRequestId / requestId
- support override flag
- metadata JSON (PHI-safe)
- immutable sequence

## Transition types (v1)

- `ENCOUNTER_CLOSED`
- `ENCOUNTER_CLOSED_AGAIN`
- `ENCOUNTER_REOPENED`
- (plus reserved types for created / assigned / transferred / admission / discharge / cancelled)

## Read API

`GET /encounters/:id/lifecycle-timeline`

Facility-scoped. Suitable for audit, compliance review, QA, billing disputes, and incident investigation.

## Rules

- Append-only under normal workflow
- Never rewrite historical close events on reopen
- Operational worklists continue to use `Encounter.status`
