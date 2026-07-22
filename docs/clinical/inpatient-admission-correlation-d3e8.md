# D3E.8 — Inpatient admission correlation & receiving-encounter identity

**Certification:** `MEDUI.INPATIENT_ADMISSION_CORRELATION.D3E8`

## Storage decision

**OPTION A — Versioned structured JSON** on `Encounter.admissionSummaryJson.admissionCorrelation`.

| Requirement | Met? |
|---|---|
| Uniqueness (service-enforced) | Yes — resolver + transactional recheck |
| Queryability | Via JSON path / candidate scan for open IP |
| Concurrency safety | Tx re-resolve before create |
| Durable linkage | correlationId + placement + source + idempotency |
| Versioning | `version` + `correlationVersion` |
| Auditability | Audit metadata on create; diagnostics API |
| Admissions without placement | Yes — direct/scheduled/transfer intents |

**OPTION B (dedicated Prisma model):** not required for this certification. No migration generated or applied.

## Wrong-reuse prevention

Always on (not feature-flagged):

- Never reuse “any open Inpatient for patient”
- Never reuse on HospitalEpisode alone
- Never reuse on admittedAt proximity
- Unsafe `admcorr:patient:…:active` ids rejected for matching
- Server generates UUID seed; client correlation ids are not authoritative

## Canonical service

`AdmissionCorrelationService` + `resolveReceivingEncounterReuse` / `planResolveOrCreateReceivingEncounter`

Writers:

- Nurse / direct admission → `InpatientOperationsService.createDirectAdmission`
- Placement arrival → `InternalPlacementService` ARRIVED_DESTINATION

## Feature flags

- `ADMISSION_CORRELATION_ENABLED` / `NEXT_PUBLIC_ADMISSION_CORRELATION_ENABLED` — Journey UI / diagnostics surfaces (production OFF)
- Wrong-reuse prevention — **always on**

## D3E.6D preservation

Unit bed boards, Floor Board inventory, ED+IP coexistence, ED non-mutation, Admission section, shared enterprise engines, and unit moves on the same Inpatient encounter remain required for D3E.8+.
