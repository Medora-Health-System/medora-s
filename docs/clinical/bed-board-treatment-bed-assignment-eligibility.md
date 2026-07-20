# Bed Board — Treatment Bed Assignment Eligibility

**Scope:** ED (and hospital) Bed Board “Assign patient” picker.

## Authoritative rule

Shared predicate: `isEligibleForTreatmentBedAssignment` / `selectTreatmentBedAssignmentCandidates`
(`packages/shared/src/encounters/bedAssignmentEligibility.ts`).

An encounter is eligible to assign to an available treatment bed when:

1. Encounter `status` is `OPEN`
2. Facility matches the current board facility (when both IDs are present)
3. Encounter is **not** already mapped to a canonical treatment bed key  
   (`resolveEncounterCanonicalBedKey` returns `null`)

Waiting-room storage values (`WAITING_ROOM`, legacy “Waiting room” / “Salle d'attente”) and empty
`roomLabel` are **not** treatment-bed assignments — they remain eligible.

Numbered ED rooms (`1`…`30` → `ED:1`…) and unit-prefixed inpatient rooms **are** treatment-bed
assignments — they are excluded from the picker.

## Source of truth

Single field: `Encounter.roomLabel`.

- Trackboard location chip: governed display of `roomLabel` (Waiting room label for waiting).
- Bed Board occupancy: open encounters whose `roomLabel` resolves to a canonical bed key.
- Assign picker: same canonical-bed rule (must not require empty `roomLabel`).

## Assignment mutation

`PATCH /encounters/:id/room` (`EncountersService.updateRoom`) remains the write path:

- facility-scoped encounter load
- bed pool / housekeeping assignability checks
- occupancy conflict detection (`resolveBedAssignmentForSave`)
- optimistic concurrency via encounter `version`
- audit log `ROOM_ASSIGNMENT_UPDATE`
- Trackboard + Bed Board refresh via existing room-assignment events

## UI states

Assign picker distinguishes:

- Loading
- Unable to load (error + retry)
- No eligible patients (successful empty list)
