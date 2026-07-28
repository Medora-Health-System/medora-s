# MEDUI.D4C.5 — Certification

**Feature:** Ambulatory Provider Workspace, Rapid H&P Documentation, and Longitudinal Clinical Summary  
**Recommendation:** **CERTIFIED WITH DOCUMENTED DEFERRALS**  
**Date:** 2026-07-27  
**Branch:** `d4c5-ambulatory-provider-workspace` (uncommitted; no commit/push)

## Verdict

Clinic Care Provider workspace mounts a functional ambulatory worklist (grouped by canonical stages) and opens the enterprise encounter chart with a thin ambulatory adapter (`?tab=clinic&workspace=ambulatory`). Rapid H&P reuses `ProviderDocumentationWorkspace` with new `AMBULATORY` encounter mode (durable `INITIAL_PROVIDER_NOTE` — no Prisma migration). Right-side clinical summary reuses `EmergencyClinicalDataPanel`. Encounters/Patients tabs mount direct searchable content (no Open cards). RN/MA/Front Desk cannot author/sign provider docs via URL. **No ClinicPatientChart / ClinicHpi / ClinicROS / ClinicPhysicalExam / ClinicDischarge forks.**

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Provider worklist | D4C.4 provider view | ✔ | Stage groups + ambulatory chart href | ✔ |
| Encounter chart | `/app/encounters/:id` | ✔ | Ambulatory tab filter + layout | ✔ ClinicPatientChart |
| HPI / ROS / PE | ProviderDocumentationWorkspace | ✔ | AMBULATORY mode | ✔ ClinicHpi/ROS/PE |
| Medical history | Patient SSoT + history tab | ✔ | — | ✔ |
| Provider note / sign | Enterprise save/sign/addendum | ✔ | Mode metadata | ✔ |
| Clinical summary | EmergencyClinicalDataPanel | ✔ | Parameterized mount | ✔ |
| Diagnosis | EncounterDiagnosticsPanel | ✔ | — | ✔ |
| Orders / Rx | Encounter orders tab | ✔ | — | ✔ (D4C.6 UX) |
| Discharge / follow-up | Enterprise discharge + followUpDate | ✔ | — | ✔ ClinicDischarge |
| Patients / encounters | Enterprise search / trackboard | ✔ | Direct Clinic mounts | ✔ Open cards |
| Auth / capability | D4C.1 / D4C.2A | ✔ | Clinic-tab author gate | ✔ |

## Test evidence (A–L)

| Suite | Tests | Result |
|-------|------:|--------|
| `apps/web/.../clinicCareProviderWorkspaceD4c5.test.ts` (A–L) | 12 | Pass |
| `packages/shared/.../clinicCareProviderWorkspaceD4c5.test.ts` | 3 | Pass |
| `apps/web/.../clinicCareNursingMaWorkspaceD4c4.test.ts` | 8 | Pass |
| `apps/web/.../clinicCareWorkspaceD4c2a1.test.ts` | 7 | Pass |
| `apps/web/.../clinicCareWorkspaceD4c2a.test.ts` | 7 | Pass |
| `apps/web/.../clinicCareTrackboard.d4c2.test.ts` | 9 | Pass |
| `packages/shared/.../clinicCareNursingQueueD4c4.test.ts` | 3 | Pass |
| `apps/api/.../clinic-care*.spec.ts` | 22 | Pass |
| **Total executed above** | **71** | **Pass** |

## Builds / Prisma

- `npm run build --workspace=@medora/shared` — pass
- `npm run build --workspace=@medora/api` — pass
- `npm run build --workspace=@medora/web` — pass
- `tsc --noEmit -p apps/web/tsconfig.json` — pass
- `prisma validate` + `prisma generate` in `@medora/api` — pass
- `git diff --check` — pass

**MEDUI.D4C.5 requires no new Prisma migration.** AMBULATORY is metadata/mode only.

## Documented deferrals

1. Dedicated ambulatory order / prescription UX polish (D4C.6).
2. Ambulatory-curated complaint template subset (full catalog reused).
3. Native ambulatory MA RoleCode (D4C.4 adapter remains).
4. Richer ambulatory-only clinical summary chrome beyond parameterized ED panel.

## Manual validation checklist

- [ ] Provider @ Clinic: Provider tab opens worklist immediately (no Open card); groups visible
- [ ] Assign me → provider name updates; patient name → chart clinic tab + ambulatory workspace
- [ ] Rapid H&P: insert complete normal ROS/PE; edit generated text; save shows author/date/time; sign locks; addendum works
- [ ] Right panel clinical summary refreshes after save
- [ ] Diagnoses / orders / follow-up / discharge use enterprise tabs/modals (no Clinic discharge)
- [ ] Encounters tab: ambulatory filter default; search works; Patients tab: enterprise search → `/app/patients/:id`
- [ ] RN / MA / Front Desk: provider tab redirected; clinic documentation read-only if chart opened
- [ ] Single global sidebar; Clinic top tabs only

## Git

Work left **uncommitted / unpushed** per task rules.
