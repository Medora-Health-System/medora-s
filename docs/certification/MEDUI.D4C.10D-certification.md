# MEDUI.D4C.10D — Certification Report

**Title:** Enterprise Active Visit Routing, Worklist Ownership & Deduplication  
**Date:** 2026-08-15  
**Branch:** `d4c10d-enterprise-active-visit-routing`  
**Base HEAD:** `469fd6c42` (`origin/main`, includes D5A.4A)

---

## Verdict

**CERTIFIED (code + focused tests + local builds)** after final pre-commit routing safety audit — pending commit / push / deploy / manual UAT.

Migration: **NONE** (`Encounter.serviceLine` reused)

---

## Exact safe-reroute predicate

`isUnclaimedAmbulatoryWaitingVisit(row)` ≡  
`listClinicOwnershipBlockersForDentalReroute(row).length === 0`

Authoritative evaluation loads DB columns + relation `_count`s in `DentalCareVisitRoutingService` (not UI board state).

### SAFE UNCLAIMED WAIT (all must hold)

| Gate | Requirement |
|------|-------------|
| Lifecycle | `status=OPEN`, `type` OUTPATIENT\|URGENT_CARE, `workflowState=ARRIVED`, `reopenCount=0`, no `closedAt`/`admittedAt` |
| Destination | `serviceLine` null\|CLINIC\|URGENT_CARE (not DENTAL/EMERGENCY/other) |
| Assignments | no `physicianAssignedUserId`, `nurseAssignedUserId`, `providerId` |
| Documentation | not SIGNED; empty `providerNote`/`treatmentPlan`/`notes`; no physicianEval / erProviderMse / nursingEval / dentalClinicalEvaluation content; not dental-tagged |
| Clinical children | `_count` diagnoses, orders, encounterNotes, clinicalEvents, clinicalDocumentationEntries, medicationAdministrations, toothFindings, providerAddenda, lifecycleTransitions = 0 |
| Financial | no billingEvents; empty `billingCaptureJson`; `billingFinalizationStatus=NOT_READY`; no claimSubmissions |
| Disposition | no disposition / discharge / dischargeSummary |
| Triage / vitals / room | no triageCompleteAt / triageAcuity; empty vitals; room null\|waiting\|DENTAL hint only |
| Other | no `hospitalEpisodeId`; no Clinic-only appointment lock flag |

**ANY blocker** → do **not** mutate → `CREATE_NEW_DENTAL` (D4C.10).

Atomic `updateMany` also requires assignment/doc/disposition/billing/workflow nulls + version match.

### Not used alone as “safe”

Empty note text · blank provider in UI · null room · frontend board state.

---

## Proofs A–L

| # | Proof | Status |
|---|-------|--------|
| A | `visitOrigin` not in route `data` | ✔ |
| B | Append-only `ENCOUNTER_UPDATE` audit | ✔ |
| C | Billing events / classification not rewritten; billed visits blocked from route | ✔ |
| D | `createdAt` untouched | ✔ |
| E | Patient/MRN unchanged | ✔ |
| F | Same `encounterId` only when blockers empty | ✔ |
| G | Owned Clinic → new Dental | ✔ |
| H | D4C.10C advisory lock + version | ✔ |
| I | Clinic board `serviceLine` filter excludes DENTAL | ✔ |
| J | Dental worklist filter + encounterId dedupe | ✔ |
| K | Patient search unchanged (facility authority) | ✔ |
| L | PMR keeps same encounter with updated `serviceLine` after safe route | ✔ |

### Residual gaps (accepted, documented)

1. **Appointment Clinic department alone is not a lock** — no durable “Clinic-only” appointment flag; check-in waits are the primary ROUTE case.
2. **Child-table TOCTOU** — Clinic write that does not bump `Encounter.version` between plan and `updateMany` is mitigated by field-level where + conflict; rare race may still need refresh/retry.
3. **Results** — covered via `orders` / clinical events / documentation counts (no separate Result table on Encounter for ambulatory MVP).

---

## Validation

| Check | Status |
|-------|--------|
| shared D4C.10D ownership suite | ✔ 39 |
| API routing contracts | ✔ 5 |
| Migration | NONE |
| Commit / push / deploy | **STOP** |

## Certification recommendation

**Approve MEDUI.D4C.10D as CERTIFIED** after explicit commit approval. Do not start D5A.5/D5A.6.
