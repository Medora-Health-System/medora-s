# MEDUI.D4C.4 — Ambulatory Nursing / MA Workspace (Audit)

**Date:** 2026-07-27  
**Branch:** `d4c4-ambulatory-nursing-ma-workspace`  
**Baseline:** `origin/main` @ `d1f0b494c` (includes D4C.2, D4C.3, D4C.2A, **D4C.2A.1**)

## 0. Git verification

| Check | Result |
|-------|--------|
| Current branch | `d4c4-ambulatory-nursing-ma-workspace` |
| Based on current `origin/main` | ✔ (HEAD = merge of PR #65 D4C.2A.1) |
| D4C.2A.1 present | ✔ `77967803c` / PR #65 |
| Unrelated mods at start | Partial WIP only (this feature); no foreign product fork |
| Commit / push | **None** (left uncommitted per rules) |

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Ambulatory trackboard | D4C.2 `GET /clinic-care/trackboard` | ✔ | Nursing stage + intake flags on rows | ✔ |
| Room assignment | `PATCH /encounters/:id/room` + `updateEncounterRoomAssignment` | ✔ | Inline select on trackboard/nursing | ✔ (no ClinicRoom*) |
| Provider self-assign | `POST …/assign-provider/me` | ✔ | Team-column Assign me | ✔ |
| RN self-assign | `POST …/assign-nurse/me` | ✔ | Nursing workspace only (not trackboard) | ✔ |
| MA / PATIENT_CARE_TECH | Hospital `TECHNICIAN` bag slot | ✔ | Typed adapter `CLINIC_CARE_MA_ASSIGNMENT_ADAPTER` | ✔ (native MA deferred) |
| Workflow / ready-for-provider | `PATCH /encounters/:id` `workflowState` | ✔ | ARRIVED→TRIAGE, TRIAGE→IN_TREATMENT | ✔ |
| Vitals | `EncounterVitalsPanel` (= ED quick vitals) | ✔ | Thin nursing adapter | ✔ (no ClinicVitalSigns) |
| Allergies | Enterprise clinical-history + inpatient allergy modal | ✔ | Nursing open + chart history tab | ✔ |
| Med-rec / notes / care team | Canonical encounter chart | ✔ | Deep-links `?tab=triage\|history` | ✔ |
| Patient chart | `/app/encounters/:id`, `/app/patients/:id` | ✔ | Board patient-name links | ✔ |
| Navigation | D4C.2A top tabs + global sidebar | ✔ | Direct mount/redirect (no Open cards) | ✔ (no second Clinic sidebar) |
| ClinicNursingNote / ClinicRoom / ClinicUserAssignment | — | — | — | ✔ never created |

## Trackboard density audit (before → after)

| Element | Before (D4C.2A.1) | After (D4C.4) |
|---------|-------------------|---------------|
| Assign Room button | Row action → modal | **Removed**; room column = inline select |
| Assign me Provider | Row action button | Team/provider cell only when unassigned |
| Assign me Nurse / MA | Row action buttons | **Removed** from trackboard |
| Open / chart | Separate Open + name link | Name = chart; Open only for discharge edge |
| Nurse sub-row in Team | Present | **Removed** (provider line only) |
| Footer later-phases | Present | **Removed** + i18n key dropped |
| Density | Larger KPI/padding | Compact fonts, padding, sticky header |

## Nursing queue stage mapping (status audit)

| EncounterWorkflowState | Nursing queue stage |
|------------------------|---------------------|
| ARRIVED / empty | WAITING_FOR_INTAKE |
| TRIAGE | IN_PROGRESS |
| IN_TREATMENT / DISPOSITION / DISCHARGE_READY / FINALIZED | READY_FOR_PROVIDER |
| RESULTS_PENDING | RETURNED |
| CLOSED / CANCELLED | COMPLETED |

Presentation-only via `projectClinicCareNursingQueueStage` — no `ClinicNursingStatus` table.

## Direct top-tab behavior

| Tab | Behavior |
|-----|----------|
| Nursing | In-shell `ClinicCareNursingWorkspaceView` |
| Provider | In-shell `ClinicCareProviderWorkspaceView` (SOAP → D4C.5) |
| Patients / Encounters / Follow-up / Billing / Lab / Rad / Pharmacy / PH / Admin | `ClinicCareDirectCanonicalRedirect` → canonical module (no Open card) |

## MA authorization note

`PATIENT_CARE_TECH` → enterprise hospital assignment `TECHNICIAN` / `PATIENT_CARE_TECH` slot (`CLINIC_CARE_MA_ASSIGNMENT_ADAPTER`). Ambulatory-native MA `RoleCode` **deferred**. RN keeps independent intake authorship; MA is rooming/assignment assist unless otherwise authorized by existing enterprise rules.

## Schema / migration

**No new Prisma migration.** Reuses D4C.3 Appointment / visitOrigin. Schema miss → **503** `CLINIC_CARE_SCHEMA_MISS` (never empty success).
