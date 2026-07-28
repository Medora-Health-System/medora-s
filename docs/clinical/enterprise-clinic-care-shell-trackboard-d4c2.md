# MEDUI.D4C.2 — Clinic Care Shell & Color Clinical Trackboard

**Date:** 2026-07-27 (final correction pass)  
**Branch:** `d4c2-clinic-care-shell-trackboard`  
**Baseline:** `origin/main` @ `7c216c2a0…` (D4C.1 merged via PR #61)

---

## 1. Purpose

Deliver the **Clinic Care ambulatory application shell** and **color clinical trackboard** as a presentation / projection layer over the Medora One shared core — without duplicating patients, encounters, registration, orders, results, medications, pharmacy, billing, public-health engines, audit, or identity engines.

---

## 2. Architecture

```
Clinic Care UI (/app/clinic-care)
        │
        ▼
GET /clinic-care/trackboard  (facility-scoped projection)
        │
        ├── Encounter (OUTPATIENT | URGENT_CARE) + EncounterWorkflowState
        ├── Trackboard operational aggregates (orders / results pending)
        ├── FollowUp (OPEN due ≤ end of facility-local today; ambulatory-hardened)
        ├── D4C.1 facility care profile + role workspace access
        └── Public Health links → existing /app/public-health/* (Haiti jurisdiction gated)
```

**Principles**

- One codebase; Clinic Care is a care-setting projection, not a product fork.
- Typed stage projection from existing workflow states — no parallel persisted clinic workflow.
- Discharge Pending reuses enterprise `DISCHARGE_READY` / `FINALIZED` — no ClinicDischarge table.
- Prefer no Prisma migration (none required).
- Color is a secondary signal; text labels remain primary.
- Role-filtered PHI on the trackboard — seeing the board does not unlock hidden clinical depth.
- Haiti MSPP eligibility is by `Facility.country`, never UI language alone.

---

## 3. Shell

| Element | Behavior |
|---------|----------|
| Landing | `/app/clinic-care` (D4C.1 ambulatory landing when Clinic Care visible) |
| In-page nav | Trackboard, Registration, Today's visits, Nursing/MA, Provider, Patients, Encounters, Follow-up, **Immunizations**, **Disease reporting**, Billing, Pharmacy — each gated by workspace access flags |
| External PH links | Existing `/app/public-health/vaccinations` and `/app/public-health/disease-reports` |
| Role banners | Technician / Front Desk / Billing operational notices |
| Facility mode labels | Clinic / Urgent care / Hybrid from D4C.1 operating mode |

---

## 4. Metric definitions (six mandatory primaries)

| Id | EN / FR | Source | Inclusion | Exclusion | Scope |
|----|---------|--------|-----------|-----------|-------|
| `TODAYS_VISITS` | Today's visits / Visites du jour | `Encounter` | Status OPEN or CLOSED; types OUTPATIENT/URGENT_CARE; created facility-local today; pipeline ARRIVED→FINALIZED | EMERGENCY, INPATIENT; CANCELLED | `FACILITY_LOCAL_TODAY` |
| `WAITING` | Waiting / En attente | `workflowState` ∈ {ARRIVED, TRIAGE} | OPEN | Closed / cancelled | Open pipeline |
| `IN_PROGRESS` | In progress / En cours | ∈ {IN_TREATMENT, DISPOSITION} | OPEN | — | Open pipeline |
| `RESULTS_PENDING` | Results pending / Résultats en attente | workflow `RESULTS_PENDING` **or** pending LAB/IMAGING lines | OPEN ambulatory | Cancelled orders | Open pipeline |
| `DISCHARGE_PENDING` | **Discharge Pending** / **Sorties en attente** | `workflowState` ∈ {DISCHARGE_READY, FINALIZED} | OPEN ambulatory; provider pathway authorized; outstanding completion remain | CLOSED/CANCELLED; ED/IP; wait/orders/results alone | Open pipeline |
| `FOLLOW_UPS_DUE` | Follow-ups due / Suivis à faire | `FollowUp` | see §6 | COMPLETED/CANCELLED; tomorrow; invalid date; cross-facility; non-ambulatory linked | Facility-local today |

**Removed from user-facing KPI contract:** `READY_FOR_COMPLETION` (private legacy alias documents same source states only).

Timezone: `Facility.timezone` via `facilityLocalDayUtcBounds`.

### Discharge Pending inclusion / removal (exact)

| Rule | Fields |
|------|--------|
| Include | `type` ∈ {OUTPATIENT, URGENT_CARE} AND `status=OPEN` AND `workflowState` ∈ {DISCHARGE_READY, FINALIZED} |
| Remove | `status` CLOSED or CANCELLED (legal close / departed / finalized) |
| Never from | Wait time alone, orders complete, results complete, unassigned, filter changes, ED/Hospital engines, D4B.7 planning |

Helper: `isClinicCareDischargePending` in `clinicCareTrackboardProjectionD4c2.ts`.

---

## 5. Ambulatory operating-mode → encounter-type mapping

Durable Prisma `Encounter.type` values used by the board: **OUTPATIENT** | **URGENT_CARE** only (no new encounter types).

| D4C.1 mode / subtype label | Maps to Encounter.type | Notes |
|----------------------------|------------------------|-------|
| CLINIC / PRIMARY_CARE / SPECIALTY / WALK_IN / PREVENTIVE / OCCUPATIONAL_HEALTH | OUTPATIENT | Walk-in typing deferred to D4C.3 |
| URGENT_CARE | URGENT_CARE | Facility operating mode / UC visits |

---

## 6. Follow-up Due definition

`FOLLOW_UPS_DUE` counts a follow-up when **all** are true:

1. Authenticated facility matches `FollowUp.facilityId`
2. Ambulatory care: unlinked **or** linked encounter type ∈ {OUTPATIENT, URGENT_CARE}
3. Status = OPEN (unresolved)
4. Valid `dueDate`
5. `dueDate` &lt; end of facility-local current day (exclusive) → **due today + overdue**
6. Not COMPLETED / CANCELLED

---

## 7. Authorization matrix (final)

| Actor | Clinic Care shell / trackboard | Discharge Pending | Discharge actions | Immunizations / Disease reporting | MSPP Haiti pathway |
|-------|-------------------------------|-------------------|-------------------|-----------------------------------|--------------------|
| ADMIN | ✔ when clinic/UC on | count + rows | ✔ existing | ✔ when PH on | ✔ when Haiti country |
| PROVIDER | ✔ | count + rows | ✔ existing | ✔ when PH on | ✔ when Haiti |
| RN | ✔ | count + rows | ✔ existing close/sortie auth | ✔ when PH on | ✔ pathway (not auto MSPP approver) |
| TECHNICIAN | ✔ tech-safe | minimal status | ✖ | ✖ | ✖ |
| FRONT_DESK | ✔ operational | ops visibility | ✖ | ✖ | ✖ |
| BILLING | ✔ | billing-readiness | ✖ | ✖ | ✖ |
| PHARMACY | ✔ conditional | status | ✖ | ✖ | ✖ |

**Haiti vs language:** `isHaitiPublicHealthJurisdiction(Facility.country)` — `fr` / France / Canada ≠ MSPP. Language = labels only.

**Non-Haiti + PH module independently on:** general immunizations + disease reporting allowed; MSPP pathway denied server/UI.

---

## 8. Patient medical-record immunization behavior

- Reuses `VaccineAdministration` (no ClinicVaccine).
- Appears on patient chart vaccinations tab + chart summary.
- Facesheet / clinical-history profile immunization SSoT deferred to **D4C.7**.
- Role-filtered PHI via existing PH API roles + Clinic Care shell flags.

---

## 9. MSPP submission / handoff behavior

- Reuses `DiseaseCaseReport` + `tryEnqueueMsppReview` (auto-enqueue for review, not silent external submit).
- Failed enqueue does **not** delete clinical record (existing engine).
- No separate Clinic MSPP connector.
- Non-Haiti: `canAccessMsppHaitiPathway=false`.
- Live WHO push / retry store deferred to D4C.7.

---

## 10. Migration

**D4C.2 requires no Prisma migration.**

---

## 11. Explicit deferrals

| Phase | Deferred |
|-------|----------|
| **D4C.3** | Registration / appointment / walk-in orchestration; durable Walk-in/Scheduled visit typing |
| **D4C.4+** | Nursing/MA documentation depth, SOAP, diagnosis UX, prescribing, MAR, order creation, result verification, claims, discharge documents, follow-up outreach |
| **D4C.7** | PH inventory/campaigns, facesheet immunization SSoT, live MSPP/WHO connector, new PH engines |

---

## 12. Files (primary)

- `packages/shared/src/auth/facilityClinicCareProfileD4c1.ts` — metric contracts + Haiti PH + workspace access
- `packages/shared/src/auth/clinicCareTrackboardProjectionD4c2.ts` — stage/metric/follow-up/discharge-pending/field visibility
- `packages/shared/src/auth/navigationAuthorization.ts` — Front Desk / Billing / Pharmacy CLINIC_CARE nav
- `apps/api/src/clinic-care/*` — projection API + guards + tests
- `apps/web/src/features/clinic-care/*` — shell + trackboard UI
- Docs under `docs/clinical/` and `docs/certification/`
