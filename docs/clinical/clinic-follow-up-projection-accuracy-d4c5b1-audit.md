# MEDUI.D4C.5B.1 — Clinic follow-up projection accuracy (audit)

**Date:** 2026-07-28  
**Branch:** `d4c5b1-clinic-follow-up-projection-accuracy`  
**Git (verification):**

```
branch: d4c5b1-clinic-follow-up-projection-accuracy
status: clean at start; based on origin/main @ 90a7e2b94
D4C.5B: merged (PR #70)
D4C.5A: present (PR #68)
D4C.6: present (PR #69)
```

## Incident

Follow-up created for the current week showed **Suivi / Follow-up = 0** on Clinical Board (and appeared inconsistent with Today's Visits).

## Source of truth (enterprise)

| Asset | Location |
|-------|----------|
| Prisma model | `FollowUp` — `apps/api/prisma/schema.prisma` |
| Durable status enum | `FollowUpStatus`: `OPEN` \| `COMPLETED` \| `CANCELLED` only |
| Due field | `FollowUp.dueDate` (DateTime, required) |
| Completion | `status=COMPLETED` + `completedAt` |
| Cancel | `status=CANCELLED` |
| Facility | `FollowUp.facilityId` (required on create) |
| Encounter link | optional `encounterId` |
| Creating user | `createdByUserId` |
| Assigned provider | **not** on FollowUp (no provider assignment field) |
| Service / controller | `apps/api/src/follow-ups/*` |
| D4C.2 due helper | `isClinicCareFollowUpDue` (today + overdue) |
| D4C.5A dashboard | `ClinicCareService.getDashboardProjection` |
| Today's Visits KPI | Trackboard `FOLLOW_UPS_DUE` via same due helper |
| Follow-up top-tab | `/app/clinic-care/follow-up` → `/app/follow-ups` |

**No `ClinicFollowUp` table. No migration required.**

## Root cause (verified)

Clinical Board KPI `FOLLOW_UPS_TO_SCHEDULE` reused **today/overdue-only** logic (`isClinicCareFollowUpDue` + `dueDate < today.endExclusiveUtc`) for **all** dashboard periods (`TODAY` / `WEEK` / `MONTH`).

Consequences:

1. A follow-up due **later this week** never entered the candidate query (`dueDate: { lt: today.end }`).
2. Even if it had, visit analytics period bounds are **rolling past** days — unsuitable for forward follow-up workload.
3. Label “Follow-ups to schedule / Suivis à planifier” overstated “to schedule” while counting already-due OPEN rows.
4. Today's Visits correctly stayed at 0 for a future-week due date (today+overdue only) — labels looked contradictory when both surfaces said “Suivi”.

**Not caused by:** missing `facilityId`, closed-encounter exclusion (status unused), care-setting filter alone, client-side counters, or a separate ClinicFollowUp store.

## Fix summary

Authoritative shared helpers in `packages/shared` (`clinicFollowUpProjectionD4c5b1.ts`):

- `resolveFollowUpFacilityScope`
- `resolveClinicFollowUpPeriod` — **forward** TODAY/+7d/+30d half-open windows in facility TZ
- `projectClinicFollowUpStatus`
- `countClinicFollowUpsForPeriod`
- `clinicCareFollowUpDrillDownHref` / `followUpsListDrillDownHref`

Clinical Board uses forward period end; Today's Visits keeps today+overdue via `isClinicCareFollowUpDue` (semantics aligned for TODAY). KPI/list/insight drill-down share filters (`status=OPEN`, `actionable=1`, `endExclusive`).

## Semantic distinction (labels)

| Surface | KPI | Meaning |
|---------|-----|---------|
| Today's Visits | `FOLLOW_UPS_DUE` — “Suivis à faire” / “Follow-ups due” | OPEN due today + overdue |
| Clinical Board | `FOLLOW_UPS_TO_SCHEDULE` — “Suivis ouverts (période)” / “Open follow-ups (period)” | OPEN with `dueDate < forward period end` (includes overdue) |

## Rejected approaches

- New `ClinicFollowUp` table / `ClinicFollowUpStatus` enum
- Client-side KPI math
- Hard-coded fake zeros on API failure
- Using visit rolling-past bounds for follow-up workload
