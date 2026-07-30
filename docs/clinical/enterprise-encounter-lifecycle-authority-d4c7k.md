# MEDUI.D4C.7K — Enterprise Encounter Lifecycle Authority

## Purpose

Single enterprise engine for encounter OPEN ↔ CLOSED lifecycle across ED, FSED, Clinic Care, Observation, Hospital, Inpatient, Dental, and future service lines.

## Permissions

| Permission | Authorized roles (RoleCode) |
|---|---|
| `CLOSE_ENCOUNTER` | PROVIDER (+ aliases), RN, ADMIN, MEDORA_SUPER_ADMIN |
| `REOPEN_ENCOUNTER` | ADMIN, MEDORA_SUPER_ADMIN |

Provider and RN do **not** receive reopen by default.

Facility roles are resolved from `UserRole` membership on the encounter facility. A Medora platform
administrator reaches close, reopen, and lifecycle-timeline through the authoritative platform-principal
resolver (`resolvePlatformPrincipalAccess`) and only with explicit, active facility context matching the
encounter; the platform action is stamped into audit and timeline metadata as a cross-facility support
action. Facility ADMIN never gains cross-facility reach.

## Field ownership

| Owner | Fields |
|---|---|
| `EnterpriseEncounterLifecycleService` | `status`, `closedAt`, `closedByUserId`, `reopenedAt`, `reopenedByUserId`, `reopenReason`, `reopenReasonCode`, `reopenCount`, lifecycle `version`, `EncounterLifecycleTransition`, close/reopen audit |
| Discharge workflows | `dischargedAt`, discharge disposition, discharge summary, discharge-specific clinical effects |

## Close

- Endpoint: `POST /encounters/:id/close`
- Preserves D4C.7J advisory 409 + acknowledgement contract
- Writes `closedAt` / `closedByUserId`
- **Never** writes `dischargedAt` for a generic close (any encounter type). Only an explicit discharge
  payload or an explicit discharge workflow (`forceDischargedAt`) may set it.
- Appends lifecycle transition `ENCOUNTER_CLOSED` or `ENCOUNTER_CLOSED_AGAIN`
- Audits `ENCOUNTER_CLOSE`

## Reopen

- Endpoint: `POST /encounters/:id/reopen`
- Mandatory reason (≥ 3 characters)
- Restores operational `status=OPEN` (workflow `IN_TREATMENT`)
- Clears operational closure fields: `closedAt = null`, `closedByUserId = null`
- Sets `reopenedAt` / `reopenedByUserId`, records the reason, increments `reopenCount`
- Does **not** restore room/bed, reopen billing, unlock signed notes, or mutate prescriptions
- Appends `ENCOUNTER_REOPENED` + audits `ENCOUNTER_REOPEN`
- Historical closure lives only in `EncounterLifecycleTransition` and the prior `ENCOUNTER_CLOSE` audit;
  a non-null `closedAt` is never used as history on an active encounter

## Timeline

- Endpoint: `GET /encounters/:id/lifecycle-timeline`
- Table: `EncounterLifecycleTransition` (append-only)

## UI

- Shared: `EnterpriseReopenEncounterAction`
- French label: **Rouvrir la rencontre**
- English label: **Reopen Encounter**
