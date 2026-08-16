# MEDUI.D4A.4.3A — Enterprise Bed Transfer Consistency Hardening

**Date:** 2026-08-16  
**Branch:** `main`  
**HEAD:** `c8a8b3526` + uncommitted D4A.4.3 / D4A.4.3A work  
**STOP:** commit = NONE · push = NONE

---

## 1. Verdict

**MEDUI.D4A.4.3A — CERTIFIED (local) — DEFECT FIXED + TESTS PASS**

Audit found a real consistency defect: exclusive `PATCH /encounters/:id/room` used check-then-update without a destination-bed lock, so two concurrent transfers to the same free bed (e.g. A: MS-1→MS-4 and B: MS-2→MS-4) could both succeed and double-occupy MS-4.

**Fix:** reuse existing enterprise room authority (`EncountersService.updateRoom`) and serialize exclusive claims with `pg_advisory_xact_lock` (same mechanism as D4C.10C), then re-read open occupancy and apply `resolveBedAssignmentForSave` inside the transaction. No inpatient-specific transfer engine. No migration. No seed.

---

## 2. Exact transfer authority

| Layer | Authority |
|-------|-----------|
| UI (UnitBedBoard / ED) | `BedBoardStatusDetailModal` → `onChangeRoom` → `RoomAssignmentModal` |
| Client | `updateEncounterRoomAssignment` → `PATCH /encounters/:id/room` |
| Server | `EncountersController.updateRoom` → **`EncountersService.updateRoom`** |
| Occupancy resolve | `resolveBedAssignmentForSave` / `findBedOccupancyConflict` (shared) |
| Bed status assignability | `FacilityBedBoardService.assertBedAssignableOrThrow` (DIRTY/CLEANING/RESERVED/BLOCKED) |
| Concurrency (exclusive pool beds) | `acquireBedAssignmentRaceLock` → `pg_advisory_xact_lock(facilityId\|canonicalBedKey)` |

**Not used by board Change room:** `InpatientLifecycleService.transferBed` (`POST .../lifecycle/transfer-bed`) — remains separate (D4A.4.3 deferral; same as ED).

**RoomAssignmentModal uses the same backend authority as ED:** yes.

---

## 3. Atomicity proof

For exclusive governed pool beds (e.g. MS-4, ED-3, ICU-2) without occupancy override:

1. Transaction begins.
2. Advisory lock on `MEDUI.D4A.4.3A|BED_ASSIGN|{facilityId}|{canonicalBedKey}` (e.g. `MS:4`).
3. Reload open encounters with `roomLabel` for the facility.
4. `resolveBedAssignmentForSave` — reject with `ROOM_ALREADY_OCCUPIED` if destination held.
5. Optimistic `updateMany` on encounter `version` sets `roomLabel` to destination (e.g. `MS-4`).
6. Commit releases lock.

**MS-1 → MS-4 guarantees (single successful transfer):**

| Invariant | Mechanism |
|-----------|-----------|
| MS-1 no longer occupied by patient | Occupancy derived from open `Encounter.roomLabel`; old label cleared by the same row update |
| MS-4 occupied by patient | Destination `roomLabel` written on that encounter |
| Encounter points to MS-4 | Persisted `Encounter.roomLabel` |
| Patient appears only once | One encounter row updated; no second encounter created |
| No second encounter | `updateRoom` never inserts |
| No stale bed-board census | Board occupant = open encounter matching canonical bed key from `roomLabel` |
| Audit old + new | `ROOM_ASSIGNMENT_UPDATE` metadata `roomFrom` / `roomTo` |

Persisted mutation: **`Encounter.roomLabel`** (+ `version`). Occupancy is not a separate table.

---

## 4. Previous-bed semantics

Authoritative post–board room-change state for the vacated bed:

- **AVAILABLE** when no other open encounter holds that `roomLabel` and no operational overlay says otherwise.
- **DIRTY is not invented** by `updateRoom` (same as ED board room change). DIRTY remains housekeeping / departure-release paths (`markBedDirtyOnRelease` on close/departure), not Change room.

---

## 5. Destination validation

Server-side, immediately before mutation (and again under lock for exclusive claims):

- Pool membership: `validateBedInPool` → 400 if out of registry.
- Operational status: `getEffectiveBedRow` + `assertBedAssignableOrThrow` (unless bed-status override).
- Occupancy: `resolveBedAssignmentForSave` → 409 `ROOM_ALREADY_OCCUPIED` unless explicit occupancy override.

---

## 6. Concurrency proof

| Scenario | Outcome |
|----------|---------|
| A and B both target free MS-4 | Only one holds the advisory lock at a time; second re-reads occupancy and gets `ROOM_ALREADY_OCCUPIED` (or version conflict) |
| Unit tests | Lock acquired **before** occupancy `findMany`; second claim after A occupies MS-4 rejected |
| Postgres integration | `encounter-bed-assignment-race-lock.postgres.integration.spec.ts` proves `pg_advisory_xact_lock` serializes same-key transactions when DB URL present |

Override / waiting-room / clear-room paths intentionally skip the exclusive lock (shared occupancy allowed only with audited override).

---

## 7. Facility isolation

- Encounter load: `findFirst({ where: { id, facilityId } })` — wrong facility → **NotFound**.
- Occupancy rows scoped by `facilityId`.
- Lock material includes `facilityId` — cross-facility keys do not collide.
- Out-of-pool / wrong bed number for unit → **BadRequest**.

---

## 8. Audit proof

`AuditAction.ENCOUNTER_UPDATE` with metadata:

- `event: "ROOM_ASSIGNMENT_UPDATE"`
- `roomFrom`, `roomTo`, `unitFrom`, `unitTo`
- optional override / bed-status override flags

Covered by room-assignment + D4A.4.3A ED regression tests.

---

## 9. Tests

| Req | Coverage |
|-----|----------|
| A MS-1→MS-4 | `encounters.service.bed-transfer-consistency-d4a43a.spec.ts` |
| B Old bed released | composeUnitBedBoard after move → MS-1 AVAILABLE |
| C Destination occupied rejected | ROOM_ALREADY_OCCUPIED |
| D Concurrent same destination | lock-before-occupancy + D2 second claim rejected + PG lock serialize |
| E Foreign facility / bad pool | NotFound + BadRequest room 99 |
| F Encounter/census/board agree | census `unitRoomBed` + board occupant on MS-4 |
| G ED regression | D4A.4.3A G + bed-governance + web `roomAssignmentK10B10` / `hospitalCareBedConsolidationD4a43` |

**API:** 31 tests passed (pattern above).  
**Web:** 15 tests passed (room assignment + hospital bed consolidation).

---

## 10. Files changed

**Production**

- `apps/api/src/encounters/encounters.service.ts` — exclusive claim transaction + lock
- `apps/api/src/encounters/encounter-bed-assignment-race-lock.util.ts` — new

**Tests / cert**

- `apps/api/src/encounters/encounter-bed-assignment-race-lock.util.spec.ts`
- `apps/api/src/encounters/encounter-bed-assignment-race-lock.postgres.integration.spec.ts`
- `apps/api/src/encounters/encounters.service.bed-transfer-consistency-d4a43a.spec.ts`
- `apps/api/src/encounters/encounters.service.bed-governance.spec.ts` (mock `$transaction`)
- `apps/api/src/encounters/encounters.service.room-assignment.spec.ts` (mock `$transaction`)
- `docs/certification/MEDUI.D4A.4.3A-certification.md` (this file)

*(D4A.4.3 Hospital Care Dashboard UI files remain in the working tree from the prior milestone; not re-scoped here.)*

---

## 11. Migration

**NONE**

---

## 12. Seed

**NONE**

---

## 13. git diff --check

**PASS** (no whitespace errors reported)

---

## 14. commit

**NONE**

---

## 15. push

**NONE**

---

## Audit Q&A (summary)

1. **API:** `PATCH /encounters/:id/room` via `EncountersService.updateRoom`.
2. **Persisted:** `Encounter.roomLabel` (+ version); occupancy derived; bed DIRTY overlay not written by this path.
3. **Authorities:** occupant/room/unit from open encounter `roomLabel` + care-unit resolution; bed status from audit overlay; previous release = label moved; destination = occupancy resolve under lock.
4. **ED parity:** same modal + same `updateRoom`.
5. **MS-1→MS-4:** yes under single success; concurrent double-claim fixed by advisory lock.
6. **A and B → MS-4:** one succeeds; other 409 after lock + re-check.
7. **Destination validated server-side:** yes (pool, status, occupancy).
8. **Cross-facility / wrong pool:** rejected.
9. **Old bed:** **AVAILABLE** (authoritative derived default); not auto-DIRTY on board Change room.
