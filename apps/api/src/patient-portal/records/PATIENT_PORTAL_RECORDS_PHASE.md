# Medora Patient Portal — Clinical Records and Document Release

This phase adds patient-facing allergy and immunization projections plus a governed document-release boundary.

## Patient endpoints

- `GET /patient/v1/facilities/:facilityId/allergies`
- `GET /patient/v1/facilities/:facilityId/immunizations`
- `GET /patient/v1/facilities/:facilityId/documents`
- `GET /patient/v1/facilities/:facilityId/documents/:documentId/content`

These routes remain behind `PatientPortalAuthGuard` and `PatientPortalFacilityGuard`.

## Staff governance endpoints

- `POST /patient-portal/v1/staff/documents/:documentId/release`
- `DELETE /patient-portal/v1/staff/documents/:documentId/release`

Release and revocation use staff `AuthGuard("jwt")` + `RolesGuard` and are restricted to ADMIN, PROVIDER, and RN roles. The client never supplies a patient ID for a release; the server derives it from the facility-scoped `EnterpriseDocument`.

## Security boundaries

- Every patient clinical/document query is constrained by both verified `facilityId` and server-derived `patientId`.
- Allergy reads project only patient-facing fields and do not expose profile provenance or staff identifiers.
- Immunization reads use existing `VaccineAdministration` authority and omit staff attribution/notes.
- Finalized registration packets are automatically patient-visible unless staff explicitly revokes patient access.
- Other active documents are invisible until an explicit, unrevoked `PatientDocumentRelease` exists for that exact document/patient/facility tuple.
- A database trigger rejects release rows whose patient/facility scope does not match the authoritative `EnterpriseDocument` and `Patient` records.
- File storage is not touched until authorization succeeds. `storagePath` is never returned to the patient client.
- Content responses use no-store caching, `nosniff`, CSP sandboxing, safe filename handling, and force non-PDF/non-raster content to download rather than render inline.
- Staff release/revocation and patient download events are audited.

## Merge gate

The `PatientDocumentRelease` migration is intentionally consumed through parameterized raw SQL in this branch. Before this phase is considered fully merge-ready, Prisma schema parity for patient-portal persistence must be resolved and the focused patient-portal plus existing auth/RBAC/facility-isolation regression suites must pass.
