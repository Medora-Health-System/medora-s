# MEDUI.D4C.8B — Enterprise Closed Encounter Clinical Record

## Purpose

Compose a human-readable, encounter-scoped legal medical record inside the
enterprise CLOSED_READ_ONLY shell established by D4C.8A.

## Architecture

```text
EnterpriseClosedEncounterViewer (D4C.8A)
  ├── banner / reopen / identity
  ├── EnterpriseClosedEncounterClinicalRecord (D4C.8B)
  │     ├── overview
  │     ├── vitals (GET …/vitals-history)
  │     ├── nursing (nursingAssessment parsers)
  │     ├── provider (physicianEval parsers + signed state)
  │     ├── diagnoses (patient list filtered by encounterId)
  │     ├── orders (GET …/orders)
  │     ├── medications / MAR
  │     ├── results (ClinicalResultViewer)
  │     ├── procedures
  │     ├── disposition / discharge instructions
  │     └── addenda
  ├── optional care-setting children (ED billing links)
  └── lifecycle timeline (D4C.7K)
```

## Non-negotiables

- EncounterId scoped — never chart-summary
- No raw JSON clinical presentation
- No ordinary mutation controls
- Reopen remains D4C.7K only
- One composition authority for ED / Clinic / Observation / Inpatient

## Deferrals

- Privileged AuditLog tab (D4C.8C)
- Patient page → pure encounter index (D4C.8C)
- Chart-export HTML JSON cleanup
- Dedicated consultations entity (none exists)
- IV access section when no encounter events (empty-safe omit)
