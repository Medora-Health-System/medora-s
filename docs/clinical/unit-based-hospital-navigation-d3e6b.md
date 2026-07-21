# D3E.6B — Unit-Based Hospital Navigation

**Certification:** `MEDUI.UNIT_BASED_HOSPITAL_NAVIGATION.D3E6B`

## Decision

**YES — WITH REVIEW ITEMS**

## Root cause of blank Inpatient page

The Inpatient page showed little or no useful structure when placement was OFF because navigation depended on placement-derived unit data / empty census chrome. Clinical units exist as bed-pool configuration (`MS`, `ICU`, `OBS`) independent of placement, but the UI did not present them as a browsable clinical hierarchy.

## Unit model audit (reuse)

| Entity | Reuse |
|---|---|
| `DEFAULT_PILOT_BED_POOLS` / bed unit codes | Facility clinical unit rooms/beds |
| `Encounter.roomLabel` | Patient location |
| Floor Board / `FacilityBedBoardService` | Occupancy counts |
| `Department` | Auth only — not clinical nursing units |
| No Prisma `HospitalUnit` | Not required for this slice |

## Architecture

- `GET /hospital-care/units` — facility-scoped registry (JWT)
- Clinical tree: **units → rooms/beds** (never floors)
- Census: canonical `GET /hospital-care/census` filtered by unit selection
- Chart profile: `resolveUnitChartProfile` foundation (shells only)
- Shared Orders / Lab / Rad / Pharmacy / Results / MAR / Timeline unchanged
- Internal unit movement: plan-only foundation (not D3F)

## Feature flags

Placement OFF → units + inpatient census still load. Production defaults remain OFF.

## Validation

```bash
pnpm hospital-units:validate
pnpm hospital-unit-tree:validate
pnpm unit-census:validate
pnpm unit-chart-profile:validate
pnpm unit-bed-consistency:validate
```

## Constraints

No migrations applied. No D3F. No full ICU/OR/PACU/L&D/Behavioral engines.
