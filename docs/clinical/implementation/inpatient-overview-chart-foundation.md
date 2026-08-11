# Inpatient Overview chart foundation implementation

## Architecture

```text
authoritative Encounter / Patient / Results / Orders / Vitals / clinical documentation
  -> shared typed readers and projection functions (@medora/shared)
  -> ClinicalSynthesisService (INPATIENT type gate, read only)
  -> projectInpatientOverview (role-aware inpatient adapter, pure)
  -> InpatientOverviewView (operational snapshot)
  -> existing Summary / print / patient-chart projections (complete record)
```

Overview and Summary never write a shadow copy. Nursing Admission continues to write its versioned authoritative encounter packet and applicable linked documentation records. A subsequent Overview fetch recomputes the projection.

## Clinician composition

`InpatientWorkspacePanel` now mounts only `InpatientProviderWorkspacePanel(mode="overview")` for the Overview section. The latter loads the authoritative workspace, authoritative clinical-domain projection, and inpatient synthesis, applies the pure adapter, and presents clinical modules. `EnterpriseProviderClinicalWorkspaceD4b8` remains restricted to provider documentation sections where its composition controls are relevant.

Patient identity and safety remain in the persistent chart header immediately above the Overview. This deliberately avoids contradictory duplicate values inside cards.

## RN navigation

The role policy and sticky catalogue use:

1. Overview
2. Nursing Admission
3. Nursing Assessment
4. Review Orders
5. MAR
6. Review Results
7. Care Plan
8. Notes
9. Discharge

The Admission selection continues to dispatch the existing `admission` section and mount `InpatientAdmissionClinicalShell`; no URL knowledge and no new persistence are required.

## Localization

New behavior uses existing EN/FR keys. Only labels, statuses, and event-code display mappings are localized. Diagnosis/result/order/medication/narrative content passes through unchanged.

## Explicit non-goals

No Prisma changes, migrations, seeds, ED UI edits, Observation redesign, new MAR, new Results engine, new Nursing Admission workflow, Overview table, deployment, or production access.
