# MEDUI.D4C.10A — Audit: Enterprise Encounter Service-Line Provenance

**Status:** Implementation complete (local; migration not deployed)  
**Date:** 2026-08-15  
**Branch:** `d4c10a-enterprise-encounter-service-line-provenance`  
**Base:** `origin/main` @ `5101eb5eb` (includes D5A.3B, D4C.9/9A, D4C.8*, D4C.7K)

---

## Root architectural gap

Clinic and Dental both use `EncounterType.OUTPATIENT`. Without a first-class persisted service-line field, concurrency / billing / reporting cannot distinguish durable care contexts.

D5A.3 Dental tag (`nursingAssessment.dentalServiceLineV1`) is a projection applied after create — insufficient as sole authority.

---

## Existing service-line authority (reused)

| Source | Role |
|--------|------|
| `MedoraServiceLine` (`facilityTypeRegistry.ts`) | Canonical vocabulary |
| `Facility.serviceLinesJson` + module caps (D4C.1 / D4C.9) | Facility enablement |
| Dental tag D5A.3 | Historical backfill + UI projection (secondary) |
| `Encounter.type` / `billingClassification` | Deterministic type mappings |

**No competing vocabulary invented.**

---

## Prisma design decision

**B — `String?` + shared registry validation** (not Prisma enum).

Rationale: MedoraServiceLine already evolves in shared TypeScript; a Prisma enum would duplicate authority and force migrations on every new line. String is indexable/queryable; Zod/shared normalize at write.

Constant: `D4C10A_PRISMA_STORAGE = "STRING_REGISTRY_VALIDATED"`.

---

## Field

`Encounter.serviceLine String?`  
Index: `(facilityId, patientId, status, serviceLine)` — justified for D4C.10 concurrency lookups.

---

## Historical backfill policy (deterministic only)

| Condition | Set |
|-----------|-----|
| `dentalServiceLineV1` in nursingAssessment | `DENTAL` |
| `roomLabel = DENTAL` | `DENTAL` |
| `type = EMERGENCY` | `EMERGENCY` |
| `type = URGENT_CARE` | `URGENT_CARE` |
| `type = INPATIENT` + billing OBSERVATION | `OBSERVATION` |
| `type = INPATIENT` (else) | `MEDSURG` |
| Untagged OUTPATIENT | **leave NULL** (do not invent CLINIC) |

---

## Create-path mappings

| Path | serviceLine |
|------|-------------|
| Dental start | `DENTAL` (DTO + server resolve + tag at create) |
| Clinic outpatient / walk-in / check-in OUTPATIENT | `CLINIC` |
| Walk-in / check-in URGENT_CARE | `URGENT_CARE` |
| ED create | `EMERGENCY` |
| Direct inpatient admission | `MEDSURG` |
| Placement receiving OBSERVATION | `OBSERVATION` |
| Placement receiving INPATIENT | `MEDSURG` |

---

## Compatibility

`null` = unknown/legacy. Concurrency helpers (`serviceLinesMatchForConcurrency`) require both sides known — **never** treat null as CLINIC.
