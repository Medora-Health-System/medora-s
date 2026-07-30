# MEDUI.D4C.7K — Enterprise Encounter Lifecycle Authority (Audit Summary)

**Certification:** MEDUI.D4C.7K  
**Mode:** Implementation companion to the approved architectural audit.

## Verdict

One enterprise lifecycle authority (`EnterpriseEncounterLifecycleService`) owns CLOSE and REOPEN transitions. D4C.7J advisory closure is preserved and extended so Facility ADMIN and platform administrators can acknowledge pending clinical work.

## Root cause of Provider-only close (confirmed)

1. D4C.7J acknowledgement previously denied `ADMIN`.
2. `resolveActorRoleCodes` previously ignored JWT `facilityRoles` and often saw only RolesGuard’s single `userRole`.
3. Route `@RequireRoles` omitted `MEDORA_SUPER_ADMIN`.

## Architecture

- Authority: `packages/shared/src/auth/enterpriseEncounterLifecycleAuthorityD4c7k.ts`
- Service: `apps/api/src/encounters/enterprise-encounter-lifecycle.service.ts`
- Transitions: `apps/api/src/common/workflow/encounter.transitions.ts` (`CLOSED → OPEN`)
- Timeline: `EncounterLifecycleTransition` (append-only)
- Timestamps: `Encounter.closedAt` / `closedByUserId` (≠ `dischargedAt`)

## Non-negotiables

- No care-setting-specific close/reopen engines.
- Reopen ≠ unlock chart / billing reopen / bed restore.
- Original close history retained.
- Inpatient discharge routes status close through the enterprise lifecycle service.
