# MEDUI.D4C.5 — Ambulatory Provider Workspace, Rapid H&P, Clinical Summary

## Summary

Delivers a simple ambulatory provider workflow on the unified Clinic Care shell: **worklist → enterprise chart → review intake → rapid H&P → A&P → save/sign → clinical summary refresh**. French UI via i18n. No Clinic* forks for chart, notes, HPI, ROS, exam, history, summary, or signing.

## Architecture

```
AppShell (global Medora sidebar)
  └─ /app/clinic-care/* → ClinicCareShell
        ├─ ClinicCareTopNav
        └─ main panel
              ├─ Provider → ClinicCareProviderWorkspaceView (grouped worklist)
              │     └─ patient name → /app/encounters/:id?tab=clinic&workspace=ambulatory
              ├─ Encounters → ClinicCareAmbulatoryEncountersView (AMBULATORY filter)
              ├─ Patients → ClinicCareAmbulatoryPatientsView (enterprise search)
              └─ Chart (enterprise)
                    ├─ ClinicVisitTab → ProviderDocumentationWorkspace (AMBULATORY mode)
                    └─ ClinicCareAmbulatoryClinicalSummaryPanel → EmergencyClinicalDataPanel
```

**REFERENCE_VIRTUAL:** provider queue groups (`IN_PROGRESS` / `RESULTS_PENDING` / `DISCHARGE_PENDING`) project canonical clinic stages only.

## Provider worklist (`/app/clinic-care/provider`)

- Mounts immediately (no Open card).
- Rows from `GET /clinic-care/trackboard`, filtered by provider view.
- Groups by projected stage.
- Assign me → `POST /encounters/:id/assign-provider/me`.
- Open chart → ambulatory adapter query on enterprise encounter route.

## Rapid H&P

- Reuses enterprise HPI / ROS (insert complete normal) / PE (insert complete normal) / templates.
- Medical history via patient SSoT + encounter history tab.
- Generated text remains editable; no silent prior-note copy.
- Save stamps author / date / time / status via existing workspace metadata.
- Sign / unlock / addendum via existing encounter endpoints.

## Assessment, diagnoses, plan, orders

- A&P inside `ProviderDocumentationWorkspace` + clinic tab follow-up date.
- Diagnoses: enterprise diagnostics tab.
- Orders / prescriptions: existing encounter orders tab (ambulatory order UX polish deferred to D4C.6).
- Visit completion: enterprise discharge — no Clinic discharge engine.

## Auth

| Role | Provider worklist | Author / sign provider docs |
|------|-------------------|-----------------------------|
| PROVIDER / ADMIN | ✔ | ✔ |
| RN / MA / Front Desk | Shell redirects away from provider tab | Clinic tab read-only (no write escalation via URL) |

## API / schema

- No new ClinicCare write APIs.
- No Prisma migration — AMBULATORY is metadata/mode only; document type stays `INITIAL_PROVIDER_NOTE`.

## Deferrals

1. Dedicated ambulatory order / Rx UX polish (D4C.6).
2. Ambulatory-curated complaint template subset (full ED catalog reused).
3. Native ambulatory MA RoleCode (still D4C.4 adapter).
4. Richer ambulatory-only clinical summary layout beyond parameterized ED panel.

## Related

- Audit: `docs/clinical/ambulatory-provider-workspace-d4c5-audit.md`
- Certification: `docs/certification/MEDUI.D4C.5-certification.md`
