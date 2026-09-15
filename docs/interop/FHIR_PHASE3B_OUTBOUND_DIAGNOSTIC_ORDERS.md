# FHIR Phase 3B — Outbound diagnostic orders

Phase 3B begins the outbound half of bidirectional Lab/Radiology interoperability.

## Implemented in this slice

- Resolves a canonical Medora diagnostic `OrderItem` (`LAB_TEST` or `IMAGING_STUDY`).
- Reuses the governed FHIR R4 `ServiceRequest` projection already exposed by the read surface.
- Requires an active/provisioned FHIR integration with direction `OUTBOUND` or `BIDIRECTIONAL`.
- Requires an explicit active facility authorization for the integration.
- Requires `serviceRequest.read` in the integration permission boundary before export preparation.
- Requires an explicit partner FHIR base URL and transport authentication policy.
- Refuses unauthenticated production outbound exchange.
- Produces a deterministic SHA-256 idempotency key for safe retry of the same logical order projection.
- Emits PHI-minimized audit evidence `FHIR_DIAGNOSTIC_ORDER_PREPARED`; the FHIR payload and clinical code are not copied into audit metadata.
- Registers `FhirDiagnosticOutboundService` in `FhirModule` for use by the delivery worker/controller added in the next Phase 3B slice.

## Deliberately not yet enabled

This slice does **not** perform a network POST to a partner. Production dispatch remains blocked until durable delivery-attempt persistence and an authenticated transport adapter (mTLS or private-key JWT) are in place. Medora does not silently fall back to unauthenticated delivery.

## Next Phase 3B slice

1. Add durable outbound delivery-attempt persistence and unique idempotency enforcement.
2. Add authenticated transport adapters for configured partner FHIR endpoints.
3. POST `ServiceRequest` using `application/fhir+json` and the same idempotency key on retry.
4. Record acknowledgement/failure metadata without storing response PHI in audit logs.
5. Add bounded exponential retry and terminal-failure handling.
6. Add sandbox delivery certification before enabling production dispatch.
