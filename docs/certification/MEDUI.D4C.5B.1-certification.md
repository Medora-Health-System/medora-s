# MEDUI.D4C.5B.1 — Certification

**Feature:** Clinic Follow-up Projection Accuracy Correction  
**Recommendation:** **CERTIFIED**  
**Date:** 2026-07-28  
**Branch:** `d4c5b1-clinic-follow-up-projection-accuracy` (uncommitted; no commit/push/merge)

## Verdict

Clinical Board `FOLLOW_UPS_TO_SCHEDULE` now counts facility-scoped OPEN `FollowUp` rows with `dueDate` before the **forward** period end (TODAY / +7d / +30d) via shared `countClinicFollowUpsForPeriod`. Mid-week scheduled follow-ups appear under WEEK. Today's Visits retains today+overdue (`FOLLOW_UPS_DUE`) with distinct French labels. KPI click and AI Insights drill to `/app/clinic-care/follow-up` → `/app/follow-ups` with matching filters. Failures do not fake zero. **No Prisma migration. No ClinicFollowUp table.**

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Follow-up | `FollowUp` + `FollowUpStatus` | ✔ | Period projection helpers | ✔ No ClinicFollowUp |
| Facility scope | `FollowUp.facilityId` (+ encounter) | ✔ | `resolveFollowUpFacilityScope` | ✔ |
| Trackboard due | `isClinicCareFollowUpDue` | ✔ | Semantics documented vs Board | ✔ |
| Clinical Board | D4C.5A dashboard | ✔ | Forward follow-up period KPI | ✔ |
| Follow-up list | `/app/follow-ups` | ✔ | actionable / endExclusive filters | ✔ No gateway card |
| AI Insights | DeterministicClinicInsightsProvider | ✔ | Typed drill-down href | ✔ |
| Draft / Signature | — | — | — | ✔ Untouched |
| Timeline | — | — | — | ✔ Untouched |

## Test evidence (A–J)

| Suite | Tests | Result |
|-------|------:|--------|
| `packages/shared/.../clinicFollowUpProjectionD4c5b1.test.ts` (A–J) | 10 | Pass |
| `apps/api/.../clinic-care.service.spec.ts` (incl. D4C.5B.1 WEEK KPI) | 14 | Pass |
| `packages/shared/.../clinicCareClinicalBoardAnalyticsD4c5a.test.ts` | (existing) | Pass when run |
| **Focused total above** | **24** | **Pass** |

## Builds / Prisma

- `npm run build --workspace=@medora/shared` — pass
- `npm run build --workspace=@medora/api` — pass
- `npm run build --workspace=@medora/web` — pass
- `apps/web` `tsc --noEmit` — pass
- `prisma validate --schema=prisma/schema.prisma` — pass
- `git diff --check` — pass

**No new Prisma migration. No seed. No db push / migrate reset.**

## Manual validation checklist

- [ ] Create OPEN follow-up due mid-week → Clinical Board WEEK KPI ≥ 1
- [ ] Same row: Today's Visits FOLLOW_UPS_DUE stays 0 until due today/overdue
- [ ] KPI click → follow-up list count matches KPI (`actionable=1`)
- [ ] Complete/cancel → dashboard + list refresh (no stale zero)
- [ ] API failure on dashboard → em dash / error, not fake 0
- [ ] FR labels: “Suivis ouverts (période)” vs “Suivis à faire”

## Git

Work left **uncommitted / unpushed / unmerged** per task rules.
