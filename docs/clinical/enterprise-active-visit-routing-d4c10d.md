# MEDUI.D4C.10D — Enterprise Active Visit Routing, Worklist Ownership & Deduplication

**Status:** Implemented locally — not committed / not deployed  
**Branch:** `d4c10d-enterprise-active-visit-routing`  
**Base:** `origin/main` @ `469fd6c42`

## STOP GATE 1 — Audit

| Finding | Detail |
|---------|--------|
| Duplicate root cause | D4C.10 allows Clinic+Dental OPEN concurrently; Clinic Care trackboard listed **all** ambulatory OPEN rows with **no `serviceLine` filter** |
| Classification | **C + E** — two encounters OR Dental-routed visit still projected on Clinic board |
| Routing authority | `Encounter.serviceLine` (D4C.10A) — sufficient |
| Migration | **NONE** |

## Safe unclaimed wait (authoritative)

In-place CLINIC/null → DENTAL only when `listClinicOwnershipBlockersForDentalReroute` is empty.

Inspected: Encounter assignment/doc/billing/disposition/workflow/room/vitals columns; Triage completion; `_count` on Diagnosis, Order, EncounterNote, BillingEvent, ClaimSubmission, clinical events/docs, MAR, ToothFinding, ProviderAddendum, LifecycleTransition.

Any clinical or financial ownership → **CREATE_NEW_DENTAL** (do not mutate).

## Implementation

1. Clinic Care trackboard/dashboard OPEN queues filter to CLINIC / URGENT_CARE / null legacy.
2. Dental worklist SQL prefilter + Dental projection assert; dedupe by encounterId.
3. `POST /dental-care/patients/:patientId/claim-or-start`:
   - reuse existing Dental OPEN
   - route **safe unclaimed** Clinic wait → `serviceLine=DENTAL` (same encounterId)
   - else create new Dental episode (owned Clinic preserved)
4. D4C.10C advisory lock reused for claim serialization.
5. Audit via `ENCOUNTER_UPDATE` with previous/new serviceLine (no DentalAuditLog). Route does not rewrite `visitOrigin`, billing classification, timestamps, or Patient/MRN.

## Out of scope

D5A.5 / D5A.6 · new routing table · encounter close on claim
