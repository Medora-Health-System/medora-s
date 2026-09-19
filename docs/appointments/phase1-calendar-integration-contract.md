# Appointments calendar — Phase 1 integration contract

This phase records the implementation boundary for the approved Medora scheduling screen. It is not a UI-only replacement.

## Existing authoritative records
- Use the existing enterprise `Appointment` model and `AppointmentsService` for scheduled appointments, arrival and check-in. Do not create a second scheduling table.
- Keep `FollowUp` and its existing clinical-board KPI semantics intact. Renaming the navigation label must not reclassify open follow-ups as booked appointments.
- A provider shown in the calendar must be the assigned appointment provider, not the follow-up creator. Unassigned appointments must display an explicit unassigned state.
- The appointment's linked encounter is authoritative for starting/continuing a visit; historical visits come from authorized patient encounters, not appointment counts.

## Required read contract before UI rollout
- Add a facility-scoped, bounded appointment range endpoint for month/week/day views. Filter by scheduledStartAt using half-open UTC bounds computed from the facility timezone; do not use the browser timezone for server filtering.
- Return an accurate count for each local date, including beyond the first page; paginate daily patient rows without silently truncating totals.
- Include patient display name, appointment reason/status, assigned provider display name, and patient visit count only after the caller passes existing facility membership and clinical-record permissions. Do not expose chart details to billing-only or unauthorized staff.
- Resolve assigned provider membership in the same facility at appointment creation, not merely `User.isActive`. Validate all cross-facility references.
- Keep calendar hover data scoped to the current facility; audit access to identifiable scheduling/clinical data and do not cache it across users/facilities.
- Keep existing /app/clinic-care/follow-up and dashboard drill-down links functional while introducing the appointments route; never silently change follow-up KPI meaning.

## UI acceptance contract
- Match the approved screenshot: Medora header/sidebar, Appointments title, Add Appointment, month/week/day controls, colorful date counts, hover roster, selected-day appointment table, and selected patient details/visit-history card.
- Clicking a calendar day updates the roster on the same page. Clicking a visit count opens authorized historical encounters or the existing patient chart.
- Preserve creation, arrival, check-in, cancellation and encounter workflows through real APIs. No hardcoded patients, counts, providers or appointments.
- Translate visible labels, statuses, dates and empty/error states for English, Spanish (Citas / Agendar una cita) and French (Rendez-vous / Ajouter un rendez-vous).
- Include timezone boundary, pagination, empty/error/offline, permission-denied, cross-facility, provider-assignment and historical-visit authorization tests before production merge.

## Current implementation boundary
This first commit establishes the contract only. Backend endpoints, migrations (if needed), UI and tests are **not yet implemented**. Do not merge or deploy as a completed scheduling feature.
