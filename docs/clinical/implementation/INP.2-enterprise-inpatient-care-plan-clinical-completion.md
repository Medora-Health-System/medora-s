# INP.2 implementation

## Aggregate

`EncounterCarePlan` owns components, immutable progress, immutable reviews, and immutable transitions. Legal-record foreign keys use `RESTRICT`. Canonical plan states are `DRAFT`, `ACTIVE`, `ON_HOLD`, `UNDER_REVIEW`, `COMPLETED`, and `DISCONTINUED`; component states are `NOT_STARTED`, `IN_PROGRESS`, `MET`, `PARTIALLY_MET`, `NOT_MET`, and `DISCONTINUED`.

Activation deep-copies the D4B.6 template definition, governance state, version, canonical IDs, localization keys, and certification metadata into `templateSnapshotJson`. It instantiates stable database component IDs. Later catalog changes cannot rewrite this snapshot. Custom clinical narratives remain verbatim.

Every mutation accepts `expectedRevision`. A conditional aggregate update increments the revision inside the same transaction as the clinical write and immutable evidence. A stale mutation returns `CARE_PLAN_REVISION_CONFLICT`. Progress and reviews have no update/delete routes. Completion, discontinuation, hold, and resume use explicit transitions; hold and discontinuation require reasons.

## Authority matrix

| Actor | Component mutation | Progress | Review/transition |
|---|---|---|---|
| RN | Nursing-owned only | Nursing | Yes |
| Provider | Provider-owned only | Provider | Oversight/review |
| PCT | None | Explicitly delegated technician component only | No |
| RT/PT/OT/SLP | D4B.6 discipline model retained; deployment requires corresponding facility clinical-role mapping | Own discipline | No overwrite |
| ADMIN | Read only by account role alone | No | No |

## Read adapters

The encounter list/detail endpoint is the shared authority for workspace reload, Overview/Summary/chart consumers, and legal export adapters. It includes chronological progress, reviews, and transitions. Legacy tuples remain a separately labelled compatibility projection and are never backfilled.
