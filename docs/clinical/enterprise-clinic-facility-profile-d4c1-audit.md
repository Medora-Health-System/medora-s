# MEDUI.D4C.1 — Clinic / Urgent Care Facility Profile Audit

**Date:** 2026-07-27  
**Branch:** `d4c1-clinic-facility-profile-foundation`  
**Baseline HEAD:** `3ebf6a8160f21ea9ab0b26a3764691df9737d71e` (= `origin/main`, PR #60 D4B.8 merged)  
**Scope:** Read-only audit completed before implementation. No coding until this audit was finalized.

---

## 1. Baseline gate (Phase A)

| Check | Result |
|-------|--------|
| Branch | `d4c1-clinic-facility-profile-foundation` ✔ |
| Working tree | Clean ✔ |
| `HEAD` == `origin/main` | ✔ `3ebf6a816…` |
| Ancestor of `origin/main` | exit `0` ✔ |
| Ahead/behind | `0 0` ✔ |
| D4B.8 on main (PR #60) | ✔ Present — reuse; do not depend on unmerged code |

---

## 2. Enterprise domain audit matrix

| Domain | Existing Component | Path | Status | Recommendation |
|--------|-------------------|------|--------|----------------|
| Facility identity | Prisma `Facility` | `apps/api/prisma/schema.prisma` | exists | **REUSE**; add additive JSON profile only |
| Facility types | `FacilityType` + `facilityTypeRegistry` | schema + `packages/shared/src/auth/facilityTypeRegistry.ts` | exists (`CLINIC`, `URGENT_CARE`, ED/Hospital preserved) | **REUSE** |
| Service lines | `serviceLinesJson` + resolvers | `facilityServiceLines.ts` | exists; CLINIC defaults → `OBSERVATION`→Hospital | **EXTEND** — add ambulatory `CLINIC` / `URGENT_CARE` lines |
| Care settings | Fragmented (D4B.1, EDOC, billing `AMBULATORY`, mobility) | multiple | partial | **CREATE** ambulatory care-setting authority in shared D4C.1 module — **no** new Prisma care-setting enum spanning products |
| Billing workflow | 19UCED site/mode | `facilityBillingWorkflow.ts` | exists (`CLINIC_ONLY`, `URGENT_CARE_ONLY`, hybrid) | **REUSE** |
| Module capabilities | D3E.5 deployment profiles | `facilityDeploymentProfilesV1.ts` | partial (FSER/Hospital only) | **EXTEND** Clinic/UC ambulatory capabilities |
| Navigation | `resolveNavigationProfile` / areas | `navigationAuthorization.ts` | partial — no `CLINIC_CARE` area | **EXTEND** + add `resolveFacilityNavigation` |
| Address / print | Billing address + `printFacilityHeader` | Facility billing fields; `printFacilityHeader.ts` | partial | **EXTEND** operational address + print projection |
| Role / profession | `professionResolver` + workspace auth | shared auth | exists | **REUSE**; map Clinic Care workspaces |
| Admin facility CRUD | Admin facilities API/UI | `admin-facilities.*`, `FacilityTypeServiceLineFields` | exists | **EXTEND** profile/address/modules/presets |
| Encounter workflow states | `EncounterWorkflowState` | schema | exists | **REUSE** for D4C.2 metric contracts |
| Follow-ups | `FollowUp` | schema + module | exists | **REUSE** for Follow-ups due metric |
| Orders / results | Order lifecycle + Result | schema | exists | **REUSE** for Results pending metric |
| Facility-scoped access | Membership guard + `UserRole.facilityId` | API | exists | **REUSE** |
| Facility config audit | Billing events only | `AuditAction` | missing for type/profile | **EXTEND** audit action + write on profile changes |
| Language / timezone | Facility fields | schema + defaults | exists | **REUSE** |
| D4C docs | — | — | missing | **CREATE** |
| Provider workspace | D4B.8 | shared + web | exists on main | **REUSE** — no second provider engine |
| Registration / patients / lab / rad / pharmacy / PH / billing | Existing modules | apps/* | exists | **REUSE** via capability gating — never fork |

---

## 3. Key gaps for D4C.1

1. CLINIC defaults map `OBSERVATION` → Hospital navigation (not ambulatory).
2. No `CLINIC_CARE` / ambulatory navigation area; Clinic Care menu reserved for D4C.2 (placeholder only in D4C.1).
3. No first-class ambulatory care-setting + Clinic/UC/Hybrid profile authority.
4. No Clinic/UC service-line tokens distinct from hospital Observation.
5. Deployment profiles omit Clinic/UC module capabilities.
6. Operational letterhead/address distinct from billing identity incomplete.
7. No facility care-profile audit trail.
8. No typed D4C.2 trackboard metric contracts.
9. No D4C clinical/certification docs.

---

## 4. What NOT to duplicate

| Do not create | Reuse |
|---------------|-------|
| Second Facility / facility-type taxonomy | `Facility` + `FacilityType` + registry |
| Parallel billing classification engine | 19UCED workflow |
| Parallel profession/RBAC | Existing resolvers + membership |
| Prisma care-setting enum spanning all products | Map onto D4C.1 ambulatory authority + existing vocabularies |
| Second provider/docs/signature engines | D4B.8 + enterprise docs |
| Parallel follow-up / order / result tables | Existing models |
| Full Clinic Care trackboard UI | **Defer to D4C.2** |
| Hard-coded facility names | Config-driven only |

---

## 5. D4C.2 dashboard contract (documented only — not built)

Approved UX sketch metric tiles (typed contracts in D4C.1):

| Metric | Intent |
|--------|--------|
| Today’s visits | Open ambulatory encounters for facility local “today” |
| Waiting | Workflow ≈ arrived / waiting room |
| In progress | Workflow ≈ in treatment / with clinician |
| Results pending | `RESULTS_PENDING` and/or open orders awaiting result |
| Ready for discharge / complete | `DISCHARGE_READY` / finalized-complete ambulatory |
| Follow-ups due | Open `FollowUp` due on/before today |

Full colorful trackboard + Clinic Care shell → **MEDUI.D4C.2**.

---

## 6. Architecture stance

**Medora One Shared Core** with independent presentation (ED, Obs, IP, Clinic Care). Facility configuration controls visibility. No separate Clinic app or clinical engines.

---

## 7. ENTERPRISE DOMAIN AUDIT (certification table)

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Facility identity | Prisma `Facility` | ✔ | additive JSON | ✔ |
| Facility type / service lines | MEDUI.FACILITY.TYPE.1 | ✔ | ambulatory lines + defaults | ✔ |
| Billing site / workflow | 19UCED | ✔ | — | ✔ |
| Navigation / RBAC | `navigationAuthorization` | ✔ | `CLINIC_CARE` + `resolveFacilityNavigation` | ✔ |
| Clinical docs / provider | D4B.1 / D4B.8 | ✔ | — | ✔ |
| Follow-ups / orders / results | Existing | ✔ | metric contracts only | ✔ |
| Print letterhead | `printFacilityHeader` | ✔ | operational address projection | ✔ |
| Facility config audit | — | — | create | ✔ |
| Longitudinal clinical domains | Enterprise constitution | ✔ | — | ✔ |
