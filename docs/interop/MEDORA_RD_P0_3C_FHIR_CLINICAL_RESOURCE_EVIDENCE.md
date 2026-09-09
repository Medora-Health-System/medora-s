# MEDORA.RD.P0.3C — Core clinical FHIR R4 evidence

## Scope and architectural decision

This increment is read/search only. The FHIR layer projects existing canonical Prisma records and creates no FHIR tables. `AllergyIntolerance` is deliberately **IMPLEMENTATION BLOCKED / NOT ADVERTISED**: the only allergy information found is unversioned clinical-history JSON, with no provable entry identifier or exhaustive lifecycle semantics. Medication orders and every out-of-scope resource are excluded.

All supported queries include the effective `facilityId` in the database predicate. Instance misses and foreign-tenant identifiers both produce the same sanitized 404 boundary. Searches use the shared strict parser, bounded `_count`, opaque logical-id cursor grammar, server-owned public base URL, and omit totals. Clinical routes allow RN, PROVIDER, and ADMIN; FRONT_DESK is intentionally excluded.

## Repository-first canonical evidence

| FHIR resource | Canonical source and stable identifier | Facility scope | Status and timestamps | Terminology and references | Unsupported/omitted |
|---|---|---|---|---|---|
| Observation | `TriageVitalsReading`; `{reading UUID}-{verified vital LOINC}` | `TriageVitalsReading.facilityId` in every read/search | ACTIVE → final; VOIDED hidden; `measuredAt` is effective time | Existing mapper's reviewed vital LOINC/UCUM; Patient and Encounter | Mutable Patient/Encounter vitals caches, non-vital clinical events, issued/performer |
| Condition | `Diagnosis.id` | `Diagnosis.facilityId` | ACTIVE/RESOLVED/REMOVED exhaustively mapped; onset/resolution/created timestamps | ICD-10-CM only for `ICD10_CATALOG`; otherwise text; Patient/Encounter | No automatic longitudinal problem-list claim, no SNOMED, notes omitted |
| AllergyIntolerance | No qualifying canonical entry model | Not applicable | Cannot prove entry lifecycle | None | **IMPLEMENTATION BLOCKED / NOT ADVERTISED**; unversioned JSON cannot support safe identity or semantics |
| ServiceRequest | Clinically atomic `OrderItem.id`, limited to LAB_TEST and IMAGING_STUDY | Parent `Order.facilityId` in the database relation predicate | Every `OrderStatus` maps to a safe request state; parent authored time; canonical occurrence fields only | Medora catalog URN only when catalog ID exists; Patient/Encounter | Medication/CARE/SUPPLY lines, accession, external IDs, unsafe requester attribution |
| DiagnosticReport | `Result.id` linked to diagnostic `OrderItem` | `Result.facilityId` and parent Order facility predicate | Cancelled item → cancelled; verified → final; otherwise preliminary; canonical effective/issued times | Medora catalog URN; same-tenant Patient, Encounter, ServiceRequest | Attachments/storage URLs and raw `resultData`; no ImagingStudy/DICOM; corrected/amended unavailable canonically; atomic lab Observation links deferred pending a versioned analyte schema |
| CarePlan | `EncounterCarePlan.id` and real components | `EncounterCarePlan.facilityId` | All CarePlanStatus values and component states mapped; activation/completion/discontinuation/created | Patient/Encounter; author only when active facility membership exists | Template snapshot JSON, progress/reviews, fake CareTeam, ordinary notes/tasks |

## Search and role matrix

| Resource | Search subset | FRONT_DESK | RN | PROVIDER | ADMIN |
|---|---|---:|---:|---:|---:|
| Observation | `_id`, subject/patient, encounter, code, category, status, date, `_count`, `_cursor` (route contract; current historical query requires subject or encounter) | No | Yes | Yes | Yes |
| Condition | `_id`, patient/subject, encounter, code, clinical-status, verification-status, recorded-date, pagination | No | Yes | Yes | Yes |
| ServiceRequest | `_id`, patient/subject, encounter, code, status, authored, pagination | No | Yes | Yes | Yes |
| DiagnosticReport | `_id`, patient/subject, encounter, based-on, status, date, pagination | No | Yes | Yes | Yes |
| CarePlan | `_id`, patient/subject, encounter, status, date, pagination | No | Yes | Yes | Yes |
| AllergyIntolerance | Not advertised | No | No | No | No |

## Jurisdictional statement

No US Core, MISPAS, or Haiti MSPP profile conformance is claimed. National profile, code-system, and required-element decisions remain **PENDING AUTHORITY CONFIRMATION**.

## C-SEC security matrix

The labels below are deliberately evidence-based; no item is marked verified merely from inspection.

| ID | Control | Result |
|---|---|---|
| C-SEC-01 | tenant-scoped Observation read | PASS — VERIFIED BY TEST |
| C-SEC-02 | tenant-scoped Observation search | PASS — VERIFIED BY TEST |
| C-SEC-03 | stable Observation reading identity | PASS — VERIFIED BY TEST |
| C-SEC-04 | canonical Observation measurement time | PASS — VERIFIED BY TEST |
| C-SEC-05 | voided vital hidden | NOT VERIFIED |
| C-SEC-06 | Condition tenant read | PASS — VERIFIED BY TEST |
| C-SEC-07 | Condition tenant search | PASS — VERIFIED BY TEST |
| C-SEC-08 | Condition terminology integrity | PASS — VERIFIED BY TEST |
| C-SEC-09 | Condition status integrity | NOT VERIFIED |
| C-SEC-10 | Allergy not advertised without identity | PASS — VERIFIED BY TEST |
| C-SEC-11 | ServiceRequest tenant read | PASS — VERIFIED BY TEST |
| C-SEC-12 | ServiceRequest tenant search | PASS — VERIFIED BY TEST |
| C-SEC-13 | medication exclusion | PASS — VERIFIED BY TEST |
| C-SEC-14 | ServiceRequest status integrity | NOT VERIFIED |
| C-SEC-15 | requester reference safety | PASS — VERIFIED BY TEST |
| C-SEC-16 | DiagnosticReport tenant read | PASS — VERIFIED BY TEST |
| C-SEC-17 | DiagnosticReport tenant search | PASS — VERIFIED BY TEST |
| C-SEC-18 | basedOn reference safety | PASS — VERIFIED BY TEST |
| C-SEC-19 | no internal storage URL | PASS — VERIFIED BY TEST |
| C-SEC-20 | no fabricated ImagingStudy | PASS — VERIFIED BY TEST |
| C-SEC-21 | DiagnosticReport status integrity | NOT VERIFIED |
| C-SEC-22 | CarePlan tenant read | PASS — VERIFIED BY TEST |
| C-SEC-23 | CarePlan tenant search | PASS — VERIFIED BY TEST |
| C-SEC-24 | CarePlan status/intent integrity | NOT VERIFIED |
| C-SEC-25 | no fabricated CareTeam | PASS — VERIFIED BY TEST |
| C-SEC-26 | central reference construction | PASS — VERIFIED BY TEST |
| C-SEC-27 | same-tenant Patient references | PASS — VERIFIED BY TEST |
| C-SEC-28 | same-tenant Encounter references | PASS — VERIFIED BY TEST |
| C-SEC-29 | strict unknown-param rejection | PASS — VERIFIED BY TEST |
| C-SEC-30 | malformed reference rejection | PASS — VERIFIED BY TEST |
| C-SEC-31 | bounded count | PASS — VERIFIED BY TEST |
| C-SEC-32 | cursor syntax validation | PASS — VERIFIED BY TEST |
| C-SEC-33 | tenant-neutral bundle links | PASS — VERIFIED BY TEST |
| C-SEC-34 | total omitted | PASS — VERIFIED BY TEST |
| C-SEC-35 | capability single-source derivation | PASS — VERIFIED BY TEST |
| C-SEC-36 | FRONT_DESK least privilege | PASS — VERIFIED BY TEST |
| C-SEC-37 | unsupported writes return 405 | PASS — VERIFIED BY TEST |
| C-SEC-38 | sanitized OperationOutcome | PASS — VERIFIED BY TEST |
| C-SEC-39 | Cache-Control no-store | PASS — VERIFIED BY TEST |
| C-SEC-40 | server-owned base URL, no profile fabrication, and real PostgreSQL E2E | PASS — VERIFIED BY TEST |

## Final verification evidence (2026-09-09)

The disposable native PostgreSQL 16 database was created with `.cursor/scripts/cloud-agent-install.sh`; all 192 committed migrations were deployed. The real `AppModule`/`PrismaService`/PostgreSQL/JWT two-facility P0.3C suite passed **1 suite / 6 tests**. The combined P0.3A/P0.3B/P0.3C FHIR regression run passed **6 suites / 46 tests**. P0.1 passed **1 suite / 13 tests**. P0.2 executed **4 suites / 93 tests**, with **3 suites passing, 1 failing; 80 tests passing and 13 failing** because time-sensitive export fixtures are expired as of the 2026-09-09 system date. Medication deployment validation executed twice: after clinical-content seeding it still failed hard acceptance with 41/64 searches and 43/64 orderability cases passing, and 23 failures (21 missing family, 2 hidden by ranking).

Exact commands:

- `corepack pnpm --filter @medora/api exec jest --config jest.config.cjs --runInBand --runTestsByPath src/fhir/fhir-clinical-tenant.e2e.spec.ts`
- `corepack pnpm --filter @medora/api exec jest --config jest.config.cjs --runInBand --runTestsByPath src/fhir/fhir-foundation.spec.ts src/fhir/fhir-module-di.spec.ts src/fhir/fhir-administrative.spec.ts src/fhir/fhir-administrative-tenant.e2e.spec.ts src/fhir/fhir-clinical.spec.ts src/fhir/fhir-clinical-tenant.e2e.spec.ts`
- `corepack pnpm --filter @medora/api exec jest --config jest.config.cjs --runInBand --runTestsByPath src/encounters/encounters.service.provider-documentation-versions.spec.ts`
- `corepack pnpm --filter @medora/api exec jest --config jest.config.cjs --runInBand --runTestsByPath src/encounters/encounters.service.provider-documentation-versions.spec.ts src/admin/organization-data-export-envelope.spec.ts src/admin/organization-data-export.service.spec.ts src/admin/organization-data-export-authz.e2e.spec.ts`
- `corepack pnpm --filter @medora/api medication:validate:deployment`

Source baseline presented for correction: `55ca722b64dd67cbc9d02d06dd67058bca3397f7` (the reconstructed local equivalent is `94baaab1b5129f874f1f082ed299441105f988fa`). The final correction head is reported from Git in the delivery response because a commit cannot contain its own SHA.

Remaining limitations are unchanged: AllergyIntolerance is blocked/unadvertised; corrected/amended DiagnosticReport semantics and atomic analyte Observations remain deferred without canonical evidence. C-SEC-05, 09, 14, 21, and 24 remain NOT VERIFIED because the final suite did not exhaustively exercise every void/status enum transition.

Build/validation commands completed successfully:

- `corepack pnpm --filter @medora/api build`
- `corepack pnpm --filter @medora/web build` (non-blocking stale Browserslist-data warning)
- `corepack pnpm --filter @medora/api exec prisma validate`
- `corepack pnpm -r lint` (all workspace lint scripts are placeholders)
- `git diff --check`

No Prisma schema change or production migration was added by P0.3C.
