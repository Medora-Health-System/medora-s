# MEDUI.D4C.5B.1 — Clinic follow-up projection accuracy

## Purpose

Correct Clinic follow-up projections so facility-scoped OPEN follow-ups for the selected period appear on Clinical Board KPIs, match the Follow-up list drill-down, ground AI Insights, and remain distinct from Today's Visits “due today” semantics.

## Authority

Enterprise `FollowUp` only (`OPEN` / `COMPLETED` / `CANCELLED`). Shared helpers in `packages/shared/src/auth/clinicFollowUpProjectionD4c5b1.ts`. Server-side counts only.

## Period rules (facility timezone, half-open)

| Period | Window | Actionable rule |
|--------|--------|-----------------|
| TODAY | `[today 00:00, tomorrow 00:00)` | `dueDate < end` (= today + overdue) |
| WEEK | `[today 00:00, today+7d 00:00)` | OPEN + `dueDate < end` (includes overdue + next 6 days) |
| MONTH | `[today 00:00, today+30d 00:00)` | same with +30d |

**Note:** Visit charts still use rolling-**past** `facilityLocalPeriodUtcBounds`. Follow-up KPIs intentionally use **forward** `resolveClinicFollowUpPeriod`.

## Facility scope

`FollowUp.facilityId` OR `encounter.facilityId` OR `appointment.facilityId` must match authenticated facility. Closed encounters do not drop valid follow-ups.

## Status / presentation

| Durable | Presentation |
|---------|--------------|
| OPEN + due &lt; today start | OVERDUE |
| OPEN + due today | DUE |
| OPEN + due later in period | SCHEDULED |
| COMPLETED / CANCELLED | same |
| Wrong facility / non-ambulatory link / invalid date | EXCLUDED |

## Surfaces

- **Clinical Board** — `FOLLOW_UPS_TO_SCHEDULE` via `countClinicFollowUpsForPeriod`; click → typed Follow-up list; failure → em dash / retry (never fake 0).
- **Today's Visits** — `FOLLOW_UPS_DUE` remains today+overdue (`isClinicCareFollowUpDue`).
- **Follow-up page** — `/app/follow-ups` with `actionable`, `endExclusive`, status, date filters; patient/encounter links; invalidate dashboard/trackboard on mutate.
- **AI Insights** — count from same KPI; href = same drill-down; no patient names.

## API

- `GET /clinic-care/dashboard?period=` — returns `followUpPeriod*`, `followUpDrillDownHref`, corrected KPI.
- `GET /follow-ups/upcoming?actionable=1&endExclusive=` — half-open OPEN list matching KPI.

## i18n

FR product labels via `clinicCareD4c5a.kpis.followUpsToSchedule` (“Suivis ouverts (période)”) and trackboard `followUpsDue` (“Suivis à faire”). Keys mirrored in `en.ts` / `fr.ts`.

## Non-goals

No Prisma migration, no ClinicFollowUp table, no offline sync (Phase 4), no multi-facility (Phase 6).
