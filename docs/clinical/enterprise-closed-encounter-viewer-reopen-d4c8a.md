# MEDUI.D4C.8A — Enterprise Closed Encounter Viewer, Navigation & Reopen

## Purpose

One authoritative closed-encounter viewing experience:

- discoverable from boards and patient encounter history
- visibly locked
- opened by `encounterId`
- rendered in enterprise CLOSED_READ_ONLY shell
- read-only
- reopenable via D4C.7K for authorized admins
- lifecycle-aware
- care-setting aware (no care-setting chart fork)

## Canonical route

```text
/app/encounters/:encounterId
```

Optional: `?view=record`.  
CLOSED status forces CLOSED_READ_ONLY regardless of workspace query.

Closed predicate: `Encounter.status === "CLOSED"` only.  
Not: `dischargedAt`, provider documentation `SIGNED`, billing finalization.

## Navigation

`resolveClinicBoardPatientNameHref` → CLOSED → `/app/encounters/:encounterId`.  
`resolveEdBoardPatientNameHref` → CLOSED/CANCELLED → ED chart adapter (enterprise shell).  
SIGNED no longer equals CLOSED.

## UI components

| Component | Role |
|---|---|
| `EnterpriseClosedEncounterViewer` | CLOSED_READ_ONLY shell |
| `EnterpriseClosedEncounterBanner` | Lock + read-only banner + reopen slot |
| `EnterpriseClosedEncounterLockBadge` | Accessible list/header lock |
| `EnterpriseEncounterLifecycleTimeline` | D4C.7K timeline presentation |
| `EnterpriseReopenEncounterAction` | Existing D4C.7K reopen dialog |

## Reopen

Uses `POST /encounters/:id/reopen` and `canReopenEncounter` only.  
Facility ADMIN and platform principal (with facility context) may reopen. Provider/RN may not by default.

## Deferrals

D4C.8B clinical domain composition, vitals/results hardening, chart-export JSON cleanup.  
D4C.8C patient page index simplification, privileged audit tab.
