# MEDUI.D4C.5A — Clinic Clinical Board Operational Analytics

## Purpose

Replace the duplicated Clinical Board trackboard landing with an **operational analytics** workspace. **Today's Visits** keeps the patient trackboard. Clinical Board (`Tableau clinique`) is the default Clinic analytics landing.

## Routes

| Path | Surface |
|------|---------|
| `/app/clinic-care` | Clinical Board analytics (D4C.5A) |
| `/app/clinic-care/todays-visits` | Patient trackboard (D4C.2) |
| `/app/clinic-care/encounters?date=&flow=&visitType=` | Drill-down from charts |

Capability top tabs + global sidebar unchanged (no second Clinic sidebar). EN/FR via `clinicCareD4c5a`.

## API

`GET /clinic-care/dashboard?period=TODAY|WEEK|MONTH`

- Facility-scoped ambulatory (`OUTPATIENT` \| `URGENT_CARE`)
- Facility timezone day bounds
- Role-aware: `providerProductivity` omitted server-side for non-ADMIN
- Schema miss → 503 (never empty fake success)

## Shared KPIs (5 only)

1. Today's Visits  
2. Completed Visits  
3. Waiting  
4. Average Wait Time  
5. Follow-ups to Schedule  

No **Revenue Today** on the shared board.

## Charts

- Visits by Day (stacked) + accessible tooltip + click → encounters
- Visit Types donut (visitOrigin / type)
- Provider Productivity (ADMIN only)
- Patient Flow (Arrived / Nursing-MA / With Provider / Completed)
- Wait-time trend (coverage in tooltip)
- Missed Appointments (NO_SHOW today + week)

## AI Insights (BETA)

`ClinicInsightsProvider` + `DeterministicClinicInsightsProvider` — grounded metrics only, period-labeled, no patient names, no clinical recommendations, no fabricated revenue, no external AI.

## Visual target

Dark global nav + white workspace; KPI row; Visits by Day + right AI panel; lower analytics cards — matches reference within Medora card tokens.
