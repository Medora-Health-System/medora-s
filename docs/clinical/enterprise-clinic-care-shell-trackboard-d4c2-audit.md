# MEDUI.D4C.2 — Clinic Care Shell & Color Clinical Trackboard Audit

**Date:** 2026-07-27 (final correction pass)  
**Branch:** `d4c2-clinic-care-shell-trackboard`  
**Baseline HEAD:** `7c216c2a0f519de9c24343131ffd80ef3870bf91` (= `origin/main`, PR #61 D4C.1 merged)

---

## 1. Baseline gate (Phase A)

| Check | Result |
|-------|--------|
| Branch | `d4c2-clinic-care-shell-trackboard` ✔ |
| Working tree | Dirty with D4C.2 work (expected) |
| `HEAD` == `origin/main` baseline | ✔ `7c216c2a0…` |
| D4C.1 on baseline | ✔ |

---

## 2. Enterprise domain audit matrix

| Domain | Existing Component | Path | Status | Recommendation |
|--------|-------------------|------|--------|----------------|
| Clinic / UC facility profile | D4C.1 `facilityClinicCareProfileD4c1` | `packages/shared/src/auth/facilityClinicCareProfileD4c1.ts` | exists | **REUSE** — metric contracts, role access, nav, Haiti PH jurisdiction |
| Metric contracts | **six primary** incl. `DISCHARGE_PENDING` | same | typed + live counts | **EXTEND** — rename from draft READY_FOR_COMPLETION; keep source states |
| Discharge / disposition | `Encounter.workflowState` + `EncountersService.close` | Prisma + encounters | exists | **REUSE** — no ClinicDischarge table |
| ED disposition stack | edDisposition* / lifecycle | shared + emergency | exists | **AVOID** for ambulatory KPI |
| Hospital / D4B.7 planning | inpatient planning JSON | shared | exists | **AVOID** — planning ≠ authorize |
| Clinic Care route | Shell + trackboard | `apps/web/app/app/clinic-care/page.tsx` | implemented | **REUSE** |
| Sidebar / nav areas | `CLINIC_CARE` + Front Desk/Billing/Pharmacy | `navigationAuthorization.ts` | corrected | **REUSE** |
| Public Health | `PublicHealthModule` / `VaccineAdministration` / `DiseaseCaseReport` | `apps/api/src/public-health/` | exists | **REUSE** — shell links only; no ClinicVaccine |
| MSPP | `MsppModule` + review enqueue | `apps/api/src/mspp/` | exists | **REUSE** — Haiti jurisdiction gate; no Clinic MSPP connector |
| Immunization longitudinal | Chart vaccinations tab + summary | patient chart | exists | **REUSE** — facesheet immunization SSoT deferred D4C.7 |
| Encounter workflow | `EncounterWorkflowState` | Prisma + machine | shared | **REUSE** |
| Follow-ups | `FollowUp` + hardened due helper | follow-ups + shared | exists | **REUSE** |
| Prisma schema | D4C.1 JSON profile | migration on main | sufficient | **NO MIGRATION** |

---

## 3. Discharge engine audit findings (mandatory)

| Concept | Canonical source | Ambulatory KPI use |
|---------|------------------|--------------------|
| Discharge ordered / pathway authorized | `Encounter.workflowState` ∈ {`DISCHARGE_READY`, `FINALIZED`} | **Include** in `DISCHARGE_PENDING` when OPEN + ambulatory |
| Legal close / departed / finalized | `EncounterStatus.CLOSED` + `close()` sets `dischargedAt` | **Remove** from KPI |
| ED disposition ordered / sortie | ED JSON engines | **Not** Clinic Care KPI source |
| Bed `DISCHARGE_PENDING` | Bed operational overlay | **Not** Clinic Care metric id (name collision only) |
| D4B.7 CM planning | Planning only (`authorizesDischarge: false`) | **Not** KPI source |
| Draft alias `READY_FOR_COMPLETION` | Same source states | **Private legacy helper only** — not user-facing KPI |

**Provider action → state → KPI:** Provider advances pathway to `DISCHARGE_READY`/`FINALIZED` → KPI include → `EncountersService.close` → leave KPI.

---

## 4. Public Health / immunization / MSPP audit findings

| Finding | Detail |
|---------|--------|
| Jurisdiction | `Facility.country` (`HT` / `HTI` / `Haiti`) — **not** UI language |
| Haiti Clinic preset | `publicHealthEnabled` defaults true when Haiti + unset optionalModules |
| Engines | `VaccineAdministration`, `DiseaseCaseReport`, MSPP review enqueue |
| Longitudinal vaccines | Chart tab + chart summary (facesheet gap → D4C.7) |
| MSPP submit | Auto-enqueue review on create; enqueue failure does **not** delete clinical record; no live WHO push |
| Clinic Care wiring | Shell nav → existing `/app/public-health/*`; server PH roles unchanged |

---

## 5. Approved UX sketch mapping (visual contract)

| Sketch element | D4C.1 / data mapping | D4C.2 plan |
|----------------|----------------------|------------|
| **6 primary KPI cards** | TODAYS_VISITS, WAITING, IN_PROGRESS, RESULTS_PENDING, **DISCHARGE_PENDING**, FOLLOW_UPS_DUE | Always rendered |
| Discharge Pending | `DISCHARGE_READY`/`FINALIZED` OPEN ambulatory | Required primary; EN/FR i18n |
| Follow-ups due | OPEN + due ≤ end of local today (includes overdue) | Hardened facility + ambulatory filters |
| PH nav (Haiti Provider/RN) | Existing PH routes | Immunizations + Disease reporting |
| Trackboard table | Encounter projection | Role-filtered columns / PHI |
| Visit type Walk-in/Scheduled | **No durable ambulatory appointment field** | Show Encounter.type; defer to D4C.3 |

---

## 6. What NOT to duplicate

| Do not create | Reuse |
|---------------|-------|
| ClinicDischarge / ClinicVaccine tables | Encounter workflow + VaccineAdministration |
| Parallel Clinic MSPP connector | DiseaseCaseReport + MSPP review |
| Clone of `EmergencyTrackboardView` | Light ambulatory projection UI |
| Fake Walk-in/Scheduled without data | Encounter.type labels only |
| Prisma migration for D4C.2 | Projection endpoint + shared helpers |
| Auto-grant MSPP approver to Nurses | Existing MSPP role assignments |

---

## 7. Migration decision

**D4C.2 requires no Prisma migration.**

---

## 8. Authorization notes (final)

| Actor | Shell / trackboard | Discharge KPI | Discharge actions | PH (Haiti + module) |
|-------|-------------------|---------------|-------------------|---------------------|
| ADMIN / PROVIDER / RN | ✔ | count + rows | existing only | Immunizations + Disease reporting; MSPP pathway |
| TECHNICIAN | ✔ tech-safe | count (status) | ✖ | ✖ |
| FRONT_DESK | ✔ operational | count (ops) | ✖ | ✖ |
| BILLING | ✔ | count (billing-readiness) | ✖ | ✖ |
| PHARMACY | ✔ conditional | count | ✖ | ✖ |
| Non-Haiti + PH on | ✔ | — | — | Immunizations/disease OK; MSPP denied |
| French language outside Haiti | — | — | — | ≠ MSPP |

---

## 9. Explicit deferrals (D4C.7 / later)

- External MSPP/WHO live transmission + retry store  
- Facesheet / clinical-history immunization SSoT  
- Vaccine inventory / campaigns  
- New PH engines or ClinicVaccine  
- Auto-transmit without review when engine requires review  
- D4C.3 registration / walk-in typing  

---

## 10. Audit conclusion

Safe to ship D4C.2 final correction pass as an **ambulatory presentation / projection** over Medora One shared core with **six mandatory KPIs** (including Discharge Pending from enterprise pathway states), Haiti PH jurisdiction gating, Front Desk / Billing / Pharmacy shell rules, hardened Follow-up Due, and expanded tests — **without** schema migration or clinical engine forks.
