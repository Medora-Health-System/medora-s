# MEDUI.D4C.7D — Enterprise ambulatory encounter lifecycle synchronization

## Purpose

One canonical enterprise encounter lifecycle drives all ambulatory projections. Surfaces project — they must not own terminal truth.

## Canonical authority

**`EncountersService.close` → `Encounter.status = CLOSED`**

Also sets atomically (same transaction): `workflowState = CLOSED`, `dischargedAt`, `roomLabel = null`, discharge/billing capture, audit `ENCOUNTER_CLOSE`.

### Not terminal

- Provider documentation SIGNED / “finalisé”
- Workflow `FINALIZED`
- Discharge summary save (D4C.7 ambulatory discharge UI)
- Dashboard / Today's Visits / header local inference

## Ambulatory COMPLETE_VISIT (corrected)

| Before D4C.7D | After D4C.7D |
|---------------|--------------|
| `DISCHARGE_READY → FINALIZED` via PATCH | `DISCHARGE_READY \| FINALIZED → ENTERPRISE_CLOSE` |
| No `/close` from Active Workspace | Thin adapter `closeAmbulatoryEncounterViaEnterprise` → `POST /encounters/:id/close` |
| Hidden when chart locked | Still shown when pathway allows close |

## Header projection

`projectAmbulatoryLifecycleHeader`:

| State | Badge | Meta |
|-------|-------|------|
| OPEN (early) | Ouverte | FR pathway label |
| OPEN + pathway + docs unsigned | Sortie effectuée | Documentation à finaliser |
| OPEN + pathway + docs signed | Prête pour la sortie | Prête à clôturer |
| CLOSED | Fermée | Terminée |
| CANCELLED | Annulée | Annulée |

Never show raw `FINALIZED` / `CLOSED` enums in French product UI.

## Projections

All continue to classify from `Encounter.status` (+ workflow for open pathway stages):

- Today's Visits / Consultations / Nursing / Provider — CLOSED leaves active defaults
- Clinical Board completed KPIs / visit-by-day / patient flow COMPLETED — `status === CLOSED`
- Facility timezone rules unchanged (D4C.5A)
- Follow-up OPEN independent of encounter CLOSED
- Patient / Medical Record retain historical encounter

## Cache invalidation

`invalidateClinicCareAmbulatoryLifecycleCache(facilityId, encounterId)` after successful close.

## Authorization

Close roles unchanged: RN, PROVIDER, ADMIN (server `@RequireRoles`). Facility membership via existing encounter scope.

## Idempotency

Repeated `close` on already CLOSED returns canonical projection (no status regression).

## Related modules

- D4C.5B Active Clinic Workspace
- D4C.5A Clinical Board
- D4C.2 Today's Visits trackboard
- D4C.7 / 7A ambulatory discharge (summary engine — not close)
- Enterprise `EncountersService.close` (ED/Hospital share same authority; ambulatory now wires it)

## French i18n

Namespace `clinicCareD4c7d.*` (mirrored EN/FR).
