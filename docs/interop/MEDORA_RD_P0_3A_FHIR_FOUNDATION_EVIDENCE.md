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
context only from `Facility.country`. Repository registration and encounter workflows demonstrate a
legitimate FRONT_DESK need for Patient and Encounter context, so those two FHIR reads remain. They
do not demonstrate a need for external clinical Observation exchange; FRONT_DESK is therefore
removed from Observation FHIR read/search without changing internal registration workflows.

`JurisdictionProfileRegistry` defines exact required status constants, FHIR-base/Medora-core
precedence, checksums, semver/dependency/retirement/conflict checks and fail-closed construction.
No US/DR/HT package is enabled. `FhirR4StructuralValidator` provides an offline adapter boundary and
tests base invariants, but is explicitly non-normative. Official package validation is NOT
IMPLEMENTED pending safe package selection, provenance and checksum review.

The protocol-neutral Prisma control plane stores no secret. Server endpoints list/create/update,
enable/disable integrations, explicitly assign facilities, constrain FHIR permissions to registry
codes, require database-backed platform authority at both guard and service layers, reject
credential-shaped endpoint configuration recursively, allowlist returned endpoint metadata, and
emit PHI-minimized critical audit metadata.
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
- The original PR #232 GitHub CI run successfully applied
  `20260908120000_p03a_integration_control_plane` with `prisma migrate deploy` to disposable
  PostgreSQL 16. The initial local Codex image did not expose PostgreSQL tooling; the repository
  bootstrap subsequently installed PostgreSQL 16 and a fresh local `prisma migrate deploy` also
  applied all 192 migrations, including the P0.3A migration, successfully.
- The P0.2 export source-contract test now resolves its target relative to the active checkout
  instead of hard-coding a GitHub Actions runner path; its expectation and export implementation
  are unchanged.
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

## PR #232 correction pass

- Previous failing head: `14adf9b7246d5c54bb7033069d1ca5118b519a89`.
- Root cause: TypeScript emitted the `readonly JurisdictionProfile[]` constructor parameter as the
  runtime `Array` token, but `FhirModule` registered the class directly without an Array provider.
- Correction: `FhirModule` now owns an explicit `FHIR_JURISDICTION_PROFILES` token/value and creates
  `JurisdictionProfileRegistry` through an injected factory. A real `AppModule` Nest-container test
  proves resolution without global mocks.
- Every resource handler declares `RequireFhirCapability`; `FhirCapabilityGuard` checks the live
  registry entry and effective human role after authenticated facility context resolution. Metadata
  and integration permission options use the same registry.
- Integration administration has both a controller guard and service authorization check against
  current database-backed platform authority. Its real PostgreSQL E2E covers 401, facility-only
  ADMIN 403, and platform-administrator 200.
- Endpoint configuration rejects credential aliases and unknown nested keys, omits configuration
  contents from audit metadata, and allowlists output even for a hostile legacy row.
- OperationOutcome diagnostics are fixed status categories and never echo exception messages.
- Correction-pass local results: 4 foundation/security suites with 29 tests passed; 4 CI-equivalent
  E2E suites with 31 tests passed; integration-admin authorization E2E with 3 tests passed; P0.1/P0.2
  regression suites with 80 tests passed; API/web builds and Prisma validation passed.

**MEDORA.RD.P0.3A: CORRECTIONS IMPLEMENTED / CI PENDING**
