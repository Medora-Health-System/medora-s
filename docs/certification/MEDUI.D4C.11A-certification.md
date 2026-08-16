# MEDUI.D4C.11A — Certification Report

**Title:** Enterprise Workforce Profession Authority Hardening  
**Date:** 2026-08-16  
**Branch:** `d5a5-enterprise-dental-complete-clinical-board`  
**HEAD (base):** `e1420730d1242cf3394cdf54ac2af859c5a76410`  
**STOP:** not committed / not pushed / not deployed.

---

## 1. Verdict

**MEDUI.D4C.11A — CERTIFIED (local hardening complete).**

Corrected unsafe RoleCode collapses (hygienist/assistant no longer PROVIDER/FRONT_DESK), gated dental prescribe/sign to dentist/admin provider authority, fixed multi-department assignment uniqueness, and made unknown PROVIDER backfill `PROVIDER_UNSPECIFIED` (never invent MD/DO/PA/NP). Clinic + Dental + inpatient workforce readiness preserved without inpatient UI.

---

## 2. Branch / HEAD

- Branch: `d5a5-enterprise-dental-complete-clinical-board`
- Base HEAD: `e1420730d` (D5A.5C)
- Working tree: uncommitted D4C.11 + D4C.11A + related dental/auth wiring

---

## 3. Profession registry complete list

**Admin picker (`ADMIN_PROFESSION_CODES`):**  
ADMINISTRATOR, ADMINISTRATION, PHYSICIAN_MD, PHYSICIAN_DO, RESIDENT_PHYSICIAN, PHYSICIAN_ASSISTANT, NURSE_PRACTITIONER, MEDICINE, PROVIDER_UNSPECIFIED, DENTIST, DENTAL_HYGIENIST, DENTAL_ASSISTANT, DENTAL_TECHNICIAN, REGISTERED_NURSE, LICENSED_PRACTICAL_NURSE, PATIENT_CARE_TECHNICIAN, NURSING, SOCIAL_WORKER, PHYSICAL_THERAPIST, OCCUPATIONAL_THERAPIST, SPEECH_LANGUAGE_PATHOLOGIST, RESPIRATORY_THERAPIST, DIETITIAN, CASE_MANAGER, PHARMACIST, PHARMACY_TECHNICIAN, TECHNICIAN, BILLING, FRONT_DESK

**Persisted aliases / legacy:** PROVIDER, RN, PHARMACY, LEGACY_PROVIDER, PROVIDER_UNSPECIFIED, MEDICINE, ADMINISTRATION

SSoT: `packages/shared/src/auth/enterpriseWorkforceProfessionD4c11.ts`

---

## 4. Existing RoleCode audit

Assignable: ADMIN, PROVIDER, RN, PHARMACY, FRONT_DESK, LAB, RADIOLOGY, BILLING, PATIENT_CARE_TECH (+ platform MEDORA_SUPER_ADMIN).

**Documented gaps (`D4C11A_ROLECODE_GAPS`):** no ALLIED_HEALTH / DENTAL_HYGIENIST / DENTAL_ASSISTANT RoleCodes. **No RoleCode-per-profession explosion** in this milestone.

---

## 5. Profession → Role mapping (hardened)

| Profession | RoleCode | Notes |
|------------|----------|-------|
| PHYSICIAN_MD/DO, RESIDENT, PA, NP, MEDICINE, PROVIDER_UNSPECIFIED, DENTIST | PROVIDER | Provider family / dentist only |
| DENTAL_HYGIENIST | **PATIENT_CARE_TECH** | Was incorrectly PROVIDER |
| DENTAL_ASSISTANT | **PATIENT_CARE_TECH** | Was incorrectly FRONT_DESK |
| DENTAL_TECHNICIAN | PATIENT_CARE_TECH | Unchanged |
| RN / LPN / NURSING | RN | |
| PT/OT/SLP/RT/SW/CM/DIETITIAN / PCT | PATIENT_CARE_TECH | Allied gap documented |
| PHARMACIST / PHARMACY_TECH | PHARMACY | |
| ADMINISTRATOR / ADMINISTRATION | ADMIN | |
| BILLING / FRONT_DESK | same | |

---

## 6. Profession → capability mapping

| Profession | Dental shell | Chart domains | Prescribe/sign | Procedures |
|------------|--------------|---------------|----------------|------------|
| DENTIST | Yes | Full + DENTAL_PROVIDER | Yes | Yes |
| DENTAL_HYGIENIST | Yes | Doc/odontogram/perio/images | **No** | No |
| DENTAL_ASSISTANT | Yes | Consent (+ view) | No | No |
| DENTAL_TECHNICIAN | Yes | Images | No | No |
| PHYSICIAN_MD + CLINIC | No (unless dental assignment) | — | — | — |

Clinic provider docs/orders/prescribe remain RoleCode.PROVIDER ∩ clinic entitlement — hygienist no longer receives PROVIDER.

---

## 7. Provider subtype proof

Automated: MD/DO/Resident/PA/NP → `roleCode: PROVIDER` with distinct `professionCode`; Clinic entitlement allowed. Attribution fields remain `professionCode` on membership.

---

## 8. Dental subtype proof

Automated: Dentist prescribe/sign true; Hygienist perio true, prescribe/sign/procedures false; Assistant shell without provider; MD+CLINIC Dental denied.

---

## 9. Inpatient workforce readiness proof

All required attending/resident/APP/nursing/ancillary/pharmacy professions selectable and mapped with preferred departments (`inpatientRoutingReady`). **No inpatient boards built.**

---

## 10. Credential model audit

| Field | On User today? | Shown when |
|-------|----------------|------------|
| first/last/email | Yes | Always (create/edit) |
| billingNpi / taxonomy / name override | Yes | PROVIDER_BILLING + DENTAL_PROVIDER profiles |
| degree / license # / jurisdiction / expiration / DEA / supervisor | **No** | Deferred — documented in `DEFERRED_CREDENTIAL_FIELDS` |

No second provider profile table. Conditional UI uses `showsProviderBillingCredentialFields`.

---

## 11. Multi-department assignment proof

**Defect:** unique `(userId, facilityId, professionCode)` blocked MD+CLINIC+ED+MEDSURG.

**Fix:** expression unique  
`(userId, facilityId, professionCode, COALESCE(departmentId, zero-uuid-text))`  
Admin conflict key = facility + profession + department. Automated test: three MD rows different depts OK; same dept conflict.

---

## 12. Historical compatibility / backfill proof

- Inference: unknown PROVIDER → `PROVIDER_UNSPECIFIED` (never MD vs DO).
- PROVIDER + DENTAL dept → DENTIST (department-proven only).
- Migration SQL (D4C.11) updated for fresh installs to use `PROVIDER_UNSPECIFIED`.
- Local DBs that already backfilled `MEDICINE` remain valid legacy (not rewritten).

---

## 13. Clinic regression proof

Automated entitlement: MEDICINE / PROVIDER_UNSPECIFIED / PHYSICIAN_* + CLINIC → allow; Dental denied without dental profession. Web admin assignment tests pass. Clinic nav/capability contracts from D4C.11 suite remain green in shared runs.

---

## 14. Facility Admin proof

Entitlement: facility ADMIN → Dental/Clinic allowed (`FACILITY_ADMIN_DEFAULT`). Authoring remains attributed to admin user (D5A.5C unchanged).

---

## 15. Platform Admin proof

`MEDORA_SUPER_ADMIN` alone → entitlement deny (`PLATFORM_OPERATOR_ONLY`).

---

## 16. Migration SQL

**D4C.11** `20261111120000_d4c11_workforce_profession_code` — additive `professionCode`, backfill, NOT NULL, drop old role unique, unique on profession (superseded by 11A).

**D4C.11A** `20261112120000_d4c11a_profession_department_assignment_unique` — drop profession-only unique; create COALESCE department expression unique.

---

## 17. Migration / index safety

- Additive profession column (already applied).
- 11A index change is non-destructive (no role rewrite).
- Expression unique prevents duplicate null-department collisions.
- Prisma schema documents DB-enforced expression unique (no Prisma `@@unique` that would fight NULL semantics).

---

## 18. Files changed (hardening focus)

- `enterpriseWorkforceProfessionD4c11.ts` — role maps, ADMINISTRATOR, PROVIDER_UNSPECIFIED, gaps, credentials
- `adminUserAssignment.ts` — multi-dept conflict keys
- `enterpriseDentalEncounterAuthoringD5a5b.ts` — prescribe/sign gate
- `enterpriseDentalServiceLineNavigationD5a2.ts` — PATIENT_CARE_TECH dental support
- `admin-users.service.ts` — upsert by profession+department
- `schema.prisma` + `20261112120000_...` migration
- `20261111120000_.../migration.sql` backfill → PROVIDER_UNSPECIFIED
- i18n FR/EN labels + duplicate message
- Tests: `enterpriseWorkforceProfessionD4c11a.test.ts` (+ updates)

---

## 19. Tests / counts

| Suite | Tests |
|-------|-------|
| D4C.11A hardening | 10 |
| D4C.11 | 9 |
| D4A.4.0W | 10 |
| Dental authoring D5A.5B | 9 |
| Dental navigation D5A.2 | 11 |
| Web admin assignment | 9 |
| **Total this gate** | **58** |

All passed.

---

## 20. Builds

| Package | Result |
|---------|--------|
| `@medora/shared` | pass |
| `@medora/api` | pass (prior nest build; regenerate after migrate as needed) |
| Prisma validate | pass |

---

## 21. Prisma validate

**pass**

---

## 22. git diff --check

**clean**

---

## 23. Migration status local

- `20261111120000_d4c11_workforce_profession_code` — **applied**
- `20261112120000_d4c11a_profession_department_assignment_unique` — **applied** (after COALESCE text fix)

---

## 24. Production migration status

**Not deployed.** Production must apply both migrations in order on release. Uncommitted branch only.

---

## 25. Remaining deferrals

- License/DEA/supervisor schema + UI
- Dedicated ALLIED_HEALTH RoleCode (future — not this milestone)
- Inpatient PT/OT/RT/SW boards
- Further Dental product phases
- Blind rewrite of local MEDICINE → PROVIDER_UNSPECIFIED (left as compatible legacy)

---

## 26. Certification recommendation

**CERTIFY MEDUI.D4C.11A.** Safe to proceed toward commit of D4C.11+D4C.11A workforce foundation after product review. Do not start inpatient UI or Dental D5A.6 from this gate.

---

## 27. Git status

Dirty working tree on feature branch (D4C.11 / D4C.11A / dental auth prerequisites). Uncommitted.

---

## 28. Commit status

**NOT COMMITTED**

---

## 29. Push status

**NOT PUSHED**
