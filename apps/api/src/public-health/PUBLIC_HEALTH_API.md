# Medora Public Health MVP – API

## Route list

| Method | Path | Roles |
|--------|------|--------|
| POST | `/public-health/vaccines/catalog` | ADMIN |
| GET | `/public-health/vaccines/catalog` | RN, PROVIDER, ADMIN |
| POST | `/public-health/vaccinations` | RN, PROVIDER, ADMIN |
| GET | `/patients/:id/vaccinations` | RN, PROVIDER, ADMIN |
| GET | `/public-health/vaccinations/due-soon` | RN, PROVIDER, ADMIN |
| POST | `/public-health/disease-reports` | RN, PROVIDER, ADMIN |
| GET | `/public-health/disease-reports` | RN, PROVIDER, ADMIN |
| GET | `/public-health/disease-summary` | RN, PROVIDER, ADMIN |

All routes require JWT + `x-facility-id` (via guards).

---

## Response shapes

### `POST /public-health/vaccines/catalog`
**Body:** `code`, `name`, optional `description`, `manufacturer`, `isActive`  
**Returns:** `VaccineCatalog` row (`id`, `code`, `name`, …).

### `GET /public-health/vaccines/catalog`
**Query:** `includeInactive=true` to include inactive entries.  
**Returns:** `VaccineCatalog[]` ordered by name.

### `POST /public-health/vaccinations`
**Body:** `patientId`, `vaccineCatalogId`, optional `encounterId`, `doseNumber`, `lotNumber`, `administeredAt`, `nextDueAt`, `notes`  
**Returns:** `VaccineAdministration` with `patient`, `vaccineCatalog`, `encounter`, `administeredBy` (user who recorded).  
`administeredByUserId` is set from the authenticated user.

### `GET /patients/:id/vaccinations`
**Query:** `limit` (1–200, default 100)  
**Returns:** `VaccineAdministration[]` (newest `administeredAt` first), same includes as above.

### `GET /public-health/vaccinations/due-soon`
**Returns:**
```json
{
  "dueWithinDays": 30,
  "windowStart": "...",
  "windowEnd": "...",
  "items": [ /* administrations with nextDueAt in [today 00:00, today+30 23:59] */ ]
}
```
Overdue doses (`nextDueAt` before today) are **not** included.

### `POST /public-health/disease-reports`
**Body:** optional `patientId`, `encounterId`; required `diseaseCode`, `diseaseName`, `status` (`SUSPECTED` | `CONFIRMED` | `RULED_OUT`); optional `reportedAt`, `onsetDate`, `commune`, `department`, `notes`  
**Returns:** `DiseaseCaseReport` with `patient`, `encounter`, `reportedBy`.

### `GET /public-health/disease-reports`
**Query:** `status`, `commune`, `diseaseCode` (exact), `diseaseName` (contains, case-insensitive), `reportedFrom`, `reportedTo`, `limit`, `offset`  
**Returns:** `{ items: DiseaseCaseReport[], total: number }`.

### `GET /public-health/disease-summary`
**Query:** optional `reportedFrom`, `reportedTo` (defaults: last 90 days to now)  
**Returns:**
```json
{
  "facilityId": "...",
  "reportedFrom": "...",
  "reportedTo": "...",
  "totalReports": 42,
  "breakdown": [
    { "diseaseName": "...", "status": "CONFIRMED", "commune": "..." | null, "count": 5 }
  ]
}
```

---

## Assumptions

1. **Single facility** – All reads/writes scoped by request facility; no cross-facility reporting in this MVP.
2. **Vaccine catalog** – Globally unique `code`; ADMIN-only create; no update/delete endpoints yet.
3. **Due-soon** – Only administrations with `nextDueAt` in the **next 30 calendar days** from start of today (UTC-local server day). Missed/overdue doses need a separate report later if needed.
4. **Disease summary** – `groupBy` on `diseaseName`, `status`, `commune`; `commune` null rows appear as `commune: null`.
5. **Audit** – `CREATE` / `VIEW` on `AuditLog` with entity types `VACCINE_CATALOG`, `VACCINE_ADMINISTRATION`, `DISEASE_CASE_REPORT`.
6. **Patients vaccinations** – Implemented on `PatientsController` (`GET /patients/:id/vaccinations`) using `PublicHealthService` to match the requested path.
