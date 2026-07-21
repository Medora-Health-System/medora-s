# D3DA — Observation departmental integration

**Certification:** `MEDUI.OBSERVATION_DEPARTMENTAL_INTEGRATION.D3DA`  
**Status:** Shared-engine integration + worklist context + live panel wiring behind flags **OFF**  
**Migrations:** **none** (reuses `Order.encounterId`, Result→OrderItem→Order, MAR `encounterId`)  
**Migration application:** prohibited

## Architectural rule

ONE Order Engine · ONE Lab worklist · ONE Radiology worklist · ONE Pharmacy workflow · ONE results architecture · ONE medication catalog.

ED and Observation are different encounters on the same departmental infrastructure.

## ED pathway source map (audit)

| Pathway | Create | Worklist | Result / dispense | Ownership |
|---------|--------|----------|-------------------|-----------|
| Lab | `POST /encounters/:encounterId/orders` `type=LAB` | `GET /worklists/lab` | `PUT /orders/:orderItemId/result` | `Order.encounterId` |
| Radiology | same, `type=IMAGING` | `GET /worklists/radiology` | same result routes | `Order.encounterId` |
| Pharmacy | same, `type=MEDICATION` | `GET /worklists/pharmacy` | `POST /pharmacy/dispenses*` + MAR | `Order` + `MedicationAdministration.encounterId` |

Worklists filter by `facilityId` + `Order.type` — **not** `Encounter.type === EMERGENCY`. Observation receiving encounters already participate when orders are placed against them.

## Feature flags (default OFF)

| Flag | Env |
|------|-----|
| Clinical workspace | `OBSERVATION_WORKSPACE_ENABLED` / `NEXT_PUBLIC_…` |
| Departmental orders + results | `OBSERVATION_DEPARTMENTAL_ORDERS_ENABLED` / `NEXT_PUBLIC_…` |
| Observation MAR | `OBSERVATION_MAR_ENABLED` / `NEXT_PUBLIC_…` |
| Documentation writers | `OBSERVATION_DOCUMENTATION_ENABLED` / `NEXT_PUBLIC_…` |

## D3DA deliverables

- `clinicalEncounterContext` on lab/rad/pharmacy worklist rows (`ED` \| `OBSERVATION` \| `INPATIENT` \| `OTHER`)
- Observation Orders / Results / MAR / Notes / Nursing panels reuse ED shared components when flags ON
- Order ownership + medication continuation policies in `@medora/shared`
- Chart certification advisory: `observationDepartmentalAdvisory` on `GET /encounters/:id/chart-certification`
- ≥300 deterministic D3DA benchmark scenarios

## Validation

```bash
pnpm observation:validate
pnpm observation:integration:validate
pnpm encounter:validate:critical
pnpm placement:validate
pnpm verify
pnpm build
```
