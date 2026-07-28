# MEDUI.D4C.4 — Certification

**Feature:** Ambulatory Nursing / MA Workspace with final Clinic trackboard density and direct-navigation corrections  
**Recommendation:** **CERTIFIED WITH DOCUMENTED DEFERRALS**  
**Date:** 2026-07-27  
**Branch:** `d4c4-ambulatory-nursing-ma-workspace` (uncommitted; no commit/push)

## Verdict

Clinic Care Nursing / MA workspace mounts a functional ambulatory queue + thin intake adapter without a second Clinic sidebar or ClinicNursing*/ClinicRoom* forks. Trackboard density removes Assign Room / Nurse / MA row buttons, uses inline room select and provider Assign me, and drops the later-phases footer. Ancillary top tabs direct-redirect to canonical modules (no Open cards). Provider tab mounts a worklist with SOAP deferred to D4C.5. **No new Prisma migration.**

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Trackboard projection | D4C.2 clinic-care service | ✔ | Nursing stage / intake / MA name | ✔ |
| Room | PATCH encounters room | ✔ | Inline select | ✔ |
| Provider assign | assign-provider/me | ✔ | Compact team cell | ✔ |
| RN assign | assign-nurse/me | ✔ | Nursing workspace | ✔ |
| MA assign | hospital TECHNICIAN slot | ✔ | Typed adapter | ✔ |
| Vitals / allergies / med-rec | Enterprise engines | ✔ | Thin adapters + chart links | ✔ |
| Workflow ready-for-provider | Encounter workflow machine | ✔ | Nursing actions | ✔ |
| Navigation | D4C.2A capability tabs | ✔ | Direct mount/redirect | ✔ |
| ClinicNursing* / ClinicRoom* forks | — | — | — | ✔ |

## Test evidence (A–H)

| Suite | Tests | Result |
|-------|------:|--------|
| `apps/web/.../clinicCareNursingMaWorkspaceD4c4.test.ts` (A–H) | 8 | Pass |
| `packages/shared/.../clinicCareNursingQueueD4c4.test.ts` | 3 | Pass |
| `apps/web/.../clinicCareWorkspaceD4c2a1.test.ts` | 7 | Pass |
| `apps/web/.../clinicCareWorkspaceD4c2a.test.ts` | 7 | Pass |
| `apps/web/.../clinicCareTrackboard.d4c2.test.ts` | 9 | Pass |
| `apps/api/.../clinic-care*.spec.ts` | 22 | Pass |
| **Total executed above** | **56** | **Pass** |

## Builds / Prisma

- `npm run build --workspace=@medora/shared` — pass
- `npm run build --workspace=@medora/api` — pass
- `npm run build --workspace=@medora/web` — pass (after clean `.next`; transient ENOENT on first sandbox attempt)
- `apps/web` `tsc --noEmit` — pass
- `npx prisma validate` + `generate` in `apps/api` — pass
- `git diff --check` — pass

**MEDUI.D4C.4 requires no new Prisma migration.** Existing D4C.3 migration must remain deployed.

## Documented deferrals

1. Ambulatory-native MA RoleCode / assignment lane (TECHNICIAN adapter remains).
2. Provider SOAP (D4C.5).
3. Dedicated `/clinic-care/nursing-queue` endpoint (optional later).
4. Richer unit-specific ambulatory room catalogs.

## Manual validation checklist

- [ ] RN @ Clinic: Nursing tab opens queue immediately (no Open card)
- [ ] Start intake → TRIAGE + chart triage tab; Ready for provider → IN_TREATMENT; board/queue update
- [ ] Trackboard: room select works; provider Assign me when unassigned; no Assign Room / Nurse / MA buttons
- [ ] PATIENT_CARE_TECH: adapter banner; assignment via TECHNICIAN slot; no independent RN assessment authorship
- [ ] Provider tab: worklist visible; SOAP note deferred
- [ ] Patients/Lab/… tabs redirect to canonical modules without Open cards
- [ ] Schema behind: 503 schema-miss banner, never false empty success
- [ ] Single global sidebar; Clinic top tabs only

## Git

Work left **uncommitted / unpushed** per task rules.
