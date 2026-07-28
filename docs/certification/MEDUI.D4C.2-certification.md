# MEDUI.D4C.2 — Clinic Care Shell & Color Clinical Trackboard Certification

**Date:** 2026-07-27 (final correction pass)  
**Phase:** MEDUI.D4C.2  
**Decision:** **CERTIFIED WITH DOCUMENTED DEFERRALS**

---

## 1. Branch / HEAD / baseline

| Item | Value |
|------|-------|
| Branch | `d4c2-clinic-care-shell-trackboard` |
| Baseline HEAD (pre-implementation) | `7c216c2a0f519de9c24343131ffd80ef3870bf91` |
| `origin/main` at baseline | same (PR #61 D4C.1 merged) |
| Working tree at certification | Uncommitted D4C.2 implementation + final correction pass (no commit per phase rules) |

---

## 2. Final decision rationale

D4C.2 delivers the Clinic Care **ambulatory shell** and **color clinical trackboard** as a facility-scoped projection over existing encounters, workflow states, diagnostic ops aggregates, follow-ups, and Public Health engines — reusing D4C.1 metric contracts, navigation, and role workspace access — **without** a Prisma migration or parallel clinical engines.

**Final correction pass** made Discharge Pending a **required primary KPI** (six mandatory cards), removed user-facing `READY_FOR_COMPLETION`, wired Haiti PH jurisdiction (country ≠ language) for Provider/Nurse Immunizations + Disease Reporting, preserved Front Desk / Billing / Pharmacy / Tech denials, and expanded discharge (18) + PH (24) contract tests.

**Validation:** shared 76, api clinic-care 19, web UI contracts 9 — all green. Builds shared/api/web succeeded. Prisma validate + generate succeeded. **D4C.2 requires no Prisma migration.**

---

## 3. Architecture reused

| Component | Role |
|-----------|------|
| D4C.1 metric contracts | Six primary KPIs incl. `DISCHARGE_PENDING` |
| `isClinicCareDischargePending` | Deterministic projection over `DISCHARGE_READY`/`FINALIZED` + OPEN |
| `resolveClinicCareWorkspaceRoleAccess` | Shell / authority / PH matrix |
| `Encounter` + `EncounterWorkflowState` | Stage projection |
| `VaccineAdministration` / `DiseaseCaseReport` / MSPP review | PH engines (links + gating only) |
| Trackboard operational SQL | Results/orders pending counts |
| `FollowUp` + `isClinicCareFollowUpDue` | Follow-ups due metric |

---

## 4. ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Facility care profile | D4C.1 JSON + resolvers | ✔ | Haiti PH preset | ✔ |
| Navigation / CLINIC_CARE | D4C.1 nav area | ✔ | PH shell links | ✔ |
| Encounter / workflow / discharge | Prisma + close() | ✔ | Discharge Pending KPI | ✔ |
| Orders / results | Trackboard ops | ✔ | Clinic Care metrics + role filter | ✔ |
| Follow-ups | FollowUp module | ✔ | Hardened due inclusion | ✔ |
| Immunizations | VaccineAdministration | ✔ | Shell exposure | ✔ (no ClinicVaccine) |
| Disease reporting / MSPP | DiseaseCaseReport + MSPP | ✔ | Haiti jurisdiction gate | ✔ (no Clinic MSPP connector) |
| Front Desk / Billing / Tech denials | Workspace access | ✔ | Discharge/PH denials | ✔ |
| Longitudinal clinical domains | Constitution | ✔ | — | ✔ |

---

## 5. Schema / migration

| Item | Result |
|------|--------|
| New Prisma models | **None** |
| New migration folder | **None** |
| Decision | **D4C.2 requires no Prisma migration** |

---

## 6. Authorization conclusion

See architecture doc §7 matrix. Key gates: Provider/RN discharge actions unchanged; Front Desk ops-only; Billing billing-readiness; Tech no discharge authority; PH only Provider/RN/Admin when module on; MSPP only Haiti country.

---

## 7. Documented deferrals

1. **MEDUI.D4C.3** — Registration / appointment / walk-in orchestration  
2. Nursing/MA documentation depth, SOAP, diagnosis, prescribing, MAR, orders in shell  
3. **MEDUI.D4C.7** — PH inventory/campaigns, facesheet immunization SSoT, live MSPP/WHO connector, new PH engines  
4. Overdue follow-up sublabel / discharge document packets in Clinic Care  

→ Deferred work is **not** claimed complete.

---

## 8. Production limitations

- KPI / row census bounded (`take` limits)  
- Visit type shows `OUTPATIENT` / `URGENT_CARE` only  
- Action links open existing modules  
- MSPP live transmission e2e not claimed (reuse enqueue + review only)  
- Manual browser walkthrough may be limited in agent environments  

---

## 9. Security / isolation

- JWT + facility membership required  
- Guard enforces `canAccessClinicTrackboardProjection`  
- Queries always scoped by `facilityId`  
- Ambulatory types only  
- Haiti MSPP pathway gated by `Facility.country`  
- Front Desk / Billing / Technician source-authority flags remain false  

---

## 10. Release prerequisites

- D4C.1 migration / care profile available on target DB  
- Shared package built before API/web  
- No D4C.2 migration step  

---

## 11. Certification statement

**CERTIFIED WITH DOCUMENTED DEFERRALS** — Clinic Care shell and color trackboard (six mandatory KPIs including Discharge Pending, Haiti PH nav gating, Front Desk / Billing / Pharmacy / Tech corrections, hardened Follow-up Due, and expanded discharge/PH tests) are ready for human review as an ambulatory projection over Medora One shared core. Validation suites green; no Prisma migration required.
