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
| C-SEC-05 | voided vital hidden | PASS — VERIFIED BY TEST |
| C-SEC-06 | Condition tenant read | PASS — VERIFIED BY TEST |
| C-SEC-07 | Condition tenant search | PASS — VERIFIED BY TEST |
| C-SEC-08 | Condition terminology integrity | PASS — VERIFIED BY TEST |
| C-SEC-09 | Condition status integrity | PASS — VERIFIED BY TEST |
| C-SEC-10 | Allergy not advertised without identity | PASS — VERIFIED BY TEST |
| C-SEC-11 | ServiceRequest tenant read | PASS — VERIFIED BY TEST |
| C-SEC-12 | ServiceRequest tenant search | PASS — VERIFIED BY TEST |
| C-SEC-13 | medication exclusion | PASS — VERIFIED BY TEST |
| C-SEC-14 | ServiceRequest status integrity | PASS — VERIFIED BY TEST |
| C-SEC-15 | requester reference safety | PASS — VERIFIED BY TEST |
| C-SEC-16 | DiagnosticReport tenant read | PASS — VERIFIED BY TEST |
| C-SEC-17 | DiagnosticReport tenant search | PASS — VERIFIED BY TEST |
| C-SEC-18 | basedOn reference safety | PASS — VERIFIED BY TEST |
| C-SEC-19 | no internal storage URL | PASS — VERIFIED BY TEST |
| C-SEC-20 | no fabricated ImagingStudy | PASS — VERIFIED BY TEST |
| C-SEC-21 | DiagnosticReport status integrity | PASS — VERIFIED BY TEST |
| C-SEC-22 | CarePlan tenant read | PASS — VERIFIED BY TEST |
| C-SEC-23 | CarePlan tenant search | PASS — VERIFIED BY TEST |
| C-SEC-24 | CarePlan status/intent integrity | PASS — VERIFIED BY TEST |
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

## Final closure verification evidence (2026-09-09)

The disposable native PostgreSQL 16 database used all 192 committed migrations. A single combined gate covering P0.1, corrected P0.2, P0.3A, P0.3B PostgreSQL tenant E2E, P0.3C PostgreSQL tenant/role/capability E2E, and the new exhaustive status checks passed **11 suites / 144 tests**. The focused status suite passed **1 suite / 5 tests** and enumerates every canonical `TriageVitalsReadingStatus`, `DiagnosisStatus`, `OrderStatus`, `CarePlanStatus`, and `CarePlanComponentStatus`. The `Result` model has no independent status enum: tests exhaust every parent `OrderStatus` combined with the canonical `verifiedAt` evidence, and unknown values fail closed.

### P0.2 deterministic-time correction

On untouched main (`fa27e8c928891c5a3e97f605a49ead1a3c1ab7e3`), the exact P0.2 command reproduced **1 failed / 2 passed suites; 13 failed / 67 passed tests (80 total)** because fixed signed-envelope fixtures had expired relative to wall-clock time. This is a **PRE-EXISTING BASELINE TEST DEFECT**. The service test now fixes Jest's clock to the fixture epoch; no production source or expiration window changed. The corrected P0.2 suites pass **3 suites / 80 tests**, including the explicit expired-export rejection test.

### Medication Validation baseline comparison

The authoritative deployment workflow was run against equivalent seeded disposable PostgreSQL data on untouched main and this branch. Both produced identical functional results: **26 families, 64 queries, 41/64 search pass, 43/64 orderability pass, 23 hard failures (21 `MISSING_FAMILY`, 2 `HIDDEN_BY_RANKING`)**. Classification: **PRE-EXISTING BASELINE FAILURE / NO P0.3C REGRESSION**. No medication implementation was changed.

Exact commands:

- `cd /tmp/medora-main-baseline && corepack pnpm --filter @medora/api exec jest --config jest.config.cjs --runInBand --runTestsByPath src/admin/organization-data-export-envelope.spec.ts src/admin/organization-data-export.service.spec.ts src/admin/organization-data-export-authz.e2e.spec.ts`
- `corepack pnpm --filter @medora/api exec jest --config jest.config.cjs --runInBand --runTestsByPath src/admin/organization-data-export-envelope.spec.ts src/admin/organization-data-export.service.spec.ts src/admin/organization-data-export-authz.e2e.spec.ts src/encounters/encounters.service.provider-documentation-versions.spec.ts src/fhir/fhir-foundation.spec.ts src/fhir/fhir-module-di.spec.ts src/fhir/fhir-administrative.spec.ts src/fhir/fhir-administrative-tenant.e2e.spec.ts src/fhir/fhir-clinical.spec.ts src/fhir/fhir-clinical-status.spec.ts src/fhir/fhir-clinical-tenant.e2e.spec.ts`
- `cd /tmp/medora-main-baseline && corepack pnpm --filter @medora/api medication:validate:deployment`
- `corepack pnpm --filter @medora/api medication:validate:deployment`
- `corepack pnpm --filter @medora/api build`
- `corepack pnpm --filter @medora/web build`
- `corepack pnpm --filter @medora/api exec prisma validate`
- `corepack pnpm -r lint`
- `git diff --check`

No Prisma schema change or production migration was added. AllergyIntolerance remains **IMPLEMENTATION BLOCKED / NOT ADVERTISED**. Corrected/amended DiagnosticReport distinctions and atomic analyte Observations remain deferred without canonical evidence. The final commit SHA is reported in delivery because a commit cannot contain its own hash.
