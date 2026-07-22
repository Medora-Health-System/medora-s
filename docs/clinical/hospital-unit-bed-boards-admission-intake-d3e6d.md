# D3E.6D — Unit bed boards, hospital admission intake & continuous inpatient chart flow

**Certification:** `MEDUI.UNIT_BED_BOARDS_ADMISSION_INTAKE.D3E6D`

## Decision

Implementation permitted under Phase 1 clinic MVP hospital care foundations. Zero-schema additive reuse of Encounter / HospitalEpisode / Floor Board inventory. Production feature defaults remain OFF. Migrations not applied.

## Architecture audit (open-encounter rules)

| CURRENT RULE | CLINICAL RISK | REQUIRED CORRECTION | REGRESSION RISK |
|---|---|---|---|
| `EncountersService.create` rejects any open encounter | Blocks ED registration when another visit is open (intentional for general create) | Keep for `GENERAL_CREATE` | Low if admission uses operations writer |
| `createDirectAdmission` previously rejected any open encounter | Blocks receiving nurse when ED still open | Context-aware policy: allow ED+IP; reuse open IP | Medium — must not allow two open IP |
| Active HospitalEpisode blocked second admit | Forces new episode while ED episode active | Reuse ACTIVE episode when present | Low |
| Direct-admit roles PROVIDER/ADMIN only | Receiving RN cannot start IP | Allow RN on server | Low |
| Placement arrival always creates receiving encounter | Duplicate IP if nurse intake already created one | Reuse existing open IP before create | Medium |

## Unit bed boards

- Dedicated unit boards embed `UnitBedBoard`, a filtered projection of `FacilityBedBoardService` / Floor Board inventory (`composeFacilityBedBoard` + `BedBoardGrid`).
- MS / ICU / OBS / ED pools are unit-scoped; units without a bed pool show a governed unavailable state and link to Full Floor Board.
- Full Floor Board remains the facility-wide administrative view.

## Hospital admission intake

- Route: `/app/hospitalisation/admissions/new`
- Actions on Hospital Care Admissions and unit boards: **Start Hospital Admission**
- Flow: patient search → identity + open-ED advisory → unit / optional bed / datetime → **Start Inpatient Encounter**
- Receiving nurse identity is server-derived from JWT (`nurseAssignedUserId` / `receivingNurseUserId`)
- Idempotency key + open-IP reuse prevent duplicate Inpatient encounters
- Starting Inpatient does **not** close or mutate the ED chart

## Concurrent encounters

Allowed: open ED + open Inpatient (and related governed handoffs).

Prevented: second open Inpatient for the same patient/facility (idempotent reuse of the existing receiving encounter for placement arrival and nurse intake).

## Chart continuity

- Independent unit workspaces; one enterprise chart (Orders, Lab, Radiology, Pharmacy, Results, MAR, Timeline shared).
- Receiving workflow opens `?section=admission` on the Inpatient workspace.
- Unit moves preserve the same Inpatient encounter (D3E.6B/C foundation).

## Feature flags

- Direct admission and related hospital-care flags: production defaults OFF.
- Placement OFF does not blank unit boards or bed boards.

## Schema / migrations

- Schema changes: none required for this certification.
- Migration files generated: none.
- Migrations applied: none.

## Validation

```bash
pnpm unit-bed-boards:validate
pnpm inpatient-admission-intake:validate
pnpm inpatient-encounter-start:validate
pnpm concurrent-encounters:validate
pnpm hospital-chart-flow:validate
```
