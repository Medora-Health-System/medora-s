# D3 Design Package — Hospital Episode, Placement Request, Linked Encounters

**Status:** DESIGN ONLY — do not apply migration  
**Certification context:** `MEDUI.ED_DISPOSITION_BOARD_ENTERPRISE_COMPLETION_PHASE_1`  
**Prerequisite:** D1/D2 landed on existing encounter JSON (no schema change)

This document prepares durable architecture for Observation and Hospital units.
It must **not** be implemented via temporary JSON as the primary durable store.

---

## 1. Current schema limitations

| Need | Current state |
|------|----------------|
| Continuous hospital stay | Absent — only `Encounter` rows |
| ED close ≠ hospital discharge | Unsupported — closing ED ends the only care-setting record |
| Linked originating/receiving encounters | Absent (`parentEncounterId` / `receivingEncounterId` do not exist) |
| Placement request lifecycle | Absent — bed board is virtual (`roomLabel` + audit overlays) |
| Observation vs inpatient encounter types | Partial — `EncounterType` has `INPATIENT`; observation is heuristic (`careLevel` / short-stay helpers) |
| Unit / service / level-of-care directory | Soft FR strings in `admissionSummaryJson`; facility bed governance units (`ED\|OBS\|MS\|ICU`) are code pools, not clinical service catalog |
| Durable placement status | Absent |

**Do not** invent incomplete inpatient charts or auto-continue ED orders in D3.

---

## 2. Proposed `HospitalEpisode` schema

```prisma
model HospitalEpisode {
  id              String   @id @default(cuid())
  facilityId      String
  patientId       String
  status          HospitalEpisodeStatus @default(ACTIVE)
  openedAt        DateTime @default(now())
  closedAt        DateTime?
  closeReason     HospitalEpisodeCloseReason?
  originatingEncounterId String? // first ED (or entry) encounter
  version         Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdByUserId String?
  updatedByUserId String?

  facility Facility @relation(fields: [facilityId], references: [id])
  patient  Patient  @relation(fields: [patientId], references: [id])
  encounters Encounter[]
  placementRequests EdPlacementRequest[]
  transitions EncounterTransition[]

  @@index([facilityId, patientId, status])
  @@index([facilityId, status, openedAt])
  @@unique([facilityId, id])
}

enum HospitalEpisodeStatus {
  ACTIVE
  CLOSED
  CANCELLED
}

enum HospitalEpisodeCloseReason {
  DISCHARGED_HOME
  EXTERNAL_TRANSFER
  AMA
  LWBS_OR_ELOPEMENT
  DECEASED
  ADMINISTRATIVE
  ERROR_CORRECTION
}
```

**Rules**

- One active `HospitalEpisode` per patient+facility at a time (partial unique / app enforced).
- Internal admission: ED encounter may close while episode stays `ACTIVE`.
- Home / external transfer / AMA / LWBS / deceased: episode typically closes with ED (unless another linked open encounter exists).

---

## 3. Proposed `EdPlacementRequest` + `EncounterTransition`

### EdPlacementRequest

```prisma
model EdPlacementRequest {
  id                   String @id @default(cuid())
  facilityId           String
  patientId            String
  hospitalEpisodeId    String
  encounterId          String // ED encounter placing the request
  dispositionPath      String // INTERNAL_OBSERVATION | INTERNAL_INPATIENT_ADMISSION
  status               EdPlacementRequestStatus @default(DECISION_SIGNED)
  requestedType        String // OBSERVATION | INPATIENT
  requestedLevelOfCare String? // code, facility-configurable
  requestedService     String?
  requestedUnitCode    String? // future FacilityUnit FK-compatible
  requestedUnitLabel   String? // temporary display until unit directory exists
  acceptingProviderUserId String?
  acceptingProviderName  String?
  priority             String? // ROUTINE | URGENT | STAT
  isolationRequired    Boolean @default(false)
  telemetryRequired    Boolean @default(false)
  safetyRequirements   String?
  conditionAtTransition String?
  requestedAt          DateTime @default(now())
  acceptedAt           DateTime?
  bedAssignedAt        DateTime?
  departedEdAt         DateTime?
  arrivedDestinationAt DateTime?
  cancelledAt          DateTime?
  cancelReason         String?
  version              Int @default(0)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  createdByUserId      String?
  updatedByUserId      String?

  @@index([facilityId, encounterId])
  @@index([facilityId, hospitalEpisodeId, status])
  @@index([facilityId, status, requestedAt])
}

enum EdPlacementRequestStatus {
  DECISION_SIGNED
  PLACEMENT_REQUESTED
  ACCEPTED
  BED_ASSIGNED
  READY_FOR_TRANSFER
  DEPARTED_ED
  ARRIVED_DESTINATION
  CANCELLED
}
```

### EncounterTransition

```prisma
model EncounterTransition {
  id                String @id @default(cuid())
  facilityId        String
  hospitalEpisodeId String
  fromEncounterId   String
  toEncounterId     String?
  placementRequestId String?
  transitionType    EncounterTransitionType
  status            EncounterTransitionStatus @default(PENDING)
  departedFromAt    DateTime?
  arrivedToAt       DateTime?
  handoffCompletedAt DateTime?
  version           Int @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([facilityId, fromEncounterId])
  @@index([facilityId, hospitalEpisodeId, status])
}

enum EncounterTransitionType {
  ED_TO_OBSERVATION
  ED_TO_INPATIENT
  INTERNAL_LEVEL_OF_CARE_CHANGE // future
  EXTERNAL_TRANSFER_OUT
}

enum EncounterTransitionStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

---

## 4. Encounter relationships

Extend `Encounter` (additive, nullable):

```prisma
hospitalEpisodeId       String?
originatingEncounterId  String? // for receiving encounters → ED
receivingEncounterId    String? // on ED after receiving created (optional denorm)
```

**Identity rules**

- Same `patientId` / MRN always.
- Never duplicate Patient.
- Never merge care settings into one mutable encounter.
- Receiving encounter created only at approved transition timing (below).

---

## 5. Episode and encounter status machines

### HospitalEpisode

`ACTIVE` → `CLOSED` (terminal)  
`ACTIVE` → `CANCELLED` (error/duplicate episode)

### ED Encounter (unchanged legal)

`OPEN` → `CLOSED` / `CANCELLED`

### Placement request

`DECISION_SIGNED` → `PLACEMENT_REQUESTED` → `ACCEPTED` → `BED_ASSIGNED` → `READY_FOR_TRANSFER` → `DEPARTED_ED` → `ARRIVED_DESTINATION`  
Any non-terminal → `CANCELLED`

**Critical:** `PLACEMENT_REQUESTED` / `BED_ASSIGNED` must **not** close the ED encounter.

---

## 6. Observation vs inpatient representation

| Concept | Representation |
|---------|----------------|
| Placement type decision | `EdPlacementRequest.requestedType` = `OBSERVATION` \| `INPATIENT` (explicit, not care-level alone) |
| Receiving encounter type | `Encounter.type` = `INPATIENT` for both initially, with `careSettingSubtype` **or** dedicated `OBSERVATION` type if product later adds enum |
| Observation locations | Facility-configurable unit codes (ED Obs, CDU, etc.) — not hardcoded permanent lists |
| Level of care | `requestedLevelOfCare` codes mapped via future facility config (Med-Surg, Telemetry, PCU, ICU, Peds, BH, L&D) |

---

## 7. Unit / service / level-of-care representation

**Phase compatibility without fake directory**

1. Store `requestedUnitCode` + `requestedUnitLabel` + `requestedService` + `requestedLevelOfCare` on `EdPlacementRequest`.
2. When `FacilityUnit` / service catalog exists later, resolve `requestedUnitCode` → FK; keep label for audit.
3. Reuse existing bed-governance unit codes (`ED`, `OBS`, `MS`, `ICU`) only as **compatibility hints**, not as clinical truth.

---

## 8. Transition lifecycle (internal admission)

1. Provider signs admission/observation decision → create/update `EdPlacementRequest` (`DECISION_SIGNED` / `PLACEMENT_REQUESTED`).
2. ED remains `OPEN`; patient remains on ED trackboard.
3. Acceptance / bed assignment update placement status only (future bed-management integration).
4. Physical ED departure recorded → `DEPARTED_ED`.
5. Close ED encounter → read-only ED summary (`CLOSED_READ_ONLY`).
6. Activate/create receiving encounter; episode stays `ACTIVE`.
7. `ARRIVED_DESTINATION` when Hospital module can board the patient.

---

## 9. ED closure vs hospital-episode continuation

| Disposition | ED encounter | Hospital episode |
|-------------|--------------|------------------|
| Home / AMA / LWBS / Deceased / External transfer | Close after departure | Close (unless other linked open encounter) |
| Internal observation / inpatient | Close after ED departure | **Remain ACTIVE** |

---

## 10. Receiving-encounter creation timing

**Recommended default:** create receiving encounter at `READY_FOR_TRANSFER` or `DEPARTED_ED` (not at decision click).

- Too early (at decision): empty inpatient chart noise; premature board presence.
- Too late (after arrival): breaks handoff/continuity.

Document product choice before migration apply.

---

## 11. Cancellation and reversal

- Cancel placement: `EdPlacementRequest.status = CANCELLED` + reason; ED remains open if still in ED.
- Signed disposition pathway change: use D1 correction/revision semantics; cancel open placement request.
- After ED closed + receiving active: legal correction / addendum policy — do not silently reopen without admin unlock patterns.
- Episode close reversal: admin-only, audited.

---

## 12. Migration sequence (apply only after approval)

1. Add enums + `HospitalEpisode` table.
2. Add nullable FKs on `Encounter`.
3. Add `EdPlacementRequest`, `EncounterTransition`.
4. Indexes/constraints.
5. Backfill (next section).
6. Deploy API readers/writers behind feature flag.
7. Wire ED disposition D3 UI.
8. Only then enable receiving-encounter creation.

**Do not** use `prisma migrate reset` or `prisma db push` for production.

---

## 13. Backfill strategy

| Population | Strategy |
|------------|----------|
| Open ED encounters | Optional: create `ACTIVE` episode on first placement decision (lazy) OR backfill episode for all open ED |
| Closed ED with home/AMA/transfer/deceased | Create `CLOSED` episode 1:1 with encounter; `closedAt = dischargedAt` |
| Closed ED with admission mode | Create `CLOSED` episode unless incomplete inpatient encounter exists; mark review queue if ambiguous |
| Existing INPATIENT short-stay | Attach to episode; set `originatingEncounterId` when detectable from prior ED |

Backfill must be facility-scoped, idempotent, and auditable.

---

## 14. Constraints and indexes

- `HospitalEpisode`: `(facilityId, patientId)` where `status = ACTIVE` unique (partial if Postgres).
- All tables: `facilityId` required; queries always facility-scoped.
- FKs: `ON DELETE RESTRICT` for patient/episode clinical links.
- Optimistic concurrency: `version` on episode, placement, transition, encounter.

---

## 15. Rollback plan

1. Feature flag off — stop writing new tables; ED JSON disposition continues (D1/D2).
2. Keep tables (no drop) if any production rows exist.
3. If empty environment: reverse migration in order transitions → placement → encounter FK columns → episode.
4. Never delete Patient / Encounter clinical JSON as part of rollback.

---

## 16. Audit / legal-record implications

- Placement decision, acceptance, departure, arrival emit `EncounterClinicalEvent` (or dedicated audit) with facilityId.
- Signed disposition decision remains on ED chart; receiving encounter has its own signatures.
- Preserve ED summary as read-only legal record after ED close.
- Corrections use existing unlock/addendum patterns — no silent overwrite.

---

## 17. Billing implications

- ED encounter billing/coding stays on ED encounter.
- Episode is **not** a claim by itself in Phase 1/D3 foundation.
- Receiving encounter gets its own billing classification later.
- Do not auto-finalize inpatient billing on ED close for internal admission.
- `DischargeStatus` enum may later need `ADMITTED_INTERNAL` — coordinate with billing before expanding.

---

## 18. Future Observation / Med-Surg / ICU / internal transfers

| Future module | How this design prepares |
|---------------|--------------------------|
| Observation board | Receiving encounter + `requestedType=OBSERVATION` + unit code |
| Med-Surg / Telemetry / PCU / ICU | `requestedLevelOfCare` + unit directory |
| Pediatrics / BH / L&D | Same LOC/unit codes via facility config |
| Internal LOC transfers | New `EncounterTransition` rows within same episode |
| Hospital MAR / orders | Separate modules; transition classifies meds as continue / discontinue / reconcile — **not** auto-continue all ED orders |

---

## 19. Explicit non-goals for D3 implementation (when approved)

- Full hospital bed-management platform
- Auto order continuation
- Fake unit capacity
- Closing ED at placement request
- Claiming hospital-module completion

---

## 20. Approval gate

**Migration required for durable D3: YES**  
**Applied in this phase: NO**

Await explicit approval before generating or applying any Prisma migration.
