# MEDUI.D4C.8A — Audit reference

**Status:** Implementation milestone following the completed MEDUI.D4C.8 architectural audit.  
**Scope:** Navigation, lock-state, CLOSED_READ_ONLY shell, reopen integration, lifecycle timeline.

## Consumed D4C.8 audit findings

1. Clinic Care boards routed CLOSED encounters to `/app/patients/:patientId`.
2. `status === "SIGNED"` was incorrectly treated as CLOSED on Clinic and ED boards.
3. No enterprise CLOSED_READ_ONLY shell outside the ED archive.
4. `EnterpriseReopenEncounterAction` existed but was not mounted on the closed encounter surface.
5. `EncounterLifecycleTransition` API existed (D4C.7K) but was not surfaced in the closed UI.
6. Patient chart remains a mixed aggregator (full index cleanup deferred to D4C.8C).
7. Full legal clinical domain composition deferred to D4C.8B.

## Decision

Implement one enterprise closed-view authority on `/app/encounters/:encounterId` with CLOSED_READ_ONLY projection. Care-setting routes remain thin adapters (ED chart archive wraps the enterprise shell).

## Non-goals (this milestone)

- Full legal-record clinical composition (D4C.8B)
- Patient page reduction to pure encounter index (D4C.8C)
- New Prisma persistence
- Second lifecycle or reopen engine
