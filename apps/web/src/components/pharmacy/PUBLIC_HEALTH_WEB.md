# Public Health MVP (web) – API integration notes

## Routes

| Path | Purpose |
|------|--------|
| `/app/public-health/summary` | Dashboard: KPIs, by disease/status/commune, date range |
| `/app/public-health/vaccinations` | Record vaccination form, due-soon list, session recent |
| `/app/public-health/disease-reports` | Create report form, filterable table |
| Patient detail → Vaccinations tab | `GET /patients/:id/vaccinations` |

## API usage

- **Vaccine catalog:** `GET /public-health/vaccines/catalog` (no `includeInactive` on vaccinations page; catalog is active-only for dropdown).
- **Record vaccination:** `POST /public-health/vaccinations` with `patientId`, `vaccineCatalogId`, optional `encounterId`, `doseNumber`, `lotNumber`, `administeredAt`, `nextDueAt`, `notes`. `administeredByUserId` is set by backend from JWT.
- **Patient vaccinations:** `GET /patients/:id/vaccinations` (used on patient detail Vaccinations tab).
- **Due soon:** `GET /public-health/vaccinations/due-soon` (next 30 days from today; backend excludes overdue).
- **Disease reports:** `POST /public-health/disease-reports`; list via `GET /public-health/disease-reports` with query params `status`, `commune`, `diseaseName`, `reportedFrom`, `reportedTo`, `limit`, `offset`.
- **Summary:** `GET /public-health/disease-summary?reportedFrom=&reportedTo=` (defaults last 90 days if omitted). Frontend aggregates breakdown into by-disease, by-status, by-commune tables.

## Assumptions

1. **Roles:** Nav and pages use `canViewPublicHealth` (RN, PROVIDER, ADMIN). Vaccine catalog management (create) is ADMIN-only and not implemented in this UI; catalog is read-only for recording.
2. **Recent vaccinations:** The vaccinations page shows “Recorded this session” (in-memory after submit) and “Vaccines due in next 30 days” from API. There is no facility-level “last N vaccinations” endpoint; only per-patient and due-soon.
3. **Date handling:** `administeredAt` and `nextDueAt` are sent as ISO date strings (midday UTC) for compatibility.
4. **Patient linking on disease report:** Optional; patient search is by name/MRN and selection is optional.
