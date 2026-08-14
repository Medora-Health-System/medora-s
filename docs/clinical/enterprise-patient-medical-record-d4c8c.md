# MEDUI.D4C.8C — Enterprise Patient Medical Record

## Purpose

Finish the D4C.8 program: patient page as longitudinal medical-record **index**, not a second encounter documentation engine.

## Architecture

```text
PATIENT
  └── EnterprisePatientMedicalRecord
        ├── Encounter Index (OPEN / CLOSED 🔒)
        ├── Longitudinal domains (existing chart tabs)
        ├── Privileged audit link (ADMIN → /app/admin/audit)
        └── CLOSED row → /app/encounters/:id → D4C.8A/8B

ONE Patient · ONE Encounter · ONE Lifecycle · ONE Closed viewer · ONE Clinical-record composition · ONE Audit authority
```

## Navigation rules

| State | Navigation |
|---|---|
| CLOSED | `/app/encounters/:id` → CLOSED_READ_ONLY + ClinicalRecord |
| OPEN ambulatory | Clinic Active Workspace path |
| OPEN emergency | `/app/emergency/active/:id` |
| OPEN inpatient/observation | `/app/encounters/:id` active shell |
| Future dental OPEN | `/app/dental?encounterId=` (index-ready; no DentalPatient) |

SIGNED ≠ CLOSED. Reopen ≠ unlock documentation / billing / room / bed / prescriptions.

## Export

Encounter HTML export reuses `EncounterChartExportService`. Structured payloads render as human-readable key/value lists (D4C.8C), not raw JSON dumps.

## Deferrals

- Mounting EnterpriseDocument center on the patient page
- Patient-filtered privileged AuditLog query UI (link to facility admin audit remains)
- Replacing chart-summary entirely (still longitudinal-only; not closed legal authority)
- Full patient longitudinal legal PDF package beyond existing print + ROI
