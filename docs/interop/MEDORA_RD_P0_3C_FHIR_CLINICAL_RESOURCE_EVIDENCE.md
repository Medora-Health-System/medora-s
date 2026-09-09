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
| C-SEC-01 | tenant-scoped Observation read | NOT VERIFIED |
| C-SEC-02 | tenant-scoped Observation search | NOT VERIFIED |
| C-SEC-03 | stable Observation reading identity | NOT VERIFIED |
| C-SEC-04 | canonical Observation measurement time | NOT VERIFIED |
| C-SEC-05 | voided vital hidden | NOT VERIFIED |
| C-SEC-06 | Condition tenant read | NOT VERIFIED |
| C-SEC-07 | Condition tenant search | NOT VERIFIED |
| C-SEC-08 | Condition terminology integrity | NOT VERIFIED |
| C-SEC-09 | Condition status integrity | NOT VERIFIED |
| C-SEC-10 | Allergy not advertised without identity | NOT VERIFIED |
| C-SEC-11 | ServiceRequest tenant read | NOT VERIFIED |
| C-SEC-12 | ServiceRequest tenant search | NOT VERIFIED |
| C-SEC-13 | medication exclusion | NOT VERIFIED |
| C-SEC-14 | ServiceRequest status integrity | NOT VERIFIED |
| C-SEC-15 | requester reference safety | NOT VERIFIED |
| C-SEC-16 | DiagnosticReport tenant read | NOT VERIFIED |
| C-SEC-17 | DiagnosticReport tenant search | NOT VERIFIED |
| C-SEC-18 | basedOn reference safety | NOT VERIFIED |
| C-SEC-19 | no internal storage URL | NOT VERIFIED |
| C-SEC-20 | no fabricated ImagingStudy | NOT VERIFIED |
| C-SEC-21 | DiagnosticReport status integrity | NOT VERIFIED |
| C-SEC-22 | CarePlan tenant read | NOT VERIFIED |
| C-SEC-23 | CarePlan tenant search | NOT VERIFIED |
| C-SEC-24 | CarePlan status/intent integrity | NOT VERIFIED |
| C-SEC-25 | no fabricated CareTeam | NOT VERIFIED |
| C-SEC-26 | central reference construction | NOT VERIFIED |
| C-SEC-27 | same-tenant Patient references | NOT VERIFIED |
| C-SEC-28 | same-tenant Encounter references | NOT VERIFIED |
| C-SEC-29 | strict unknown-param rejection | NOT VERIFIED |
| C-SEC-30 | malformed reference rejection | NOT VERIFIED |
| C-SEC-31 | bounded count | NOT VERIFIED |
| C-SEC-32 | cursor syntax validation | NOT VERIFIED |
| C-SEC-33 | tenant-neutral bundle links | NOT VERIFIED |
| C-SEC-34 | total omitted | NOT VERIFIED |
| C-SEC-35 | capability single-source derivation | NOT VERIFIED |
| C-SEC-36 | FRONT_DESK least privilege | NOT VERIFIED |
| C-SEC-37 | unsupported writes return 405 | NOT VERIFIED |
| C-SEC-38 | sanitized OperationOutcome | NOT VERIFIED |
| C-SEC-39 | Cache-Control no-store | NOT VERIFIED |
| C-SEC-40 | server-owned base URL, no profile fabrication, and real PostgreSQL E2E | NOT VERIFIED |

Real PostgreSQL AppModule/JWT two-facility E2E remains NOT VERIFIED in this working environment and is required before release classification may advance.
