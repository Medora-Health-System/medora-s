# MEDUI.D4C.8A — Certification

**Feature:** Enterprise Closed Encounter Viewer, Navigation & Reopen Integration  
**Status:** Implemented pending review (do not commit/push/merge in this session)

## Verdict

**CERTIFIED WITH DOCUMENTED DEFERRALS**

## Evidence matrix

| Requirement | Evidence | Status |
|---|---|---|
| Closed Clinic encounters open by encounterId | `resolveClinicBoardPatientNameHref` → `/app/encounters/:id` | ✔ |
| patientId is not closed-record authority | Board helpers no longer return `/app/patients/:id` for CLOSED | ✔ |
| SIGNED ≠ CLOSED | Clinic + ED board predicates; shared projection tests | ✔ |
| Lock visible on CLOSED | D4C.8.1 consultations lock + `EnterpriseClosedEncounterLockBadge` / banner | ✔ |
| Canonical closed route | `/app/encounters/:encounterId` + CLOSED_READ_ONLY shell | ✔ |
| Enterprise CLOSED_READ_ONLY shell | `EnterpriseClosedEncounterViewer` | ✔ |
| Ordinary mutations unavailable on closed shell | Shell has no mutation controls; API guard unchanged | ✔ |
| Reopen uses D4C.7K only | `EnterpriseReopenEncounterAction` + `canReopenEncounter` | ✔ |
| Reopen reason required | Existing D4C.7K dialog (≥3 chars) | ✔ |
| Lifecycle timeline visible | `EnterpriseEncounterLifecycleTimeline` → `GET …/lifecycle-timeline` | ✔ |
| French UI / no raw keys | `enterpriseClosedEncounterD4c8a` in fr.ts + en.ts | ✔ |
| Facility isolation | Existing encounter GET / lifecycle / reopen facility scoping | ✔ |
| ED closed workflow not broken | ED archive thin adapter wraps enterprise shell | ✔ |
| No duplicate lifecycle/chart engine | Reuses D4C.7K + encounter route | ✔ |
| No Prisma migration / seed | Projection-only | ✔ |

## Documented deferrals (allowed)

- Full legal clinical composition (D4C.8B)
- Vitals measuredAt / structured lab hardening (D4C.8B)
- Chart-export raw JSON cleanup (D4C.8B)
- Patient page → pure encounter index (D4C.8C)
- Privileged AuditLog tab (D4C.8C)

## Tests run

- Shared: `enterpriseClosedEncounterViewerD4c8a` + D4C.7K authority — 20 passed
- Web focused D4C.8A + Clinic/ED nav regression — 34 passed
- API D4C.7K close/reopen/guard/integrity — 89 passed
- Builds: shared, api, web — passed
- Prisma validate — passed
- `git diff --check` — passed

## Migration / seed

```text
Migration: NONE
Seed: NONE
```
