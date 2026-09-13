# MEDORA.RD.P0.3G — FHIR Provenance, integrity, terminology, and concurrency hardening

**Phase:** MEDORA.RD.P0.3G  
**Scope:** signed-document lineage projection, source-integrity verification, terminology-release governance, and read-side concurrency evidence  
**Canonical clinical writes:** **NOT ENABLED**  
**FHIR delete:** **NOT SUPPORTED**

## 1. Purpose and boundary

P0.3G hardens the existing FHIR R4 read/search and staged-proposal surface without turning FHIR into a second Medora system of record. The phase adds a narrow `Provenance` projection backed only by Medora's immutable signed provider-documentation versions and adds terminology/concurrency controls that can be evidenced without inventing unsupported clinical semantics.

This is not a general-purpose audit export. Internal `AuditLog` rows remain security/compliance evidence and are not exposed as FHIR `AuditEvent`. The FHIR `Provenance` resource represents clinical lineage only.

## 2. Provenance source of truth

The only source admitted by this phase is `EncounterProviderDocumentationVersion`, which already records:

- facility, patient, and encounter ownership;
- monotonically assigned documentation version number;
- signing time and signing user;
- immutable clinical snapshot JSON;
- SHA-256 snapshot hash;
- optional predecessor version linkage;
- unlock/correction history in the canonical encounter workflow.

`GET /fhir/Provenance/:id` and `GET /fhir/Provenance` are read/search projections over those rows. Queries always include authenticated `facilityId`. Search supports `_id`, `target=Encounter/{id}`, `patient=Patient/{id}`, `agent=Practitioner/{id}`, `recorded=YYYY-MM-DD`, `_count`, and opaque `_cursor`.

The projection contains patient/encounter targets, author attribution, signing time, facility attribution, predecessor lineage when present, documentation version number, and the canonical snapshot SHA-256 identifier. The clinical snapshot itself is **not** copied into Provenance.

## 3. Integrity verification

Before a signed-document version is exposed as FHIR Provenance, Medora canonicalizes `clinicalSnapshotJson` with the same deterministic chart-export canonicalizer used by the canonical documentation workflow, calculates SHA-256, and compares it with the stored `snapshotHash`.

A mismatch fails closed with a service-unavailable response. It also emits a PHI-minimized integrity audit event containing facility/patient/encounter/entity attribution plus event name, resource type, and version number. The audit metadata does not contain provider narrative, clinical snapshot JSON, or the stored/actual hash values.

P0.3G does **not** fabricate a FHIR digital `signature`. The canonical source proves an immutable hashed snapshot and signer attribution, but that is not equivalent to a FHIR `Signature` containing a cryptographic signature blob. A digital signature may be projected only if a canonical signature artifact is later proven.

## 4. Terminology release governance

FHIR terminology release versions are operator-controlled configuration:

- `FHIR_ICD10CM_VERSION`
- `FHIR_LOINC_VERSION`
- `FHIR_UCUM_VERSION`
- `FHIR_SNOMEDCT_VERSION`

Medora emits or validates a release version only when the corresponding value is explicitly configured and passes a bounded release-identifier grammar. An unset release produces no invented version. The current date, code value, or software version is never substituted as terminology provenance.

The staged P0.3F inbound proposal schema now accepts optional `Coding.version`. If Medora has an authoritative configured release for that coding system and the sender supplies a different version, staging is rejected before persistence. If no authoritative release is configured, the proposal remains a human-review item and Medora does not assert version equivalence.

## 5. Concurrency and representation versioning

FHIR instance reads already receive deterministic representation `meta.versionId` and a weak HTTP `ETag` computed from the returned representation. P0.3G adds regression evidence that the same Provenance representation produces the same version/ETag and a changed representation produces a different version/ETag.

This is **read-side concurrency evidence only**. P0.3F stages proposals and does not apply them to canonical clinical records. Therefore P0.3G does not claim an implemented `If-Match` mutation contract. Any future approved proposal-application phase must define the canonical workflow command, expected canonical version, stale-write conflict behavior, and transactional audit before a FHIR-originated clinical mutation can be enabled.

## 6. Capability and authorization contract

P0.3G adds only:

- `Provenance` READ → `provenance.read`
- `Provenance` SEARCH → `provenance.search`

No Provenance create/update/patch/delete interaction is registered. Human authorization continues through the capability registry's clinical roles; machine authorization requires the exact P0.3E interaction scope plus current client/credential/integration/facility validation.

`/fhir/metadata` advertises Provenance only while the FHIR deployment gate is enabled and reports `target`/`agent` as reference search parameters and `recorded` as a date search parameter.

## 7. PHI/logging boundary

FHIR integrity failures and machine access audits are deliberately metadata-only. Tests assert that integrity audit metadata excludes the signed clinical narrative and snapshot hash. No token, client secret, MRN, patient name, or staged clinical payload is intentionally written into the P0.3G audit metadata.

## 8. Evidence tests

`apps/api/src/fhir/fhir-provenance-integrity.spec.ts` covers:

- Provenance READ/SEARCH-only capability registration;
- exact machine scopes;
- explicit-only terminology release versioning and invalid configuration failure;
- same-facility signed-version projection;
- foreign-facility/missing-resource indistinguishability;
- hash-tamper fail-closed behavior and PHI-minimized audit metadata;
- tenant-bound Provenance search filters;
- malformed recorded-date rejection;
- deterministic representation ETag/versionId and change detection.

Hosted Verify, Medication Validation, API typecheck/build, web typecheck/build, and existing tenant/RBAC/FHIR regressions remain release gates for the exact hosted head. P0.3H remains the real guarded two-facility JWT/M2M/database E2E certification phase, and P0.3I remains final regression/operations evidence and activation decision.
