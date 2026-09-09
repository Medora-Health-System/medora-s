# MEDORA.RD.P0.3B — FHIR administrative resource evidence

## 1–4. Baseline, merge and branch

- **Verified baseline:** `90ead19ce58138d1d8001f9dd20762d242244bb4`.
- **P0.3A merge:** `90ead19ce58138d1d8001f9dd20762d242244bb4`, merge of PR #232, with implementation commits `fc3496a` and `e28cc78`.
- **Branch:** `codex/medora-rd-p03b-fhir-core-administrative-resources`.
- **Final commit:** authoritative PR head (reported by Codex after commit; a commit cannot truthfully contain its own hash).

The baseline contains the capability/context guards and registries, metadata endpoint, FHIR media interceptor, OperationOutcome filter, strict protocol parsers, integration control plane and Administration → Integrations foundation. Migration `20260908120000_p03a_integration_control_plane` is present in Prisma history. No FHIR controller declares POST, PUT, PATCH, or DELETE.

## 5. Resource inventory

| Resource | Canonical authority | Read | Search | Writes |
|---|---|---:|---:|---:|
| Patient | `Patient` | IMPLEMENTED | IMPLEMENTED | NOT IMPLEMENTED / NOT ADVERTISED |
| Encounter | `Encounter` | IMPLEMENTED | IMPLEMENTED | NOT IMPLEMENTED / NOT ADVERTISED |
| Practitioner | clinician `User` with active RN/PROVIDER `UserRole` in effective facility | IMPLEMENTED | IMPLEMENTED | NOT IMPLEMENTED / NOT ADVERTISED |
| PractitionerRole | active clinical `UserRole` | IMPLEMENTED | IMPLEMENTED | NOT IMPLEMENTED / NOT ADVERTISED |
| Organization | effective `Facility` only | IMPLEMENTED | IMPLEMENTED | NOT IMPLEMENTED / NOT ADVERTISED |
| Location | facility `Department` | IMPLEMENTED | IMPLEMENTED | NOT IMPLEMENTED / NOT ADVERTISED |
| RelatedPerson | no sufficiently precise canonical relationship model | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT ADVERTISED |

## 6–11. Field mapping audit

Every row below is facility-owned unless explicitly stated. Optional values are omitted rather than fabricated.

| Resource.element | Canonical source | Transformation / terminology | Nullability | Status |
|---|---|---|---|---|
| Patient.id | `Patient.id` | existing UUID logical ID | required | IMPLEMENTED |
| Patient.identifier | `globalMrn`, `mrn` | established Medora identifier URI policy | MRN optional | IMPLEMENTED |
| Patient.active | canonical row existence | `true`; there is no patient soft-delete state | required | IMPLEMENTED |
| Patient.name | first/last name | FHIR HumanName | required | IMPLEMENTED |
| Patient.telecom | phone/email | direct ContactPoint; no auth fields | optional | IMPLEMENTED |
| Patient.gender | `Patient.sex`, then explicit sex-at-birth fallback only for UNKNOWN | FHIR administrative-gender mapping | required | IMPLEMENTED |
| Patient.birthDate | `dob` | UTC date-only | optional | IMPLEMENTED |
| Patient.address | address/city/country | original canonical strings | optional | IMPLEMENTED |
| Patient.managingOrganization | `facilityId` | centralized `Organization/{id}` reference | required | IMPLEMENTED |
| Encounter.id | `Encounter.id` | UUID logical ID | required | IMPLEMENTED |
| Encounter.status | `OPEN/CLOSED/CANCELLED` | `in-progress/finished/cancelled`; exhaustive switch | required | IMPLEMENTED |
| Encounter.class | `OUTPATIENT/URGENT_CARE/INPATIENT/EMERGENCY` | v3 ActCode `AMB/AMB/IMP/EMER` | required | IMPLEMENTED |
| Encounter.subject | `patientId` | centralized Patient reference | required | IMPLEMENTED |
| Encounter.period | created/discharged timestamps | ISO instant | end optional | IMPLEMENTED |
| Encounter.serviceProvider | `facilityId` | centralized Organization reference | required | IMPLEMENTED |
| Encounter.reasonCode | chief complaint | text only; no diagnosis coding claim | optional | IMPLEMENTED |
| Practitioner.id | `User.id` | UUID, exposed only through active clinical facility membership | required | IMPLEMENTED |
| Practitioner.identifier | `billingNpi` | `http://hl7.org/fhir/sid/us-npi`; emitted only when stored | optional | IMPLEMENTED |
| Practitioner.active/name | User fields | direct safe subset | required | IMPLEMENTED |
| PractitionerRole.id | `UserRole.id` | UUID | required | IMPLEMENTED |
| PractitionerRole.active | `UserRole.isActive` | direct | required | IMPLEMENTED |
| PractitionerRole.practitioner/organization | user/facility FK | centralized references | required | IMPLEMENTED |
| PractitionerRole.code | RBAC role | deliberately omitted: security RBAC is not a clinical code | n/a | NOT IMPLEMENTED |
| Organization.id/name/active | effective `Facility` | direct | required | IMPLEMENTED |
| Organization.identifier | `Facility.code` | Medora facility-code URI, not a national authority | required | IMPLEMENTED |
| Organization.address | billing address fields | direct | optional | IMPLEMENTED |
| Location.id/name/status | `Department` | active/inactive | required | IMPLEMENTED |
| Location.identifier | `Department.code` | Medora department-code URI | required | IMPLEMENTED |
| Location.mode/managingOrganization | canonical department/facility FK | instance + centralized Organization reference | required | IMPLEMENTED |
| Facility/department rooms/beds | no first-class canonical room/bed entity | none invented | n/a | NOT IMPLEMENTED |

Not emitted: SSN/national ID, race, ethnicity, marital/deceased state, fabricated languages, practitioner email, password/refresh/MFA/auth metadata, diagnosis, fake version history, or unsupported national identifiers.

## 12–18. Search, identifiers, references, tenancy, and authorization

Search is parsed once by `FhirSearchService`: strict allowlists, at most eight keys, no repeated values, 256-character value limit, control/wildcard rejection, bounded `_count` (default 20, max 50), and validated keyset `_cursor`. Prisma composes typed predicates; no raw SQL or regex is used. Names use bounded prefix matching, not contains/wildcards. Ordering is stable by logical ID. Search Bundles omit `total`, preventing cross-tenant counts, and share one serializer for `self`, `next`, `fullUrl`, and `search.mode`. URLs come only from server-owned `FHIR_PUBLIC_BASE_URL`; request Host and forwarding headers are ignored. Production requires HTTPS.

Patient supports `_id`, `identifier`, `family`, `given`, `name`, `birthdate`, `gender`. Encounter supports `_id`, `patient`, `subject`, `date`, `status`, `class`. Practitioner supports `_id`, `identifier`, `family`, `given`, `name`. PractitionerRole supports `_id`, `practitioner`, `organization`. Organization supports `_id`, `identifier`, `name`. Location supports `_id`, `identifier`, `name`, `organization`, `status`. Pagination controls `_count` and `_cursor` are common.

Existing UUID logical IDs preserve the P0.3A contract and expose no sequential structure. Existing global/facility MRNs remain identifiers; searches always add `facilityId`. NPI is emitted only from the canonical `billingNpi`. No authority is guessed.

`FhirReferenceResolver` centralizes typed construction and tenant-aware existence checks for administrative resources. All database reads include the effective facility. Organization search is hard-constrained to the one effective facility. Practitioner disclosure requires a clinical RN/PROVIDER assignment in that facility; arbitrary staff and platform accounts are excluded. PractitionerRole and Location are facility-scoped. Missing and foreign records both produce 404 through the OperationOutcome boundary.

Role policy: FRONT_DESK retains Patient and Encounter read/search only; RN, PROVIDER, and ADMIN additionally receive administrative directory resources. Observation remains denied to FRONT_DESK. Registry enforcement is route mandatory. The normalized FHIR context retains actor type/ID, facility, scopes and jurisdiction for future machine actors; P0.3B issues no machine credentials.

## 19–24. Control plane, profiles, validation, database, audit, performance

Capabilities are declared once in `FHIR_CAPABILITIES`; the guard, CapabilityStatement and Integration permission options consume that registry. Only implemented read/search interactions are grantable. Server-side permission validation rejects unsupported writes. Metadata advertises the per-resource search allowlists and configured implementation URL.

All resources remain under the P0.3A jurisdiction registry. United States uses base Medora behavior only. Dominican Republic and Haiti remain **PENDING AUTHORITY CONFIRMATION**; no MISPAS, RNSIS or MSPP profile/identifier is advertised.

The offline boundary remains **STRUCTURAL_VALIDATION**, not profile conformance or certification. P0.3B tests cover administrative shapes, references, Bundle structure and status mapping; normative package/profile validation is deferred.

No Prisma model or migration was required. Existing facility, patient name/MRN, encounter facility/patient/status, user-role facility, and department uniqueness/indexes are used. Keyset pages issue one query and mappers do not perform per-entry queries. The facility-only Organization query is bounded. A future production-query-plan review may justify composite indexes after representative workload measurement; none were added speculatively.

Instance reads continue existing patient/encounter audit events with PHI-safe `source: fhir` metadata. Search values are not logged. Administrative directory search audit taxonomy is a known follow-up; no PHI was added to logs. Authenticated resource responses set `Cache-Control: no-store`; metadata remains non-PHI.

## 25–30. U.S. Core gaps, security, tests, limitations, deferrals, readiness

### U.S. Core gap matrix

| Requirement area | Canonical source / implementation | Gap / future phase |
|---|---|---|
| Patient demographics and identifiers | partial canonical mapping | race/ethnicity/extensions, language preference and profile validation absent |
| Practitioner identity/NPI | name and optional NPI | qualification/address/telecom absent |
| PractitionerRole relationships | practitioner + organization | clinical specialty/role coding and location assignment absent |
| Organization | facility identity and optional billing address | full telecom/type/profile validation absent |
| Location | department identity | physical type/address/telecom/hierarchy absent |

No U.S. Core conformance is claimed. DR and Haiti authority findings are unchanged and PENDING AUTHORITY CONFIRMATION.

### Security assessment

| ID | Result | Evidence summary |
|---|---|---|
| B-SEC-01–04 | PASS | Patient/Encounter instance and search predicates require facility ID |
| B-SEC-05–06 | PASS | practitioners require clinical membership; roles require effective facility |
| B-SEC-07–08 | PASS | Organization is effective facility only; departments are facility scoped |
| B-SEC-09 | PASS | centralized validated resolver and tenant visibility checks |
| B-SEC-10–11 | PASS | strict allowlist, key/value/repetition/count limits, bounded prefix searches |
| B-SEC-12 | PASS | P0.3A sanitized OperationOutcome boundary retained |
| B-SEC-13 | PASS | configured base URL only; Host headers unused |
| B-SEC-14 | PASS | search values not logged; no new PHI audit metadata |
| B-SEC-15–16 | PASS | route/metadata/admin permissions share registry; server rejects unknown codes |
| B-SEC-17–18 | PASS | only GET controllers and only read/search advertisement |
| B-SEC-19–21 | PASS | no P0.1, P0.2, or integration-security storage/workflow changes |
| B-SEC-22–23 | PASS | no national profile/identifier claim; only canonical Medora/NPI systems |
| B-SEC-24 | PASS | authenticated administrative routes use `no-store` |
| B-SEC-25 | PASS | facility predicate is invariant across keyset pages |

Test command evidence and exact Jest suite/test totals are recorded in the final Codex report because generated terminal results cannot be embedded before execution. Migration validation is likewise reported there.

Known limitations: no exact Bundle total; no chaining/modifiers/date prefixes/repeated OR; no clinical PractitionerRole coding; canonical departments are the only Locations; no profile conformance; administrative directory audit taxonomy is pending; CI is independently pending.

Deferred to P0.3C or later: Condition, AllergyIntolerance, Procedure, ServiceRequest, DiagnosticReport expansion, medication resources, documents, Provenance/AuditEvent endpoints, Binary, bulk, subscription, transaction/batch, writes, SMART/OAuth, HL7 v2, DICOM and X12.

**Readiness:** core administrative read/search and tenant-safe reference foundation are IMPLEMENTED and locally VERIFIED BY TEST subject to the exact final report. No inbound clinical write is enabled.

## Final security correction pass — PR #233

**Previous independently verified PR head:** `60fd07ae05e460152ddd47641d9c14b9ca6e2ce4`.
**Correction branch:** `codex/implement-fhir-r4-core-administrative-resources` (existing PR #233 head branch).
**Final head:** recorded by the final Codex report after the evidence commit (Git commit objects cannot contain their own hash).
**CI:** the previous PR head was independently reported green; CI for this correction commit is **PENDING**.

### Strict reference parser

`parseFhirReference(value, expectedResourceType)` is the sole P0.3B search-reference parser. Its
accepted grammar is `ResourceType/logical-id`, where the type must exactly equal the parameter's
expected type and the ID must pass `FHIR_LOGICAL_ID_RE` (`[A-Za-z0-9\-.]{1,64}`). Bare IDs and
absolute URLs are not supported. Percent signs are rejected before any decoding or normalization;
extra path segments, queries, fragments, controls, traversal, empty IDs, and wrong types fail with
`BadRequestException`. The P0.3A filter renders that failure as a sanitized HTTP 400 FHIR
OperationOutcome. Encounter `patient`/`subject`, PractitionerRole `practitioner`/`organization`, and
Location `organization` all call this parser; no ad-hoc prefix removal remains.

### Route review and hardening

The former `/fhir/:type` and `/fhir/:type/:id` dispatcher was removed. Four explicit controllers now
own Practitioner, PractitionerRole, Organization, and Location routes, each with a statically declared
`RequireFhirCapability` value. Therefore unsupported resource types have no controller or capability,
and metadata, Patient, Encounter, and Observation cannot be shadowed by an administrative wildcard.
The real-AppModule routing test exercises ROUTE-01 through ROUTE-10 and the no-write fallback.

### PostgreSQL tenant and reference E2E

`fhir-administrative-tenant.e2e.spec.ts` uses real `AppModule`, Prisma, PostgreSQL, JWT login, and
canonical fixtures for two facilities. Its seven tests cover TENANT-01 through TENANT-20, all six
required same-tenant emitted references, REF error responses, static routing, no-write behavior, and
no-store caching. It additionally verifies direct Practitioner/PractitionerRole reads require an active
RN/PROVIDER facility assignment.

### Exact local verification (2026-09-09)

| Command group | Suites | Tests | Result |
|---|---:|---:|---|
| P0.3A/P0.3B FHIR foundation, administrative, DI | 3 | 27 | PASS |
| P0.3B PostgreSQL tenant/routing/reference E2E | 1 | 7 | PASS |
| Facility isolation, RBAC, order atomicity, JSON charset, integration admin | 5 | 34 | PASS |
| P0.1 signed versions, P0.2 encrypted export, Medication Validation | 9 | 114 | PASS |
| **Executed Jest total** | **18** | **182** | **PASS** |

Both API and Web production builds passed. Prisma validated and all 192 migrations deployed to the
disposable PostgreSQL database, including `20260908120000_p03a_integration_control_plane`. Lint
scripts and `git diff --check` passed. GitHub CI for the correction head remains pending.

### Security matrix after correction

| ID | Status |
|---|---|
| B-SEC-01 | PASS — VERIFIED BY TEST |
| B-SEC-02 | PASS — VERIFIED BY TEST |
| B-SEC-03 | PASS — VERIFIED BY TEST |
| B-SEC-04 | PASS — VERIFIED BY TEST |
| B-SEC-05 | PASS — VERIFIED BY TEST |
| B-SEC-06 | PASS — VERIFIED BY TEST |
| B-SEC-07 | PASS — VERIFIED BY TEST |
| B-SEC-08 | PASS — VERIFIED BY TEST |
| B-SEC-09 | PASS — VERIFIED BY TEST |
| B-SEC-10 | PASS — VERIFIED BY TEST |
| B-SEC-11 | PASS — VERIFIED BY TEST |
| B-SEC-12 | PASS — VERIFIED BY TEST |
| B-SEC-13 | PASS — VERIFIED BY TEST |
| B-SEC-14 | PASS — VERIFIED BY TEST |
| B-SEC-15 | PASS — VERIFIED BY TEST |
| B-SEC-16 | PASS — VERIFIED BY TEST |
| B-SEC-17 | PASS — VERIFIED BY TEST |
| B-SEC-18 | PASS — VERIFIED BY TEST |
| B-SEC-19 | PASS — VERIFIED BY TEST |
| B-SEC-20 | PASS — VERIFIED BY TEST |
| B-SEC-21 | PASS — VERIFIED BY TEST |
| B-SEC-22 | PASS — VERIFIED BY TEST |
| B-SEC-23 | PASS — VERIFIED BY TEST |
| B-SEC-24 | PASS — VERIFIED BY TEST |
| B-SEC-25 | PASS — VERIFIED BY TEST |
| B-SEC-26 | PASS — VERIFIED BY TEST |
| B-SEC-27 | PASS — VERIFIED BY TEST |
| B-SEC-28 | PASS — VERIFIED BY TEST |
| B-SEC-29 | PASS — VERIFIED BY TEST |
| B-SEC-30 | PASS — VERIFIED BY TEST |

### Correction classification

MEDORA.RD.P0.3B: **FINAL SECURITY CORRECTIONS IMPLEMENTED / LOCAL VERIFICATION COMPLETE / CI PENDING**.
Independent review remains the merge authority.
