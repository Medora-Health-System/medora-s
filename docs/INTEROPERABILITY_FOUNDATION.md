# Medora-S — Interoperability foundation (Phase 11B)

**Status:** architecture, contracts, and safety policy only. **No** live HL7 listeners, FHIR servers, device feeds, or auto-filing of external clinical data.

This document anchors the **next maturity bottleneck** after pilot hardening: connecting Medora to the external healthcare ecosystem **without** compromising chart integrity, identity safety, or PHI boundaries.

**Related code today**

| Area | Location | Role |
|------|----------|------|
| **Outbound / billing** | `apps/api/src/billing/*`, `external-billing-export.service.ts`, `queues` | Claim build, X12, clearinghouse ack **webhook** (`clearinghouse-ack-webhook.controller.ts`), vendor webhook delivery — **facility-scoped / audited**, not generic HL7. |
| **Read-only FHIR** | `apps/api/src/fhir/*`, `apps/api/src/fhir-mapper/*` | Maps **internal** `Patient`, `Encounter`, vitals JSON → FHIR R4 JSON for **export/read** (e.g. `mapVitalsJsonToObservations`). Not an inbound FHIR server. |
| **Clinical SoT** | `apps/api/prisma/schema.prisma` | `Patient`, `Encounter`, `Order` / `OrderItem`, `Result`, `Triage`, `TriageVitalsReading`, `EncounterClinicalEvent` (append-only events). |
| **Audit** | `AuditLog`, `AuditAction`, `apps/api/src/common/services/audit.service.ts` | All integration paths must extend this model — **PHI-safe metadata** only unless explicitly storing clinical payloads under retention policy. |
| **Public health** | `apps/api/src/public-health/*` | Facility/governance-bound reporting — **not** a generic ADT feed. |
| **ROI** | `ChartRoiRequest`, chart export snapshots | Governed **release** of records — distinct from **ingestion**. |

**TypeScript contracts (Phase 11B)** — `apps/api/src/interop/*`: language-only shapes for **future** inbound adapters (`External*Draft`, `IntegrationIngestionStatus`). **No** Prisma models or persistence for these drafts in 11B.

---

## 1. Integration principles

1. **Medora remains source of truth** for the legal chart until a clinician (or explicitly scoped automation policy) **accepts** external-derived content.
2. **Inbound** clinical data (labs, imaging narratives, vitals from devices, ADT hints) enters as **pending review** — never silently overwrites `Result`, `Encounter`, or `Patient`.
3. **Outbound** (claims, structured exports, FHIR read views) is derived from SoT and existing audit patterns.
4. **Facility scope** — every integration action is tied to `facilityId` (and patient/encounter where applicable); no cross-tenant shortcuts.
5. **Append-only clinical narrative** where the product already uses append-only semantics (`EncounterClinicalEvent`, `OrderEvent`, `TriageVitalsReading` pattern) — external acceptance should **add** evidence, not rewrite history without policy.
6. **Interface engine assumption** (Mirth Connect, Rhapsody, etc.): Medora exposes **small, authenticated HTTP APIs** or **explicit file drops** behind the engine; the engine owns retry, transformation, and queueing. Medora does **not** embed a full integration broker in Phase 11B.

---

## 2. HL7 / FHIR mapping overview (conceptual)

Mappings are **directional hints** for future adapters — not active transforms in production for inbound HL7.

### 2.1 HL7 v2 (future inbound)

| HL7 message | Typical intent | Medora SoT anchor (future) |
|-------------|----------------|----------------------------|
| **ADT** (A01/A02/A04/A08/A11…) | Visit/patient admin | `Patient` + `Encounter` lifecycle; **never** auto-merge patients on external PID alone. |
| **ORM** | Order placer | `Order` / `OrderItem` — correlate by placer order number + facility, then **pending review** queue. |
| **ORU** | Results (OBX) | `Result` on `OrderItem` — correlate by filler/placer + OBX identifiers; **pending review** before `RESULT_VERIFY` / chart filing. |

### 2.2 FHIR R4 (future inbound / already partial outbound-read)

| FHIR resource | Medora model today | Notes |
|---------------|-------------------|--------|
| **Patient** | `Patient` | Read mapping: `patient-to-fhir.mapper.ts`. Inbound: match candidates only; **no auto-merge**. |
| **Encounter** | `Encounter` | Read: `encounter-to-fhir.mapper.ts`. Inbound ADT maps to encounter workflow state with human reconciliation. |
| **Observation** | Vitals JSON, triage vitals | Read: `vitals-to-observation.mapper.ts`. Device vitals: must carry **provenance** (`DEVICE` / pending / validated). |
| **DiagnosticReport** | Imaging/lab narrative (future) | Today: `Result.resultText` / `resultData` — inbound narrative **pending review** before legal filing. |
| **ServiceRequest** | `Order` / `OrderItem` | Future placer intent; correlate to existing orders or create **draft** order pending approval. |

---

## 3. Device vitals ingestion (future design)

- **Raw device streams** are not stored in `AuditLog.metadata` or operational logs.
- Normalised values may become **`ExternalObservationDraft`** (contract) → UI queue **pending review** → on accept, append as clinician-attested vitals (e.g. new `EncounterClinicalEvent` or triage reading per product rules — **deferred implementation**).
- **Provenance:** `sourceKind: "DEVICE"`, vendor id, device id (non-PHI where possible), effective time, correlation id.
- **Never** auto-overwrite `Patient.latestVitalsJson` from device alone without validation policy.

---

## 4. Lab / radiology result feeds (future design)

- **ORU / FHIR DiagnosticReport** payloads contain PHI — store only under **explicit retention** tables/policies (not Phase 11B).
- Correlation: `OrderItem.id` / accession / placer-filler pairs + facility.
- Lifecycle: **received → parsed → pending_clinical_review → accepted | rejected** (`IntegrationIngestionStatus` in contracts).
- **Radiology reports** and **structured lab panels**: same rule — **human review** before chart-legal state (`RESULT_VERIFY`, acknowledgment flows already reflect human attestation in current product).

---

## 5. Human-review rules (must not auto-file)

| Data type | Rule |
|-----------|------|
| **Device vitals** | Pending until clinician validates (or future policy engine explicitly scoped). |
| **External lab results** | Pending until lab/clinical role confirms mapping to the correct `OrderItem` and content. |
| **Radiology reports** | Pending until radiology/clinical workflow matches imaging `OrderItem` / encounter. |
| **Patient identity** | **No auto-merge** from external MRN/PID; match suggestions only (`ExternalPatientIdentityHint` contract). |
| **ADT create patient** | **No** auto-create `Patient` from ADT in MVP/foundation; registration remains a controlled Medora workflow unless sponsor-approved policy exists. |

---

## 6. Audit rules for integration failures

Log and audit (with **PHI-safe metadata**):

- Parse failures (schema, segment, FHIR validation).
- Correlation failures (unknown patient, unknown order, duplicate message id).
- Technical delivery failures (HTTP 5xx from vendor, timeout) — align with existing **external billing export** audit patterns (`EXTERNAL_BILLING_EXPORT` / `EXTERNAL_BILLING_AUTO_EXPORT` entity types) as a **template** for future `INTEGRATION_*` entity types when implemented.
- **Rejected** clinical proposals — reason code + actor id, **no** raw OBX text in metadata.

Use `AuditService` with `critical: true` only when the action would have mutated SoT without review (should not occur in 11B).

---

## 7. PHI-safe logging rules

- **Allowed in logs / audit metadata:** correlation ids, message control ids, HL7 message type, FHIR resource type + id (internal), facility id, encounter id **if** policy allows (prefer opaque internal ids), error class, counts, timing.
- **Forbidden by default:** patient name, DOB, MRN, national id, free-text clinical content, full payloads, webhook secrets, tokens.
- Use **`sanitizeIntegrationAuditMetadata`** (`apps/api/src/interop/integration-metadata-sanitize.ts`) as the reference allowlist for **stub** metadata until dedicated services exist.

---

## 8. Downtime / replay / reconciliation

- **Idempotency:** inbound adapters must key on **external message id** + source system + facility to suppress duplicates on replay.
- **Ordering:** HL7/FHIR feeds may arrive out of order — state machines must tolerate late messages (e.g. result before order) via **pending** queues.
- **Replay:** after downtime, engine or Medora replays from last acknowledged offset — **reconciliation** job compares external queue depth vs Medora accepted count (future operational metric).
- **Conflict:** if SoT changed after an external message was generated, **reject** or **re-review**; never silent overwrite.

---

## 9. Facility-level integration settings (later)

Examples for future `Facility` JSON or dedicated tables (not in 11B schema):

- Enabled interfaces (lab vendor id, imaging vendor id).
- Allowed inbound message types.
- Auto-route to department queue vs always manual review.
- **MEDORA_INTEROP_ENABLED** — reserved env flag; must remain **false** / unset until adapters and UI are shipped (see `docs/ENV_PRODUCTION_CHECKLIST.md`).

---

## 10. Phase 11B deliverables vs deferred

| Delivered now | Deferred |
|---------------|----------|
| This document + env checklist note | HL7 listener, Mirth-specific code |
| TS contracts + metadata sanitizer + unit tests | DB tables for staging payloads |
| Explicit safety policy | FHIR server, Subscription, bulk import |
| | Auto-file results, auto-merge patients |
| | Multi-tenant clearinghouse beyond current billing scope |

---

## 11. Verification

- `pnpm run verify:api`
- `pnpm --filter @medora/api exec jest --testPathPattern=interop`

No migration for Phase 11B contracts-only work.
