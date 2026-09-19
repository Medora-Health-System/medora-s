# MEDORA Phase 3 — Effective Facility Capability Enforcement

Phase 3 begins enforcement of the Phase 2 hierarchy at server clinical boundaries.

## Authority

Effective availability is resolved as:

```
country eligibility
AND parent facility module
AND granular facility feature
AND existing role / clinical authorization
```

The authenticated facility remains authoritative. A client does not submit a country to obtain a capability.

## Care Plan first enforcement

Phase 1 identified Care Plans as a confirmed gap because the inpatient UI also contains deployment-wide feature flags. Phase 3 makes the canonical `EncounterCarePlan` API independently enforce the facility's effective Care Plan capability.

For inpatient Care Plans:

- country must permit the Hospital module;
- the facility's Hospital module must be enabled;
- the facility's `digitalCare.carePlans` setting must be enabled;
- existing role/discipline rules continue to apply;
- existing facility/encounter/patient record scoping continues to apply.

Therefore Hospital A can enable Care Plans while Hospital B in the same country and deployment disables them.

A disabled facility receives `FACILITY_CAPABILITY_DISABLED:carePlans` at the API boundary; hiding a browser tab is not the security control.

## Deployment flags

Deployment-wide inpatient flags are retained as rollout/safety switches in this phase. They are no longer sufficient authority for the canonical Care Plan API. Later UI enforcement can combine a deployment safety gate with the effective facility capability.

## Module authority

`FacilityConfigurationService` now exposes server-side effective module resolution and an assertion boundary for other clinical modules. This is the reusable path for Radiology, Laboratory, Pharmacy and subsequent clinical surfaces.

## Historical data

Phase 3 does not delete, rewrite or move historical Care Plan records. Configuration controls runtime access/authoring only; the underlying facility-scoped clinical record remains intact.

## Database

No Prisma schema changes are required. No migration is required for Phase 3.
