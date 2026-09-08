# MEDORA.RD.P0.3A — FHIR foundation implementation evidence

## Build identity and classification

- Baseline: `5ae9283cbb75cde8b7e24bfcd9b0179a84c9f818`
- Branch: `codex/medora-rd-p03a-fhir-foundation-security`
- Implementation commit: `5cab312f371a731d61365dd8282da64f992707d0`
- Migration: `20260908120000_p03a_integration_control_plane` (additive)
- Classification: FHIR foundation/security contract implemented; no inbound clinical writes.

## Repository-first findings

- Existing routes were `FhirPatientController.read`, `FhirEncounterController.read`, and
  `FhirObservationController.read/search` under `apps/api/src/fhir/`; each used JWT and
  `RolesGuard`, but duplicated fallback trust in `x-facility-id`.
- `FhirResourceService` already scopes Encounter, Patient, and Observation lookups by `facilityId`
  and maps canonical Prisma data through `FhirMapperService`; no FHIR clinical persistence exists.
- `fhir-read.schemas.ts` previously used a non-strict Zod object, permitting unknown Observation
  search keys to be stripped.
- `AppModule` registered `FhirModule` unconditionally. `main.ts` uses 50 MB global JSON/urlencoded
  limits and global `AllExceptionsFilter`; FHIR had no scoped error shape or request policy.
- `RolesGuard` resolves active `UserRole` and facility state from Prisma. `platform-principal.ts`
  defines the database-backed Super Admin authority used by global administration.
- `AuditService.log` writes structured `AuditLog` rows and supports critical/fail-closed behavior.
- `apps/web/app/app/admin/page.tsx` is the established Administration hub and gates platform tools
  with `canCreateFacilities`; `/api/admin/*` is the established authenticated Nest proxy.
- `Facility.country` is server-owned deployment context. No pre-existing integration partner or
  credential model was found.
- P0.1 immutable signed documentation/version domains and P0.2 encrypted organization-export code
  were inspected and were not modified.

## Implemented architecture

`FhirCapabilityRegistry` is the single typed list for enabled interactions, searches, future M2M
scope codes, human roles, jurisdiction applicability, deployment/production state and evidence IDs.
`GET /fhir/metadata` derives its R4 CapabilityStatement from that list. Integration permission
options and server validation use the same provider; writes/history/SMART/profile claims are absent.

`FhirMediaInterceptor`, `FhirOperationOutcomeFilter`, strict ID/reference/search utilities and the
FHIR request policy establish JSON-only negotiation, sanitized failures, unknown-key rejection,
bounded query/repetition/count/response/time policies, and a 1 MiB future-write ceiling. Rate
limiting remains process-local in the existing Nest throttler; multi-instance enforcement is a
documented production requirement for P0.3E.

`FhirContextGuard` proves human identity, active facility membership and facility state from the
database, rejects conflicting headers, rejects request-supplied jurisdiction, and resolves profile
context only from `Facility.country`. FRONT_DESK read access is retained because it is part of all
three existing product route contracts; reassessment remains a least-privilege product decision.

`JurisdictionProfileRegistry` defines exact required status constants, FHIR-base/Medora-core
precedence, checksums, semver/dependency/retirement/conflict checks and fail-closed construction.
No US/DR/HT package is enabled. `FhirR4StructuralValidator` provides an offline adapter boundary and
tests base invariants, but is explicitly non-normative. Official package validation is NOT
IMPLEMENTED pending safe package selection, provenance and checksum review.

The protocol-neutral Prisma control plane stores no secret. Server endpoints list/create/update,
enable/disable integrations, explicitly assign facilities, constrain FHIR permissions to registry
codes, require database-backed platform authority, and emit PHI-minimized critical audit metadata.
The Administration hub links to a six-step Integrations workflow. Records remain pending
provisioning; no machine credential, token endpoint, connection test, or clinical authorization is
created.

## Exposure and remaining work

`MEDORA_INTEROP_ENABLED=true` is required for every FHIR controller, including metadata; default is
fail-closed. Invalid profile construction fails startup. A shared/distributed limiter and normative
FHIR validator are not claimed. See `MEDORA_FHIR_JURISDICTION_AUTHORITY_MATRIX.md` for the network
verification constraint and profile/data gaps.

P0.3B remains core resource read/search mapping; P0.3C clinical mapping; P0.3D protocol/pagination
hardening; P0.3E machine identity, credential lifecycle and distributed limits; P0.3F separately
approved staged inbound proposals; P0.3G provenance/concurrency/terminology hardening; P0.3H real
guarded cross-tenant E2E; P0.3I final regression, operations evidence and activation decision.

## Executed checks

- API P0.3A Jest suites: 2 suites, 8 tests passed.
- Web integrations Vitest suite: 1 file, 3 tests passed.
- API and web production builds passed; Prisma schema validation, workspace placeholder lint, and
  `git diff --check` passed.
- Targeted P0.1/P0.2 regression: 3 suites and 79 tests passed. One existing
  `organization-data-export.service.spec.ts` assertion failed because it hard-codes the unrelated
  GitHub Actions path `/home/runner/work/medora-s/medora-s/...`, absent in this workspace. Export
  implementation was not changed.
- A broad web invocation selected the entire suite despite the requested file filter and was
  stopped after existing fixed-count localization assertions and unrelated source/display
  assertions failed. The dedicated integration UI suite was rerun directly and passed.

## Security review

SEC-01–06 PASS by facility-scoped canonical reads, context guard, OperationOutcome tests/behavior,
strict search and generated metadata. SEC-07–12 PASS by platform authority, explicit FK grants,
registry permission validation, secret-free schema and critical audit events. SEC-13–14 PASS by
fail-closed profile validation and isolated resolution. SEC-15–20 PASS: P0.1/P0.2 code is untouched,
only GET FHIR interactions are registered, flag default is closed, and no credential generation or
clinical DELETE exists.
