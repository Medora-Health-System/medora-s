# D3E.6D — Unit bed boards, hospital admission intake & continuous inpatient chart flow

**Certification:** `MEDUI.UNIT_BED_BOARDS_ADMISSION_INTAKE.D3E6D`

## Decision

Implementation permitted under Phase 1 clinic MVP hospital care foundations. Zero-schema additive reuse of Encounter / HospitalEpisode / Floor Board inventory. Production feature defaults remain OFF. Migrations not applied.

## Architecture audit (open-encounter rules)

| CURRENT RULE | CLINICAL RISK | REQUIRED CORRECTION | REGRESSION RISK |
|---|---|---|---|
| `EncountersService.create` rejects any open encounter | Blocks ED registration when another visit is open (intentional for general create) | Keep for `GENERAL_CREATE` | Low if admission uses operations writer |
| `createDirectAdmission` previously rejected any open encounter | Receiving blocked while ED open | Context-aware policy: allow ED+IP | Medium |
| Blind reuse of any open Inpatient | Wrong chart / cross-episode attachment | **Admission correlation contract** required for reuse | Medium |
| Active HospitalEpisode blocked second admit | Forces new episode while ED episode active | Reuse ACTIVE episode when present | Low |
| Direct-admit roles PROVIDER/ADMIN only | Receiving RN cannot start IP | Allow RN on server | Low |
| Placement arrival always creates receiving encounter | Duplicate IP if nurse intake already created one | Correlated reuse before create | Medium |

## Unit bed boards

- Dedicated unit boards embed `UnitBedBoard`, a filtered projection of `FacilityBedBoardService` / Floor Board inventory (`composeFacilityBedBoard` + `BedBoardGrid`).
- MS/ICU/OBS/ED pools are unit-scoped; units without a bed pool show a governed unavailable state and link to Full Floor Board.
- Full Floor Board remains the facility-wide administrative view.

## Hospital admission intake

- Route: `/app/hospitalisation/admissions/new`
- Actions on Hospital Care Admissions and unit boards: **Start Hospital Admission**
- Flow: patient search → identity + open-ED advisory → unit / optional bed / datetime → **Start Inpatient Encounter**
- Receiving nurse identity is server-derived from JWT (`nurseAssignedUserId` / `receivingNurseUserId`)
- Starting Inpatient does **not** close or mutate the ED chart

## Admission correlation contract

Zero-schema record stored in `admissionSummaryJson.admissionCorrelation` (`hospitalAdmissionCorrelationV1`):

| Field | Role |
|---|---|
| `admissionCorrelationId` | Stable id for this admission / receiving attempt |
| `admissionIntent` | `NURSE_ADMISSION_INTAKE` \| `DIRECT_ADMISSION` \| `PLACEMENT_RECEIVING` |
| `sourceEncounterId` | Source ED (or other) — linked, never mutated |
| `internalPlacementRequestId` | Placement row when applicable |
| `hospitalEpisodeId` | Continuity container when enabled |
| `receivingEncounterId` | Authoritative Inpatient encounter |
| `idempotencyKey` | Client/server retry key |

`resolveReceivingEncounterReuse` may **REUSE** only when correlation matches (idempotency, correlation id, placement id, or compatible episode+source). It must **DENY** unrelated open Inpatient / cross-episode attachment — never silently attach to “any open IP”.

## Concurrent encounters

Allowed: open ED + open Inpatient on admission pathways.

`GENERAL_CREATE` may keep its strict one-open policy.

D3E.8 must **not** restore a global one-open-encounter restriction on:

- `NURSE_ADMISSION_INTAKE`
- `DIRECT_ADMISSION`
- `PLACEMENT_RECEIVING`

## Chart continuity

- Independent unit workspaces; one enterprise chart (Orders, Lab, Radiology, Pharmacy, Results, MAR, Timeline shared).
- Receiving workflow opens `?section=admission` on the Inpatient workspace.
- Unit moves preserve the same Inpatient encounter; clinical governance records belong to that receiving encounter.

## D3E.8 preservation (non-negotiable)

D3E.8 must preserve:

1. Unit-specific visual bed boards as filtered projections of `FacilityBedBoardService`
2. Full Floor Board as the only facility-wide bed inventory
3. Patient search and identity confirmation for hospital admission
4. Server-derived receiving nurse identity
5. Explicit Inpatient encounter creation
6. ED and Inpatient encounter coexistence
7. ED chart ownership and non-mutation
8. Placement-independent hospital admission
9. Admission as the initial receiving-chart section
10. Shared Orders, Laboratory, Radiology, Pharmacy, Results, MAR and Timeline
11. Unit movement using the same Inpatient encounter when clinically appropriate
12. Admission correlation contract for receiving-encounter reuse (not “any open IP”)

## Feature flags

- Direct admission and related hospital-care flags: production defaults OFF.
- Placement OFF does not blank unit boards or bed boards.

## Schema / migrations

- Schema changes: none required (correlation stored in `admissionSummaryJson`).
- Migration files generated: none.
- Migrations applied: none.

## Validation

```bash
pnpm unit-bed-boards:validate
pnpm inpatient-admission-intake:validate
pnpm concurrent-encounters:validate
pnpm --filter @medora/shared exec vitest run src/encounters/hospitalAdmissionCorrelationV1.test.ts
```
