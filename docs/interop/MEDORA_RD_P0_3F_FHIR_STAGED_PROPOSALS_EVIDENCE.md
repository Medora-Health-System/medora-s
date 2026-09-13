# MEDORA.RD.P0.3F — staged inbound FHIR proposals

**Phase:** MEDORA.RD.P0.3F  
**Scope:** machine-authenticated, tenant-bound staging of selected inbound clinical proposals  
**Canonical clinical writes:** **NOT ENABLED**  
**Human review:** **MANDATORY**  
**Runtime exposure gate:** `MEDORA_INTEROP_ENABLED=true`

## 1. Purpose

P0.3F introduces the first controlled inbound clinical path without turning FHIR into a second clinical system of record. External systems may submit a narrowly validated proposal for later Medora review; the proposal is not inserted into `Diagnosis`, `Order`, `OrderItem`, `Result`, `TriageVitalsReading`, or any other canonical clinical table.

The only new runtime operation is:

`POST /fhir/$propose`

It is intentionally a Medora-controlled operation rather than generic FHIR `create` or `update`. `/fhir/metadata` therefore continues to advertise the production READ/SEARCH interactions only. No POST/PUT/PATCH/DELETE interaction is added to the ordinary resource controllers.

## 2. Approved proposal resources

The initial staging contract is intentionally small:

- `Observation` — one bounded coded quantitative observation with patient, optional encounter, status, and effective time;
- `Condition` — coded condition with patient, optional encounter, and bounded status/date metadata;
- `ServiceRequest` — coded request proposal with patient, optional encounter, status/intent, and authored time;
- `DiagnosticReport` — bounded report metadata/conclusion with patient, optional encounter, and optional tenant-validated `basedOn` ServiceRequest references.

`DiagnosticReport.presentedForm`, arbitrary attachments, binary payloads, broad extension bags, and unknown keys are rejected. AllergyIntolerance, MedicationRequest, DocumentReference, Patient/Encounter writes, CarePlan writes, and all DELETE semantics remain outside this phase.

## 3. Authorization

Only the `fhir-client` machine Passport strategy can reach `$propose`. Human staff JWTs do not use this endpoint.

Each resource requires its own grant:

- `observation.propose`
- `condition.propose`
- `serviceRequest.propose`
- `diagnosticReport.propose`

These grants are available to the Integration administration permission picker but are **not** FHIR capability interactions and are not advertised as `create` or `update` in the CapabilityStatement.

The machine token is still subject to the P0.3E checks: active client, active credential, active facility authorization, current integration permission, exact client scope, integration provisioning state, short token lifetime, and distributed request limits.

## 4. Tenant and reference validation

The facility comes only from the validated machine principal. `x-facility-id` cannot switch it.

Before staging, Medora verifies:

1. `subject.reference` is a local `Patient/{id}` reference;
2. that patient exists in the machine client's facility;
3. any `encounter.reference` is a local `Encounter/{id}` in the same facility and belongs to the same patient;
4. any DiagnosticReport `basedOn` reference is a same-tenant ServiceRequest/OrderItem for that patient.

Missing and foreign references return an indistinguishable not-found response path. No cross-facility proposal can be staged.

## 5. Storage and human-review boundary

Validated proposals are stored in `interop.FhirInboundProposal`, isolated from canonical clinical tables. The row contains the validated bounded proposal JSON, server-resolved source-system identity, machine client/integration/facility identity, patient/encounter references, status, timestamps, and a SHA-256 request fingerprint.

New rows are always `PENDING_REVIEW`. The database restricts the initial proposal table to four approved resource types and review-only states. P0.3F intentionally provides no operation that converts a staged row into a canonical chart mutation. A later explicitly approved workflow must call the relevant canonical Medora service and preserve its safety, terminology, lifecycle, signing, and concurrency invariants.

## 6. Idempotency

The deduplication identity is:

`(facilityId, integrationClientId, sourceSystem, externalMessageId, resourceType)`

The source-system identifier is derived from the authenticated IntegrationClient/Integration configuration, not trusted from request input.

The validated request is canonicalized and fingerprinted with SHA-256.

- same identity + same fingerprint → returns the existing proposal with `duplicate=true`;
- same identity + different fingerprint → HTTP 409 conflict;
- concurrent duplicate inserts are serialized by the database unique constraint and `ON CONFLICT DO NOTHING` handling.

This prevents replay from producing multiple review items while also preventing an external sender from silently changing the meaning of a previously used message identifier.

## 7. Audit atomicity

For a new proposal, the staging insert and critical `FHIR_INBOUND_PROPOSAL` audit row execute inside the same Prisma transaction. `AuditService.log(..., { tx })` means an audit persistence failure aborts the transaction regardless of global best-effort audit configuration.

Audit metadata contains machine/integration/resource/source identity, a truncated hash of the external message ID, and review status. It does not copy clinical values or the staged payload into audit metadata.

## 8. Response

Successful staging returns HTTP 202 with a FHIR `Parameters` resource containing:

- proposal ID;
- proposed resource type;
- current status (`PENDING_REVIEW`);
- creation timestamp;
- duplicate flag;
- `humanReviewRequired=true`.

The response is not a canonical clinical resource and does not imply acceptance, verification, signing, or chart filing.

## 9. Tests and release gates

`fhir-inbound-proposal.spec.ts` proves the bounded proposal schemas reject unknown/high-risk fields and that proposal grants do not become FHIR create/update capabilities.

Hosted release gates remain authoritative for migration deployment, API typecheck/build, web typecheck/build, facility isolation, RBAC, existing FHIR tests, P0.3E machine-security behavior, Verify, and Medication Validation. No P0.3F claim should be treated as production-ready until those gates are green on the exact hosted head.
