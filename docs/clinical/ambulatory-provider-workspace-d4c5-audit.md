# MEDUI.D4C.5 — Ambulatory Provider Workspace Audit

**Date:** 2026-07-27  
**Branch:** `d4c5-ambulatory-provider-workspace`  
**Baseline:** `origin/main` @ `60f9b2865` (includes D4C.1–D4C.4, D4C.2A, D4C.2A.1)

## 0. Git verification

| Check | Result |
|-------|--------|
| Branch | `d4c5-ambulatory-provider-workspace` |
| Tree at start | Clean |
| D4C.4 in history | ✔ Merge PR #66 (`cda4e396b` / `60f9b2865`) |
| D4C.2A / D4C.2A.1 | ✔ |
| Wrong baseline / Clinic* forks required | No — proceed |

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Provider worklist | `ClinicCareProviderWorkspaceView` (D4C.4) | ✔ | Stage groups + ambulatory chart query | ✔ |
| Encounter chart | `/app/encounters/:id` | ✔ | Thin ambulatory adapter (tabs / mode) | ✔ ClinicPatientChart |
| HPI / ROS / PE | `ProviderDocumentationWorkspace` | ✔ | `AMBULATORY` encounterMode | ✔ ClinicHpi/ROS/PE |
| Medical history | Patient clinical history + history tab | ✔ | — | ✔ |
| Provider note / sign | Enterprise save/sign/addendum APIs | ✔ | Mode metadata AMBULATORY | ✔ ClinicSign* |
| Clinical summary | `EmergencyClinicalDataPanel` | ✔ | Parameterized mount in clinic tab | ✔ ClinicClinicalSummary |
| Diagnosis | `EncounterDiagnosticsPanel` | ✔ | — | ✔ |
| Orders / Rx | Encounter orders tab | ✔ | — (D4C.6 UX deferred) | ✔ |
| Discharge / follow-up | Enterprise discharge + followUpDate | ✔ | — | ✔ ClinicDischarge |
| Assign provider | `assign-provider/me` | ✔ | — | ✔ |
| Patients / encounters lists | Enterprise search / trackboard | ✔ | Direct Clinic shell mounts + ambulatory filter | ✔ Open cards |
| Capability nav | D4C.2A registry | ✔ | — | ✔ |

## Architecture decisions

1. **No chart fork** — ambulatory opens `/app/encounters/:id?tab=clinic&workspace=ambulatory`.
2. **AMBULATORY mode** — presentation/metadata only; durable `documentType` remains `INITIAL_PROVIDER_NOTE` (no Prisma migration).
3. **Right-side summary** — reuses `EmergencyClinicalDataPanel` props (`encounterId`, `facilityId`, `facilityTimeZone`).
4. **Author gate** — non-PROVIDER/ADMIN get read-only provider documentation on the clinic tab (URL cannot escalate writes).
5. **REFERENCE_VIRTUAL** — provider queue groups are projections of canonical clinic stages.

## Stop conditions checked

- D4C.4 present ✔  
- No ClinicPatientChart / ClinicHpi / ClinicROS / ClinicPhysicalExam / duplicate signing engines ✔  
- Prefer no Prisma migration ✔  
