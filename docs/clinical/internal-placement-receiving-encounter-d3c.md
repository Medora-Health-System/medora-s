# D3C — Internal Placement Request and Receiving Encounter Foundation

**Certification ID:** `MEDUI.INTERNAL_PLACEMENT_AND_RECEIVING_ENCOUNTER_D3C`  
**Status:** Foundation implemented — migrations **generated, not applied**; all hospital feature flags **OFF**  
**Does not activate:** Observation clinical workflows, inpatient MAR/orders, bed housekeeping, hospital billing claims

---

## Audit source map (post–Trackboard incident)

| Area | Location |
|------|----------|
| D3B schema/migration | `HospitalEpisode` + `20261024120000_hospital_episode_foundation_d3b` |
| Trackboard select hardening | `trackboard-encounter-select.ts` (forbids `hospitalEpisodeId` + D3C placement relations) |
| Compatibility guard | `schema-compatibility.ts` (D3B + D3C optional objects) |
| Type-flip (legacy) | `EncountersService.update` / `updateOperational` — gated OFF when D3C workflow ON |
| Handoff | `erHandoffV1` / `ErHandoffV1Panel` |
| Disposition readiness / close | `disposition-safety-readiness.util.ts`, `close-check` |

**Discrepancy vs docs:** Local databases may have D3B applied from prior smoke tests; **production policy remains unapplied** until approved. D3C migration must not be applied in this slice.

---

## Migration order

1. D3B additive (`hospital_episode_foundation_d3b`)
2. D3C additive (`internal_placement_request_d3c`)
3. Schema verification (`pnpm db:compatibility:check`)
4. Compatible application deploy (flags OFF)
5. Controlled staging enablement
6. Later production enablement

**Never** combine application deploy that queries D3C tables before migration apply.

---

## Feature flags (all default OFF)

| Flag | Env | Role |
|------|-----|------|
| `hospitalEpisodeFoundationEnabled` | `HOSPITAL_EPISODE_FOUNDATION_ENABLED` | Episode writers (D3B) |
| `internalPlacementWorkflowEnabled` | `INTERNAL_PLACEMENT_WORKFLOW_ENABLED` / `NEXT_PUBLIC_…` | Placement lifecycle + Trackboard placement query |
| `receivingEncounterFoundationEnabled` | `RECEIVING_ENCOUNTER_FOUNDATION_ENABLED` | Receiving encounter create at arrival |

---

## Architectural decisions

### Entity: `InternalPlacementRequest` (not universal CareTransitionRequest)

Scoped to ED → Observation/Inpatient placement.

### Status machine

`DRAFT → SIGNED|REQUESTED → UNDER_REVIEW → ACCEPTED → BED_ASSIGNED → READY_FOR_TRANSFER → DEPARTED_ED → ARRIVED_DESTINATION → COMPLETED`  
Terminal: `CANCELLED`, `DECLINED`, `EXPIRED`, `ERROR_REVIEW`

SIGNED and REQUESTED: both supported; provider may jump DRAFT → REQUESTED on submit.

### HospitalEpisode creation

At first transition to **REQUESTED**, create/link episode (idempotent). No episode for DRAFT. No episode for Home/AMA/Transfer/LWBS/Elopement/Deceased/Other.

### Receiving encounter timing

**Created and activated at `ARRIVED_DESTINATION`** (when receiving foundation flag ON).

| Option | Tradeoff |
|--------|----------|
| BED_ASSIGNED create | Earlier prep; false census / cancel complexity |
| **ARRIVED_DESTINATION (chosen)** | No false inpatient census; cancelled placements need no chart cleanup; receiving prep limited until arrival |

`ReceivingEncounterLifecycle`: `NONE → ACTIVE` at arrival (PLANNED reserved for future early-create).

### Type-flip expand-and-contract

- Flag **OFF**: legacy EMERGENCY→INPATIENT on admission save / confirm transfer preserved.
- Flag **ON**: ED stays `EMERGENCY`; placement request is durable; confirm-transfer type flip rejected.

### Bed assignment boundary

Stores `assignedUnitCode` / `assignedRoomKey` / `assignedBedKey` + `assignmentSourceSystem` (`FACILITY_ROOM_LABEL`). Interim — not housekeeping.

### Trackboard

Separate optional `internalPlacementRequest.findMany` when flag ON. Never on Encounter select. Patient remains on ED board until departure/close (ED type stays EMERGENCY when D3C ON).

### Billing

Placement request and HospitalEpisode are **not** claims. ED charges stay on ED encounter. Future Obs/IP billing on receiving encounter.

### Orders / medications

D3C does **not** auto-continue ED orders into receiving care.

---

## Field decisions (summary)

**Accepted (durable):** identity, requestedEncounterType, level/service/priority/diagnosis/reason, telemetry/isolation + JSON special needs, acceptance, assignment keys, transfer timestamps, status/cancellation, revision/version, receivingEncounterId + lifecycle.

**Deferred:** requestedUnitId FK to canonical unit table, full isolation enum catalog, code-status on request, OR/PACU/external transfer engine, early PLANNED receiving chart.

**Rejected:** client-authored facilityId/patientId; treating `roomLabel` as BED_ASSIGNED; treating handoff as ARRIVED; Encounter.type mutation as placement signal when D3C ON.

---

## Validation commands

```bash
pnpm internal-placement:validate:unit
pnpm internal-placement:validate:critical
pnpm internal-placement:validate:full
pnpm receiving-encounter:validate:critical
pnpm db:compatibility:check
pnpm trackboard:validate:critical
pnpm hospital-episode:validate:critical
```

Disposable DB smoke: `pnpm trackboard:smoke:pre-post-d3b` (extend with D3C hold) — do not apply to production.
