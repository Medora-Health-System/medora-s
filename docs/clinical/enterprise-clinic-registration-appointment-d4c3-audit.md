# MEDUI.D4C.3 — Ambulatory Registration, Appointment & Walk-In Orchestration Audit

**Date:** 2026-07-27 (updated after schema approval)  
**Branch:** `d4c3-clinic-registration-appointment-walkin`  
**Baseline HEAD:** `495c36008` (= `origin/main`, PR #62 D4C.2)  
**Schema decision:** **APPROVED WITH REQUIRED REVISIONS** (human) → additive migration applied locally only.

---

## 1. Baseline gate

| Check | Result |
|-------|--------|
| Branch | `d4c3-clinic-registration-appointment-walkin` ✔ |
| D4C.2 on main | ✔ `9befacd60` / PR #62 |
| Package manager | npm workspaces |

---

## 2. Updated audit findings (post-approval)

| Gap (pre-approval) | Resolution |
|--------------------|------------|
| No Appointment model | **Created** enterprise `Appointment` |
| No durable visit origin | **Created** nullable `Encounter.visitOrigin` enum |
| ARRIVED vs CHECKED_IN | Distinct `AppointmentStatus` values + separate clocks |
| serviceCategory enum | **Not added** — facility mode / Encounter.type / appointment reason suffice |
| modeOfArrival overload | **Rejected** — left as transport/clinical arrival |
| Encounter.type overload | **Rejected** — remains OUTPATIENT \| URGENT_CARE |

### Service-category gate

Inspected: facility operating mode, service lines, department, Encounter.type, chiefComplaint/reason, appointment.reason.  
**Conclusion:** no new serviceCategory enum required for D4C.3. Prefer reuse.

### FollowUp → Appointment linkage

No approved schema field for FollowUp.id on Appointment. Follow-up scheduling foundation creates `Appointment` with `isFollowUp` audit metadata only. Deeper FollowUp FK deferred.

---

## 3. Final approved schema (implemented)

- `Appointment` (enterprise, not ClinicAppointment)
- `AppointmentStatus`: SCHEDULED | CONFIRMED | ARRIVED | CHECKED_IN | COMPLETED | CANCELLED | NO_SHOW
- Clocks: scheduledStartAt, scheduledEndAt?, arrivedAt?, checkedInAt?, completedAt?, cancelledAt?
- `Appointment.encounterId` nullable unique → Encounter (Restrict)
- `Encounter.visitOrigin` nullable `EncounterVisitOrigin`
- Indexes: facility+scheduledStart; facility+status+scheduledStart; facility+patient+scheduledStart; provider+scheduledStart; department+scheduledStart; Encounter facility+visitOrigin+createdAt
- FKs: Facility/Patient Restrict; Encounter Restrict; Provider/Department/CreatedBy SetNull
- No broad unique on patient+facility+OPEN

Migration folder: `apps/api/prisma/migrations/20261028120000_enterprise_appointment_visit_origin_d4c3`

---

## 4. Authorities reused

Patient search/create · Registration · Encounter create semantics · Insurance/facesheet · Documents/packets · FollowUp (due tasks) · D4C.1 capabilities · D4C.2 trackboard projection · Audit

---

## 5. What was not duplicated

ClinicPatient, ClinicRegistration, ClinicEncounter, ClinicAppointment, ClinicInsurance, parallel completeness persistence, trackboard KPI tables.

---

## 6. Audit conclusion

Safe to implement and certify **WITH DOCUMENTED DEFERRALS** after local migrate + tests/builds (no production migrate, no commit).
