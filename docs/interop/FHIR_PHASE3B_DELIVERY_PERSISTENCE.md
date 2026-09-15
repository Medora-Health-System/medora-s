# FHIR Phase 3B — durable diagnostic delivery persistence

This slice persists the operational lifecycle required before Medora enables outbound PHI dispatch for laboratory and radiology ServiceRequests.

## Persistence boundary

`DiagnosticOutboundDelivery` stores only routing/lifecycle evidence: integration, facility, order-item identity, deterministic idempotency key, LAB/RADIOLOGY domain, state, bounded attempt count, retry timing, acknowledgement timing, HTTP status, opaque partner correlation ID and failure class.

The table intentionally does **not** store the FHIR ServiceRequest body, patient demographics, clinical narrative, access tokens, private keys, client secrets or partner credentials.

## Integrity controls

- one durable delivery identity per integration + facility + order item
- globally unique idempotency key
- attempt count database constraint: 0–5
- state/domain database constraints
- acknowledgement updates require matching delivery + integration + facility
- only 2xx responses may be persisted as acknowledged
- acknowledged/dead-letter/permanent-failure rows cannot be acknowledged again
- retry indexes support bounded worker polling without weakening facility isolation
- foreign keys prevent orphan integration/facility/order-item delivery records

## Gate

This persistence does not enable network dispatch. The next slice must add authenticated PRIVATE_KEY_JWT/mTLS transport adapters and use this durable record for dispatch/retry/acknowledgement transitions. Sandbox certification remains required before real PHI transmission.
