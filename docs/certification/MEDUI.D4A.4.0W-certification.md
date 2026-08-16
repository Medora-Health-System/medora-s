# MEDUI.D4A.4.0W — Certification Report

**Title:** Enterprise Workforce Profession, Credential & Clinical Routing Authority  
**Date:** 2026-08-16  
**Branch:** `d5a5-enterprise-dental-complete-clinical-board`  
**Base HEAD:** `e1420730d1242cf3394cdf54ac2af859c5a76410` (`fix(dental): allow facility admin clinical authoring D5A.5C`)  
**STOP:** not committed / not pushed / not deployed.

---

## 1. Verdict

**MEDUI.D4A.4.0W — CERTIFIED (local architecture + automated contracts + builds).**

One enterprise workforce profession SSoT extended for Clinic / Dental / inpatient-ready allied & nursing professions. Provider-family MD/DO/Resident/PA/NP derive `RoleCode.PROVIDER` without RoleCode explosion. Dental remains profession-gated. Clinic physician access preserved. Credential UI reuses existing User NPI/taxonomy/name fields; license/DEA deferred (no schema invention). Always-on Cursor rule added.

---

## 2. Branch

`d5a5-enterprise-dental-complete-clinical-board`

---

## 3. Base HEAD

`e1420730d1242cf3394cdf54ac2af859c5a76410`

---

## 4. Current workforce model audit

| Layer | Authority | Status |
|-------|-----------|--------|
| Profession | `UserRole.professionCode` (TEXT) + shared registry | Extended (D4A.4.0W catalog) |
| System role | Prisma `RoleCode` / `UserRole.roleId` | Unchanged — derived from profession |
| Department | `Department` + `DepartmentCode` + optional `UserRole.departmentId` | Unchanged |
| Specialty | Care profile / dental specialties — not DepartmentCode | Unchanged |
| Capability | Workspace entitlement + dental capability resolver | Profession-refined |
| Credential | `User.billingNpi`, `billingTaxonomyCode`, `billingNameOverride`, name/email | Reused; license/DEA **deferred** |

Concepts remain separate. No DentistUser / TherapistUser / parallel provider identity.

---

## 5. Existing profession values (preserved)

Legacy / prior codes still valid: `ADMINISTRATION`, `MEDICINE`, `PROVIDER` (alias→MEDICINE), `NURSING`, `RN` (alias→NURSING), `TECHNICIAN`, `PHARMACY`, `BILLING`, `FRONT_DESK`, `DENTIST`, `DENTAL_HYGIENIST`, `DENTAL_ASSISTANT`, `DENTAL_TECHNICIAN`, plus new `PROVIDER_UNSPECIFIED`.

---

## 6. Existing system roles

`ADMIN`, `PROVIDER`, `RN`, `PHARMACY`, `FRONT_DESK`, `LAB`, `RADIOLOGY`, `BILLING`, `PATIENT_CARE_TECH`, (+ platform `MEDORA_SUPER_ADMIN`). **No new RoleCodes** for MD/DO/NP/PA.

---

## 7. Existing department authority

Prisma `DepartmentCode`: PRIMARY_CARE, LAB, RAD, PHARM, INPATIENT, EMERGENCY, ICU, MEDSURG, OBSERVATION, OBGYN, PEDIATRICS, BEHAVIORAL_HEALTH, TELEMETRY, LABORATORY, RADIOLOGY, DENTAL.

Profession → valid departments filtered via `filterDepartmentsForProfession` ∩ facility department rows ∩ service lines.

---

## 8. Existing provider credential authority

**Reuse:** `User.firstName`, `lastName`, `email`, `billingNpi`, `billingTaxonomyCode`, `billingNameOverride`.  
**Deferred (no migration this milestone):** middle name, degree letters, license # / jurisdiction / expiration, DEA, supervising provider.

---

## 9. Architecture decision

**Extend existing TEXT `professionCode` + shared SSoT** (`enterpriseWorkforceProfessionD4c11.ts` / D4A.4.0W constants).  
**No new profession migration for D4A.4.0W** (additive string codes).  
**No second provider profile table.**  
**Credential expansion deferred** until product requires license/DEA persistence.

---

## 10. New / extended professions

Provider family: `PHYSICIAN_MD`, `PHYSICIAN_DO`, `RESIDENT_PHYSICIAN`, `PHYSICIAN_ASSISTANT`, `NURSE_PRACTITIONER` (+ legacy `MEDICINE` / `PROVIDER_UNSPECIFIED`).  
Nursing precise: `REGISTERED_NURSE`, `LICENSED_PRACTICAL_NURSE`, `PATIENT_CARE_TECHNICIAN`.  
Allied: `SOCIAL_WORKER`, `PHYSICAL_THERAPIST`, `OCCUPATIONAL_THERAPIST`, `SPEECH_LANGUAGE_PATHOLOGIST`, `RESPIRATORY_THERAPIST`, `DIETITIAN`, `CASE_MANAGER`.  
Pharmacy precise: `PHARMACIST`, `PHARMACY_TECHNICIAN`.  
Dental set preserved.

---

## 11. Profession → system-role mapping

| Profession | RoleCode |
|------------|----------|
| PHYSICIAN_MD/DO, RESIDENT, PA, NP, MEDICINE, DENTIST, DENTAL_HYGIENIST | PROVIDER |
| REGISTERED_NURSE, LPN, NURSING, SOCIAL_WORKER, CASE_MANAGER | RN |
| PATIENT_CARE_TECHNICIAN, PT/OT/SLP/RT/DIETITIAN, DENTAL_TECHNICIAN | PATIENT_CARE_TECH |
| PHARMACIST / PHARMACY_TECHNICIAN / PHARMACY | PHARMACY |
| DENTAL_ASSISTANT | FRONT_DESK |
| ADMINISTRATION | ADMIN |
| TECHNICIAN + type | LAB / RADIOLOGY / PATIENT_CARE_TECH |
| BILLING / FRONT_DESK | same |

---

## 12. Profession → valid department routing

| Profession | Preferred | Valid (examples) |
|------------|-----------|------------------|
| PHYSICIAN_* / MEDICINE / PA / NP | PRIMARY_CARE | ambulatory + hospital depts |
| RESIDENT_PHYSICIAN | MEDSURG | same provider set |
| DENTIST / dental support | DENTAL | DENTAL only |
| RESPIRATORY_THERAPIST | ICU | hospital depts |
| PT/OT/SLP/SW/CM/DIETITIAN | MEDSURG | hospital (+ ambulatory where listed) |
| PHARMACIST | PHARM | PHARM |

UI filters via shared `filterDepartmentsForProfession` — not a hardcoded separate list.

---

## 13. Provider credential data model

Existing User billing identity fields only. Onboarding shows NPI/taxonomy/name when `showsProviderBillingCredentialFields(profession)` (PROVIDER_BILLING or DENTAL_PROVIDER profiles). Hygienist/assistant/RN do not get billing credential panel by profession.

---

## 14. Dental routing proof

Automated: Dentist → Dental allow + signing authority; Hygienist/Assistant → shell without dentist sign/procedures; MD+CLINIC → Dental deny. Capability resolver still grants dentist procedures / hygienist perio only.

---

## 15. Clinic regression proof

Automated: `PHYSICIAN_MD` + CLINIC allow; `MEDICINE` + CLINIC allow; Dentist-only → Clinic deny. Prior D4C.11 hospital+CLINIC line `clinicCareEnabled` + nav contracts remain in suite.

---

## 16. Inpatient workforce readiness proof

`inpatientRoutingReady: true` on resident, nursing precise, RT/PT/OT/SLP/SW/CM/dietitian/pharmacist definitions. Preferred depts set (e.g. RT→ICU, Resident→MEDSURG). **No inpatient documentation boards built.**

---

## 17. Facility ADMIN behavior

Unchanged D5A.5C: facility `ADMIN` → dental/clinic entitlement `FACILITY_ADMIN_DEFAULT` when module enabled.

---

## 18. Platform admin behavior

`MEDORA_SUPER_ADMIN` alone → workspace entitlement deny (`PLATFORM_OPERATOR_ONLY`). Synthetic `/auth/me` projection uses profession `ADMINISTRATION` (not clinical impersonation).

---

## 19. Billing attribution impact

No new billing engine. Provider NPI/taxonomy/name remain on User for rendering-provider attribution. Profession available on membership for future billing classification. Actions still attributed to acting `userId`.

---

## 20. Audit attribution impact

No impersonation path. Admin user create/update already audit professions. Actor remains authenticating user.

---

## 21. Historical compatibility

Do not guess MD vs DO from `RoleCode.PROVIDER`. Inference → `MEDICINE`. Aliases: `PROVIDER`→`MEDICINE`, `RN`→`NURSING`. Edit form maps unspecified/legacy to picker-safe codes. Historical rows not rewritten by this milestone.

---

## 22. Files changed (D4A.4.0W focus + related D4C.11 wiring on branch)

**New**
- `packages/shared/src/auth/enterpriseWorkforceProfessionD4c11.ts` (expanded catalog)
- `packages/shared/src/auth/enterpriseWorkforceProfessionD4a40w.test.ts`
- `packages/shared/src/auth/enterpriseWorkforceProfessionD4c11.test.ts`
- `packages/shared/src/auth/enterpriseClinicalWorkspaceEntitlementD4c11.ts`
- `.cursor/rules/enterprise-workforce-profession-identity.mdc`
- `docs/certification/MEDUI.D4A.4.0W-certification.md` (this file)
- Prior on branch: D4C.11 migration + cert (prerequisite)

**Updated (selected)**
- `packages/shared/src/auth/adminUserAssignment.ts`
- `apps/web/src/features/admin/adminUserAssignmentForm.ts`
- `apps/web/src/features/admin/AdminUserAssignmentSection.tsx`
- `apps/web/app/app/admin/users/page.tsx`
- `apps/web/src/i18n/messages/en.ts` / `fr.ts`
- API auth/admin/dental guards for professionCode + TS build fixes

---

## 23. Tests and exact counts

| Suite | Files | Tests |
|-------|-------|-------|
| Shared D4A.4.0W | 1 | **10** |
| Shared D4C.11 | 1 | **9** |
| Web admin assignment | 1 | **9** |
| **Total run for this milestone gate** | **3** | **28** |

All passed.

---

## 24. TypeScript result

- `@medora/shared` `tsc` build: **pass**
- `apps/web` `tsc --noEmit`: **pass**
- `@medora/api` `nest build`: **pass**

---

## 25. Shared / API / Web builds

| Package | Result |
|---------|--------|
| `@medora/shared` | pass |
| `@medora/api` | pass |
| `@medora/web` `next build` | pass |

---

## 26. Prisma validate

**pass** — schema valid.

---

## 27. Migration decision (D4A.4.0W)

**No new migration required for D4A.4.0W.**  
`UserRole.professionCode` TEXT already exists (D4C.11). New profession codes are additive strings. Credential license/DEA columns **explicitly deferred**.

---

## 28. Migration folder if applicable

D4A.4.0W: **none**.  
Prerequisite already on branch: `apps/api/prisma/migrations/20261111120000_d4c11_workforce_profession_code/`

---

## 29. Seed decision

**No seed change.** Admins update precise profession on existing users when known.

---

## 30. git diff --check

**clean** (no whitespace errors reported).

---

## 31. Manual UAT matrix

| ID | Scenario | Expect |
|----|----------|--------|
| A | Onboard PHYSICIAN_MD + PRIMARY_CARE | PROVIDER; Clinic OK; Dental denied |
| B | PHYSICIAN_DO + CLINIC | same baseline |
| C | RESIDENT + MEDSURG | PROVIDER; preferred MEDSURG |
| D–E | PA / NP + CLINIC | PROVIDER; Clinic OK |
| F | DENTIST + DENTAL | Dental authoring + sign |
| G | Hygienist | Dental shell; no dentist procedures |
| H | Assistant | appropriate shell; cannot dentist-sign |
| I | RT | ICU preferred; not provider family |
| J | PT/OT/SLP | MEDSURG routing readiness |
| K | SW / Case manager | inpatient routing readiness |
| L | Facility ADMIN | module admin clinical per D5A.5C |
| M | MEDORA_SUPER_ADMIN only | no chart authoring |
| N | Cross-facility | no leakage (facility membership) |
| O | Legacy MEDICINE | Clinic preserved |
| P | Nurse / pharmacy / billing / front desk | no regression |

---

## 32. Deferrals

- License # / jurisdiction / expiration / DEA / supervising provider schema
- Inpatient PT/OT/RT/SW/CM documentation boards
- D5A.6 and further Dental product work
- Charge-nurse as distinct profession (assignment/responsibility unless later proven)
- RoleCode split for allied vs nursing (mapped to existing RN / PATIENT_CARE_TECH)

---

## 33. Certification recommendation

**CERTIFY MEDUI.D4A.4.0W** for workforce/profession/onboarding/routing authority. Proceed to inpatient documentation phases only by consuming this SSoT — do not invent parallel workforce engines.

---

## 34. git status

Working tree dirty on `d5a5-enterprise-dental-complete-clinical-board` (~39 paths including D4C.11 + D4A.4.0W + dental authoring prerequisite work). Uncommitted.

---

## 35. Commit status

**NOT COMMITTED** (per STOP gate).

---

## 36. Push status

**NOT PUSHED** (per STOP gate).
