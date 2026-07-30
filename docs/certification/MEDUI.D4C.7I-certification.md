# MEDUI.D4C.7I — Certification

**ID:** `MEDUI.D4C.7I`  
**Title:** Enterprise facility identity, onboarding address/contact, and document-header projection  
**Branch:** `d4c7i-enterprise-facility-identity-onboarding-print-projection`  
**Base:** `origin/main` @ `216c9a1218b7c0b5ca45cdc07b531b0f5a016a2d` (includes D4C.7H)  
**Package manager:** npm workspaces  
**Commit / push / merge:** **NOT done** (policy)

## Verdict

**CERTIFIED WITH DOCUMENTED DEFERRALS**

## Certification gate checklist

| Gate | Status |
|---|---|
| Audit completed before schema migration | ✔ (no migration needed) |
| One enterprise facility identity authority | ✔ (`facilityCareProfileJson` + shared projection) |
| No ClinicFacilityAddress / PrescriptionFacilityAddress / DentalFacilityAddress | ✔ |
| International address (Haiti without US ZIP/state requirement) | ✔ |
| Onboarding FACILITY ADDRESS AND CONTACT section | ✔ |
| Edit facility address/contact (Facility Admin) | ✔ |
| Validation: name, country, line1, city, phone; optional email/website checks | ✔ |
| Authorization: JWT + platform principal or facility ADMIN on service-config | ✔ |
| Prescription header from associated facility | ✔ |
| Discharge header from enterprise identity | ✔ |
| Laboratory / radiology headers where print pack exists | ✔ |
| Historical document prefers document facilityId | ✔ |
| French + English i18n labels | ✔ |
| No hard-coded facility name | ✔ |
| D5A dental service-line tokens reserved only | ✔ |
| No migration / no seed | ✔ |
| Focused tests + shared/api/web builds + Prisma validate | ✔ |

## Documented deferrals

1. Full letterhead wiring for every billing invoice PDF, referral, consent, and patient letter pack where no dedicated print surface exists yet.  
2. Immutable printable facility identity snapshot persisted at document sign time (Order remains `facilityId`-scoped; print uses that facility’s current care profile).  
3. Selectable Dental service lines + Dental chart (D5A).  
4. Promoting operational address from JSON to first-class Prisma columns (not required for 7I).  
5. Full interactive UAT screenshot matrix for onboarding/edit/print — authority + source tests + builds exercised; clinic UAT deferred.

## Evidence docs

- `docs/clinical/enterprise-facility-identity-onboarding-print-projection-d4c7i-audit.md`  
- `docs/clinical/enterprise-facility-identity-onboarding-print-projection-d4c7i.md`  

## Tests (exact focused runs)

| Suite | Result |
|---|---|
| `@medora/shared` `enterpriseFacilityIdentityOnboardingPrintProjectionD4c7i` | 1 file / **11** passed |
| `@medora/web` `clinicCareEnterpriseFacilityIdentityOnboardingPrintD4c7i` + `printFacilityHeader` | 2 files / **13** passed |

**Total focused:** **3 files / 24 tests passed**

## Builds / validation

| Command | Result |
|---|---|
| `npm run build --workspace=@medora/shared` | pass |
| `npm run build --workspace=@medora/api` | pass |
| `npm run build --workspace=@medora/web` | pass |
| `apps/web/node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json` | pass |
| `prisma validate` (apps/api) | pass |
| `git diff --check` | pass |
| `@medora/api` `facility-care-profile.util` (regression) | 1 suite / **5** passed |

## Recommendation

Ship as **CERTIFIED WITH DOCUMENTED DEFERRALS**. Do not commit/push/merge from this agent session unless explicitly requested.
