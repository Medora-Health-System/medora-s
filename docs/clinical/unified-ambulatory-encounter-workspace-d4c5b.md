# MEDUI.D4C.5B — Unified Ambulatory Encounter Workspace

## Purpose

Correct Clinic Care to follow the ED **one-board workspace** pattern structurally, while keeping Clinic clinically simpler:

**Clinic entry → Clinical Board → Today's Visits → click patient → Active Clinic Workspace**

Inline section content only — **no popup, no Open Chart gateway, no second chart**.

## Flow

```
/app/clinic-care                 Clinical Board (D4C.5A analytics)
        │
        ▼
/app/clinic-care/todays-visits   Today's Visits trackboard
        │  patient name (OPEN)
        ▼
/app/encounters/:id?workspace=ambulatory&section=…
        Active Clinic Workspace (canonical encounter shell)
```

Closed encounters still open `/app/patients/:patientId` (enterprise patient engine).

## Active Clinic Workspace

- **Title:** Active Clinic Workspace / Espace clinique actif
- **careSetting:** AMBULATORY (presentation)
- **Persistent header:** no ESI, no ED badge, no trauma
- **Tiles (inline):** Intake, Medical Eval, Orders, Meds, Results, Dx, Clinical Data, Nursing/MA, Notes, Follow-up/Checkout, Summary  
  Abbreviations: I, ME, O, M, R, Dx, CD, N/MA, N, F, S
- **Section query preserved** on tile click
- **Role-aware tiles + route guards** (unauthorized section redirects to default)

## Workflow actions (EncounterWorkflowState)

| Action | Transition |
|--------|------------|
| Start intake | ARRIVED → TRIAGE |
| Ready for provider | TRIAGE → IN_TREATMENT |
| Start consultation | TRIAGE → IN_TREATMENT (or stay IN_TREATMENT) + open Medical Evaluation |
| Ready for checkout | IN_TREATMENT/RESULTS_PENDING → DISPOSITION |
| Complete visit | DISCHARGE_READY → FINALIZED |

No `ClinicEncounterStatus`.

## Provider worklist (D4C.5B)

Includes **WAITING** (ARRIVED / waiting / ready) plus in-progress, results-pending, checkout-pending. Assigned patients are not excluded merely because they are not yet `IN_TREATMENT`.

## D4C.6 mounting points

- Orders tile → `EmergencyErOrdersPanel` (`data-testid=clinic-care-ambulatory-orders-mount`)
- Results tile → `EmergencyResultsPanel` (`data-testid=clinic-care-ambulatory-results-mount`)
- Clinic Care top-tab boards remain; remaining polish documented in certification deferrals

## Sidebar

- **Soins cliniques / Clinic Care** first ACCUEIL item → `/app/clinic-care`
- Same chart/analytics icon as Tableau de bord (`1f4ca.svg`)
- Pure ambulatory facilities suppress duplicate global DASHBOARD trackboard when Clinic Care owns landing

## Non-goals

- No ClinicPatientChart / ClinicEncounterChart / ClinicEncounterStatus
- No copying ED persistence into Clinic-specific models
- No Prisma migration / seed changes
