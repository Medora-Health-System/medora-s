# FHIR Phase 3B — Durable diagnostic delivery gate

This slice extends outbound diagnostic `ServiceRequest` preparation with the lifecycle rules required before network dispatch is enabled.

## Delivery lifecycle

`prepared -> dispatched -> acknowledged`

Transient transport/partner failures become `retryable_failure` and reuse the original idempotency key. Retry is bounded to five attempts with exponential backoff (30s initial, capped at 15 minutes). Exhausted transient failures become `dead_lettered`. Permanent partner rejection becomes `permanent_failure` and is not automatically retried.

## Safety requirements

- Every attempt remains bound to integration + facility + order item + idempotency key.
- Acknowledgement cannot be applied across integration or facility boundaries.
- Production transport fails closed without configured authentication.
- Raw ServiceRequest bodies, patient demographics, result narrative, secrets and tokens are prohibited from operational audit metadata.
- Authentication failures are permanent failures until configuration is corrected; they are not blindly retried.
- Network failures and HTTP 408/425/429/500/502/503/504 are transient.
- Retry never creates a new logical order identity.

## Remaining implementation before PHI dispatch

The next slice must add durable database persistence for delivery attempts and partner acknowledgement correlation, followed by authenticated PRIVATE_KEY_JWT/mTLS adapters. Network dispatch remains disabled until persistence, credential resolution, audit evidence and sandbox certification are all present.
