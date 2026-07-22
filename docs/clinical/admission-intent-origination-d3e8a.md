# D3E.8A — Admission Intent Origination, Observation Conversion & Legacy Reconciliation

**Certification:** `MEDUI.ADMISSION_INTENT_ORIGINATION_OBS_CONVERSION.D3E8A`  
**Storage:** OPTION A — versioned JSON on `Encounter.admissionSummaryJson.admissionCorrelation` (unchanged). Placement mirrors `admissionCorrelationId` in `specialPlacementNeedsJson`.  
**Migrations applied:** none  
**Production feature defaults:** OFF

## Flow audit (summary)

| PATH | INTENT | CORRELATION | PLACEMENT ATTACH | RECEIVING | VERSION | GAP / CORRECTION |
|------|--------|-------------|------------------|-----------|---------|------------------|
| ED Admit → placement draft | Disposition / draft create | Immediate when `EARLY_ADMISSION_CORRELATION_ENABLED` | Atomic at create | Arrival / nurse intake | `applyAdmissionCorrelationMutation` | Fixed — no longer first created only at arrival when flag ON |
| ED Place in Observation | Placement OBS | No inpatient correlation | N/A (OBS destination) | OBS receiving foundation | Placement version | Unchanged — not inpatient admission identity |
| Direct / scheduled / transfer-in | Direct admit writer | Created before receiving encounter | Optional placement | Same writer | Correlation version on stamp | Correlation before IP create |
| Observation conversion | `POST …/observation/:id/convert-to-inpatient` | New `OBSERVATION_CONVERSION` | Optional / direct receive | New IP encounter | expectedVersion on resume | Full writer; OBS type never mutated |
| Legacy reconciliation | Admin console | Corrected only with explicit evidence | Inspect / link | N/A | expectedVersion required | No auto-link on patient/episode/time alone |

## Feature flags

| Flag | Role |
|------|------|
| `EARLY_ADMISSION_CORRELATION_ENABLED` / `NEXT_PUBLIC_…` | ED intent + placement attach at draft create; journey actions |
| `OBSERVATION_INPATIENT_CONVERSION_ENABLED` / `NEXT_PUBLIC_…` | Observation conversion writer |
| `ADMISSION_CORRELATION_RECONCILIATION_ENABLED` / `NEXT_PUBLIC_…` | Admin reconciliation queue / correct |
| Wrong open-IP reuse prevention | **Always on** (D3E.8) |

## Expected-version / JSON concurrency

- Every correlation mutation goes through `applyAdmissionCorrelationMutation(current, expectedVersion, patch)`.
- Stale writes → `ADMISSION_CORRELATION_VERSION_CONFLICT`.
- Whole-object client replacement is rejected (controller allowlists patch keys).
- Persistence uses a transaction load → compare → update on the host encounter JSON.
- **Limitation (documented):** PostgreSQL does not enforce uniqueness of nested JSON correlation ids at the DB layer; uniqueness of placement↔correlation and receiving↔correlation is service-level inside transactions. Dedicated structured model is **not** required yet for this certification if transactional CAS + audits hold.

## Cancellation

- Before arrival (`INTENT_CREATED` / `PLACEMENT_REQUESTED` / `ACCEPTED`): cancel correlation, cancel placement, clear reserved bed keys, no receiving create.
- After receiving started (pre-arrival): void receiving encounter status to `CANCELLED`, preserve record + linkage, cancel placement when safe.
- Source ED / Observation encounter type and chart are not closed by cancellation.

## Validation

```bash
pnpm admission-intent-origination:validate
pnpm admission-correlation:validate
```

## Explicit non-goals

- No D3F Transfers
- No production migration apply
- No push
- HospitalEpisode remains continuity only
