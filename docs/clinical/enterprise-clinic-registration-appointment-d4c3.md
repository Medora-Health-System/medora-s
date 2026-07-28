# MEDUI.D4C.3 — Ambulatory Registration, Appointment & Walk-In Orchestration

**Status:** Implemented (local) — awaiting human review / uncommitted  
**Date:** 2026-07-27  
**Branch:** `d4c3-clinic-registration-appointment-walkin`  
**Baseline:** `origin/main` @ `495c36008` (D4C.2)

---

## 1. Purpose

Operational Clinic Care front door: patient identity, walk-in encounters with durable `WALK_IN` origin, scheduled appointments with distinct arrival/check-in clocks, transactional check-in to canonical ambulatory encounters, registration completeness projection, and D4C.2 trackboard handoff.

---

## 2. Architecture

```
Clinic Care Registration UI (/app/clinic-care/registration)
        │
        ├── Patient search/create     → enterprise Patient / Registration
        ├── POST /appointments        → Appointment (SCHEDULED)
        ├── POST .../arrive           → status ARRIVED + arrivedAt
        ├── POST .../check-in         → tx: Encounter + visitOrigin=SCHEDULED + link
        ├── POST /registration/walk-in→ Encounter visitOrigin=WALK_IN (no Appointment)
        ├── Completeness projection   → derived (not persisted)
        └── GET /clinic-care/trackboard → D4C.2 + origin/times columns
```

**Encounter.type** remains OUTPATIENT | URGENT_CARE.  
**modeOfArrival** is not used for Scheduled vs Walk-In.

---

## 3. Migration

Folder: `20261028120000_enterprise_appointment_visit_origin_d4c3`

Additive only: enums, `Encounter.visitOrigin` nullable, `Appointment` table, indexes, audit enum values.  
No fabricated origin backfill. Legacy `visitOrigin` = NULL.

**Seed:** not run (and not required).

---

## 4. Behaviors (summary)

| Flow | Behavior |
|------|----------|
| Appointment create | Facility-scoped; default SCHEDULED; preserves scheduledStartAt |
| Arrival | SCHEDULED/CONFIRMED → ARRIVED; sets arrivedAt; does not create encounter |
| Check-in | Transactional; idempotent if encounterId set; open-encounter conflict; visitOrigin=SCHEDULED |
| Walk-in | Creates ambulatory encounter only; visitOrigin=WALK_IN; no Appointment row |
| Trackboard | Shows origin, scheduled, arrival, check-in; LEGACY when null; no fabricated schedule for walk-ins |
| Completeness | Derived; Haiti insurance NOT_REQUIRED; noncritical gaps do not block care |
| Follow-up foundation | Appointment create with isFollowUp metadata; FollowUp FK deferred |

---

## 5. Authorization

| Actor | May | Must not |
|-------|-----|----------|
| FRONT_DESK / ADMIN | Create appointments, arrive, check-in, walk-in | Clinical authorship |
| PROVIDER | Create appointments (schedule); view | Check-in / walk-in APIs (Front Desk) |
| BILLING | Completeness view; insurance via existing APIs | Clinical mutation / walk-in |
| RN | Completeness / today list view | Registration mutations in this module |

---

## 6. Explicit deferrals

- FollowUp.id FK on Appointment  
- Advanced scheduling (recurrence, waitlists, SMS, self-schedule)  
- D4C.4–D4C.8 clinical/billing/MSPP depth  
- Guarantor first-class model  
- Historical visitOrigin backfill  

---

## 7. Certification

See `docs/certification/MEDUI.D4C.3-certification.md`.
