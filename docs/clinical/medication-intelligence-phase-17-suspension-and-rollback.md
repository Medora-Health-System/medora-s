# Phase 17 — Suspension and Rollback

## Automatic suspension (fail closed)

Suspend when any of the following occurs:

- attempted order / MAR / chart mutation
- attempted enterprise activation
- unauthorized provider or facility exposure
- exposure outside time window
- unapproved recommendation exposure
- recommendation or knowledge version drift
- expired evidence or revoked expert approval
- critical safety event or unresolved critical conflict
- constitutional assertion failure
- audit persistence failure
- inability to verify pilot authorization

## Suspension effects

1. Mark program `SUSPENDED`
2. Set `controlledPilotAllowed = false`
3. Stop future pilot exposures
4. Preserve audit / exposure history
5. Create critical safety event
6. Surface on governance dashboard

## Resumption

**No automatic resumption.** Explicit authorized review required (`SUSPENDED` → `PAUSED` → re-approval path before `ACTIVE`).

## Manual controls

Admin UI suspend control + API `POST .../programs/:id/suspend` with required reason.
