# MEDUI.D4C.5A — Clinic Clinical Board Analytics Audit

**Date:** 2026-07-28  
**Branch:** `d4c5a-clinic-clinical-board-analytics`  
**Baseline:** `origin/main` @ `b533b88f1` (includes D4C.1–D4C.5 via PR #67)

## Git verification

| Check | Result |
|-------|--------|
| Branch | `d4c5a-clinic-clinical-board-analytics` |
| Working tree at start | Clean |
| D4C.5 present | ✔ `feat(clinic-care): add ambulatory provider workspace D4C.5` merged |
| D4C.1–D4C.4 ancestry | ✔ on `origin/main` |
| Commit / push | **Not performed** (task rule) |

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Encounter authority | Encounter + ambulatory types | ✔ | Dashboard aggregates | ✔ No ClinicEncounter |
| Appointment / NO_SHOW | AppointmentStatus.NO_SHOW | ✔ | Missed KPI | ✔ |
| Follow-up | FollowUp + isClinicCareFollowUpDue | ✔ | FOLLOW_UPS_TO_SCHEDULE KPI | ✔ |
| Trackboard stages | D4C.2 projection | ✔ | Patient flow / visits-by-day | ✔ |
| Nursing queue | D4C.4 nursing stages | ✔ | Patient flow NURSING_MA | ✔ |
| Provider docs | D4C.5 workspace | ✔ | — (unchanged) | ✔ |
| Billing / revenue | Enterprise billing | — | Deferred; no shared Revenue KPI | ✔ No ClinicRevenue |
| AI / insights | DeterministicClinicInsightsProvider | ✔ new | No external AI | ✔ |
| Facility timezone | facilityLocalDayUtcBounds | ✔ | Period WEEK/MONTH | ✔ |
| Auth / nav | D4C.2A capability nav | ✔ | Clinical Board = analytics home | ✔ No second sidebar |

## Classification notes

- **Visits-by-day:** exclusive priority CANCELLED → COMPLETED → TELECONSULTATION → WAITING → NEW. TELECONSULTATION always 0 (no durable modality field).
- **Wait time:** `physicianAssignedAt − (checkedInAt ?? arrivedAt)`; missing excluded (not zero).
- **Missed:** `AppointmentStatus.NO_SHOW` only.
- **Revenue:** forbidden on shared KPI strip; financial insights ADMIN-only and deferred (no durable clinic revenue rollup).

## Ownership mapping

| Surface | Owner |
|---------|--------|
| Clinical Board (`/app/clinic-care`) | D4C.5A analytics |
| Today's Visits (`/app/clinic-care/todays-visits`) | D4C.2 trackboard |
| Encounters drill-down | Enterprise list + date/flow/visitType query params |
| Provider productivity | ADMIN only (no OWNER role; ADMIN = owner-equivalent) |
