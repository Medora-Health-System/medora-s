# D3E — Inpatient Clinical Workspace

**Certification:** `MEDUI.INPATIENT_CLINICAL_WORKSPACE.D3E`

## Dependency audit (reusable)

| Capability | Source | Inpatient role |
|---|---|---|
| Hospital Care shell / census patterns | D3CA + D3D Observation census | Reuse UI shells |
| Shared Order Engine | Existing orders module | Place Lab/Rad/Pharmacy/Meds on IP encounter |
| Laboratory / Radiology / Pharmacy worklists | Facility + `Order.type` | Same worklists; `clinicalEncounterContext=INPATIENT` |
| Medication Intelligence + MAR | Shared medication platform | Encounter-scoped; explicit Obs→IP continuation only |
| Results | Shared Results / EmergencyResultsPanel | Reuse |
| Chart Certification | B1 + advisory fields | Add `inpatientClinicalAdvisory` |
| HospitalEpisode | Existing episode service | Shared; IP does not fork |
| Departmental encounter context | `departmentalEncounterContext.ts` | Already resolves `INPATIENT` |

## Owns

- Inpatient encounter (receiving / direct admit)
- Census projection (unit/room/bed/service/attending/hospital day/LOS)
- Documentation shells (H&P, nursing, consults, care plan, discharge)
- Feature flags (default **OFF**)

## Must not create

Inpatient Lab / Pharmacy / Radiology / MAR forks; ICU; OR; PACU; Cath Lab; enterprise transfers; episode intelligence; billing engine.

## Feature flags (default OFF)

- `INPATIENT_WORKSPACE_ENABLED` / `NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED`
- `INPATIENT_DEPARTMENTAL_ORDERS_ENABLED` / `NEXT_PUBLIC_…`
- `INPATIENT_MAR_ENABLED` / `NEXT_PUBLIC_…`
- `INPATIENT_DOCUMENTATION_ENABLED` / `NEXT_PUBLIC_…`

## Routes

- Census: `/app/hospitalisation/inpatient`
- Workspace: `/app/hospitalisation/inpatient/active/[id]`

## Validation

```bash
pnpm inpatient:validate
pnpm encounter:validate
pnpm placement:validate
pnpm hospital-episode:validate
```

## Migrations

None required for D3E (additive schema not needed). Do not apply migrations.

## Review items

1. **Departmental context vs true inpatient:** `resolveDepartmentalEncounterContext` still classifies many OPEN `INPATIENT` encounters with `admittedAt` as `OBSERVATION` via short-stay heuristics. Worklist badges and chart-cert advisories may therefore prefer Observation until a durable inpatient marker (billing / placement / episode) is used. D3E census uses placement `requestedEncounterType=INPATIENT` (correct for census).
2. **Live writers gated OFF:** Orders / Results / MAR / H&P live panels require flags; nursing / consults / care plan / discharge remain deterministic shells until documentation flags are enabled.
3. **Isolation / code status / assigned nurse** on census show “Not documented” until clinical fields exist — no migration added.
