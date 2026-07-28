# MEDUI.D4C.2A — Certification

**Feature:** Unified Clinic Workspace & Capability-Based Navigation
**Recommendation:** **CERTIFIED WITH DOCUMENTED DEFERRALS**
**Date:** 2026-07-27
**Branch:** `d4c2a-unified-clinic-workspace-capability-navigation` (uncommitted work; no commit/push)

## Verdict

Clinic Care now uses a nested unified shell with a single typed navigation registry. Global sidebar and route guards apply `facilityEnabledModules ∩ roleAuthorizedModules ∩ userAssignments`. Admin cannot restore ED/Hospital on Clinic-only facilities. Six D4C.2 KPIs preserved on Trackboard / Today's Visits. **No Prisma migration.**

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Facility capabilities | D4C.1 `facilityCareProfileJson` + service lines | ✔ | ✔ (D4C.2A resolver) | ✔ |
| Navigation authorization | `navigationAuthorization` + D4C.1 `resolveFacilityNavigation` | ✔ | ✔ (wired to web) | ✔ |
| Clinic Care shell | D4C.2 trackboard shell | ✔ | ✔ (nested layout) | ✔ |
| Registration | D4C.3 Clinic registration | ✔ | ✖ | ✔ |
| Patient / Encounter engines | Shared Medora One | ✔ | ✖ | ✔ |
| ED / Hospital workspaces | Existing ED + Hospital Care | ✔ | ✖ (gated only) | ✔ |
| Public Health / MSPP | Existing PH modules | ✔ | ✖ (capability gate) | ✔ |

## Test evidence (A–G)

| Suite | Tests | Result |
|-------|------:|--------|
| `packages/shared/.../clinicWorkspaceCapabilityNavigationD4c2a.test.ts` | 10 | Pass |
| `apps/web/.../clinicCareWorkspaceD4c2a.test.ts` (A–G) | 7 | Pass |
| `apps/web/.../clinicCareNavigation.d4c1.test.ts` (incl. Admin Clinic) | 6 | Pass |
| `apps/web/.../clinicCareTrackboard.d4c2.test.ts` (KPI regression) | 9 | Pass |
| `packages/shared/.../facilityClinicCareProfileD4c1.test.ts` | 22 | Pass |
| `packages/shared/.../navigationAuthorization.test.ts` | 36 | Pass |
| `apps/api/.../trackboard-read-access.guard.spec.ts` | 7 | Pass |
| **Total executed above** | **97** | **Pass** |

A–G coverage: Admin Clinic hide ED/Hospital; nested top tabs; role landings; direct URL gates; hybrid ED without Hospital-from-Lab; Front Desk no Provider escalation; shell/layout presence.

## Builds / Prisma

- `npm run build --workspace=@medora/shared`
- `npm run build --workspace=@medora/api`
- `npm run build --workspace=@medora/web`
- `npx prisma validate` + `generate` in `apps/api`
- **MEDUI.D4C.2A requires no Prisma migration.**

## Documented deferrals

1. **In-shell embedding of full Nursing/Provider/Patients/Encounters worklists** — nested Clinic routes provide role-gated hub panels; deep worklists still open shared enterprise modules (URL may leave Clinic for full worklist). Full composition without leaving Clinic deferred to a later Clinic UX pass.
2. **Hospitalisation API surface-wide capability guard** — ED trackboard API enforced; every Hospital Care write path not exhaustively wrapped in this pass (web route guard covers primary UI entry).
3. **Global sidebar dual Registration** — `/app/registration` remains for ED/FSER facilities; Clinic prefers `/app/clinic-care/registration`. Full de-duplication of global Registration item on ambulatory deferred.
4. **Public Health sidebar `navAreas` completeness** — Clinic side nav gates PH; some global PH items remain role-visible without `navAreas` (pre-existing).

## Manual validation checklist

- [ ] Admin @ Clinic: no Emergency / Hospital in sidebar; ED URL redirects to Clinic landing
- [ ] Front Desk @ Clinic: lands on Registration; no Provider tab
- [ ] Provider @ Clinic: lands on Provider hub; Trackboard KPIs still six tiles
- [ ] Hybrid UC+ED: Emergency visible; Hospital not inferred from Lab alone
- [ ] Hospital facility: ED/Hospital still visible for Admin
- [ ] D4C.3 registration walk-in / appointment still works under Clinic shell
- [ ] Haiti Clinic with PH module: Public Health side link visible for clinical roles

## Git

Work left **uncommitted / unpushed** per task rules.
