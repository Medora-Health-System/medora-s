# MEDUI.D4C.7H — Certification

**ID:** `MEDUI.D4C.7H`  
**Title:** Enterprise MAR safety acknowledgement and prescription print authority repair  
**Branch:** `d4c7h-mar-safety-acknowledgement-rx-print-authority`  
**Base:** `origin/main` @ `74dd90b3955a11ab6959d444a7b672c3a3e3bec4` (includes D4C.7G)  
**Package manager:** npm workspaces  
**Commit / push / merge:** **NOT done** (policy)

## Verdict

**CERTIFIED WITH DOCUMENTED DEFERRALS**

## Certification gate checklist

| Gate | Status |
|---|---|
| MAR allergy warning reflects real allergy state (category + summary text) | ✔ |
| Acknowledgement control visibly available | ✔ |
| Submit disabled until acknowledgement | ✔ |
| Server enforces acknowledgement | ✔ (unchanged gate + audit enrichment) |
| Direct medication–allergy conflict stronger policy preserved | ✔ (governance panels unchanged) |
| Acknowledgement audited (`safetyAcknowledged…`, version, category) | ✔ |
| Clinic administration unblocked when ack completed | ✔ |
| ED/Hospital MAR safety not regressively forked | ✔ |
| Facility name / address / phone print when configured | ✔ |
| Facility identity from session facility + care profile (not hard-coded) | ✔ |
| Print entry points use canonical `printRx` | ✔ |
| Blank `about:blank` prevented (no noopener write path) | ✔ |
| Print after render readiness | ✔ |
| Empty/missing projection → typed error | ✔ |
| No Clinic-specific MAR/print engine | ✔ |
| No migration / no seed | ✔ |
| Focused tests + shared/api/web builds + Prisma validate + `git diff --check` | ✔ |

## Documented deferrals

1. Facility **fax** not modeled on `FacilityOperationalAddress` — prints when present; no invented fax.  
2. Facility **logo** / advanced jurisdictional Rx templates — future enhancement.  
3. Immutable printable facility snapshot persisted on Order at sign time — current path uses prescription-time facility session identity via `/auth/me` care profile; Order still scoped by `facilityId`.  
4. Full interactive browser manual scenarios (A–H) — exercised via source/authority tests + builds; live screenshot validation deferred to clinic UAT.  
5. Direct allergen–medication conflict override UX beyond existing MAR governance — not weakened; full conflict engine expansion out of scope.

## Evidence docs

- `docs/clinical/mar-safety-acknowledgement-rx-print-authority-d4c7h-audit.md`  
- `docs/clinical/mar-safety-acknowledgement-rx-print-authority-d4c7h.md`  

## Tests (exact focused runs)

| Suite | Result |
|---|---|
| `@medora/shared` `enterpriseMarSafetyAckRxPrintAuthorityD4c7h` + `enterpriseMarAuthorityClinicOrderRxD4c7g` | 2 files / **15** passed |
| `@medora/web` `clinicCareEnterpriseMarSafetyAckRxPrintD4c7h` + `clinicCareEnterpriseMarAuthorityClinicOrderRxD4c7g` | 2 files / **13** passed |

## Builds / validation

| Command | Result |
|---|---|
| `npm run build --workspace=@medora/shared` | pass |
| `npm run build --workspace=@medora/api` | pass |
| `npm run build --workspace=@medora/web` | pass |
| `apps/web/node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json` | pass |
| `prisma validate` (apps/api) | pass |
| `git diff --check` | pass |

## Recommendation

Ship as **CERTIFIED WITH DOCUMENTED DEFERRALS** after clinic UAT of scenarios A–H. Do not commit/push/merge from this agent session unless explicitly requested.
