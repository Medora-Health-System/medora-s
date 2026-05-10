# Medora-S — Device & patient monitor integration architecture (Phase 11C)

**Status:** design, TypeScript contracts, and audit-metadata helper only. **No** live device listeners, webhooks, database tables, UI, workers, waveform storage, or automatic vitals filing.

**Depends on:** `docs/INTEROPERABILITY_FOUNDATION.md` (Phase 11B) — external data is **proposed**, not authoritative until human validation.

**Contracts & sanitizer:** `apps/api/src/interop/device-monitor.contracts.ts`, `device-monitor-metadata-sanitize.ts`.

---

## 1. Current vitals architecture (as implemented)

| Layer | Location | Role |
|-------|----------|------|
| **Current triage snapshot** | `Triage.vitalsJson` | Single row per encounter; updated on triage save. |
| **Append-only vitals history** | `TriageVitalsReading` | One row per non-empty vitals save from triage path; `recordedAt` server time. |
| **Encounter chart path** | `EncounterClinicalEvent` with `eventType: VITALS_RECORDED` | Payload `{ source, vitals }` via `buildVitalsRecordedPayloadJson` (`clinical-event-vitals.util.ts`). Sources today: `TRIAGE`, `ENCOUNTER_CHART`. |
| **Patient header cache** | `Patient.latestVitalsJson` / `latestVitalsAt` | Updated when triage saves non-empty vitals (not from device in current code). |
| **Vitals timeline API** | `encounters.service.ts` → `getVitalsHistory` | Merges `TriageVitalsReading` + non-`TRIAGE` `VITALS_RECORDED` events (dedupes triage-originated events). |
| **ER UI merge** | `apps/web/src/features/emergency/*` | Client merge into `vitalsJson` for triage PUT; canonical units via `@medora/shared`. |
| **FHIR read** | `vitals-to-observation.mapper.ts` | Export/read only from internal vitals JSON. |

**Invariant today:** every chart-legal vitals row flows through **authenticated user** actions (triage or encounter chart save), not through an integration pipe.

---

## 2. Supported future integration patterns (realistic paths)

| Pattern | Typical use | Medora boundary |
|---------|-------------|-----------------|
| **HL7 v2 ORU** | Monitor gateway emits OBX segments | Interface engine normalises → future authenticated **ingestion** API (not in 11C). |
| **FHIR R4 Observation bundle** | Hospital integration bus | Same — engine or adapter posts **draft** observations. |
| **HTTPS webhook** | Vendor cloud gateway | Signed requests, facility-scoped API keys, idempotency keys. |
| **Interface engine** (e.g. Mirth) | Transform, queue, retry | Engine owns transport; Medora exposes **small** POST endpoints when enabled. |
| **Vendor batch export** | Periodic file drop | Out-of-band to engine → same normalisation pipeline. |
| **Local bridge** | Serial/network in small ER | Bridge posts to engine or directly to Medora **staging** API — still **no** auto-chart. |

---

## 3. Recommended future architecture

```
[ Monitor / gateway / engine ]
        │  (HL7 / FHIR / JSON — PHI in payload)
        ▼
[ Adapter: parse, normalise, correlate ]
        │  DeviceObservationDraft + correlation hints
        ▼
[ Pending device observation store ]  ← future DB / queue (not Phase 11C)
        │  status: pending_clinical_review
        ▼
[ Nurse / clinician UI ] — match review, value sanity, stale/conflict flags
        │  DeviceObservationReviewDecision: ACCEPT | REJECT | DEFER
        ▼
[ Existing vitals write path ] — only on ACCEPT
        e.g. triage.service save OR dedicated service that:
          - creates TriageVitalsReading (if triage path)
          - creates EncounterClinicalEvent VITALS_RECORDED with source extended to include DEVICE + validator id
          - updates Patient.latestVitalsJson only as today’s triage path does (explicit policy)
```

**Landing zone (safest):**

1. **Pending queue** (future persistence) — holds `DeviceObservationDraft` + correlation + **no** write to `Triage` / `Patient.latestVitalsJson` until accept.
2. **On accept** — call the **same** semantics as human vitals entry: append `TriageVitalsReading` and/or `VITALS_RECORDED` with provenance in payload (future extension of `VitalsClinicalEventSource` or payload fields — **deferred**).
3. **Never** replace `Triage.vitalsJson` silently from device; nurse validation chooses merge vs replace policy in UI.

---

## 4. Representation mapping (contracts)

| Concept | Contract / future field | Notes |
|---------|-------------------------|--------|
| **Device id** | `deviceId` (opaque string) | Non-PHI preferred; still treat as sensitive in logs. |
| **Bed / room** | `bedId` / `roomId` (optional) | **Hints only** — never sole basis for patient assignment. |
| **Facility** | `facilityId` | Required for tenancy. |
| **Match confidence** | `DeviceMatchConfidence` | `HIGH` only after explicit rules + human confirm; default `UNKNOWN`/`LOW` from adapter. |
| **Device timestamp** | `deviceObservedAt` (ISO) | From payload; may drift from server. |
| **Received timestamp** | `receivedAt` (ISO) | Server time at adapter accept. |
| **Signal quality** | `DeviceSignalQuality` | Adapter-normalised; drives UI warnings, not auto-reject unless policy. |
| **Measurement type** | `DeviceMeasurementType` | e.g. HR, SPO2, NIBP_SYS — maps to internal `vitalsSchema` keys in a future mapper. |
| **Unit** | carried inside normalised draft per measurement (future) | Align with `@medora/shared` canonical units on accept. |
| **Source** | `DeviceSourceKind` = `DEVICE` | Distinct from `MANUAL` / `IMPORT_REPLAY`. |
| **Validation status** | `DeviceObservationStatus` | Pending → accepted/rejected/expired. |
| **Review decision** | `DeviceObservationReviewDecision` | Human outcome + reason code (no free-text PHI in audit metadata). |

Full TypeScript definitions: `device-monitor.contracts.ts`.

---

## 5. Nurse validation workflow (future)

1. **Queue:** list pending observations for facility, sorted by `receivedAt` / acuity.
2. **Match review:** show suggested `patientId` / `encounterId` + confidence; nurse confirms or reassigns — **no** auto-assign from room alone.
3. **Clinical review:** flag abnormal / stale / conflicting with last manual vitals; optional dose calculator / policy highlights (out of scope here).
4. **Accept:** triggers legal chart write through existing vitals pipeline; audit who accepted.
5. **Reject:** record reason code; optional retention of raw payload per **separate** PHI policy (not in metadata).
6. **Replay / duplicate:** idempotency on `(facilityId, deviceId, externalMessageId)`; duplicates **suppressed** with audit.

---

## 6. Provenance rules

- Every accepted chart row must record: **device id**, **adapter version**, **validator user id**, **deviceObservedAt**, **receivedAt**, **sourceKind = DEVICE** (in clinical payload or parallel metadata — implementation deferred).
- **Manual** vitals remain authoritative for conflicts until nurse merges — device must not overwrite without explicit accept action.

---

## 7. Safety gates (must never happen)

| Prohibited behaviour | Mitigation |
|---------------------|------------|
| Auto-overwrite manual vitals | Pending queue + explicit accept; merge logic in UI/service. |
| Auto-create encounter | Device feed only **proposes** correlation to **existing** open encounter (policy TBD). |
| Auto-assign patient by room/bed only | Room is a **hint**; human confirms patient + encounter. |
| Silent legal-chart filing | No write to `TriageVitalsReading` / `VITALS_RECORDED` without validated user action. |
| Raw waveform in audit/logs | Waveforms out of scope; separate storage + DLP if ever added. |
| PHI in operational `AuditLog.metadata` | Use `sanitizeDeviceObservationAuditMetadata` allowlist; full values only in controlled clinical stores. |

---

## 8. Reconciliation & downtime replay

- **Idempotency:** external message id + device id + facility.
- **Clock skew:** display device vs server time delta; warn if `deviceObservedAt` « last accepted reading or unreasonably future.
- **Replay after outage:** engine replays; Medora dedupes; stale messages may land in **DEFER** or **REJECT** with reason `REPLAY_STALE` (future enum extension).
- **Conflict:** if encounter closed or patient changed rooms, observation goes to **manual correlation** queue.

---

## 9. Audit metadata policy

- **Success path (technical):** received, parsed, queued — metadata via device sanitizer (no numeric vitals).
- **Accept:** audit action (future) with `patientId`/`encounterId` internal UUIDs only if policy allows; never names/MRN in metadata.
- **Reject:** reason code + optional non-PHI comment id.

Use `sanitizeDeviceObservationAuditMetadata` for stub/integration logs until a dedicated `AuditAction` set exists.

---

## 10. PHI logging rules

- **Never** log: patient name, MRN, national id, vitals numeric values, notes, raw HL7/FHIR body, waveforms.
- **May** log (operational): internal ids (if approved), device id, message id, status transitions, latency, error class.
- **Application logs:** follow structured logger patterns; default deny for payload dumps.

---

## 11. Vendor & interface engine assumptions

- Engine performs TLS, authentication to Medora, mapping OBX/Observation → `DeviceObservationDraft`.
- Medora does not run embedded Mirth; it consumes **normalised** events at the API edge.
- Facility enables device integration via future **facility integration settings** (deferred); env flag `MEDORA_INTEROP_ENABLED` remains documented as reserved until adapters ship (`docs/ENV_PRODUCTION_CHECKLIST.md`).

---

## 12. Risks & deferred work

| Risk | Mitigation |
|------|------------|
| Wrong-patient vitals | Human match + confidence UX; bed hint never sufficient alone. |
| Stale vitals on discharge | Encounter state checks before accept. |
| Volume / alarm storms | Rate limit per device; batch UI (future). |

**Deferred:** DB schema, APIs, UI, workers, waveform, vendor SDKs, auto-accept policies, extending `VitalsClinicalEventSource`, system-health probes for device connectivity.

---

## 13. Verification

- `pnpm run verify:api`
- `pnpm --filter @medora/api exec jest --testPathPattern='device-monitor'`

No migration for Phase 11C.
