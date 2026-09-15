# FHIR Phase 3 — Bidirectional Lab & Radiology

## Phase 3A — exchange boundary and safety contract

Phase 3 moves Medora from read-only FHIR interoperability toward operational diagnostic exchange. It does **not** make arbitrary FHIR writes legal-chart writes.

### Direction

Outbound diagnostic orders are derived from Medora's canonical `Order` / `OrderItem` source of truth and represented as FHIR R4 `ServiceRequest`. Inbound partner status/results are authenticated, facility-bound proposals represented by `ServiceRequest`, `DiagnosticReport`, and `Observation` before governed acceptance.

### Non-negotiable invariants

1. Every exchange is facility scoped. Partner identifiers, accession numbers, patient identifiers, or order numbers never grant tenant access.
2. Medora remains the legal-chart source of truth until a governed human-review workflow accepts external clinical content.
3. Inbound results never silently overwrite an existing `Result`, encounter, patient, or latest clinical value.
4. Patient identity from an external partner is match evidence only; no automatic patient merge or creation.
5. Replay is idempotent on source + facility + external message identity. Duplicate delivery cannot duplicate chart content.
6. Late or out-of-order results remain reconcilable and pending; they are not discarded or force-filed.
7. Audit metadata is PHI-minimized. No raw FHIR body, narrative, patient name, DOB, MRN, secret, token, or result text is written to operational audit metadata.
8. Narrative lab/radiology content always requires governed review before chart-legal filing.
9. Partner-specific transformation belongs behind an adapter boundary; Medora's clinical domain does not become vendor-specific.
10. No generic `fhir.*` scope and no unrestricted FHIR create/update/patch/delete capability.

### Planned implementation slices

- **3A — Exchange contract:** canonical correlation/idempotency vocabulary and safety invariants.
- **3B — Outbound orders:** facility-scoped ServiceRequest delivery, partner acknowledgement, retries, delivery audit.
- **3C — Inbound staging:** authenticated DiagnosticReport/Observation/status ingestion with duplicate suppression and quarantine for unresolved correlation.
- **3D — Clinical reconciliation:** lab/radiology review queues, order/patient/encounter matching, accept/reject, append-only filing through existing canonical workflows.
- **3E — Reliability:** retry/backoff, dead-letter handling, replay, reconciliation metrics and operational runbooks.
- **3F — Deployed sandbox certification:** positive/negative bidirectional tests, facility A/B isolation, duplicate/replay tests, audit evidence, downtime/recovery evidence.

### Certification boundary

A real laboratory or radiology partner must not be onboarded to production clinical exchange until Phase 3F passes against a dedicated sandbox/test integration. Internal Phase 3 certification is not a claim of US Core, SMART, or ONC certification.
