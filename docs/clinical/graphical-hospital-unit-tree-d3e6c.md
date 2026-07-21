# D3E.6C — Graphical Hospital Unit Tree & Dedicated Unit Boards

**Certification:** `MEDUI.GRAPHICAL_HOSPITAL_UNIT_TREE.D3E6C`

## Decision

**YES — WITH REVIEW ITEMS**

## Root cause of incorrect UI

D3E.6B delivered a vertical accordion that expanded rooms/beds and filtered a single shared panel. That did not match the approved service-line org-chart design or dedicated unit-board routing.

## Retained

- `HospitalCensusService` / canonical census
- `HospitalUnitRegistryService` / unit registry
- `resolveUnitChartProfile` foundation
- Floor Board as bed inventory
- Placement-independent census visibility

## Replaced (presentation)

- Vertical room accordion on Inpatient hub → `HospitalServiceLineTree`
- In-panel unit filter-only UX → dedicated routes under `/hospitalisation/inpatient/...`

## Feature flags

- `GRAPHICAL_HOSPITAL_UNIT_TREE_ENABLED` / `NEXT_PUBLIC_...` — production OFF
- `DEDICATED_UNIT_BOARDS_ENABLED` / `NEXT_PUBLIC_...` — production OFF
- Local/test: runtime may enable graphical hub when `NODE_ENV` is development/test

## Validation

```bash
pnpm hospital-service-tree:validate
pnpm hospital-unit-boards:validate
```

## Constraints

No migrations. No D3E.8 / D3F. No full ICU/OR/PACU/L&D clinical engines.
