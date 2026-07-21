# D3E.6A — Unified Hospital Census & Dashboard Consolidation

**Certification:** `MEDUI.UNIFIED_HOSPITAL_CENSUS_DASHBOARD.D3E6A`

## Decision

**YES — WITH REVIEW ITEMS**

## Root cause of Observation count mismatch

Hospital Care counted **active placement-queue rows only**. On arrival with receiving foundation ON, placements auto-transition to **`COMPLETED`**, which `listFacilityQueue` excludes. Floor Board counted **open `Encounter` rows** (`GET /trackboard?status=OPEN&type=INPATIENT`). Result: Hospital Care Observation = 0 while Floor Board showed 1.

## Correction

Canonical `HospitalCensusService` / `buildHospitalCensusV1`:

- Clinical Observation / Inpatient counts from **open INPATIENT encounters** classified by `resolveClinicalEncounterContext`
- Placement metrics remain placement-queue derived and may be zero/unavailable when placement is OFF
- Dashboard merges clinical census into tiles so placement OFF does not hide active patients

## Architecture

| Concern | Owner |
|---|---|
| Clinical census | `GET /hospital-care/census` |
| Placement queue metrics | `GET /internal-placement` (still) |
| Bed inventory | Floor Board / `FacilityBedBoardService` |
| Hospital Care Home | Consumes dashboard + census |
| Observation / Inpatient tabs | Canonical census (not placement-only) |

## Feature flag behavior

Placement OFF → placement tiles show unavailable; Observation/Inpatient census remain visible.

## Validation

```bash
pnpm hospital-census:validate
pnpm hospital-dashboard-unification:validate
pnpm floor-board-consistency:validate
pnpm hospital-care:validate
```

## Constraints

No migrations. Production flags remain OFF. No D3F / D3E.8.
