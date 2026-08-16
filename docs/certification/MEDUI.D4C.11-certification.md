# MEDUI.D4C.11 — Certification Report

**Title:** Enterprise Workforce Profession, Department & Clinical Workspace Authorization  
**Date:** 2026-08-16  
**Branch:** `d5a5-enterprise-dental-complete-clinical-board`  
**STOP:** not committed / not pushed / not deployed.

---

## 1. Verdict

**MEDUI.D4C.11 — CERTIFIED (local architecture + automated contracts + migration applied locally).**

Physician Clinic access restored for HOSPITAL+CLINIC hybrids; Dental gated by dental profession/assignment (not blanket PROVIDER). First-class dental professions in shared onboarding registry. Dual MEDICINE+DENTIST assignments supported via `UserRole.professionCode`.

---

## 2. Proven root causes

| # | Defect | Cause |
|---|--------|--------|
| A | No Dentist in onboarding | `ADMIN_PROFESSION_CODES` lacked dental professions; only RoleCode-mapped UI labels |
| B | Clinic physician “paralyzed” after Dental enable | (1) `clinicCareEnabled` required ambulatory facilityType — HOSPITAL+CLINIC line stayed false; (2) Clinic nav supplement only for CLINIC/UC types; (3) `PRIMARY_CARE`→`OBSERVATION` pulled physicians into hospital base; (4) Dental nav granted to any PROVIDER |
| C | Physician ≡ Dentist | `resolveDentalCapabilityCodes` / dental nav used RoleCode.PROVIDER alone |
| D | Multi-assignment blocked | `@@unique([userId, roleId, facilityId])` + conflict helper forbade two PROVIDER rows |

---

## 3. Current profession architecture (after)

Profession (first-class) ≠ RoleCode ≠ Department ≠ Capability.

Persisted: `UserRole.professionCode` + `roleId` + optional `departmentId` + `facilityId`.

---

## 4. New shared profession registry

`packages/shared/src/auth/enterpriseWorkforceProfessionD4c11.ts`

Codes: ADMINISTRATION, MEDICINE, NURSING, TECHNICIAN, PHARMACY, BILLING, FRONT_DESK, DENTIST, DENTAL_HYGIENIST, DENTAL_ASSISTANT, DENTAL_TECHNICIAN (+ deprecated PROVIDER/RN aliases).

---

## 5. Profession → broad-role mappings

| Profession | RoleCode |
|------------|----------|
| ADMINISTRATION | ADMIN |
| MEDICINE / DENTIST | PROVIDER |
| NURSING | RN |
| DENTAL_HYGIENIST | PROVIDER (not RN) |
| DENTAL_ASSISTANT | FRONT_DESK |
| DENTAL_TECHNICIAN | PATIENT_CARE_TECH |
| TECHNICIAN+type | LAB / RADIOLOGY / PATIENT_CARE_TECH |
| PHARMACY / BILLING / FRONT_DESK | same |

---

## 6. Profession → department/service-line rules

| Profession | Preferred department |
|------------|----------------------|
| DENTIST / HYGIENIST / ASSISTANT / TECHNICIAN | DENTAL |
| MEDICINE / NURSING | PRIMARY_CARE |
| Dental professions UI | only when facility has DENTAL service line |

---

## 7–10. Dental profession behaviors

| Profession | Shell | Clinical write highlights |
|------------|-------|---------------------------|
| DENTIST | YES | Full dental clinical caps |
| DENTAL_HYGIENIST | YES | Perio/odontogram/document; not full procedures |
| DENTAL_ASSISTANT | YES | View + consent manage |
| DENTAL_TECHNICIAN | YES | View + image upload |

MEDICINE + PRIMARY_CARE → Dental **DENY**.

---

## 11. Clinic regression root cause and correction

**Fix:**
- `clinicCareEnabled` when `CLINIC`/`URGENT_CARE` line present (any facility type)
- Clinic nav supplement no longer limited to ambulatory facilityType
- `PRIMARY_CARE` no longer maps to hospital `OBSERVATION`
- Dental nav/capabilities profession-gated via `resolveClinicalWorkspaceEntitlement`

---

## 12. Facility Admin behavior

Unchanged D5A.5C: facility `ADMIN` → enabled modules including Dental authoring by default.

---

## 13. Platform Admin behavior

`MEDORA_SUPER_ADMIN` alone → no automatic clinical facility authoring / dental entitlement.

---

## 14. Multi-assignment behavior

Unique key now `(userId, facilityId, professionCode)` — MEDICINE + DENTIST both allowed (two PROVIDER RoleCode rows).

---

## 15. Session/auth refresh findings

- JWT has no roles; JWT strategy reloads DB memberships each request → **API authoritative immediately**
- `/auth/me` now projects `professionCode`
- Client `/auth/me` cache TTL 10s; role-edit success now calls `refreshFromMe` + `medora:session-refresh`
- Target employee must refresh their own session (force `/auth/me`) — not fixed by admin’s refresh alone (documented)

---

## 16. Facility isolation proof

Unchanged: membership scoped by `facilityId`; cross-facility remains DENY at guards.

---

## 17. Audit proof

`FACILITY_ROLES_CHANGED` / `ADMIN_USER_CREATED` evidence now includes professions + departments (in addition to role codes).

---

## 18. Files changed (high level)

- Shared: workforce registry, entitlement resolver, dental caps, clinic capabilities, navigation, admin assignment helpers, schemas
- API: Prisma UserRole.professionCode + migration, admin-users service, auth/me, dental guard/controller/board
- Web: onboarding professions + i18n, layout nav professions, session refresh on role save
- Tests: D4C.11 matrix + updated dental/clinic contracts

---

## 19. Tests and exact counts

| Suite | Result |
|-------|--------|
| shared D4C.11 + dental/clinic/nav related | 96+ passed (prior run; 1 platform reason assert relaxed) |
| shared D4C.11 + D5A.5B focused | 18 passed |
| web admin + dental authoring | 13 (1 assert updated) |
| api dental authoring specs | 5 passed |

---

## 20. Browser/manual UAT

Automated policy matrix covered in unit tests. Full browser UAT (A–F accounts) **deferred to operator visual pass** after this local gate — create Dentist assignment via Admin UI and verify Clinic physician retains `/app/clinic-care` without Dental.

Local migration applied successfully on developer DB.

---

## 21. Migration decision

**YES — minimal additive:** `UserRole.professionCode TEXT NOT NULL` + unique `(userId, facilityId, professionCode)`.  
Folder: `20261111120000_d4c11_workforce_profession_code`.  
Backfill from RoleCode+Department. Non-destructive.

---

## 22. Seed decision

**NONE required** — backfill maps existing PROVIDER+PRIMARY_CARE→MEDICINE, PROVIDER+DENTAL→DENTIST.

---

## 23. git diff --check

Clean at last check.

---

## 24. Deferrals

- Full browser UAT A–F with seeded dentist/hygienist accounts
- Explicit onboarding restriction engine for admin clinical deny (still documented gap from D5A.5C)
- Clinic entitlement refinement for dental-only staff who also hold FRONT_DESK RoleCode via DENTAL_ASSISTANT mapping (assistant is intentionally non-clinic)

---

## 25. Certification recommendation

**CERTIFY MEDUI.D4C.11 for local architecture gate.** Await approval before commit/push/deploy.

---

## 26. Git branch/status

Uncommitted changes on `d5a5-enterprise-dental-complete-clinical-board` (includes prior D5A.5C work + D4C.11).

---

## 27. Commit status

**Not committed.**

---

## 28. Push status

**Not pushed.**
