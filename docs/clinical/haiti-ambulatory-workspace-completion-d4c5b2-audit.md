# MEDUI.D4C.5B.2 — Haiti ambulatory clinical workspace completion (audit)

**Date:** 2026-07-28  
**Branch:** `d4c5b2-haiti-ambulatory-workspace-completion`  
**Parent:** intentional switch from `origin/main` (includes D4C.5B, D4C.6, D4C.5B.1)

## 0. Git verification

```
branch: d4c5b2-haiti-ambulatory-workspace-completion
working tree: clean at start (implementation uncommitted per task rules)
HEAD == origin/main at branch creation: 785577285
D4C.5B: present (PR #70)
D4C.6: present (PR #69)
D4C.5B.1: present (PR #71)
```

## STOP checks

| Gate | Result |
|------|--------|
| Unrelated dirty mix | ✔ clean start |
| Second patient chart | ✔ none |
| ClinicHPI / ClinicDiagnosis / ClinicRx / ClinicDischarge / ClinicSummary / ClinicNursingNote / ClinicVitals | ✔ none |
| Duplicate enterprise engines | ✔ reuse only |
| Jurisdiction from UI language | ✔ `Facility.country` via `isHaitiPublicHealthJurisdiction` |

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Encounter workspace | D4C.5B Active Clinic Workspace | ✔ | Rx tile, Haiti filters | ✔ ClinicEncounterChart |
| Header / vitals | ED clinical strip + triage GET | ✔ | Always show vitals; pain; workflow/follow-up | ✔ ESI/trauma chrome |
| Intake | EmergencyTriagePanel | ✔ | Mounted on Intake tile | ✔ ClinicIntake |
| Medical evaluation | ProviderDocumentationWorkspace AMBULATORY | ✔ | Haiti hide Workup/Impression/Addendum; template filter | ✔ ClinicHPI |
| Orders | EmergencyErOrdersPanel + D4C.6 board | ✔ | DEFAULT med mode; French status display | ✔ ClinicOrder |
| Prescriptions | CreateOrderModal DEFAULT | ✔ | Dedicated Rx tile | ✔ ClinicPrescription |
| Medications / MAR | MedicationAdministrationTab | ✔ | Hide Shift Timeline (Haiti ambulatory) | ✔ parallel MAR |
| Clinical Data | ClinicalDocumentationHub | ✔ | careSetting=CLINIC + registry filter | ✔ ED-only default |
| Nursing | EnterpriseNursingClinicalWorkspaceD4b2 | ✔ | AMBULATORY care setting | ✔ ClinicNursingNote |
| Discharge | PatientDischargeInstructionsClosureCard | ✔ | Follow-up / checkout mount | ✔ ClinicDischarge |
| Summary | EmergencyVisitSummaryPanel | ✔ | Ambulatory flags (no IV/procedures catalog) | ✔ ClinicSummary |
| Diagnoses | EncounterDiagnosticsPanel + FR search helpers | ✔ | No new table | ✔ HaitiDiagnosis |
| Allergies / home meds / history | Triage + patient chart engines | ✔ | Via intake mount | ✔ forks |
| Auth / roles | D4C.5B section guards | ✔ | PHARMACIST + Rx tiles | ✔ |

## Incident remediation map

| # | Incident | Fix |
|---|----------|-----|
| 1 | Header missing latest vitals | Always render vitals card; empty → « non documenté »; pain from triage |
| 2 | Intake incomplete | Mount `EmergencyTriagePanel` (vitals/allergies/history/assignment path) |
| 3 | Med Eval ED/trauma templates | Haiti ambulatory template blocklist + hide Workup/Impression/Addendum |
| 4 | English UI labels | French i18n tiles + D4C.5B.2 keys; Haiti locale separate from jurisdiction |
| 5 | MDM English | Generated chips via `t()`; Haiti hides ED MDM admit/observe field |
| 6 | Order board English | `ambulatoryOrderStatusDisplayKey` / priority i18n |
| 7 | Shift Timeline | `showFacilityMarShiftTimeline=false` when Haiti ambulatory |
| 8 | Clinical Data ED docs | Hub `careSetting=CLINIC` + `filterHaitiAmbulatoryClinicalDataCards` |
| 9 | Nursing Observation | `careSetting="AMBULATORY"` + French ambulatory title |
| 10 | Follow-up no discharge | Mount `PatientDischargeInstructionsClosureCard` |
| 11 | Summary catalogs | Mount `EmergencyVisitSummaryPanel` read-only saved record |
| 12 | No Rx tile | New `prescriptions` section + CreateOrderModal DEFAULT |
| 13 | Tiles too small | Larger min touch targets; wrap labels |
| 14 | Saved docs in Summary | Visit summary panel aggregates saved encounter content |
| 15 | Diagnosis French | Existing FR search/display layer retained; **licensed WHO/CIM dataset not imported** |

## Licensing / terminology gap (documented deferral)

Official Haiti French CIM/ICD preferred-label authority requires a **licensed terminology dataset**. No unauthorized scrape/import performed. Existing Medora diagnosis search + French alias/display helpers remain. Full guaranteed French preferred labels for all codes = **CERTIFIED WITH DOCUMENTED DEFERRALS**.

## Migration

**None.** No Prisma schema change. No `db push` / reset.
