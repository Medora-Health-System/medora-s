# FHIR Phase 2 Final Deployed Certification

## Purpose

This is Medora's internal deployed acceptance gate for the final Phase 2 expanded read-only FHIR R4 surface. It does not claim US Core, SMART, ONC, or third-party certification.

## Prerequisites

Use a dedicated non-production-partner certification integration bound to a test facility. The deployed machine client must explicitly contain:

- `documentReference.read`
- `documentReference.search`
- `provenance.read`
- `provenance.search`

The certification facility must contain at least one governed FHIR-eligible DocumentReference and at least one integrity-valid signed provider-documentation version eligible for Provenance projection. Do not use a live external partner credential.

## Automated acceptance checks

The workflow `FHIR Phase 2 Final Deployed Certification` verifies:

1. wrong-facility token issuance is rejected;
2. a non-existent write scope is rejected;
3. DocumentReference search returns a FHIR Bundle/searchset;
4. a returned DocumentReference can be read directly with an exact read scope;
5. DocumentReference read and search scopes cannot substitute for each other;
6. conflicting facility context is rejected;
7. Provenance search returns a FHIR Bundle/searchset;
8. a returned Provenance can be read directly with an exact read scope;
9. Provenance read and search scopes cannot substitute for each other;
10. conflicting facility context is rejected;
11. DocumentReference and Provenance scopes cannot cross-authorize each other.

The harness does not print bearer tokens, client secrets, resource bodies, patient demographics, document titles, medication data, signed narrative, or logical resource identifiers.

## Required audit review

After an automated PASS, inspect Administration > Audit and verify the deployed requests produced PHI-minimized interoperability evidence with the expected integration/client, key, facility, action/outcome, timestamp, and request/correlation context. No secret, bearer token, signed narrative, document body, or patient demographic data may appear in audit metadata.

## Phase 2 completion criteria

Phase 2 is internally complete only when the deployed code includes AllergyIntolerance, MedicationRequest, MedicationAdministration, DocumentReference, and Provenance; the relevant machine scopes are explicitly synchronized; the prior medication deployed gate passes; this final deployed gate passes; tenant/scope negative controls pass; and audit evidence is reviewed.

After those conditions are satisfied, proceed to Phase 3 bidirectional Lab/Radiology interoperability. Phase 3 must introduce inbound mutation only through narrowly governed workflow endpoints with validation, idempotency, reconciliation, tenant isolation, audit, retry/dead-letter handling, and partner sandbox certification before any live partner onboarding.
