# MEDUI.D4C.6 — Ambulatory Orders and Results

## Summary

Clinic Care exposes **Orders** and **Results** as facility + ambulatory projections over the enterprise Order / Result engines. French UI via i18n (`clinicCareD4c6`). One-click top-nav destinations — no Open cards, no second sidebar.

## Architecture

```
AppShell (global Medora sidebar)
  └─ /app/clinic-care/* → ClinicCareShell + ClinicCareTopNav
        ├─ Orders  → ClinicCareAmbulatoryOrdersBoardView
        │              GET /clinic-care/orders-board (Order projection)
        │              patient → patient chart; order → /encounters/:id?tab=orders&workspace=ambulatory
        │              place → CreateOrderModal on enterprise chart (no Clinic composer)
        └─ Results → ClinicCareAmbulatoryResultsInboxView
                       GET /clinic-care/results-inbox (Result projection)
                       groups: CRITICAL | ABNORMAL | NEW_FINAL | PRELIMINARY | ACKNOWLEDGED | ALL
                       ack → POST /orders/:id/result/acknowledge (user + time; comment deferred)
```

**REFERENCE_VIRTUAL:** `AMBULATORY` filters `Encounter.type ∈ {OUTPATIENT, URGENT_CARE}`.

## Order board

- Dense rows; category + status filters from enterprise vocabulary.
- Status filter `ACTIVE` = non-cancelled operational statuses.
- Placement never invents a clinic catalog — chart Orders tab only.

## Results inbox

- Critical / abnormal use **text badges + border**, not color alone.
- Detail reuses `ClinicalResultViewer` via encounter results tab.
- Acknowledgement audit: `acknowledgedByUserId` + `acknowledgedByProviderAt` (+ order event / audit trail in ResultsService). Comment deferred.

## Integrations

| Surface | Behavior |
|---------|----------|
| D4C.5 provider worklist | RESULTS_PENDING / pending count → Results chart deep link |
| Today's Visits | Compact open-order / results-pending chips with accessible labels |
| Clinical Summary | Unchanged enterprise summary / EncounterResultsTab |
| D4C.5A Clinical Board / AI | Grounded count insights helper (no PHI names); no revenue |

## API

- `GET /clinic-care/orders-board` — read projection
- `GET /clinic-care/results-inbox` — read projection
- Writes: existing Orders / Results controllers only

## Schema

**No Prisma migration. No seed.**

## Deferrals

1. Acknowledgement **comment** field (would require Result schema change).
2. Native ambulatory clinical-context badge on departmental worklists (OUTPATIENT still maps to UNKNOWN in `clinicalEncounterIdentity` — clinic boards filter by type instead).
3. Dedicated ambulatory Rx polish beyond chart Orders tab.
4. Merging Lab/Rad clinic redirects into the new Results inbox (dept worklists remain SOT for technicians).

## Related

- Audit: `docs/clinical/ambulatory-orders-results-d4c6-audit.md`
- Certification: `docs/certification/MEDUI.D4C.6-certification.md`
