# MEDORA.RD.P0.3 — Production FHIR R4 interoperability audit

**Phase:** 0 — repository audit, architecture contract, and implementation plan  
**Classification:** **ARCHITECTURE AUDIT COMPLETE / IMPLEMENTATION PENDING**  
**Audited baseline:** `08e5f3dd2b4d8733183363bed66088330949dabd` (P0.2 merge commit)  
**Audit date:** 2026-09-08  
**Production code changed by this phase:** **NO**

## 1. Scope, evidence, and baseline qualification

This audit treats the checked-out repository as authoritative. The checkout began clean at
`08e5f3dd2b4d8733183363bed66088330949dabd`. That commit is the supplied P0.2 merge commit and is
`HEAD`. The clone contains no local `main` ref and no configured Git remote, so a later remote
`main` could not be fetched or independently compared. The Phase 0 branch was therefore created
directly from the supplied, clean baseline. This environment limitation does not alter the code
findings, but the PR operator must confirm the remote target has not advanced before merge.

Repository areas inspected include the full Prisma schema, `apps/api/src/fhir`,
`apps/api/src/fhir-mapper`, interop contracts, authentication/role guards, exception handling,
audit service, relevant canonical services, package dependencies, and interoperability,
production, device, clinical-documentation, medication, imaging, and export documentation.

This is not a conformance certification. “FHIR-shaped” below means a locally defined subset of
FHIR R4 JSON, not a resource validated against the normative R4 schemas or a published profile.
No claim of FHIR R4, US Core, SMART, or Dominican implementation-guide conformance is made.

## 2. Architectural finding

The existing design has the correct source-of-truth direction:

```text
external FHIR R4 / future HL7 v2
              |
     controlled interop edge
              |
 existing Medora workflow services
              |
 canonical Prisma/PostgreSQL domain
```

The mapper facade is stateless and does not persist FHIR resources. Current reads project
canonical `Patient`, `Encounter`, and vital-sign JSON. There are no FHIR-only clinical tables and
there must never be any. P0.4 HL7 v2 must reuse the same application workflows and identity,
staging, idempotency, audit, and canonical-domain boundaries—not create a parallel domain.

The current surface is nevertheless **not production-grade**: it is always registered regardless
of `MEDORA_INTEROP_ENABLED`; provides only three resource types; has no `/fhir/metadata`; uses
handwritten subset types instead of full validation; returns the application's ordinary error
shape rather than `OperationOutcome`; has no FHIR-specific rate limiting; has no machine identity
or scopes; has almost no search; and has no dedicated tests.

## 3. Existing endpoint inventory

All current routes are read-only, use `application/fhir+json`, and apply controller guards in the
order `AuthGuard("jwt"), RolesGuard`. JWT validates an active user and session. `RolesGuard` then
requires an active role at the selected active facility. Allowed roles on all four operations are
RN, PROVIDER, ADMIN, and FRONT_DESK. The facility comes from authenticated request context after
guard processing; an `x-facility-id` header can select a facility only because the role guard
verifies the caller's membership there. There is no integration-client authentication.

| Method and route | Operation/source | Scope, audit, validation | Search/paging and readiness |
|---|---|---|---|
| `GET /fhir/Patient/:id` | Instance read; `PatientsService.findOne`, then `Patient` mapper | `facilityId + id`; foreign/missing IDs become 404 through the canonical service. UUID Zod check. Canonical patient-view audit is reused. | No Patient search, version, ETag, profile validation, or FHIR error. **Prototype only.** |
| `GET /fhir/Encounter/:id` | Instance read; direct `Encounter.findFirst`, then mapper | Query is `id + facilityId`; missing/foreign is the same 404. UUID Zod check. `ENCOUNTER_VIEW` audit with `source: fhir`. | No Encounter search, version/ETag, full workflow detail, profile validation, or FHIR error. **Prototype only.** |
| `GET /fhir/Observation/:id` | Derived vital-sign instance; opaque ID resolves encounter vitals or patient's latest-vitals cache | Opaque ID syntax is bounded; source lookup always includes facility; missing/foreign is 404. Reuses patient/encounter view action with FHIR metadata. | No persistent Observation identity/version. A latest-cache ID can change meaning. No normative validation. **Prototype only.** |
| `GET /fhir/Observation?subject=Patient/{uuid}&encounter=Encounter/{uuid}` | Type search over one encounter snapshot or one patient's latest-vitals cache | At least one reference required; exact local-reference and UUID checks; encounter/patient relationship checked; source lookup scoped by facility; view audit. | Only `subject` and `encounter`; no `_id`, `patient`, code/date/category/status, `_count`, links, cursor, or generic paging. Unknown keys are currently stripped/ignored by Zod. Returns a minimal searchset `Bundle` with `total` and entries. **Prototype only.** |

There are no current FHIR POST, PUT, PATCH, DELETE, history, batch, transaction, conditional,
operation, terminology, or bulk endpoints. There is no `CapabilityStatement`, `OperationOutcome`,
`Provenance`, or FHIR `AuditEvent` endpoint. No dedicated FHIR test files were found.

### Existing serialized resource content

* **Patient:** Medora UUID logical ID; global and facility MRNs using Medora-defined canonical
  URLs; name, administrative gender, birth date, phone/email, and basic address.
* **Encounter:** Medora UUID; coarse status and class, patient reference, start/end, and free-text
  chief complaint as `reasonCode.text`. It omits facility/service-provider/location/participants,
  identifiers, disposition, and most workflow detail.
* **Observation:** vital signs only, derived from `Encounter.vitals` or
  `Patient.latestVitalsJson`; LOINC codes and UCUM quantities for temperature, heart rate,
  respiratory rate, blood pressure, SpO2, weight, and height. The mapper labels valid stored
  values `final`; the encounter timestamp is `Encounter.updatedAt`, which is not reliably the
  clinical effective time. Triage's append-only `TriageVitalsReading` is not used by this API.
* **Bundle:** a minimal `searchset` whose entries can contain only Observation. It lacks `id`,
  `meta`, `link`, search modes/scores, and paging controls.

## 4. Canonical Medora domain to FHIR mapping

FHIR remains a projection of, or controlled command into, these sources. JSON fields require
versioned parsing; no mapper may infer clinical meaning from unknown keys.

| Medora clinical domain | Canonical model/service evidence | FHIR representation and qualification |
|---|---|---|
| Patient and demographics | `Patient`; `PatientsService`; registration workflow; facility/global MRN | `Patient` (READ/SEARCH). Controlled create/update only through registration/identity review, deferred. |
| Encounter and disposition | `Encounter`, `EncounterIntake`, lifecycle transitions, hospital episodes; encounter lifecycle services | `Encounter` (READ/SEARCH). Disposition remains Encounter fields/lifecycle; no external direct state assignment. |
| Facility | `Facility`, facility services | `Organization` for legal/operating entity and `Location` for care sites/departments/rooms where stable data exists. Facility is also the tenant boundary. |
| User/provider | `User` plus provider attribution fields | `Practitioner` for clinically participating staff only; never expose password/session/MFA fields. |
| Provider roles/membership | `Role`, `UserRole` with facility and optional department | `PractitionerRole`, scoped to Organization/Location. Only active, clinically relevant assignments. |
| Vital signs | `Triage.vitalsJson`, append-only `TriageVitalsReading`, `EncounterClinicalEvent(VITALS_RECORDED)`, latest cache | `Observation`. Production mapping must prefer timestamped canonical readings/events, not the cache as history. |
| Laboratory orders | `Order` + `OrderItem`, type `LAB_TEST`; order lifecycle services/catalog | `ServiceRequest`; specimen linkage only when canonical specimen data exists. |
| Laboratory results | `Result` linked to `OrderItem`; lab result submission/verification workflows | Atomic `Observation` plus `DiagnosticReport` grouping. Preserve preliminary/verified/corrected semantics; do not derive codes not in catalogs. |
| Imaging orders/results | `Order` + `OrderItem`, type `IMAGING`; `Result`; imaging catalog/workflows | `ServiceRequest` + `DiagnosticReport`. `ImagingStudy` deferred because no dependable DICOM/study-instance canonical source was found. |
| Diagnoses/problems | `Diagnosis`, ICD-10 catalog/terminology and lifecycle service | `Condition` (READ/SEARCH). Procedure diagnosis/billing roles must not be conflated with a longitudinal problem list. |
| Allergies | `Patient.clinicalHistoryProfileJson` governed clinical-history service | `AllergyIntolerance` after its versioned JSON structure and provenance are mapped. No standalone allergy table exists. |
| Medication catalog | `CatalogMedication` and canonical medication/RxNorm models | Medication concepts embedded in `MedicationRequest`/`MedicationAdministration`; a standalone `Medication` resource may be added only for stable canonical concepts. |
| Medication orders | Medication `Order`/`OrderItem`, schedule/dose-instance/lifecycle and provider-order services | `MedicationRequest` (READ/SEARCH). All creates/changes must invoke order authority, safety, lifecycle, and pharmacy rules. |
| Medication administration | `MedicationAdministration` plus verification, override, waste, correction, dose-instance and MAR services | `MedicationAdministration` (READ/SEARCH). Inbound create/update is not safe and is not proposed. Corrections are append/governed, not replacement. |
| Provider/clinical documentation | `EncounterNote`, `EncounterClinicalDocumentationEntry`, structured encounter documentation | `DocumentReference` for discoverability/content access controls; possibly resource-specific projections later. No mutable generic document write. |
| Signed versions | `EncounterProviderDocumentationVersion` snapshot/hash/signature chain; P0.1 services | `DocumentReference` plus `Provenance` describing signatures/version derivation. Signed snapshots are immutable. |
| Addenda/corrections | `EncounterProviderAddendum`; note amendment/void; medication correction and result correction workflows | New/amended resources and `Provenance` as appropriate; never overwrite signed historical content. |
| Care plans | `EncounterCarePlan` and components/progress/review/transitions | `CarePlan` is justified for READ/SEARCH after a dedicated mapper; writes deferred. |
| Procedures | `EncounterClinicalEvent(PROCEDURE_DOCUMENTED)`, procedure orders/catalog, dental procedures | `Procedure` deferred until the distinct performed-procedure sources have a reliable unified projection. |
| Care team | assignment/provider fields and enterprise assignment projection | `CareTeam` deferred: current operational assignments are not automatically a formal clinical care team. |
| Consent | registration packet answers/signatures and EnterpriseDocument artifacts | `Consent` deferred: acknowledgement/disclosure/signature records are not yet proven to encode a complete FHIR consent policy/provision. |
| Questionnaire responses | versioned registration packet fields/answers | `QuestionnaireResponse` deferred; semantics/profile and patient-access boundaries require design. |
| Specimen | no reliable canonical specimen entity found | `Specimen` **not supported** until canonical collection/accession/specimen identity exists. |
| Imaging study | imaging catalog/order/result, but no reliable DICOM study entity found | `ImagingStudy` **not supported** in first release. |

## 5. Target first-release resource and interaction contract

Legend: **Y** target, **D** deferred pending a later approved workflow/profile, **N** not supported.
Only capabilities that pass implementation and evidence tests may appear in `/fhir/metadata`.

| Resource | READ | SEARCH | CREATE | UPDATE | DELETE | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| Patient | Y | Y | D | D | N | Registration/identity reconciliation is prerequisite to writes. |
| Encounter | Y | Y | D | D | N | Lifecycle commands, not generic PUT, would be required. |
| Practitioner | Y | Y | N | N | N | Minimum-data staff projection. |
| PractitionerRole | Y | Y | N | N | N | Active facility membership projection. |
| Organization | Y | Y | N | N | N | Facility projection; administrative mutation is not FHIR-owned. |
| Location | Y | Y | N | N | N | Only stable facility/department/location sources. |
| Observation | Y | Y | D | D | N | External clinical proposal/review workflow is prerequisite. |
| DiagnosticReport | Y | Y | D | D | N | External result review/verification workflow is prerequisite. |
| ServiceRequest | Y | Y | D | D | N | External order draft + clinician approval is prerequisite. |
| AllergyIntolerance | Y | Y | D | D | N | Requires governed history-profile commands and dedupe. |
| Condition | Y | Y | D | D | N | Requires diagnosis workflow and terminology policy. |
| MedicationRequest | Y | Y | D | D | N | Requires all canonical ordering/safety invariants. |
| MedicationAdministration | Y | Y | N | N | N | MAR remains a human, governed Medora workflow. |
| DocumentReference | Y | Y | D | N | N | Possible create only as quarantined/reviewed document intake, never signed-record replacement. |
| Provenance | Y | Y | N | N | N | Derived from canonical authorship/signature/correction evidence. Not the security audit. |
| CarePlan | Y | Y | D | D | N | Read mapper after clinical semantics review; writes later. |
| Procedure | D | D | N | N | N | First unify performed-procedure authority. |
| CareTeam | D | D | N | N | N | Do not equate operational assignment with formal care team. |
| Consent | D | D | N | N | N | Await complete consent authority and policy mapping. |
| QuestionnaireResponse | D | D | N | N | N | Await profile and disclosure/access review. |
| Specimen | N | N | N | N | N | No canonical source. |
| ImagingStudy | N | N | N | N | N | No canonical study identity/metadata. |

Thus the first release is predominantly READ/SEARCH. Phase 0 authorizes **no writes**. Candidate
CREATE/UPDATE interactions remain deferred until P0.3F and may be rejected then if the canonical
workflow cannot safely express them.

## 6. Inbound-write and delete policy

Every accepted inbound item is a command/proposal to a canonical Medora workflow, never Prisma
CRUD from a FHIR controller. Before enabling a resource interaction, define its allowed client
scope, facility, human-review requirement, exact canonical service, semantic validation,
idempotency key, duplicate policy, conflict response, transactional audit, and concurrency token.

| Candidate | Safety and workflow policy |
|---|---|
| Patient | External demographics create match candidates only. Registration staff review collisions; national ID/MRN never auto-merge. Conflicts return 409 or enter reconciliation. |
| Encounter | External event proposes an encounter/lifecycle action. Canonical lifecycle service checks patient/facility/status. Human review is default. |
| Observation | Stage a bounded external observation with source/message identity; validate patient/encounter/code/unit/effective time; clinician accepts through the existing vitals/result workflow. Never insert directly or overwrite latest vitals. |
| DiagnosticReport | Correlate facility + placer/filler/accession + order item, quarantine unresolved data, and require lab/radiology verification before legal filing. |
| ServiceRequest | Create a draft proposal only. An authorized provider invokes canonical ordering, safety, and lifecycle services on approval. |
| AllergyIntolerance/Condition | Match normalized external identifiers and canonical concepts; clinician reviews additions/changes. Never translate free text to a fabricated standard code. |
| MedicationRequest | Draft only; provider approval runs medication catalog, allergy/interaction, dose, lifecycle, and pharmacy policies. Signed/active history is not rewritten. |
| DocumentReference | Quarantined attachment intake only if separately approved; malware/content-type/size scan and human association. It cannot overwrite P0.1 snapshots. |

Integration scopes should be interaction-specific, for example
`patient.read`, `observation.read`, and later `observation.propose`, not generic `fhir.*` or
`resource.write`. A proposal is deduplicated on `(facilityId, integrationClientId, sourceSystem,
externalMessageId/resource identifier)` and stores a request fingerprint. Same key/same fingerprint
returns the prior result; same key/different fingerprint is 409. Signed/locked records cause a new
addendum/correction workflow or a conflict, never an update. Audit failure for a clinical mutation
must fail closed inside the same transaction.

**DELETE policy:** all clinical FHIR DELETE interactions are **NOT SUPPORTED**. Return a sanitized
`OperationOutcome` with HTTP 405 (and an `Allow` header) for unsupported methods. Canonical
entered-in-error, cancel, discontinue, void, and correction workflows may later be represented as
status transitions; they are not deletion.

## 7. Identifier and reference strategy

* Canonical Medora UUIDs are suitable as logical IDs because they are stable and match FHIR `id`
  syntax. UUID unpredictability is defense in depth, not authorization.
* Resolve every logical ID through `(facilityId, id)` or a proven facility relationship. Return the
  same sanitized 404 for absent and foreign resources to resist enumeration. Organization-wide
  global resources require an explicit global-read policy; they must not create a tenant bypass.
* Patient `globalMrn` and facility `mrn` remain identifiers, not logical IDs. Give facility MRNs a
  facility-specific system URI (include a non-secret facility UUID/code path), rather than the
  current single facility-MRN system. Never expose national IDs by default.
* Encounter identifiers use the Medora UUID initially. Add external placer/visit identifiers only
  through a facility/client/source namespace with a database uniqueness constraint.
* Practitioner identifiers may include Medora UUID and verified NPI when disclosure is authorized.
  Never derive provider identity from a display name.
* External identifiers require an `IntegrationClient`-owned namespace and unique constraint.
  Duplicate values become reconciliation/conflict, never last-write-wins.
* Accept only relative references to explicitly supported resource types in the first write phase.
  Reject absolute, contained, recursive, foreign-facility, unresolved, and unsupported references
  unless a documented resolver permits them. Validate all linked resources in one facility.

## 8. Authentication, authorization, and tenant isolation

### Human users

Keep session-bound Bearer JWT for appropriate interactive reads. Do not trust a facility claim or
header alone: normalize one facility context, reject conflicting query/header/body facility values,
and require active `UserRole` + active Facility. Resource scopes/RBAC should be centralized rather
than repeated ad hoc on controllers. FRONT_DESK access to clinical Observation is broader than
least privilege and must be reviewed before production.

### Machine-to-machine

No suitable integration-client/service-account model exists today. Add the smallest secure model:

* `IntegrationClient`: opaque client ID, display name, facility ID, active/revoked state, allowed
  scopes, created/updated/revoked attribution, and optional source-system identifier;
* separate rotatable credentials with key ID, **Argon2id hash only**, created/expires/revoked/last-used
  timestamps; reveal a generated secret once and never log/store plaintext;
* short-lived signed access tokens minted after client authentication, with audience, subject,
  facility, scopes, token ID, issued/expiry times; rotation overlap and immediate client revocation;
* per-client/facility rate limits and audit attribution. Never hard-code an API key.

Full OAuth authorization-server and SMART-on-FHIR launch flows are not justified by current
foundations. They require a separate standards/security phase. **SMART on FHIR: NOT IMPLEMENTED / NOT
ADVERTISED.**

### Isolation response policy

Instance reads for a valid foreign ID return the same 404 `OperationOutcome` as a nonexistent ID.
Malformed IDs are 400. A known authenticated principal lacking a resource-type scope gets 403;
authentication failure gets 401. Searches silently constrain to the authorized facility and must
never reveal foreign totals. Foreign references in writes fail with a non-enumerating 404/422 as
defined per validation stage. Required real-guard E2E cases cover Facility A attempting Facility B
Patient, Encounter, Observation/result, ServiceRequest/order, and DocumentReference.

## 9. Validation and error contract

There is no FHIR validation dependency today beyond Zod and handwritten subset types. Introduce a
small boundary validator only after comparing maintained R4 packages for dependency size,
security, release cadence, and ability to validate base R4 JSON. Keep focused Zod DTOs for supported
search and command policy. Validate **both outgoing mappings and incoming resources** in tests.
Profile validation is additive and must never rewrite canonical data.

All `/fhir` failures must be converted by a FHIR-scoped exception filter to a minimal R4
`OperationOutcome`, preserving a correlation ID but never exception messages from Prisma/SQL,
stacks, filesystem paths, storage keys, headers, tokens, or payloads:

| HTTP | Use |
|---:|---|
| 400 | malformed JSON, syntax, malformed search/id/reference |
| 401 | missing/invalid/expired authentication |
| 403 | authenticated but missing interaction scope/role |
| 404 | missing or inaccessible instance/reference |
| 409 | idempotency collision, duplicate external identifier, or stale/conflicting state |
| 412 | failed `If-Match` precondition when an update is supported |
| 422 | structurally parseable resource that violates supported semantic/profile/workflow rules |
| 405 | unsupported interaction such as DELETE |
| 413 | payload exceeds the FHIR-specific limit |
| 429 | client/facility rate limit |

Production must not inherit the current development filter's stack-bearing response. Unknown
search parameters should produce a 400 `OperationOutcome` in strict mode rather than being ignored.

## 10. CapabilityStatement

`GET /fhir/metadata` is required in P0.3A/D and will return an R4 `CapabilityStatement` with
`kind=instance`, `fhirVersion=4.0.1`, JSON format, security description, and only implemented
resource interactions and search parameters. It must be generated from the same typed capability
registry used by route/search validation and contract tests, so documentation cannot drift.
Do not advertise batch, transaction, history, conditional operations, subscriptions, bulk export,
SMART, US Core, or writes until their guarded E2E evidence passes.

**Current status: ABSENT.**

## 11. Search and pagination contract

Initial explicit allowlist (implement incrementally):

| Resource | Supported target parameters |
|---|---|
| Patient | `_id`, `identifier`, `name`, `birthdate` |
| Encounter | `_id`, `patient`, `date`, `status`, `identifier` |
| Observation | `_id`, `patient`/`subject` alias as documented, `encounter`, `code`, `date`, `category`, `status` |
| DiagnosticReport | `patient`, `encounter`, `code`, `date`, `status` |
| ServiceRequest | `patient`, `encounter`, `code`, `status` |
| AllergyIntolerance | `patient`, `clinical-status` |
| Condition | `patient`, `encounter`, `code`, `clinical-status` |
| MedicationRequest | `patient`, `encounter`, `status` |
| MedicationAdministration | `patient`, `context`, `status` |
| DocumentReference | `patient`, `encounter`, `date`, `type` |
| Organization/Location/Practitioner/PractitionerRole/Provenance/CarePlan | Only parameters explicitly added to the capability registry with indexed canonical queries |

Each search must require at least one selective parameter for PHI-heavy resources unless a scope
explicitly permits a bounded facility listing. Date ranges should default to 90 days and cap at one
year where clinically workable; reject combinations whose estimated complexity exceeds policy.
No `_include`, `_revinclude`, `_summary`, chained, reverse-chained, arbitrary modifier, or arbitrary
sort support in the initial release.

Search returns a FHIR `Bundle(type=searchset)` with self and opaque next links. `_count` defaults to
20 and is clamped/rejected above 100 (prefer reject so clients see the contract). The cursor is an
authenticated/encrypted token binding facility, client/user, resource type, normalized query,
stable `(updatedAt,id)` keyset, expiry, and page size. It never exposes a raw offset or unscoped DB
cursor. Compute `Bundle.total` only when cheap and exact; otherwise omit it rather than lie. Every
page reauthorizes the actor and facility. URLs are generated from a trusted configured public base,
not an untrusted Host header.

Bundle modes: **searchset SUPPORTED**; **batch DEFERRED**; **transaction NOT SUPPORTED**;
**history DEFERRED**. Ordinary search is not bulk export; P0.2 remains the controlled organization
export path.

## 12. Versioning and concurrency

Use stable canonical update/version evidence only. `meta.lastUpdated` comes from the authoritative
row/event timestamp, not response time. `meta.versionId` can use a canonical integer version where
one exists (`Encounter.version`) or an immutable version/event/hash identifier. Strong or weak ETags
must be derived consistently from that version. Any enabled update requires `If-Match`; stale
versions return 412 and no mutation/audit-success event.

Do not invent mutable history for snapshot projections. Signed provider documentation uses its
immutable `versionNumber`, `signedAt`, and snapshot hash. A correction/addendum becomes a new
canonical record and new projected version/Provenance, never a rewrite of a prior resource. Sources
without reliable version fields are READ-only until a concurrency strategy exists.

## 13. Audit and Provenance

The existing `AuditService` and `AuditLog` provide user/facility/patient/encounter/order/entity,
action, time, IP/user-agent, and metadata. Current FHIR reads reuse patient/encounter view actions,
but lack a uniform resource type/logical ID, integration identity, correlation ID, outcome, and
failure audit contract. Add FHIR-specific PHI-safe audit helpers that record actor (user or client),
facility, resource type/logical ID, interaction, request correlation ID, source, success/failure,
and reason code/count—not complete resources, query values containing PHI, names, MRNs, narrative,
or tokens. Clinically meaningful writes are transactionally fail-closed.

FHIR `Provenance` is a clinical lineage projection (authors, signatures, source, derivation,
corrections). It is **not** the internal security audit log and must not expose internal audit
metadata. FHIR `AuditEvent` is not part of the first production resource set; exposing security logs
requires a separate policy. `Provenance` READ/SEARCH begins with signed documentation and verified
results where canonical evidence is reliable.

## 14. Terminology strategy

| System | Repository state / policy |
|---|---|
| ICD-10-CM/CIE-10 | Strong governed catalogs, multilingual/effective releases and diagnosis provenance exist. Emit a code only when the canonical diagnosis identifies the validated system/version; manual-declared text stays text. |
| LOINC | A small hard-coded vital-sign map exists. Lab catalogs do not establish complete LOINC coverage. Expand through governed mappings, not label inference. |
| UCUM | Current vital quantities use canonical UCUM codes. Validate units/value ranges and never convert without an explicit tested conversion. |
| RxNorm | Substantial canonical concept/import/review governance exists. Emit RxNorm only from approved source-backed links; preserve local coding otherwise. |
| CPT/HCPCS | Billing procedure/mapping data exists. Do not treat billing codes as clinical procedure identity without reviewed linkage. |
| SNOMED CT | No dependable production mapping/license-backed terminology source was found for these target fields. Do not fabricate or claim support. |

Each Coding includes the true system URI and, when known, version/display from governed data.
Free text uses `CodeableConcept.text` or a local code; it is never silently upgraded to a standard.
No terminology server or `$validate-code` operation is currently implemented or initially promised.

## 15. Multinational FHIR architecture

P0.3 is an international interoperability platform, not a Dominican-only server and not three
country forks. One deployment uses one canonical Medora clinical domain and one FHIR R4 edge:

```text
FHIR R4 base
  └── Medora International/Core profile
        ├── United States layer (US Core / applicable USCDI / SMART evaluation)
        ├── Dominican Republic layer (MISPAS / RNSIS requirements when confirmed)
        ├── Haiti layer (MSPP requirements when confirmed)
        └── future versioned layers (for example Canada, CARICOM, France)
```

`Patient`, `Encounter`, Observation sources, allergy history, medication/order/result, and clinical
documentation remain the same Prisma models and workflow services in every jurisdiction. A country
must not gain a parallel database, country-specific FHIR server, or country branch inside every
resource service. An authoritative requirement that cannot be represented by a standard element,
profile, extension, terminology binding, identifier namespace, or configuration is the only reason
to propose an additive canonical-domain change, and that proposal requires separate governance.

### 15.1 Status vocabulary and current jurisdiction findings

Every jurisdiction claim and artifact must carry exactly one of these statuses:

* **VERIFIED AUTHORITATIVE REQUIREMENT** — traced to a named authority artifact, canonical URL,
  published version, publication/effective date, and retained review evidence;
* **IMPLEMENTED** — code, configuration, validator package, CapabilityStatement declaration, and
  conformance tests exist for the pinned authoritative requirement;
* **ARCHITECTURALLY SUPPORTED** — the international core has an extension/configuration point, but
  Medora makes no conformance claim;
* **PENDING AUTHORITY CONFIRMATION** — repository hints or product assumptions exist without a
  confirmed national FHIR contract.

| Layer | Repository evidence | Phase 0 status |
|---|---|---|
| FHIR R4 base | Handwritten Patient/Encounter/vital Observation projections | **ARCHITECTURALLY SUPPORTED**, partially prototyped; not normatively validated or conformant |
| Medora International/Core | This common resource, security, identifier, search, audit, and workflow contract | **ARCHITECTURALLY SUPPORTED**, not yet implemented as profiles/packages |
| United States | U.S. billing/NPI/ICD-10-CM/CPT/HCPCS/RxNorm data exists, but no US Core package, USCDI matrix, certification target, or SMART authorization server exists | US Core/USCDI/SMART: **PENDING AUTHORITY CONFIRMATION** for applicability and version; **NOT IMPLEMENTED** |
| Dominican Republic | Facilities/country support exists, but no repository-held authoritative MISPAS/RNSIS FHIR IG, endpoint contract, national identifier URI, or terminology binding was found | **PENDING AUTHORITY CONFIRMATION** |
| Haiti | Haiti clinical catalogs, geography, notifiable-disease workflow, and national `MSPP_*` roles/review concepts exist; these are product/canonical operational sources, not a national FHIR IG | **ARCHITECTURALLY SUPPORTED** as source data; national FHIR profile **PENDING AUTHORITY CONFIRMATION** |

“Implemented” is deliberately not used for any national FHIR profile. Repository-held Haiti/MSPP
or U.S. terminology data does not by itself establish national-profile conformance.

### 15.2 United States profile strategy: US Core, USCDI, and SMART

US Core is a versioned HL7 implementation guide layered over FHIR R4; USCDI is a versioned U.S.
data-class/element policy baseline, not a FHIR profile or automatic statement that every Medora
field is exchange-ready. Applicability also depends on the deployment, actor, certification/API
program, contract, and effective date. Before implementation, regulatory/product governance must
record the current official releases and applicable rule in the profile registry; no unverified
“latest” version may be silently selected at runtime.

P0.3A must create a US gap matrix for every applicable USCDI data class/element against (a) a
canonical Medora source, (b) the pinned US Core profile/search/terminology requirement, (c) data
quality/provenance, and (d) supported interaction. Missing reliable data remains a declared gap—it
must not be synthesized. Likely relevant existing foundations include demographics, encounter,
vitals, problems, allergies, laboratory/imaging orders and results, medications, procedures, care
plans, notes, provenance, and provider/facility identifiers, but applicability and completeness are
**PENDING AUTHORITY CONFIRMATION** until that versioned matrix is approved.

SMART App Launch/OAuth is evaluated as a separate authorization layer for U.S. user-facing and
backend-service use cases. The P0.3E minimum M2M client design is not automatically SMART Backend
Services, and a Medora JWT is not a SMART token. Authorization endpoint discovery, scopes, launch
context, PKCE, token audience, JWKS, backend-service assertions, revocation, and `.well-known`
metadata must be implemented and tested before advertising SMART. **US CORE, USCDI CONFORMANCE,
SMART ON FHIR, AND U.S. CERTIFICATION: NOT IMPLEMENTED / NOT CLAIMED.**

Phase 0 attempted to verify current official US Core, USCDI, and SMART publications, but outbound
access to the official HL7 and HealthIT.gov sites was blocked by the execution environment. This
report therefore intentionally does not freeze a guessed version number. P0.3A has a blocking
authority-verification task to record the then-current official versions and the versions legally
applicable to each U.S. deployment before selecting validator packages or claiming conformance.

### 15.3 Dominican Republic profile strategy

The repository search found no authoritative Dominican MISPAS/RNSIS FHIR implementation guide,
national FHIR endpoint contract, canonical identifier-system URI, or required terminology/value-set
package. Dominican facility/country records and localized workflows are not substitutes for such an
artifact. Therefore:

**DOMINICAN-SPECIFIC FHIR PROFILE: PENDING AUTHORITY/IMPLEMENTATION-GUIDE CONFIRMATION**

When an authority contract is obtained, register its canonical URLs/version, identifiers,
terminology packages, extensions, validation rules, search requirements, and endpoint policy in a
Dominican adapter package. Do not embed `country === "DO"` branches in resource services.

### 15.4 Haiti profile strategy

The repository contains material Haiti operational evidence: Haiti medication/lab/imaging catalogs,
geographic department/commune references, notifiable-disease reporting, and MSPP national roles and
review/audit workflows. These may become governed mapping inputs. They do **not** prove an MSPP FHIR
profile, national endpoint, patient/provider identifier namespace, required ValueSet, or exchange
contract. The similarly named Dominican **MISPAS** and Haitian **MSPP** authorities must never be
conflated.

**HAITI-SPECIFIC FHIR PROFILE: PENDING AUTHORITY/IMPLEMENTATION-GUIDE CONFIRMATION**

Until an MSPP artifact is verified, Haiti catalog codes remain correctly identified local Medora
codes unless they have a separately governed ICD-10, LOINC, RxNorm, UCUM, or other authoritative
mapping. National public-health access also remains separate from ordinary facility-scoped FHIR
clinical access; an `MSPP_*` role is not implicitly a FHIR scope or a cross-facility FHIR grant.

### 15.5 Bounded jurisdiction configuration

Create a versioned `JurisdictionProfileRegistry`, loaded from reviewed configuration/packages, with:

* jurisdiction and deployment/facility applicability, package ID, canonical URL, semantic version,
  publication/effective/retirement dates, authority/source, status, and artifact checksum;
* resource profile URLs, required/allowed extensions, terminology/value-set bindings, identifier
  namespaces, supported interactions/search parameters, and validation severity policy;
* capability fragments and SMART/security metadata that are enabled only after implementation and
  conformance evidence; and
* deterministic precedence: FHIR R4 base → Medora Core → one or more explicitly compatible
  jurisdiction/deployment profiles. Startup fails closed on unknown, conflicting, expired, or
  incompatible profile versions rather than silently falling back.

Shared resource services produce a Medora Core projection/command. A profile pipeline then applies
pure, bounded serialization constraints/extensions and validation. Terminology and identifiers use
registries/resolvers injected by profile context. Clinical workflow authorization and facility
isolation remain common and cannot be weakened by a profile. Never accept a request-supplied country
as authority; resolve jurisdiction from server-owned facility/deployment configuration and reject
header/query/body conflicts.

### 15.6 Terminology and identifier variation

The common layer preserves original coding and verified mappings. Jurisdiction packages select
required ValueSets and displays without changing the canonical clinical fact. U.S. may require
versioned US Core/USCDI bindings and verified NPI/terminology use; Dominican and Haitian national
identifiers/terminologies remain pending. Identifier systems must be canonical URIs scoped to the
issuing authority/facility and must never be guessed from a country's name. Cross-country duplicate
values do not match unless issuer/system is identical and authorized. Patient matching remains a
reviewed canonical workflow, never a profile-side merge.

### 15.7 CapabilityStatement and validation differences

There is one server implementation but CapabilityStatements may differ by deployment/profile
context. `/fhir/metadata` must represent the effective intersection of implemented base capability,
enabled jurisdiction package, facility policy, and deployed version—not a union of every country.
Canonical/profile URLs and security declarations are included only when their exact version is
active and tested. A Haitian deployment must not advertise US Core; a U.S. deployment must not
advertise unimplemented SMART; a multinational gateway must expose an unambiguous configured base
or tenant discovery mechanism rather than choose country from an untrusted query parameter.

Validation runs in ordered stages: base R4 structure, Medora Core invariants, effective
jurisdiction profile, terminology bindings, reference/facility checks, then canonical workflow
rules. OperationOutcome identifies the failed layer using safe issue codes without leaking PHI or
internal package paths. Golden examples and negative conformance suites are pinned per profile
version; a package upgrade is a reviewed release with regression evidence, not an automatic fetch.

### 15.8 Future-country extensibility and divergence risks

Canada, CARICOM, France, or another country is added by registering a versioned package and
configuration—not forking controllers, mappers, services, or clinical tables. Compatibility tests
must prove that adding one country does not change another country's serialization, validation,
search, CapabilityStatement, or authorization behavior.

Primary divergence risks are duplicated mappers, contradictory required cardinalities/extensions,
terminology licensing/version drift, identifier collisions, country inferred from patient data,
capability over-advertising, validator-package supply-chain compromise, configuration drift between
instances, and national reporting roles accidentally bypassing facility isolation. Controls are a
single Medora Core mapping, explicit precedence/conflict detection, signed/checksummed pinned
packages, issuer-qualified identifiers, server-owned jurisdiction context, per-profile contract
tests, and fail-closed startup/deployment gates.

## 16. Performance and abuse controls

The application has `@nestjs/throttler`, but its global registration is a permissive 10,000/minute
default and no global throttler guard or FHIR-specific guard is evident. Current JSON body limit is
50 MB, excessive for ordinary FHIR resource writes. Before exposure:

* apply a FHIR guard with per-client/user + facility + IP token buckets; start near 120 reads/min,
  30 searches/min, and 10 proposal writes/min, then tune from measured traffic;
* enforce 1 MB per single-resource request initially; bundles are unsupported for writes;
* cap `_count` at 100, result bytes (for example 5 MB), query length/parameter repetitions,
  reference count, JSON nesting depth, and parser CPU time;
* use indexed allowlisted search plans, 10-second DB/request timeout, bounded date ranges, stable
  keyset pagination, cancellation, and 429/503 sanitized outcomes;
* reject unbounded cross-resource extraction and unsupported `_include`/`_revinclude`; use P0.2 for
  approved organization export.

Exact production rates are deployment policy, not a conformance claim; multi-instance enforcement
needs a shared rate-limit store or gateway.

## 17. Threat model

| Threat | Planned control | Evidence test |
|---|---|---|
| Cross-facility access | Resolve all resources/references with authorized facility; indistinguishable 404 | FHIR-041–045 |
| ID enumeration | UUIDs plus identical absent/foreign outcomes, rate limit, no foreign totals | FHIR-046–048 |
| Excessive search/bulk PHI extraction | selective allowlist, count/date/byte caps, complexity budget, P0.2 separation | FHIR-020–026, 081 |
| Malformed or deeply recursive JSON | streaming/body byte cap, depth/reference cap, R4 + semantic validation | FHIR-050–054 |
| Oversized payload | FHIR-specific 413 before application parsing/persistence | FHIR-055 |
| Unsupported/foreign references | type allowlist and same-facility resolution | FHIR-056–058 |
| External identifier collision | client/facility/source namespace, DB uniqueness, reconciliation/409 | FHIR-049, 059 |
| Replay/duplicate writes | idempotency key + payload hash + expiry; atomic prior-result lookup | FHIR-060–063 |
| Privilege escalation | distinct read/propose scopes, active client/membership, canonical workflow role checks | FHIR-033–040, 064 |
| Forged/conflicting facility context | authenticated facility binding; reject header/query/body/token conflict | FHIR-038–040 |
| Stale/lost update | mandatory `If-Match`, canonical version in transaction, 412 | FHIR-070–073 |
| Audit bypass/failure | interceptor/service failure audit; write and critical audit in one transaction/fail closed | FHIR-074–078 |
| PHI in logs | structured scalar allowlist; no bodies/search values/secrets; log-capture tests | FHIR-079–080 |
| Error leakage | FHIR exception filter and hostile Prisma/parser fixtures | FHIR-027–032 |
| Expensive-search DoS | indexed parameters, plan/complexity caps, timeouts, shared throttling | FHIR-022–026, 081–083 |
| Transaction bundle abuse | no transaction/batch routing or advertised interaction | FHIR-084–085 |
| Unauthorized clinical mutation | no generic CRUD; proposal/review + canonical service + transactional audit | FHIR-064–069 |
| Signed-record rewrite | immutable snapshot/addendum rules; reject PUT/patch against signed content | FHIR-066–069 |
| Secret theft/rotation failure | hash-only M2M secrets, one-time display, short tokens, revoke/rotate | FHIR-034–037 |
| Audit-event/payload exfiltration | no AuditEvent exposure; minimum Provenance; field-level tests | FHIR-077–080 |

## 18. Dedicated test architecture

Tests must use the identifiers below in names/evidence. Unit tests cover deterministic mappers and
validators; integration tests use Prisma test data; real E2E starts NestJS and traverses actual JWT
or M2M authentication, real role/scope guards, facility membership, services, and a disposable
PostgreSQL database. No allow-all mocked guards satisfy security acceptance.

| IDs | Coverage |
|---|---|
| FHIR-001–009 | R4 serialization/mapping for Patient, Encounter, actors/facility, vitals, orders/results, medication, documents/Provenance; absent-data behavior |
| FHIR-010–019 | outgoing schema validation, coding/unit accuracy, semantic validation, stable IDs/references, terminology provenance |
| FHIR-020–026 | allowlisted search, unknown/repeated params, date/complexity/count caps, deterministic cursor pagination and links |
| FHIR-027–032 | `OperationOutcome`, status mapping, malformed JSON, 404 indistinguishability, error/stack/Prisma/secret sanitization |
| FHIR-033–040 | human JWT, session/revocation, machine credentials/rotation, scopes, roles, conflicting/forged facility context |
| FHIR-041–045 | Facility A denied Facility B Patient, Encounter, Observation/result/order/document through real guarded E2E |
| FHIR-046–049 | enumeration resistance and logical/external identifier collision attacks |
| FHIR-050–059 | inbound R4/schema/semantic validation, size/depth/reference attacks, cross-tenant links, duplicates |
| FHIR-060–063 | replay/idempotency same/different payload and concurrent duplicate delivery |
| FHIR-064–069 | write authorization, human review, canonical workflow preservation, MAR denial, immutable signed version/addendum protection |
| FHIR-070–073 | `meta`, ETag, `If-Match`, stale/concurrent update handling |
| FHIR-074–080 | success/failure audit attribution, fail-closed atomic write audit, Provenance separation, PHI-safe logs |
| FHIR-081–085 | rate/timeout/complexity enforcement and rejected batch/transaction/history |
| FHIR-086–090 | CapabilityStatement exactly matches live routes/search/interaction and effective jurisdiction registry; no SMART/US Core/national-profile overclaim |
| FHIR-091–094 | U.S./Dominican/Haiti profile-version selection, ordered validation, identifier/terminology isolation, and fail-closed profile conflict tests |
| FHIR-095–099 | full real NestJS/PostgreSQL regression across supported resources, cross-country non-divergence, and P0.1/P0.2 non-regression |

## 19. Implementation sequence

* **P0.3A — foundation/security contract:** capability registry; FHIR media negotiation and
  `OperationOutcome` filter; strict request/query limits; logical-ID/reference/tenant resolver;
  authorization policy; versioned jurisdiction profile registry; authority/version/applicability
  evidence matrix for U.S. US Core/USCDI/SMART, Dominican MISPAS/RNSIS, and Haitian MSPP; no new
  clinical writes. Add FHIR-001–019 and 027–032.
* **P0.3B — core read/search:** Patient, Encounter, Organization, Location, Practitioner, and
  PractitionerRole mappers/read/search with minimum disclosure, facility scope, and mapping tests.
* **P0.3C — clinical read/search:** timestamped Observation, DiagnosticReport/ServiceRequest,
  AllergyIntolerance, Condition, MedicationRequest/Administration, DocumentReference, CarePlan and
  narrowly supported Provenance, each from canonical sources only.
* **P0.3D — protocol contract:** accurate `/fhir/metadata`, complete searchset Bundles, opaque
  keyset pagination, `meta`/ETag for reads, strict unknown-search behavior, and media/error hardening.
* **P0.3E — M2M identity/scopes:** integration client and hash-only rotatable credential migration,
  token issuance/revocation, facility and least-privilege scopes, distributed rate limits, audit
  attribution. Still no clinical writes.
* **P0.3F — controlled inbound proposals:** implement only separately approved candidate resources,
  with staging/reconciliation, idempotency, human review, canonical workflow calls, `If-Match`, and
  transactional audit. MedicationAdministration and DELETE remain unsupported.
* **P0.3G — audit/Provenance/concurrency/terminology hardening:** close mapping gaps, verified
  terminology versions, signature/correction Provenance, failure audit, PHI-log evidence, and
  concurrency certification.
* **P0.3H — real guarded tenant/security E2E:** Facility A/B matrix, real JWT/M2M auth and DB
  memberships, hostile inputs, replay/concurrency/load limits, and no mocked authorization.
* **P0.3I — final regression/evidence/closure:** run builds, Prisma validation, full tests and
  P0.1/P0.2 regression; reconcile CapabilityStatement to live behavior; security review, runbook,
  deployment gates, and evidence report. Only this phase may recommend production activation.

## 20. Known limitations and acceptance gate

1. Only Patient and Encounter instance reads and vital Observation read/search exist.
2. Output is a handwritten subset and is not normatively validated.
3. There is no CapabilityStatement, OperationOutcome, multinational profile registry, or M2M identity.
4. Search and Bundle pagination are not production-capable.
5. Current Observation history/effective-time semantics are insufficient.
6. Current audit is useful but does not meet the complete FHIR access/failure attribution contract.
7. The 50 MB global JSON limit and permissive throttling are inappropriate for the FHIR edge.
8. The feature flag is documented as reserved but does not gate the registered read endpoints.
9. No existing dedicated FHIR tests were found.
10. Remote `main` advancement, branch push, and hosted PR publication could not be completed in
    this no-remote checkout; PR title/body metadata was prepared for the repository operator.
11. Current official US Core, USCDI, and SMART releases could not be verified because this execution
    environment denied outbound access to official HL7 and HealthIT.gov sites; version and legal
    applicability confirmation is a P0.3A gate, not a guessed Phase 0 claim.

The canonical mapping, current FHIR code, facility isolation, target authorization, inbound-write
policy, and P0.1/P0.2 boundary are sufficiently understood to begin foundation work. No conflict
requires changing canonical clinical semantics. P0.3A should begin only on an up-to-date main and
must not enable inbound clinical writes.

**MEDORA.RD.P0.3 PHASE 0: ARCHITECTURE AUDIT COMPLETE / IMPLEMENTATION PENDING**  
**SAFE TO BEGIN P0.3A: YES**, subject to confirming remote-main parity and retaining the no-write
gate.

> **P0.3A implementation update (2026-09-08):** the foundation/security contract, generated
> CapabilityStatement, strict FHIR error/query boundary, server-owned jurisdiction registry, and
> protocol-neutral Administration Integrations configuration foundation are implemented on the
> P0.3A branch. Machine credentials, normative profile validation, clinical expansion and all
> inbound clinical writes remain deferred. See
> `MEDORA_RD_P0_3A_FHIR_FOUNDATION_EVIDENCE.md` for evidence and limitations.

## P0.3B administrative read/search addendum (2026-09-09)

P0.3B adds registry-governed, facility-scoped read/search for Patient, Encounter,
Practitioner, PractitionerRole, Organization, and Department-backed Location. It also adds a
central reference resolver, shared bounded keyset search/Bundle foundation, server-owned public
FHIR base URL, no-store resource caching, and integration-permission synchronization. No write,
history, transaction, batch, national profile, or U.S. Core conformance is advertised. Detailed
evidence: `MEDORA_RD_P0_3B_FHIR_ADMINISTRATIVE_RESOURCE_EVIDENCE.md`.

### PR #233 final security correction status

The correction pass replaces wildcard administrative routing with four explicit capability-bound
controllers, centralizes strict typed relative-reference parsing, and adds real PostgreSQL tenant,
reference, routing, error, pagination, and no-write E2E evidence. Local verification passed 18 suites
and 182 tests plus API/Web builds and Prisma validation/deployment. Status remains **CI PENDING**;
this audit does not declare the PR merged or independently approved.
