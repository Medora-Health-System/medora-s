# D3B — HospitalEpisode Foundation and Migration Certification

**Certification ID:** `MEDUI.HOSPITAL_EPISODE_FOUNDATION_D3B`  
**Status:** Foundation implemented — migration generated, **not applied**; feature flag **OFF** by default  
**Does not activate:** Observation workflows, inpatient documentation/MAR, placement requests, receiving encounters, hospital discharge, hospital billing, episode summary UI

---

## 1. Hierarchy

```
Patient
└── HospitalEpisode          ← continuous facility stay
    ├── ED Encounter         ← care-setting record (may close while episode ACTIVE)
    ├── future Observation Encounter
    ├── future Inpatient Encounter
    └── future specialty encounters
```

Closing an ED Encounter must **not** close an active `HospitalEpisode`.  
Do **not** mutate ED → INPATIENT as the episode solution (type-flip remains temporary until D3C).

---

## 2. Schema (accepted fields)

| Field | Required in D3B | Owner | Mutators | Lifecycle / notes | Indexes |
|-------|-----------------|-------|----------|-------------------|---------|
| `id` | Yes | Server | Create only | UUID | PK |
| `facilityId` | Yes | Server (from auth/encounter) | Create only | Must match all member encounters | idx, active partial unique |
| `patientId` | Yes | Server | Create only | Must match all member encounters | idx, active partial unique |
| `status` | Yes | Server | Controlled transitions (future close/cancel) | Default `ACTIVE` | compound idxs |
| `openedAt` | Yes | Server | Create | Stay start | with status |
| `closedAt` | Yes (nullable) | Server | On close only | Null while ACTIVE | — |
| `closeReason` | Yes (nullable) | Server | On close only | Enum; null while ACTIVE | — |
| `originatingEncounterId` | Yes | Server | Create only | Unique; prevents duplicate episode per origin | UNIQUE + FK |
| `version` | Yes | Server | Increment on mutate | Optimistic concurrency | — |
| `createdAt` / `updatedAt` | Yes | Server | System | Audit timestamps | — |
| `createdByUserId` / `updatedByUserId` | Yes (nullable) | Server | Actor ids | No PHI | idxs |

### Fields rejected / deferred

| Field | Decision | Reason |
|-------|----------|--------|
| `currentEncounterId` | **Deferred** | Easily stale across unit transfers; derive from linked open encounters later |
| `receivingEncounterId` | **Deferred** | D3C+ transition model |
| `parentEncounterId` | **Deferred** | Not episode-level |
| `transitionId` / `placementRequestId` | **Deferred** | D3C placement / transition slices |
| `DischargeStatus.ADMITTED_INTERNAL` | **Deferred** | Billing/clinical lifecycle review (D3C or billing) |

### Enums

**HospitalEpisodeStatus:** `ACTIVE` | `CLOSED` | `CANCELLED` | `MERGED` | `ERROR_REVIEW`  
**HospitalEpisodeCloseReason:** `FACILITY_DISCHARGE` | `EXTERNAL_TRANSFER` | `AMA` | `LWBS` | `ELOPEMENT` | `DECEASED` | `ADMINISTRATIVE_CORRECTION` | `DUPLICATE_EPISODE` | `OTHER_GOVERNED`

### Encounter relationship

- `Encounter.hospitalEpisodeId` nullable FK → `HospitalEpisode`
- Reverse: `HospitalEpisode.encounters`
- One encounter → at most one episode (single FK)
- One episode → many encounters (future Obs/IP)
- Composite patient/facility FKs: **not** added (Postgres/Prisma composite FK to two parent tables is awkward and Patient.facilityId is not a perfect historical proxy). **Enforced in service + transaction + tests.** Partial unique ACTIVE episode per `(facilityId, patientId)` is **SQL-only** (see migration).

---

## 3. Episode creation policy

**Eligibility (pure rules):** signed internal Admission/Observation disposition on an ED encounter; feature flag ON; not already linked; patient/facility consistent.

**Production wiring recommendation (tradeoff):**

| Option | Pros | Cons |
|--------|------|------|
| **A — at signed internal decision** | Earlier continuity identity; simpler D3B tests | Orphan episode if placement never created |
| **B — with D3C placement request (same TX)** | Atomic with placement; no orphan stay | Depends on D3C model |

**Recommendation:** Keep **eligibility = A** (signed internal decision). Activate durable **row creation in D3C inside the same transaction as `EdPlacementRequest`** (option **B**), calling `HospitalEpisodeService.createEpisodeForEncounter`. D3B exposes the controlled service method only; **no automatic production hook**; type-flip admission **unchanged** (temporary coexistence — remove in D3C).

---

## 4. Lifecycle

```
ACTIVE → CLOSED          (facility leave / governed close — not implemented in D3B)
ACTIVE → CANCELLED       (governed)
ACTIVE → ERROR_REVIEW    (governed quarantine)
CLOSED → (no normal reopen)
```

Episode must **not** close merely because: disposition signed, placement submitted, ED closed for internal admission, or a member care-setting encounter ended while another remains active.

---

## 5. Active-episode uniqueness

**Default:** at most one `ACTIVE` episode per `(facilityId, patientId)`.  
**DB-enforced** via partial unique index in migration SQL.  
Governed override (second ACTIVE) is **not** supported in D3B.

Same patient at **different** facilities may each have an ACTIVE episode (facility isolation).

---

## 6. Feature flag

Name: `hospitalEpisodeFoundationEnabled`  
Env: `HOSPITAL_EPISODE_FOUNDATION_ENABLED` / `NEXT_PUBLIC_HOSPITAL_EPISODE_FOUNDATION_ENABLED`  
**Default: OFF**

| Flag | Behavior |
|------|----------|
| OFF | No automatic rows; create service refuses unless explicit test override; reads tolerate null |
| ON (tests / controlled) | Eligible create/link; duplicate prevention; facility isolation |

**Rollout:** apply migration → keep flag OFF → certify → enable only in non-prod with jobs/tests → never enable clinician auto-create until D3C placement exists.

---

## 7. Service / API

`HospitalEpisodeService` (Nest, facility-scoped):

- `createEpisodeForEncounter` / `getEpisodeById` / `getEpisodeForEncounter`
- `listEpisodeEncounters` / `validateEncounterEligibility` / `safelyLinkEncounter`
- `projectEpisodeState`

**API surface (D3B):** no public clinician create/close/link endpoints. Internal service only.

---

## 8. Audit

Events (metadata, no clinical narrative PHI): creation, link, rejected duplicate/mismatch, idempotent recovery. Actor, timestamp, facility, source encounter, version.

---

## 9. Billing boundary

- Episode is **not** a claim.
- Billing remains **encounter-scoped**.
- ED / future Obs / future IP billing stay on their encounters.
- Episode = continuity only.

---

## 10. Summary behavior

ED Encounter Clinical Summary remains encounter-owned, CLOSED_READ_ONLY, unchanged. Episode reference may appear later as optional null-safe projection; **not** built in D3B UI.

---

## 11. Migration

File: `apps/api/prisma/migrations/20261024120000_hospital_episode_foundation_d3b/migration.sql`

- Additive enums + table + nullable FK + indexes + partial unique ACTIVE
- No backfill; existing encounters keep `hospitalEpisodeId = NULL`
- **Do not apply** in this certification slice

### Rollback (before production episode data)

1. Drop `Encounter_hospitalEpisodeId_fkey` and column/index  
2. Drop `HospitalEpisode` FKs / indexes / table  
3. Drop enums  
4. Revert Prisma schema / regenerate client

---

## 12. Backfill plan (document only — do not run)

| Cohort | Strategy |
|--------|----------|
| Open ordinary ED | No episode until signed internal admission |
| Open admitted/observation (type-flipped) | Controlled review create; do not assume valid IP |
| Closed home discharge | Generally no backfill |
| Closed internal admission | Ambiguous; dry-run classify or review queue |
| Mutated INPATIENT rows | Do not assume true IP encounter |
| Duplicate/conflicting admissions | Quarantine `ERROR_REVIEW` / `MERGED` |

Include dry-run report (counts, conflict categories), rollback of backfill batch, audit of every created episode id.

---

## 13. Temporary coexistence (D3C removal requirement)

Current admission still mutates `Encounter.type` → `INPATIENT`. D3B does **not** remove this. D3C must replace type-flip with placement + receiving encounter activation while keeping HospitalEpisode continuity.

---

## 14. Validation commands

```bash
pnpm hospital-episode:validate:unit
pnpm hospital-episode:validate:critical
pnpm hospital-episode:validate:full
```

Do **not** run `prisma migrate deploy`, `db push`, or `migrate reset` for this certification.
