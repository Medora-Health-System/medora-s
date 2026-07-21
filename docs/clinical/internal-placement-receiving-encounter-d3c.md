# D3C — Internal Placement Request and Receiving Encounter

**Certification ID:** `MEDUI.INTERNAL_PLACEMENT_WORKFLOW.D3C`
**Status:** Workflow foundation + HTTP/UI wiring — migrations **generated, not applied**; all hospital feature flags **OFF**
**Does not activate:** Observation clinical chart, inpatient MAR/orders, hospital progress notes, bed housekeeping, claims

---

## Audit source map

| Area | Location |
|------|----------|
| D3B schema/migration | `HospitalEpisode` + `20261024120000_hospital_episode_foundation_d3b` |
| D3C schema/migration | `InternalPlacementRequest` + `20261025120000_internal_placement_request_d3c` |
| Encounter query hardening (P0) | `encounter-query-contracts.ts` — forbids `hospitalEpisodeId` on core selects |
| Trackboard select hardening | `trackboard-encounter-select.ts` |
| Compatibility guard | `schema-compatibility.ts` (D3B + D3C + query contracts) |
| Type-flip (legacy) | `EncountersService.update` / `updateOperational` — gated OFF when D3C workflow ON |
| Placement service | `internal-placement.service.ts` |
| Placement HTTP | `internal-placement.controller.ts` |
| Provider decision UI | `AdmissionObservationDecisionBoard.tsx` |
| Trackboard badge | `EmergencyTrackboardView.tsx` (`internalPlacement.trackboardLabel`) |

### Where `Encounter.type` becomes `INPATIENT`

| Location | When |
|----------|------|
| `EncountersService.update` (admission save) | D3C flag **OFF** only — legacy flip |
| `EncountersService.updateOperational` (`confirmInpatientTransfer`) | D3C flag **OFF** only; **rejected** when D3C ON |
| Receiving encounter create at `ARRIVED_DESTINATION` | New encounter `type: INPATIENT` when receiving flag ON — **does not mutate ED type** |

There is **no** `EncounterType.OBSERVATION`. Observation is `requestedEncounterType` on the placement request.

---

## Placement workflow

```
Provider Decision (Obs | IP + clinical fields)
      ↓ DRAFT / SIGNED / REQUESTED
Placement Request (durable InternalPlacementRequest)
      ↓ UNDER_REVIEW → ACCEPTED
Operational Review
      ↓ BED_ASSIGNED (unit + room required)
Bed Assignment  ≠  Patient Arrived
      ↓ READY_FOR_TRANSFER
Ready For Transfer
      ↓ DEPARTED_ED   ← patient leaves ED Trackboard cohort only after this (ED type still EMERGENCY until close)
ED Departure
      ↓ ARRIVED_DESTINATION
Destination Arrival → optional receiving encounter (ACTIVE) → COMPLETED
```

Terminal: `CANCELLED` | `DECLINED` | `EXPIRED` | `ERROR_REVIEW`

---

## State machine

Server-owned transitions only (`validateInternalPlacementTransition`).
Client cannot set arbitrary status.

`EXPIRED` is reachable from `REQUESTED` / `UNDER_REVIEW` / `ACCEPTED` by `ADMIN` or `SERVER`.

Clinic MVP role map: `ADMIN` covers bed-management accept/assign; `RN` covers ready/depart/arrive.

---

## HospitalEpisode linkage

At first transition to **REQUESTED**: create/link episode **only if** D3B feature + schema path allows (placement submit uses episode service with placement override).
No episode for Home / AMA / LWBS / Elopement / Death.
Idempotent — never duplicate active episode for the encounter.

---

## Receiving encounter strategy

**Safest create point: `ARRIVED_DESTINATION`** (chosen).

| Option | Tradeoff |
|--------|----------|
| ACCEPTED / BED_ASSIGNED | Earlier prep; cancel cleanup; false inpatient census |
| READY_FOR_TRANSFER | Still pre-arrival |
| **ARRIVED_DESTINATION** | No false census; cancelled placements need no chart cleanup |

Lifecycle: `NONE` until arrival → `ACTIVE` when receiving foundation flag ON. `PLANNED` reserved for future early-create.

---

## Bed assignment policy

- Requires `assignedUnitCode` + `assignedRoomKey` (bed key optional).
- Stores assignment time + assigned-by.
- **Never** treat ED `roomLabel` as `BED_ASSIGNED`.
- **Never** treat bed assigned as arrived.

---

## Trackboard

- Separate `internalPlacementRequest.findMany` when flag ON — never on Encounter select.
- Badge shows `trackboardLabel` when present.
- Patient remains on ED board until `DEPARTED_ED` / encounter close; ED encounter stays `EMERGENCY` when D3C ON.

---

## Security & concurrency

- Facility from JWT; patient/facility never from client body.
- Version checks on draft update / submit / transition.
- Duplicate active placement blocked (`ConflictException`).
- Role-gated transitions; unauthorized bed assign / accept / expire fail closed.

---

## Compatibility

- Core Encounter contracts must not select `hospitalEpisodeId`.
- Placement/episode services are allowlisted for D3 columns.
- Flags default **OFF**. Safe with pre-D3B schema when flags OFF (placement APIs return Forbidden; Trackboard skips placement query).

---

## Validation commands

```bash
pnpm placement:validate
pnpm placement:validate:full
pnpm hospital-episode:validate
pnpm trackboard:validate
pnpm encounter:validate:critical
pnpm verify
pnpm build
```

Disposable DB: `pnpm trackboard:smoke:pre-post-d3c` — do not apply migrations to production in this slice.
