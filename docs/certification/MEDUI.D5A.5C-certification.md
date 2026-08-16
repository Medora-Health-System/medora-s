# MEDUI.D5A.5C — Certification Report

**Title:** Enterprise Facility Administrator Clinical Authoring Authority  
**Date:** 2026-08-16  
**Branch:** `d5a5-enterprise-dental-complete-clinical-board`  
**STOP:** not committed / not pushed / not deployed.

---

## 1. Verdict

**MEDUI.D5A.5C — CERTIFIED** (local automated contracts + facility-admin live UAT).

Facility `ADMIN` (facility-scoped membership) may author enabled Dental clinical domains by default. Platform `MEDORA_SUPER_ADMIN` alone does not inherit clinical authoring. Production defect message “rôle PROVIDER requis” removed.

---

## 2. Root cause

Dental clinical write capabilities were granted only for `PROVIDER` role membership. Facility administrators (`RoleCode.ADMIN` on `UserRole` for the facility) received view/`DENTAL_ADMIN` only → `resolveEnterpriseDentalEncounterAuthoring` → `NO_CLINICAL_CAPABILITY` → French UI “PROVIDER requis”. API write routes were also `@RequireRoles(PROVIDER)` only.

This contradicted Medora ambulatory governance (`canAuthorAmbulatoryProviderDocumentation` = PROVIDER **or** ADMIN) and enterprise facility-admin policy.

---

## 3. Existing admin role architecture

| Concept | Representation |
|---------|----------------|
| Facility membership | `UserRole` (`userId` + `roleId` + `facilityId`, `isActive`) |
| Facility administrator | `RoleCode.ADMIN` on that facility membership |
| Platform / Medora operator | `RoleCode.MEDORA_SUPER_ADMIN` (`PLATFORM_OPERATOR_ROLE_CODE`) |
| Clinical provider | `RoleCode.PROVIDER` |
| Capabilities | Derived by `resolveDentalCapabilityCodes` from facility-scoped `roleCodes` |

No new Dental role system. No parallel persona table.

---

## 4. Platform Admin vs Facility Admin distinction

- **Facility Admin:** `roleCodes` includes `ADMIN` from **this facility’s** membership (proven by `DentalCareReadAccessGuard` before capability resolution).
- **Platform Admin alone:** `MEDORA_SUPER_ADMIN` without `ADMIN`/`PROVIDER` → **no** clinical write caps.
- Seed note: some platform principals may also hold facility `ADMIN` — clinical access then comes from that explicit facility ADMIN assignment, not from SUPER_ADMIN alone.

---

## 5. Authoritative resolver used/created

1. **`resolveFacilityClinicalAuthoringAuthority`** — `packages/shared/src/auth/enterpriseFacilityAdministratorClinicalAuthoringD5a5c.ts` (reusable facility clinical authority).
2. **`resolveDentalCapabilityCodes` / `canAuthorDentalClinicalBoard`** — grants clinical write for PROVIDER **or** facility ADMIN.
3. **`resolveEnterpriseDentalEncounterAuthoring`** — single encounter projection consumed by API + UI (unchanged entrypoint; policy updated).

Do not scatter `ADMIN \|\| PROVIDER` checks in panels — use the projection.

---

## 6. Facility scoping proof

- Guard loads memberships for `x-facility-id` only; no membership → 403.
- Live UAT: facility admin against foreign facility id → **403**.

---

## 7. Capability/module enablement proof

- Guard + capability path require Dental enabled (`serviceLinesJson` includes `DENTAL`).
- Unit: `moduleEnabled: false` / `dentalCareEnabled: false` → DENY.
- Live UAT facility: Clinique Bon Samaritain has DENTAL enabled.

---

## 8. Explicit restriction behavior

**Gap (documented, not built):** no durable onboarding flag to strip clinical authoring from a facility ADMIN while keeping ADMIN role.

Helper accepts `explicitClinicalAuthoringDenied` for future use; default for facility ADMIN = **ALLOW**.

**No migration** — do not invent a permissions engine in this milestone.

---

## 9. Authoring vs signing distinction

Audited existing Medora ambulatory pattern:

- `canAuthorAmbulatoryProviderDocumentation` = PROVIDER **or** ADMIN.
- Provider documentation **sign** endpoints already allow ADMIN alongside PROVIDER.

Dental projection: facility ADMIN gets `canSign: true` when clinical writable (aligned with ambulatory). Attribution remains the actual `userId` (no provider spoofing). Licensed-provider identity is **not** invented for the administrator.

---

## 10. Dental domains fixed

Facility ADMIN default WRITE (OPEN + Dental enabled): Evaluation (via ambulatory AUTHOR + projection), Odontogram, Periodontal, Diagnoses (evaluation/diagnostics path), Treatment Plan, Procedures, enterprise history inline, history review, documents/consents per existing front-desk assist rules, follow-up flag, Overview projection.

---

## 11. API authorization proof

- Dental write routes: `@RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)`.
- Services still enforce capability flags from facility-scoped access.
- Live UAT: ADMIN wrote odontogram / perio / plan / procedure / history successfully.

---

## 12. UI authorization proof

- Workspace uses `resolveEnterpriseDentalEncounterAuthoring` / `/authoring` → `boardLocked`.
- i18n FR/EN: removed “PROVIDER requis”; generic facility clinical authority wording.
- Shared FR helper `dentalAuthoringReadOnlyReasonMessageFr("NO_CLINICAL_CAPABILITY")` no longer mentions PROVIDER.

---

## 13. Audit attribution proof

Live UAT: `ToothFinding.documentedByUserId` = `admin@medora.local` user id; `facilityId` + `encounterId` correct. No provider identity spoof.

---

## 14. Cross-facility isolation proof

Live UAT test 5: ADMIN token + foreign `x-facility-id` → **403**.

---

## 15. Tests and counts

| Suite | Result |
|-------|--------|
| shared D5A.5C + related auth | 39 passed |
| api dental authoring specs | 9 passed |
| web dental authoring specs | 7 passed |
| Live UAT `uat-d5a5c-facility-admin-authoring.ts` | 10/10 PASS |

Matrix coverage (unit + live): PROVIDER WRITE; FACILITY_ADMIN WRITE; ADMIN+PROVIDER WRITE; PLATFORM-only DENY; cross-facility DENY; module disabled DENY; explicit restriction flag DENY; OPEN WRITE; CLOSED READ; domain writes; audit; provider unchanged.

---

## 16. Manual UAT results

Account: `admin@medora.local` (facility ADMIN only at Bon Samaritain).  
Encounter: `46ae9388-0143-4dc5-92e3-2dcb86376155` (OPEN, DENTAL).

| Check | Result |
|-------|--------|
| Authoring projection writable | PASS |
| Odontogram write | PASS |
| Periodontal write | PASS |
| Treatment plan write | PASS |
| Procedure write | PASS |
| Enterprise history write | PASS |
| Cross-facility deny | PASS |
| Provider still writable | PASS |
| Audit documentedBy = admin | PASS |
| Platform-only policy deny | PASS (resolver) |

Browser polish (print/overview refresh after close) deferred to operator visual pass; API board domains + attribution verified.

---

## 17. Migration decision

**NONE.** Existing `RoleCode.ADMIN` vs `MEDORA_SUPER_ADMIN` + facility `UserRole` already express the policy.

---

## 18. Seed decision

**NONE.** Demo `admin@medora.local` is already facility ADMIN-only.

---

## 19. git diff --check

Clean (no whitespace errors reported).

---

## 20. Files changed

- `packages/shared/src/auth/enterpriseFacilityAdministratorClinicalAuthoringD5a5c.ts` (+ test)
- `packages/shared/src/auth/enterpriseDentalServiceLineNavigationD5a2.ts` (+ test updates)
- `packages/shared/src/auth/enterpriseDentalEncounterAuthoringD5a5b.ts` (+ test updates)
- `packages/shared/src/index.ts`
- `apps/api/src/dental-care/dental-care.controller.ts`
- `apps/api/src/dental-care/enterprise-*-d5a5*.spec.ts` (+ new D5A.5C spec)
- `apps/api/scripts/uat-d5a5c-facility-admin-authoring.ts`
- `apps/api/scripts/uat-d5a5b-dental-authoring.ts` (ADMIN expectation updated)
- `apps/web` i18n en/fr + dental authoring tests
- `docs/certification/MEDUI.D5A.5C-certification.md`

---

## 21. Deferrals

- Durable explicit “deny clinical authoring for this ADMIN” persistence (permissions engine) — document only.
- Full browser UAT for print/close visual lock (API closed-encounter lock already covered in D5A.5B / unit CLOSED).
- Clinic/Hospital module-wide reuse of `resolveFacilityClinicalAuthoringAuthority` beyond Dental capability path (helper ready).

---

## 22. Certification recommendation

**CERTIFY MEDUI.D5A.5C** for local gate. Await explicit approval before commit/push/deploy.

---

## 23. Git status

Uncommitted changes on branch `d5a5-enterprise-dental-complete-clinical-board` (modified + untracked D5A.5C files).

---

## 24. Commit status

**Not committed** (STOP gate).

---

## 25. Push status

**Not pushed** (STOP gate).
