# MEDUI.D5A.3B — Enterprise Dental patient discovery, registration authority & safe encounter launch

## Production defect

Clinique Bon Samaritain (`932088c9-e595-4d1b-8a97-773616214fbf`).

Dental dashboard treated free-text search (e.g. `Dukens`) as `Patient.id`:

`POST /patients/Dukens/encounters` → **404 NotFoundException**.

Sidebar “Soins dentaires” used Twemoji fallback `2753.svg` (❓).

## Root cause

`DentalCareDashboardView` bound an input to `patientId` state and POSTed:

```ts
`/patients/${encodeURIComponent(patientId.trim())}/encounters`
```

Typed name ≠ Patient UUID.

## Correction

Reuse enterprise:

- `PatientSearchAndSelect` → `GET /patients/search?q=&limit=` (facility-scoped)
- `patientSearchQueryIsEligible` (min 3 chars, debounce 300ms)
- Selection stores `PatientSearchHitV1.id`
- Start button disabled until `selectedPatient.id`
- Editing query clears selection
- Encounter create still enterprise `POST /patients/{uuid}/encounters` + Dental tag (D5A.3)
- Worklist remains `GET /dental-care/worklist` (Dental encounters only — not the patient registry)
- Sidebar: stroke tooth icon for `/app/dental*`

## Identity constitution

Complies with `.cursor/rules/enterprise-patient-facility-identity-invariant.mdc`  
(strengthened: free-text must never substitute for `Patient.id`).

## Migration / seed

**NONE**

## Manual UAT

A: Register once → Dental search finds same MRN → encounter same Patient.id  
B: Search by first/last/MRN fragment  
C: Cross-facility excluded  
D: Free text without selection → no POST with name as id  
