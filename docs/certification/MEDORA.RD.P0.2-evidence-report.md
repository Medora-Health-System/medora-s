# MEDORA.RD.P0.2 — Encrypted Organization Export & Portability (Evidence Report)

## Architecture overview
- Added additive `OrganizationDataExport` Prisma model for export job metadata and lifecycle state.
- Added `OrganizationDataExportService` for request, asynchronous processing, reconciliation, encryption, and download.
- Added `/admin/data-exports` controller endpoints for request/list/detail/download.
- Added provider-neutral `SecureExportStorage` abstraction with `DocumentSecureExportStorage` implementation.

## Authorization model
- Endpoints require JWT + `RolesGuard` + `@RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)`.
- Service enforces tenant boundary with `assertFacilityAdminFacilityScope(...)` for request/list/detail/download.

## Facility isolation controls
- All export queries include explicit facility-scoped SQL predicates or explicit join predicates constrained by facility.
- Export job read/download paths query by both `id` and `facilityId`.

## Exact data categories exported
- `Patient`, `Encounter`, `Diagnosis`
- Medication-related: `OrderItem` (medication rows), `MedicationAdministration`, `MedicationOrderSchedule` relation coverage through `Order`/`OrderItem`, `MedicationDispense` via order exports
- `Result` (lab/radiology partitioned exports)
- `Order`, `OrderItem`
- `EncounterNote`, `EncounterProviderAddendum`, `EncounterProviderDocumentationVersion`
- `EncounterClinicalDocumentationEntry`, `EncounterClinicalEvent`
- `EnterpriseDocument`, `EnterpriseDocumentPacketSource`
- `EncounterCarePlan`
- `Triage`, `TriageVitalsReading`
- Dental: `ToothFinding`, `PatientDentitionState`, `DentalPeriodontalExam`, `DentalTreatmentPlan`, `DentalProcedureRecord`
- `VaccineAdministration`
- Human-readable encounter artifacts via `renderEncounterChartExportHtml()`

## Excluded data/categories
- No inbound FHIR/HL7 additions.
- No DICOM/billing redesign/non-export refactors.
- Allergies file is present but currently empty unless modeled rows exist in facility-scoped schema.

## Export schema version
- `exportSchemaVersion: 1` in `manifest.json`.
- Database `schemaVersion` default `1`.

## Encryption algorithm details
- AES-256-GCM authenticated encryption.
- Stored metadata: algorithm, IV (base64), auth tag (base64), encrypted SHA-256.

## Key handling strategy
- One-time random 32-byte secret is generated at request time and returned once.
- Secret is retained only in-memory for job execution.
- No plaintext secret is persisted in DB/audit logs/manifest/storage metadata.

## Integrity verification process
- SHA-256 per plaintext file (manifest `files[]`).
- SHA-256 for plaintext package (`plaintextSha256`).
- SHA-256 for encrypted artifact (`encryptedSha256`).
- `verifyEncryptedArtifact(...)` validates decrypt -> package hash -> per-file hashes.

## Object-storage model
- `SecureExportStorage` interface.
- `DocumentSecureExportStorage` implementation writes encrypted artifact bytes only.
- DB stores only object key/reference and metadata.

## Expiration behavior
- Controlled by `ORGANIZATION_EXPORT_DOWNLOAD_TTL_HOURS` (default 24h).
- Download after TTL is denied and export status is transitioned/audited as `EXPIRED`.

## Audit events
- `ORGANIZATION_EXPORT_REQUESTED`
- `ORGANIZATION_EXPORT_STARTED`
- `ORGANIZATION_EXPORT_COMPLETED`
- `ORGANIZATION_EXPORT_FAILED`
- `ORGANIZATION_EXPORT_DOWNLOADED`
- `ORGANIZATION_EXPORT_EXPIRED`

## Reconciliation behavior
- Export fails closed if exported row counts diverge from facility-scoped DB counts.
- Reconciliation includes patient, encounter, provider-documentation-version, and other major child tables.

## Test matrix (EXP-01 … EXP-20)
| ID | Result | Evidence |
|---|---|---|
| EXP-01 | PASS | `organization-data-export.service.spec.ts` |
| EXP-02 | PASS | `organization-data-export.service.spec.ts` |
| EXP-03 | PASS | `organization-data-export.service.spec.ts` |
| EXP-04 | PASS | `organization-data-export.service.spec.ts` |
| EXP-05 | PASS | `organization-data-export.service.spec.ts` |
| EXP-06 | PASS | `organization-data-export.service.spec.ts` |
| EXP-07 | PASS | `organization-data-export.service.spec.ts` |
| EXP-08 | PASS | `organization-data-export.service.spec.ts` |
| EXP-09 | PASS | `organization-data-export.service.spec.ts` |
| EXP-10 | PASS | `organization-data-export.service.spec.ts` |
| EXP-11 | PASS | `organization-data-export.service.spec.ts` |
| EXP-12 | PASS | `organization-data-export.service.spec.ts` |
| EXP-13 | PASS | `organization-data-export.service.spec.ts` |
| EXP-14 | PASS | `organization-data-export.service.spec.ts` |
| EXP-15 | PASS | `organization-data-export.service.spec.ts` |
| EXP-16 | PASS | `organization-data-export.service.spec.ts` |
| EXP-17 | PASS | `organization-data-export.service.spec.ts` |
| EXP-18 | PASS | `organization-data-export.service.spec.ts` |
| EXP-19 | PASS | `organization-data-export.service.spec.ts` |
| EXP-20 | PASS | `organization-data-export.service.spec.ts` |

## Exact tests run and build results
- `pnpm --filter @medora/api test -- organization-data-export.service.spec.ts` ✅ PASS (15/15)
- `pnpm --filter @medora/api build` ✅ PASS

## Known limitations
- Current endpoint only accepts ZIP processing path.
- Artifact delivery is streamed from server (no external signed URL provider yet).
- Large-export memory profile is improved via paged SQL reads, but ZIP assembly is still in-process memory.

## Regulatory distinction statement
This implementation supports evidence for data portability and secure post-termination export. It does not by itself prove legal/regulatory certification, retention policy guarantees, backup/restore guarantees, or infrastructure-wide encryption-at-rest claims.
