# MEDUI.D4C.4 — Ambulatory Nursing / MA Workspace

## Summary

Delivers the Clinic Care **Nursing / MA** workspace and final trackboard density / direct-navigation corrections on the unified Clinic shell (D4C.2A.1), without forking enterprise clinical engines or adding a second Clinic sidebar.

## Architecture

```
AppShell (global Medora sidebar)
  └─ /app/clinic-care/* → ClinicCareShell
        ├─ ClinicCareTopNav (capability tabs)
        └─ main panel
              ├─ Trackboard (compact: inline room, provider Assign me)
              ├─ Nursing → ClinicCareNursingWorkspaceView (queue + thin intake)
              ├─ Provider → ClinicCareProviderWorkspaceView (worklist; SOAP = D4C.5)
              └─ Other tabs → direct canonical redirect (no Open cards)
```

**REFERENCE_VIRTUAL:** nursing queue stages and intake status flags are projections only.

## Trackboard compactness

1. Removed row buttons: Assign Room, Assign me Provider (row), Assign me Nurse, Assign me MA.
2. Room column: `ClinicCareInlineRoomSelect` → `PATCH /encounters/:id/room` (available options via enterprise room list; errors surfaced, no false success).
3. Team/provider column: provider name only; unassigned → **Assign me** / **M’affecter** via `assign-provider/me` for PROVIDER/ADMIN.
4. Patient name → canonical chart; duplicate Open minimized (discharge edge only).
5. Footer deferral copy + unused Open-module i18n keys removed.
6. Compact KPI / table density for more visible rows.

## Nursing / MA workspace (`/app/clinic-care/nursing`)

- Facility-scoped ambulatory open encounters from `GET /clinic-care/trackboard`.
- Group/filter by nursing queue stage (mapped from `EncounterWorkflowState`).
- Row: identity, complaint, times, room, provider, nursing/MA assignment, intake/vitals/allergy/med-rec flags, stage.
- Room: enterprise room assign. Nursing ownership: `assign-nurse/me` (RN) or TECHNICIAN adapter (MA).
- Intake: start → workflow `TRIAGE` then canonical chart `?tab=triage`; ready-for-provider → `IN_TREATMENT` (audited PATCH, actor/timestamp via existing encounter update).
- Thin adapters: shared vitals panel + enterprise allergy editor; med-rec / notes via chart deep-links.
- No secondary left nav.

## Provider tab

Mounts ambulatory provider worklist immediately. SOAP documentation **deferred to D4C.5**.

## Auth

| Role | Nursing queue | Clinical intake authorship | Room | Assign |
|------|---------------|----------------------------|------|--------|
| RN / Admin | ✔ | ✔ | ✔ | Nurse self-assign |
| PATIENT_CARE_TECH (MA) | Tech-safe projection | ✖ (assist) | when room gate allows | TECHNICIAN adapter |
| Provider | via Provider tab | N/A | ✔ | Provider self-assign |

Capability / path guards remain on `ClinicCareShell` + D4C.2A registry.

## API

- Still `GET /clinic-care/trackboard` (enriched with `nursingQueueStage`, `intakeStatus`, `maName`).
- Mutations reuse encounters room / assign / PATCH workflow — no ClinicCare write fork.
- Schema miss → 503 `CLINIC_CARE_SCHEMA_MISS`.

## Deferrals

1. Ambulatory-native MA RoleCode / assignment lane (adapter remains).
2. Provider SOAP / full documentation (D4C.5).
3. Dedicated nursing-queue HTTP resource (projection on trackboard is sufficient for MVP).
4. Unit-aware ambulatory room catalogs beyond enterprise room options.

## Related

- Audit: `docs/clinical/ambulatory-nursing-ma-workspace-d4c4-audit.md`
- Certification: `docs/certification/MEDUI.D4C.4-certification.md`
