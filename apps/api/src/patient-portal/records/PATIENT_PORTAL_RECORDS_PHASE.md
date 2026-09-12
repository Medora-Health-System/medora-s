# Medora Patient Portal — Clinical Records Phase

This phase adds patient-facing read projections for allergies and immunizations and a deliberately conservative document listing.

## Endpoints

- `GET /patient/v1/facilities/:facilityId/allergies`
- `GET /patient/v1/facilities/:facilityId/immunizations`
- `GET /patient/v1/facilities/:facilityId/documents`

All routes remain behind `PatientPortalAuthGuard` and `PatientPortalFacilityGuard`.

## Security boundaries

- Every clinical query is constrained by both the verified `facilityId` and server-derived `patientId`.
- Allergy reads project only patient-facing fields and do not expose profile provenance or staff identifiers.
- Immunization reads use the existing `VaccineAdministration` authority and omit staff attribution/notes.
- Document reads are V1 metadata-only and release **only finalized registration packets**. Clinical, emergency, billing, legal, administrative, and ad-hoc uploaded documents remain withheld until Medora has an explicit patient-document release authority.
- All three read surfaces generate patient-portal audit events.

## Follow-up

A future phase should add an explicit governed patient-document release model before exposing broader clinical documents or file download/content endpoints.
