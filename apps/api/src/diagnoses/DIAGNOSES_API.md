# Medora Core – Diagnoses & Chart Summary

## Route list

| Method | Path | Roles | Description |
|--------|------|--------|-------------|
| POST | `/encounters/:encounterId/diagnoses` | RN, PROVIDER, ADMIN | Create diagnosis for encounter |
| GET | `/patients/:patientId/diagnoses` | RN, PROVIDER, ADMIN | List diagnoses for patient |
| PATCH | `/diagnoses/:id` | RN, PROVIDER, ADMIN | Update diagnosis (code, description, onsetDate, notes) |
| POST | `/diagnoses/:id/resolve` | RN, PROVIDER, ADMIN | Set status RESOLVED and resolvedDate |
| GET | `/patients/:id/chart-summary` | RN, PROVIDER, ADMIN | Patient chart summary (demographics + recent data) |

All require JWT and `x-facility-id`.

---

## DTOs

**Create (POST encounter diagnoses)**  
Body: `code` (required), optional `description`, `onsetDate`, `notes`.  
Patient and facility are taken from the encounter.

**Update (PATCH diagnoses/:id)**  
Body: optional `code`, `description`, `onsetDate`, `notes`.  
Resolved diagnoses cannot be updated.

**List (GET patient diagnoses)**  
Query: optional `status` (ACTIVE | RESOLVED), `limit`, `offset`.  
Returns `{ items, total }`.

---

## Chart summary response example

```json
{
  "patient": {
    "id": "uuid",
    "mrn": "MRN001",
    "globalMrn": "G-MRN001",
    "firstName": "Jean",
    "lastName": "Baptiste",
    "dob": "1985-03-15T00:00:00.000Z",
    "phone": "+509...",
    "email": null,
    "sexAtBirth": "M",
    "address": null,
    "city": null,
    "country": null,
    "language": null,
    "createdAt": "2025-01-10T..."
  },
  "recentEncounters": [
    {
      "id": "uuid",
      "type": "OUTPATIENT",
      "status": "OPEN",
      "chiefComplaint": "Fever",
      "createdAt": "2025-03-18T...",
      "dischargedAt": null,
      "dischargeStatus": null
    }
  ],
  "activeDiagnoses": [
    {
      "id": "uuid",
      "code": "J06.9",
      "description": "Acute upper respiratory infection",
      "onsetDate": "2025-03-15T...",
      "notes": null,
      "createdAt": "2025-03-18T...",
      "encounter": {
        "id": "uuid",
        "type": "OUTPATIENT",
        "createdAt": "2025-03-18T..."
      }
    }
  ],
  "recentMedicationDispenses": [
    {
      "id": "uuid",
      "quantityDispensed": 30,
      "dosageInstructions": "1 tab twice daily",
      "dispensedAt": "2025-03-18T...",
      "catalogMedication": { "code": "PARA500", "name": "Paracetamol 500mg" },
      "inventoryItem": { "sku": "PARA-001", "lotNumber": "L123" }
    }
  ],
  "recentVaccinations": [
    {
      "id": "uuid",
      "doseNumber": 1,
      "lotNumber": "COVID-A1",
      "administeredAt": "2025-02-01T...",
      "nextDueAt": "2025-03-01T...",
      "vaccineCatalog": { "code": "COVID-19", "name": "COVID-19 vaccine" }
    }
  ]
}
```

- **recentEncounters:** last 10, newest first.  
- **activeDiagnoses:** all with `status: ACTIVE`.  
- **recentMedicationDispenses:** last 20, by `dispensedAt` desc.  
- **recentVaccinations:** last 20, by `administeredAt` desc.

---

## Backend files changed/added

- **diagnoses/** – New module: `dto/` (create, update, list), `diagnoses.service.ts`, `diagnoses.controller.ts`, `diagnoses.module.ts`, `DIAGNOSES_API.md`.
- **encounters/** – `encounters.controller.ts`: added `POST encounters/:encounterId/diagnoses`; `encounters.module.ts`: imports `DiagnosesModule`.
- **patients/** – `patients.controller.ts`: added `GET :id/diagnoses`, `GET :id/chart-summary`; `patients.module.ts`: imports `DiagnosesModule`, adds `ChartSummaryService`; new `chart-summary.service.ts`.
- **app.module.ts** – Imports `DiagnosesModule`.
