# FHIR Phase 2D — Provenance evidence

## Scope

Phase 2D exposes read-only FHIR R4 `Provenance` for immutable signed provider-documentation versions only.

Canonical source: `EncounterProviderDocumentationVersion`.

Supported interactions:

- `GET /fhir/Provenance/:id`
- `GET /fhir/Provenance`

Machine scopes:

- `provenance.read`
- `provenance.search`

Search allowlist:

- `_id`
- `target` (`Encounter/...`)
- `patient` (`Patient/...`)
- `agent` (`Practitioner/...`)
- `recorded` (`YYYY-MM-DD`)
- `_count`
- `_cursor`

## Safety boundary

- Facility scope is mandatory on every read/search.
- Only immutable signed provider-documentation versions are projected.
- The stored signed snapshot is re-hashed with Medora's canonical SHA-256 routine before projection.
- A hash mismatch fails closed and emits a PHI-minimized integrity audit event.
- Signed narrative content is never returned by `Provenance`.
- The stored SHA-256 is represented only as source identity evidence; it is not represented as a FHIR digital signature.
- Signer, facility, patient, encounter, version number, recorded time, and predecessor lineage are projected only where Medora has authoritative persisted values.
- No `AuditEvent` exposure is introduced.
- No FHIR Provenance create/update/patch/delete interaction is introduced.

## Acceptance gates

1. Capability registry advertises exactly `provenance.read` and `provenance.search`.
2. Human access is limited to RN, Provider, and Admin.
3. Foreign-facility reads resolve as not found.
4. Search is facility constrained and strictly allowlisted.
5. Source-integrity mismatch fails closed before resource disclosure.
6. CapabilityStatement remains read/search only.
7. Deployed M2M positive/negative certification and audit evidence are required after merge/deploy before Phase 2D is considered complete.

This is internal Medora interoperability evidence only; it is not an external US Core, SMART, or ONC certification claim.
