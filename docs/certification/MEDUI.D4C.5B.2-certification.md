# MEDUI.D4C.5B.2 — Certification

**Feature:** Haiti Ambulatory Clinical Workspace Completion  
**Recommendation:** **CERTIFIED WITH DOCUMENTED DEFERRALS**  
**Date:** 2026-07-28  
**Branch:** `d4c5b2-haiti-ambulatory-workspace-completion` (uncommitted; no commit/push/merge)

## Verdict

Haiti ambulatory Active Clinic Workspace defects from manual validation are remediated on enterprise-shared, care-setting-aware mounts: vitals header, complete intake, Haiti Med Eval filters, French order display, Rx tile, Clinical Data CLINIC filter, ambulatory nursing, shared discharge on Follow-up, saved-record Summary, larger tiles. Jurisdiction uses `Facility.country` only. **No Clinic* forks. No Prisma migration.** Full official French diagnosis preferred-label authority remains deferred pending licensed terminology.

## ENTERPRISE DOMAIN AUDIT

See `docs/clinical/haiti-ambulatory-workspace-completion-d4c5b2-audit.md` — all touched domains Reused/Extended with Duplicate Prevented ✔.

## Test evidence (A–L)

| Suite | Tests | Result |
|-------|------:|--------|
| `packages/shared/.../clinicCareHaitiAmbulatoryWorkspaceD4c5b2.test.ts` (A–L) | 12 | Pass |
| `apps/web/.../clinicCareHaitiAmbulatoryWorkspaceD4c5b2.test.ts` (A–L) | 12 | Pass |
| `packages/shared/.../clinicCareAmbulatoryEncounterWorkspaceD4c5b.test.ts` (updated) | 3 | Pass |
| `apps/web/.../clinicCareAmbulatoryEncounterWorkspaceD4c5b.test.ts` (updated) | 12 | Pass |
| `packages/shared/.../enterpriseNursingClinicalWorkspaceD4b2.test.ts` | 8 | Pass |
| **Total executed above** | **47** | **Pass** |

## Builds / Prisma

- `npm run build --workspace=@medora/shared` — pass
- `npm run build --workspace=@medora/api` — pass
- `npm run build --workspace=@medora/web` — pass
- `apps/web/node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json` — pass
- `prisma validate` in `@medora/api` — pass
- `git diff --check` — pass

**MEDUI.D4C.5B.2 requires no new Prisma migration.**

## Documented deferrals

1. **Licensed French CIM/ICD preferred-label dataset** — not imported; existing FR alias/display search retained. Full Haiti diagnosis French authority incomplete until licensed data is available.
2. Emergency triage intake may still expose ESI fields from the shared triage engine (not Haiti-specific ESI workflow productization).
3. Exhaustive MDM English fragment catalog audit beyond Haiti field hide + i18n `t()` path — residual English possible if locale ≠ `fr` or if a fragment key is missing in `fr.ts`.
4. Native MA RoleCode remains D4C.4 adapter (TECH / PATIENT_CARE_TECH).
5. Weight/height/BMI always in header strip depends on triage vitals hydration; pain appended when present.

## Manual validation checklist

- [ ] Haiti facility (`Facility.country=HT`) + French locale: tiles French, no Open Chart
- [ ] Header shows vitals or « non documenté » (not hidden)
- [ ] Intake opens shared triage (not motif-only)
- [ ] Med Eval: no trauma defaults; no routine Workup / Clinical Impression / Addendum
- [ ] Clinical Data: no CIWA/COWS/thrombolysis/trauma cards by default
- [ ] Nursing titled Espace infirmier ambulatoire; not Observation catalog
- [ ] Meds: no Shift Timeline on Haiti ambulatory
- [ ] Rx tile opens DEFAULT CreateOrderModal; print French Rx path retained
- [ ] Follow-up mounts Sortie de la consultation (shared discharge JSON)
- [ ] Summary shows saved visit record (not blank EDOC catalog primary)
- [ ] Orders board statuses French (Prescrite/Placée, Active, …)
- [ ] U.S. facility ambulatory/ED options unchanged

## Git

Work left **uncommitted / unpushed / unmerged** per task rules.
