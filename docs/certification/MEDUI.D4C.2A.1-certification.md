# MEDUI.D4C.2A.1 — Certification

**Feature:** Clinic Workspace Regression Correction, Trackboard Restoration, Room Assignment, and User Assignment Integration
**Recommendation:** **CERTIFIED WITH DOCUMENTED DEFERRALS**
**Date:** 2026-07-27
**Branch:** `d4c2a1-clinic-workspace-regression-correction` (uncommitted work; no commit/push)

## Verdict

Clinic Care shell uses **global Medora sidebar + Clinic top tabs only** (in-shell side nav removed; full-width content). Trackboard distinguishes **API/schema failure vs true empty**, surfaces D4C.3 schema-miss as 503, and restores patient chart links, room assignment, and enterprise Provider/RN/MA assign actions without forking clinical engines. **No new Prisma migration** — production must deploy existing D4C.3 migration.

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Appointment | D4C.3 `Appointment` | ✔ | ✖ | ✔ |
| visitOrigin | `Encounter.visitOrigin` | ✔ | ✖ | ✔ |
| Room assignment | `Encounter.roomLabel` + `RoomAssignmentModal` | ✔ | UI wire | ✔ |
| User assignment | `EnterpriseAssignmentService` | ✔ | UI wire | ✔ |
| Patient chart | Enterprise patient / encounter routes | ✔ | Clinic board adapter | ✔ |
| Navigation | D4C.2A capability registry | ✔ | Top-tab ancillary | ✔ (no second Clinic sidebar) |
| ClinicUserAssignment / ClinicRoom* | — | — | — | ✔ (never created) |

## Test evidence (A–G)

| Suite | Tests | Result |
|-------|------:|--------|
| `apps/web/.../clinicCareWorkspaceD4c2a1.test.ts` (A–G) | 7 | Pass |
| `apps/web/.../clinicCareWorkspaceD4c2a.test.ts` (regression) | 7 | Pass |
| `packages/shared/.../clinicWorkspaceCapabilityNavigationD4c2a.test.ts` | 10 | Pass |
| `apps/api/.../clinic-care-schema-miss.spec.ts` | 3 | Pass |
| `apps/api/.../clinic-care.service.spec.ts` + `clinic-care-read-access.guard.spec.ts` | 19 | Pass |
| `apps/web/.../clinicCareTrackboard.d4c2.test.ts` (KPI) | 9 | Pass |
| **Total executed above** | **55** | **Pass** |

A–G: one-sidebar shell; ancillary top tabs; Admin Clinic capability; error≠empty + schema-miss; chart helper; room/assign reuse; landings/hybrid/Front Desk.

## Builds / Prisma

- `npm run build --workspace=@medora/shared`
- `npm run build --workspace=@medora/api`
- `npm run build --workspace=@medora/web`
- `npx prisma validate` + `generate` in `apps/api`
- `npx prisma migrate status` (local)
- **MEDUI.D4C.2A.1 requires no new Prisma migration.** Existing `20261028120000_enterprise_appointment_visit_origin_d4c3` must be deployed to production.

## Production migration checklist

See `docs/clinical/clinic-workspace-regression-correction-d4c2a1.md` § Production migration checklist (migrate status, Appointment, visitOrigin, endpoints non-500). No credentials in this document.

## Documented deferrals

1. **Ambulatory-native MA assignment lane** — MA uses enterprise hospital `TECHNICIAN` / `PATIENT_CARE_TECH` slot; dedicated ambulatory MA column / D4C.4 Nursing-MA depth deferred.
2. **In-shell full Nursing/Provider worklists** — hubs remain; deep documentation may leave Clinic nested routes (pre-existing D4C.2A deferral).
3. **Automatic production migrate on API boot** — intentionally not implemented (`docs/OPS.md`); ops must run `migrate deploy` as release step.
4. **Hospitalisation write-path capability exhaustiveness** — web route guards cover primary UI; not every hospital write wrapped in this pass.

## Manual validation checklist

- [ ] Admin @ Clinic: single global sidebar; Clinic top tabs only; full-width trackboard
- [ ] Lab/Pharmacy tabs appear only when facility module + role allow
- [ ] With D4C.3 applied: ambulatory rows + six KPIs when census exists
- [ ] With schema behind: error banner + retry, not “true empty”
- [ ] Patient name opens chart/encounter; Assign Room opens shared modal
- [ ] Provider/RN Assign me updates team columns; audited via enterprise APIs
- [ ] ED/Hospital still hidden for Clinic-only Admin; hybrid ED when EMERGENCY present

## Git

Work left **uncommitted / unpushed** per task rules.
