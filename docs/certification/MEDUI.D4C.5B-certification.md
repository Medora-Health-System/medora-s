# MEDUI.D4C.5B — Certification

**Feature:** Unified Ambulatory Encounter Workspace  
**Recommendation:** **CERTIFIED WITH DOCUMENTED DEFERRALS**  
**Date:** 2026-07-28  
**Branch:** `d4c5b-unified-ambulatory-encounter-workspace` (uncommitted; no commit/push)

## Verdict

Clinic Care now opens a single **Active Clinic Workspace** on the canonical encounter route (`/app/encounters/:id?workspace=ambulatory&section=…`) with persistent ambulatory header, role-aware tiles, inline section content, and Explicit `EncounterWorkflowState` actions including **Start consultation**. Clinical Board (D4C.5A) remains the analytics landing. Today's Visits deep-links into the workspace. Provider worklist includes WAITING. Orders/Results tiles mount shared D4C.6 engines. **No ClinicPatientChart / ClinicEncounterChart / ClinicEncounterStatus / ClinicOrder / ClinicResult forks. No Prisma migration.**

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Encounter chart | `/app/encounters/:id` | ✔ | Active Workspace gate | ✔ ClinicEncounterChart |
| Patient header | ED/hospital patterns | ✔ | Ambulatory chrome | ✔ ESI/trauma forks |
| HPI/ROS/PE | ProviderDocumentationWorkspace | ✔ | ME tile AMBULATORY | ✔ ClinicHpi/ROS/PE |
| Orders / Results | D4C.6 + ED panels | ✔ | Tile mounts | ✔ ClinicOrder/Result |
| Workflow | EncounterWorkflowState | ✔ | Ambulatory actions | ✔ ClinicEncounterStatus |
| Provider queue | D4C.5 | ✔ | WAITING group | ✔ |
| Clinical Board | D4C.5A | ✔ | Unchanged | ✔ |
| Sidebar nav | AppShell | ✔ | Clinic Care first + icon | ✔ duplicate dashboard |
| Clinical data | EmergencyClinicalDataPanel | ✔ | Ambulatory filter helper | ✔ |
| Auth / capability | D4C.1 / D4C.2A | ✔ | Section route guards | ✔ |

## Test evidence (A–L)

| Suite | Tests | Result |
|-------|------:|--------|
| `apps/web/.../clinicCareAmbulatoryEncounterWorkspaceD4c5b.test.ts` (A–L) | 12 | Pass |
| `packages/shared/.../clinicCareAmbulatoryEncounterWorkspaceD4c5b.test.ts` | 3 | Pass |
| `apps/web/.../clinicCareProviderWorkspaceD4c5.test.ts` (updated) | 12 | Pass |
| `apps/web/.../clinicCareAmbulatoryOrdersResultsD4c6.test.ts` (updated) | 12 | Pass |
| `apps/web/.../clinicCareWorkspaceD4c2a1.test.ts` (updated) | 7 | Pass |
| `packages/shared/.../clinicCareProviderWorkspaceD4c5.test.ts` | 3 | Pass |
| `packages/shared/.../clinicCareAmbulatoryOrdersResultsD4c6.test.ts` | 12 | Pass |
| **Total executed above** | **61** | **Pass** |

## Builds / Prisma

- `npm run build --workspace=@medora/shared` — pass
- `npm run build --workspace=@medora/api` — pass
- `npm run build --workspace=@medora/web` — pass
- `apps/web/node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json` — pass
- `prisma validate` + `prisma generate` in `@medora/api` — pass
- `git diff --check` — pass

**MEDUI.D4C.5B requires no new Prisma migration.**

## Documented deferrals

1. Live vitals + richer allergy strip hydration in ambulatory header (structure present; vitals pairs optional).
2. Deeper Clinical Documentation hub ambulatory card filtering beyond shared helper (helper shipped).
3. Native ambulatory MA RoleCode (D4C.4 adapter remains).
4. Further Orders/Results board UX polish beyond tile mounts (D4C.6 boards retained).

## Manual validation checklist

- [ ] Clinic Care is first ACCUEIL item with chart icon; pure clinic hides duplicate Tableau de bord
- [ ] Clinical Board KPIs unchanged (D4C.5A)
- [ ] Today's Visits → patient name opens Active Workspace; closed → patient chart
- [ ] Start consultation → IN_TREATMENT + Medical Evaluation inline
- [ ] Tile switches preserve `section=`; unauthorized section redirects
- [ ] Provider worklist shows waiting/ready assigned patients
- [ ] Orders/Results tiles mount shared engines (no ClinicOrder/Result)
- [ ] RN cannot author Medical Evaluation; Provider can save/sign

## Git

Work left **uncommitted / unpushed** per task rules.
