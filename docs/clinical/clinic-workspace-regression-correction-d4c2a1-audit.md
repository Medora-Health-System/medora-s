# MEDUI.D4C.2A.1 — Audit: Clinic Workspace Regression Correction

**Date:** 2026-07-27
**Branch:** `d4c2a1-clinic-workspace-regression-correction`
**Prerequisite on origin/main:** D4C.2A (PR #64) + D4C.3 (PR #63)

## 1. Production migration incident

| Finding | Detail |
|---------|--------|
| Migration in source | `apps/api/prisma/migrations/20261028120000_enterprise_appointment_visit_origin_d4c3/` |
| Creates | `EncounterVisitOrigin` enum, nullable `Encounter.visitOrigin`, `Appointment` table + FKs, appointment audit actions |
| Deploy pattern | Ops: **`prisma migrate deploy` is a separate release step** — API `start` does **not** migrate on boot (`docs/OPS.md`) |
| Failure mode | API image includes Prisma client / queries expecting `visitOrigin` + `Appointment`; production DB behind → **P2022** (`visitOrigin`) on clinic trackboard; **P2021** (`Appointment`) on `GET /appointments/today` |
| Empty board myth | Browser shows empty / failed KPIs because the **API returns 500**, not because ambulatory census is intentionally empty |

**Correction (ops, not code migration):** deploy existing D4C.3 migration to production. **MEDUI.D4C.2A.1 adds no new Prisma migration.**

## 2. Navigation root cause

- D4C.2A mounted **ClinicCareSideNav** inside `ClinicCareShell` **in addition to** the global Medora sidebar.
- Side-only registry items (lab / radiology / pharmacy / PH / admin) lived only in the in-shell side nav.
- Result: duplicate navigation chrome and a narrowed main panel (`maxWidth: 1280` + side column).

## 3. Trackboard / chart / room / assignment audit

| Concern | Existing authority | Clinic gap before 2A.1 | Decision |
|---------|-------------------|------------------------|----------|
| Trackboard projection | `ClinicCareService` + D4C.3 `visitOrigin` / appointment select | UI treated load failure similarly to empty | Surface 503 schema-miss; retry; never `[]` on Prisma miss |
| Patient name → chart | ED `resolveEdBoardPatientNameHref` | Plain text name | Thin ambulatory adapter `resolveClinicBoardPatientNameHref` |
| Room assignment | `PATCH /encounters/:id/room` + `RoomAssignmentModal` | Display/filter only | Reuse modal; no `ClinicRoom*` tables |
| Assign user | `EnterpriseAssignmentService` via `/assign-provider/me`, `/assign-nurse/me`, hospital TECHNICIAN slot | Not wired on clinic board | Reuse; no `ClinicUserAssignment` |
| Capability gates | D4C.2A registry + route guards | Must preserve | Keep; promote ancillary to top tabs |

## 4. ENTERPRISE DOMAIN AUDIT (pre-impl)

| Domain | Existing Component | Reuse | Extend | Duplicate Prevented |
|--------|-------------------|-------|--------|---------------------|
| Appointment | D4C.3 `Appointment` | ✔ | ✖ (no new migration) | ✔ |
| visitOrigin | `Encounter.visitOrigin` | ✔ | ✖ | ✔ |
| Room | `Encounter.roomLabel` + room API | ✔ | ✖ | ✔ |
| Assignment | Enterprise assignment engine | ✔ | UI wire only | ✔ |
| Patient chart | `/app/patients/:id`, `/app/encounters/:id` | ✔ | Adapter | ✔ |
| Navigation | Global sidebar + Clinic top tabs | ✔ | Remove side nav | ✔ |

## 5. Out of scope

- D4C.4 Nursing/MA documentation depth
- Recreating or editing D4C.3 migration
- `prisma db push` / `migrate reset` / production seed
- Commit / push / merge
