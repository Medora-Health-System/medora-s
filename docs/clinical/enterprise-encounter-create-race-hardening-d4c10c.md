# MEDUI.D4C.10C — Enterprise Encounter Creation Race Hardening

**Status:** Implemented (local) — not committed / not deployed  
**Depends on:** D4C.10A (`Encounter.serviceLine`), D4C.10B (service-aware concurrent policy)

## Problem

D4C.10B policy correctly reuses same-service unbound episodes and allows distinct service lines, but open-check and insert were not atomic. Two concurrent `GENERAL_CREATE` requests for the same facility + patient + serviceLine + episode could both observe “no open row” and insert two OPEN encounters.

## Mechanism (selected)

**B — transaction-scoped PostgreSQL advisory lock** (`pg_advisory_xact_lock`), same pattern as platform governance bootstrap.

Not chosen:

- A — no existing authoritative unique idempotency constraint for unbound ambulatory create
- C — serializable + retry (heavier; not needed once episode lock exists)
- D — additive unique `(patientId, serviceLine, status)` — unsafe (collapses legitimate multi-episode)

**Migration:** NONE

## Lock / transaction key

```
MEDUI.D4C.10C \0 facilityId \0 patientId \0 SERVICE_LINE \0 (UNBOUND | APPT:{appointmentId})
```

Hashed to two `int32` keys for `pg_advisory_xact_lock(key1, key2)`.

Narrow enough that Clinic ∥ Dental ∥ ED do not serialize each other. Distinct appointment IDs do not share a lock.

## Create paths hardened

| Path | Change |
|------|--------|
| `EncountersService.create` (+ outpatient helper) | `$transaction` → advisory lock → open query → policy → insert; audit only on `created` |
| Appointments `checkIn` | lock inside existing txn; re-read appointment under lock; `ENCOUNTER_CREATE` audit only on actual create |
| Appointments `createWalkIn` | open-check + create under `$transaction` + lock; audits only on create |

## Side effects

Reuse / idempotent responses do **not** emit `ENCOUNTER_CREATE` (or walk-in create) audit. Appointment check-in may still audit `APPOINTMENT_CHECK_IN` when the appointment itself transitions.

No BillingEvent / charge capture is emitted on these GENERAL_CREATE paths today; race hardening therefore cannot double-bill at create time.
