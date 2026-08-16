# MEDUI.D5A.4 — Enterprise Interactive Odontogram

Dental tooth findings are a **normalized clinical domain** projected into an interactive SVG odontogram.

## Authority

- Patient / Encounter / Facility / AuditLog reused
- `ToothFinding` events = clinical authority
- Odontogram UI = rebuildable projection
- No `DentalPatient` / `DentalEncounter` / `DentalMedicalRecord`

## Canonical tooth codes

`PERM_11`…`PERM_48`, `PRIM_51`…`PRIM_85` (FDI-aligned). Display: FDI / Universal / Palmer preference.

## API

| Method | Path |
|---|---|
| GET | `/dental-care/encounters/:encounterId/odontogram` |
| GET | `/dental-care/patients/:patientId/odontogram` |
| GET | `/dental-care/patients/:patientId/teeth/:toothCode/history` |
| PUT | `/dental-care/patients/:patientId/dentition` |
| POST | `/dental-care/encounters/:encounterId/tooth-findings` |
| PATCH | `/dental-care/tooth-findings/:id` |

Writes require `ODONTOGRAM_EDIT` (PROVIDER). Closed encounters are read-only.

## Workspace

Section **Odontogram** in `EnterpriseDentalEncounterWorkspace`.

## Legal record

D4C.8B section `dentalFindings` lists structured encounter findings (not a screenshot).

## Migration

`20261107120000_d5a4_enterprise_interactive_odontogram_tooth_findings`  
Models: `PatientDentitionState`, `ToothFinding` + AuditAction values.

## Deferrals

Multi-tooth bulk edit · Treatment plans / Procedures / Periodontal — **completed in MEDUI.D5A.5** · licensed CDT · image–tooth associations
