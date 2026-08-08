# MEDUI.D4C.8.1 — Preimplementation audit

## Decision

Implementation may proceed without an architectural exception.

The patient consultations surface is `PatientConsultationsTab.tsx` and already routes authorized users to the single encounter viewer at `/app/encounters/:encounterId`. The patient-scoped list uses `ENCOUNTER_LIST_SELECT`, which composes `ENCOUNTER_CORE_SELECT`. That contract includes `status`, `closedAt`, `closedByUserId`, `reopenedAt`, `reopenedByUserId`, `reopenReason`, `reopenReasonCode`, and `reopenCount`.

## Authority and constraints

- `Encounter.status === "CLOSED"` is the sole closed-state predicate.
- `closedAt` is optional display metadata and is displayed only with a CLOSED projection.
- `dischargedAt` is not consulted by this UI projection.
- Document signature locks remain separate from encounter lifecycle closure.
- Both OPEN and CLOSED rows retain `/app/encounters/:encounterId` navigation.
- No care-setting branch, alternate viewer, lifecycle engine, database migration, or seed is needed.

## Planned verification

Focused Vitest coverage will certify lifecycle derivation, the absence of discharge inference, accessible persistent lock rendering, optional closure time, route invariance, forbidden alternate routes, and preserved OPEN behavior. Repository-native typecheck, lint, web test, and web build checks will follow.
