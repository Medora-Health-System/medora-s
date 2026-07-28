# MEDUI.D4C.7D — Certification

**Certification id:** `MEDUI.D4C.7D`  
**Branch:** `d4c7d-enterprise-ambulatory-encounter-lifecycle-synchronization`  
**Base:** `origin/main` @ `770f70037` (includes D4C.7B+7C via PR #76)  
**Phase:** Phase 1 Clinic MVP  
**Verdict:** **CERTIFIED WITH DOCUMENTED DEFERRALS**

## Summary

Ambulatory COMPLETE_VISIT now delegates to enterprise `EncountersService.close`. Documentation SIGNED / workflow FINALIZED are no longer confused with encounter CLOSED. Header projects French lifecycle labels (never raw `FINALIZED`). Cache invalidation uses existing GET dedupe standards.

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Encounter lifecycle | `EncountersService.close` | ✔ | ✔ idempotent close | ✔ |
| Encounter status | `Encounter.status` | ✔ | — | ✔ |
| Provider documentation | SIGNED lock | ✔ | — | ✔ |
| Discharge summary | D4C.7 ambulatory discharge | ✔ | — | ✔ |
| Ambulatory workspace | D4C.5B Active Workspace | ✔ | ✔ close + header | ✔ |
| Trackboard / KPIs | D4C.2 / D4C.5A | ✔ | — | ✔ |
| ClinicEncounterStatus | — | — | — | ✔ |

## Gates

| Gate | Status |
|------|--------|
| One canonical lifecycle authority | ✔ `EncountersService.close` |
| No Clinic-specific encounter status | ✔ |
| Docs finalize ≠ encounter close | ✔ |
| Discharge/closure policy explicit | ✔ documented |
| Terminal transition server-authoritative | ✔ |
| Transaction-safe close | ✔ existing `$transaction` |
| Header reflects canonical state | ✔ |
| Closed leaves Today's Visits active defaults | ✔ (status CLOSED) |
| Closed leaves Consultations / Provider / Nursing active queues | ✔ |
| Dashboard completed / waiting / graphs from canonical status | ✔ |
| Facility timezone unchanged | ✔ |
| Cache invalidation complete (no setTimeout workaround) | ✔ |
| Room release on close | ✔ |
| Follow-up independent | ✔ |
| Patient / MR retained | ✔ |
| Auth server-side | ✔ RN/PROVIDER/ADMIN |
| French i18n | ✔ `clinicCareD4c7d` |
| No migration required | ✔ |

## Documented deferrals

1. **Encounter.closedAt / closedByUserId** — not on Encounter schema; terminal stamp uses `status` + `dischargedAt` + audit. No migration in D4C.7D.
2. **True “discharged but OPEN for docs” with `dischargedAt` while OPEN** — enterprise close sets `dischargedAt` atomically with CLOSED. Intermediate UI uses pathway + docs projection while OPEN.
3. **Typed documentation-completion queue UI** — incomplete docs after pathway advance remain on discharge-pending / READY_TO_CLOSE until close; dedicated docs-only worklist deferred.
4. **Ambulatory reopen UI** — reopen policy audit only; no new reopen product flow in D4C.7D (enterprise reopen remains separate if/when authorized).
5. **Multi-tab live push** — other tabs update on normal refresh/navigation after dedupe invalidation; no websocket fleet.

## Tests (exact counts)

| Suite | Result |
|-------|--------|
| Shared D4C.7D A–O | **15 passed** |
| Web D4C.7D guards | **5 passed** |
| Shared regressions (7C/7B/7A/7/5B/5A/D4C.2) | **124 passed** (8 files) |
| Web regressions 7B+7C | **19 passed** (with D4C.7D = 24 in combined run) |

Pre-existing on main before D4C.7D hygiene: D4C.2 test expected PROVIDER view to exclude WAITING; D4C.5B intentionally includes WAITING — assertion updated to match production policy.

## Validation

| Check | Result |
|-------|--------|
| `@medora/shared` build | pass |
| `@medora/api` build | pass |
| `@medora/web` build | pass |
| Web `tsc --noEmit` | pass |
| `prisma validate` | pass |
| `git diff --check` | pass |
| Migration | none |
| Seed | unchanged |

## Docs

- `docs/clinical/enterprise-ambulatory-encounter-lifecycle-synchronization-d4c7d-audit.md`
- `docs/clinical/enterprise-ambulatory-encounter-lifecycle-synchronization-d4c7d.md`
- `docs/certification/MEDUI.D4C.7D-certification.md`

## Manual checklist (required before production)

- [ ] Finalize pathway → Clôturer la rencontre on Jean-Paul-like visit
- [ ] Header shows Fermée / Terminée (not Ouverte + raw FINALIZED)
- [ ] Today's Visits: leaves Sorties en attente / En attente defaults
- [ ] Clinical Board: Visites terminées +1; En attente / Avec médecin update
- [ ] Visit-by-day / patient-flow completed segment updates
- [ ] Room cleared; history retained on Patient / MR
- [ ] Open follow-up remains if present
- [ ] Second close idempotent (already closed message / stable CLOSED)

## Git

- **Do not commit.**
- **Do not push.**
- Working tree dirty with D4C.7D implementation files only (see final report §48).
