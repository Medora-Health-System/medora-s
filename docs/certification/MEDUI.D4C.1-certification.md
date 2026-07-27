# MEDUI.D4C.1 — Clinic / Urgent Care Facility Profile Certification

**Date:** 2026-07-27  
**Phase:** MEDUI.D4C.1  
**Decision:** **CERTIFIED WITH DOCUMENTED DEFERRALS** (foundation correction applied — technician Clinic Care eligibility)

---

## 1. Branch / HEAD / baseline

| Item | Value |
|------|-------|
| Branch | `d4c1-clinic-facility-profile-foundation` |
| Baseline HEAD (pre-implementation) | `3ebf6a8160f21ea9ab0b26a3764691df9737d71e` |
| `origin/main` at baseline | same |
| Ahead/behind at baseline | **0 0** |
| Ancestor check | **0** |
| D4B.8 on main (PR #60) | ✔ Present — reused |
| Working tree at certification | Uncommitted D4C.1 implementation + foundation correction (no commit per phase rules) |

---

## 2. Final decision rationale

D4C.1 establishes the Clinic / Urgent Care **facility profile and ambulatory care-setting foundation** over the Medora One shared core: ambulatory service lines, `CLINIC_CARE` navigation, module capabilities, operational address / print identity, role workspace mapping, typed D4C.2 metric contracts, admin config + audit — **without** building the colorful trackboard or duplicating clinical engines.

**Foundation correction (technician eligibility):** Authorized technicians at Clinic / Urgent Care may access the Clinic Care shell, shared trackboard / Today's Visits projections, assigned technician tasks, technician-safe Nursing/MA projection, and Lab/Rad when facility module + user authorization allow — while remaining denied provider/nursing source authorities. Prior incorrect denial of Clinic Care shell to technicians is corrected.

---

## 3. Architecture reused

| Component | Role |
|-----------|------|
| `Facility` + `FacilityType` + `facilityTypeRegistry` | Facility taxonomy |
| `serviceLinesJson` + `facilityServiceLines` | Service-line resolution |
| 19UCED `facilityBillingWorkflow` | Billing modes |
| `navigationAuthorization` / profession resolvers | Nav + RBAC |
| D4B.3 technician NA capability prohibitions | Tech-safe projection boundaries |
| D4B.8 provider workspace | Provider documentation composition |
| `FollowUp` / `EncounterWorkflowState` / orders-results | Metric contract mapping |
| `printFacilityHeader` | Print identity consumer |
| Facility membership guards | Tenant isolation |

---

## 4. Files changed (summary)

### Docs
- `docs/clinical/enterprise-clinic-facility-profile-d4c1-audit.md`
- `docs/clinical/enterprise-clinic-facility-profile-d4c1.md`
- `docs/certification/MEDUI.D4C.1-certification.md`

### Shared
- `facilityClinicCareProfileD4c1.ts` (+ test) — technician Clinic Care + authority denials
- `facilityTypeRegistry.ts` / tests — ambulatory defaults + `CLINIC`/`URGENT_CARE` lines
- `facilityServiceLines.ts` / tests
- `navigationAuthorization.ts` / tests — `CLINIC_CARE` for authorized technicians
- `freestandingErRnProviderNavigation.ts` / `freestandingErTechnicianAccess.ts` — UC ambulatory vs hybrid ED
- `facilityDeploymentProfilesV1.ts` — CLINIC / UC profiles
- `schemas/facilities.ts` — care profile DTO fields
- `packages/shared/src/index.ts` export

### API
- Prisma: `facilityCareProfileJson`, `AuditAction.FACILITY_CARE_PROFILE_UPDATED`
- Migration `20261027120000_clinic_facility_care_profile_d4c1`
- `admin-facilities.service.ts`, `facility-care-profile.util.ts` (+ spec)

### Web
- Sidebar `CLINIC_CARE` + `/app/clinic-care` placeholder
- `FacilityTypeServiceLineFields` ambulatory lines
- i18n EN/FR + `uiLabels` French nav
- `navigationVisibility` passes service lines to FSER filter
- `clinicCareNavigation.d4c1.test.ts` — technician Clinic Care visibility

---

## 5. Schema / migration

| Item | Result |
|------|--------|
| Additive JSON `Facility.facilityCareProfileJson` | ✔ |
| `AuditAction.FACILITY_CARE_PROFILE_UPDATED` | ✔ |
| Silent Clinic conversion of legacy Hospital/FSER | **Prevented** |
| Seed rows with explicit OBSERVATION lines | **Unchanged** |
| Migration folder | `20261027120000_clinic_facility_care_profile_d4c1` |
| Timestamp governance | **Kept** — lexicographically immediately after latest predecessor `20261026120000_role_patient_care_tech`. Calendar-July rename would sort **before** the Oct 2026 medication/hospital chain and break Prisma order. |
| Applied to shared/production DB? | **No evidence** — untracked in git; local Postgres unreachable (connection refused); Docker unavailable in check environment. Treated as local-only uncommitted. |

---

## 6. ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Facility identity | Prisma `Facility` | ✔ | JSON profile | ✔ |
| Facility type / service lines | MEDUI.FACILITY.TYPE.1 | ✔ | ambulatory lines | ✔ |
| Billing workflow | 19UCED | ✔ | defaults link | ✔ |
| Navigation / RBAC | navigationAuthorization | ✔ | CLINIC_CARE + tech | ✔ |
| Technician capabilities | D4B.3 | ✔ | Clinic Care eligibility | ✔ |
| Provider docs | D4B.8 | ✔ | — | ✔ |
| Follow-ups / encounters / orders | Existing | ✔ | metric contracts | ✔ |
| Print letterhead | printFacilityHeader | ✔ | operational address | ✔ |
| Longitudinal clinical domains | Constitution | ✔ | — | ✔ |

---

## 7. Authorization conclusion (updated)

| Actor | Clinic Care shell | Tech-safe Nursing/MA | Provider docs | Lab | Rad | ED/Hospital (pure Clinic/UC) |
|-------|-------------------|----------------------|---------------|-----|-----|------------------------------|
| Technician (authorized) | ✔ | ✔ projection only | ✖ | role+module | role+module | ✖ unless hybrid + separately authorized |
| Front Desk | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| RN / Provider | ✔ | RN ✔ / Provider ✖ | Provider ✔ | gated | gated | ✖ unless hybrid |

Shell / projection visibility **does not** grant provider documentation, diagnosis, problem-list mutation, provider orders, prescribing, independent nursing assessment, unrestricted MAR, disposition completion, or nurse/provider signature authority.

---

## 8. Documented deferrals

1. Full colorful Clinic Care trackboard UI  
2. Visit status workflow UX / rooming redesign  
3. Facility-scoped trackboard filter UI  
4. Deep Clinic Care menu beyond placeholder  

→ **Next phase: MEDUI.D4C.2 — Clinic Care Shell and Color Clinical Trackboard**

---

## 9. Security / isolation

- Admin/platform principal for facility profile writes  
- Client ownership/capability escalation keys rejected  
- Facility-scoped membership unchanged  
- Capabilities derived server-side from type + profile + service lines + role codes  
- Facility module eligibility ≠ user authorization; assignment ≠ authorization; projection ≠ source authority  

---

## 10. Production limitations

- Clinic Care page is a foundation placeholder (no live metric counts yet)  
- Existing DB facilities with explicit hospital-shaped service lines keep those lines until admin resets  
- Full trackboard requires D4C.2  

---

## 11. Release prerequisites

1. Apply migration `20261027120000_clinic_facility_care_profile_d4c1`  
2. Build `@medora/shared`, `@medora/api`, `@medora/web`  
3. Smoke: create Clinic facility → Clinic Care nav for RN **and** authorized technician; confirm ED/Hospital hidden  
4. Smoke: Lab tech sees Lab when Lab module on; Rad tech sees Rad when Rad module on  
5. Smoke: technician does **not** gain provider documentation  
6. Smoke: hybrid UC+EMERGENCY lines → ED visible only when separately authorized  

---

## 12. Closure

**D4C.1 may be closed** as **CERTIFIED WITH DOCUMENTED DEFERRALS** after human review of this uncommitted tree (including technician eligibility correction + migration timestamp governance note).
