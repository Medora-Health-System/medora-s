# D3E.6 — Hospital Care Operational Activation

**Certification:** `MEDUI.HOSPITAL_CARE_OPERATIONAL_ACTIVATION.D3E6`

## Why the dashboard was empty

Hospital Care home rendered **static shell tiles** with D3D/D3E “coming soon” copy and did not call a facility-scoped summary API. Placement census pages queried live data only when `INTERNAL_PLACEMENT_WORKFLOW_ENABLED` was ON; with production defaults OFF the boards correctly returned empty / feature-disabled — but empty states still looked like unfinished placeholders.

## Development activation profile

Set **both** server and `NEXT_PUBLIC_*` pairs locally (never in production):

```bash
INTERNAL_PLACEMENT_WORKFLOW_ENABLED=true
NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED=true
RECEIVING_ENCOUNTER_FOUNDATION_ENABLED=true
NEXT_PUBLIC_RECEIVING_ENCOUNTER_FOUNDATION_ENABLED=true
OBSERVATION_WORKSPACE_ENABLED=true
NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED=true
INPATIENT_WORKSPACE_ENABLED=true
NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED=true
INPATIENT_DEPARTMENTAL_ORDERS_ENABLED=true
NEXT_PUBLIC_INPATIENT_DEPARTMENTAL_ORDERS_ENABLED=true
DIRECT_INPATIENT_ADMISSION_ENABLED=true
NEXT_PUBLIC_DIRECT_INPATIENT_ADMISSION_ENABLED=true
HOSPITAL_CARE_DASHBOARD_ENABLED=true
NEXT_PUBLIC_HOSPITAL_CARE_DASHBOARD_ENABLED=true
```

Dashboard soft-enables when placement workflow is ON. Dev-only diagnostics appear on the home page when `NODE_ENV` is development/test.

## Production

All activation flags default **OFF**. No migrations. No push.

## API

- `GET /hospital-care/dashboard` — facility from JWT
- `GET /hospital-care/meta` — flag pairs + mismatches

## Validation

```bash
pnpm hospital-care:validate
pnpm hospital-dashboard:validate
pnpm hospital-activation:validate
```
