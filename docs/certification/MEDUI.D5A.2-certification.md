# MEDUI.D5A.2 — Certification

**Certification id:** `MEDUI.D5A.2`  
**Branch:** `d5a2-enterprise-dental-service-line-navigation`  
**Base:** `origin/main` @ `5e7cc19e5033b9e5185907bb6d60dffc6e84af2c` (PR #84 D5A.1 + PR #83 D4C.7J)  
**Phase:** Phase 1 Clinic MVP  
**Verdict:** **CERTIFIED WITH DOCUMENTED DEFERRALS**

## Summary

Dental is registered as enterprise service line `DENTAL` with capability-aware navigation (`DENTAL_CARE` / Soins dentaires), facility onboarding toggles + specialty configuration, dashboard and Active Dental Workspace **shells**, and server-side access enforcement. No duplicated Patient/Encounter/Appointment authorities. No odontogram, periodontal, orthodontic case, or treatment-plan clinical implementation.

## Tests (exact counts)

| Suite | Result |
|-------|--------|
| Shared D5A.2 | **11 passed** |
| Shared D5A.1 regression | **7 passed** |
| Web D5A.2 guards + admin form | **9 passed** |
| API `DentalCareReadAccessGuard` | **4 passed** |

Combined focused: **31 passed**.

## Validation

| Check | Result |
|-------|--------|
| `npm run build --workspace=@medora/shared` | pass |
| `npm run build --workspace=@medora/api` | pass |
| `npm run build --workspace=@medora/web` | pass |
| Web `tsc --noEmit` | pass |
| `npx prisma validate` | pass |
| `git diff --check` | pass |
| Migration | **none** |
| Seed | **unchanged** |

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Patient | `Patient` | ✔ | — | ✔ |
| Encounter | `Encounter` | ✔ | — | ✔ |
| Appointment | `Appointment` | ✔ | shell route only | ✔ |
| Facility service lines | `MedoraServiceLine` | ✔ | ✔ `DENTAL` | ✔ |
| Care profile | `facilityCareProfileJson` | ✔ | ✔ `dentalSpecialties` | ✔ |
| Navigation | `NavigationArea` + sidebar | ✔ | ✔ `DENTAL_CARE` | ✔ |
| Facility identity (D4C.7I) | operational address / print | ✔ | — | ✔ |
| Orders / Results / Billing / Follow-up | enterprise engines | ✔ | shell references | ✔ |
| DentalPatient / DentalEncounter | — | — | — | ✔ |

## Certification gates

| Gate | Status |
|------|--------|
| Dental as enterprise service line | ✔ |
| No duplicated authorities | ✔ |
| Navigation works (area + sidebar + FR/EN) | ✔ |
| Capability model works | ✔ |
| Dashboard shell loads | ✔ |
| Workspace routing works | ✔ |
| Facility onboarding supports Dental + specialties | ✔ |
| Localization complete | ✔ |
| No Prisma migration / no seed | ✔ |
| TypeScript / builds / Prisma / diff-check | ✔ |
| No odontogram / periodontal / ortho / treatment-plan engines | ✔ |

## Documented deferrals

1. Live appointment / worklist counts (D5A.3+) — placeholders only.  
2. Odontogram persistence and UI (D5A.4).  
3. Periodontal chart (D5A.6).  
4. OrthodonticCase authority (D5A.7).  
5. Treatment-plan versioning UI (D5A.5).  
6. Per-user capability grants table (optional later; D5A.2 derives from profession ∩ facility).  
7. Full Active Dental Workspace clinical panels (D5A.3+).  

## Commit / push / merge

**DO NOT COMMIT. DO NOT PUSH. DO NOT MERGE.** (per milestone instruction)
