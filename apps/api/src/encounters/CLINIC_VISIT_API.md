# Clinic / outpatient encounter API

## Field mapping (storage)

| Concept | Stored as |
|---------|-----------|
| Visit reason | `chiefComplaint` |
| Clinician impression | `providerNote` |
| Treatment plan | `treatmentPlan` (new column) |
| Follow-up date | `followUpDate` (new column) |
| Administrative notes | `notes` |

## Routes

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/patients/:patientId/encounters/outpatient` | FRONT_DESK, RN, PROVIDER, ADMIN | Create **OUTPATIENT** visit (`visitReason`, `notes` optional). |
| POST | `/patients/:patientId/encounters` | FRONT_DESK, RN, PROVIDER, ADMIN | Create any encounter type; `visitReason` or `chiefComplaint` for reason. |
| GET | `/patients/:patientId/encounters` | RN, PROVIDER, ADMIN, PHARMACY | List encounters. Query: `type` (OUTPATIENT, …), `limit` (1–100). |
| GET | `/patients/:id/encounters` | RN, PROVIDER, ADMIN | Same query params (patient-scoped alias). |
| GET | `/encounters/:id` | RN, PROVIDER, BILLING, ADMIN | Single encounter; response includes `visitReason`, `clinicianImpression`, `treatmentPlan`, `followUpDate`. |
| PATCH | `/encounters/:id` | RN, PROVIDER, ADMIN | Update clinic fields: `visitReason`, `chiefComplaint`, `clinicianImpression`, `providerNote`, `treatmentPlan`, `followUpDate`, `notes`, vitals, triage. |
| POST | `/encounters/:id/close` | RN, PROVIDER, ADMIN | Close encounter. |

## Response shape (encounter)

All encounter reads return aliases for the frontend:

- `visitReason` — same as `chiefComplaint`
- `clinicianImpression` — same as `providerNote`
- `treatmentPlan`, `followUpDate` — direct fields

## Chart summary

`GET /patients/:id/chart-summary` includes per recent encounter:

- `visitReason`, `treatmentPlanPreview` (truncated), `followUpDate`
