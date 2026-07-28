# MEDUI.D4C.2A.1 — Clinic Workspace Regression Correction

## Summary

Corrects Clinic Care workspace regressions after D4C.2A + D4C.3: one-sidebar layout, trackboard API error vs empty distinction, patient chart navigation, room assignment, and enterprise user assignment — **without** a new Prisma migration.

## Architecture

```
AppShell (global Medora sidebar)
  └─ /app/clinic-care/* → ClinicCareShell
        ├─ header
        ├─ ClinicCareTopNav (capability-filtered tabs, including lab/rad/pharmacy/PH/admin)
        └─ full-width main panel (trackboard / hubs)
```

**Removed:** in-shell `ClinicCareSideNav` (duplicate of global sidebar pattern).

## Trackboard restoration

- `GET /clinic-care/trackboard` maps Prisma **P2021/P2022** (and visitOrigin/Appointment messaging) to **503** `CLINIC_CARE_SCHEMA_MISS` — never an empty projection.
- `GET /appointments/today` same mapping.
- Web UI: error banner + retry; KPIs show `—` when unloaded due to error; true empty only when API succeeds with zero matching rows.
- D4C.3 projections (`visitOrigin`, appointment schedule/arrive/check-in) preserved when schema is present.

## Patient chart

- `resolveClinicBoardPatientNameHref` mirrors ED closed→chart / open→workspace pattern using enterprise paths (`/app/patients/:id`, `/app/encounters/:id`).
- Row actions prefer nested `/app/clinic-care/provider|nursing?encounterId=…` hubs.

## Room assignment

- Reuses `RoomAssignmentModal` + `PATCH /encounters/:id/room` (RN / Provider / Admin).
- Facility-scoped, audited by existing encounter room path. No ClinicRoom tables.

## Assign User

| Role | Engine |
|------|--------|
| Provider / Admin | `POST …/assign-provider/me` → `EnterpriseAssignmentService` ED columns |
| RN / Admin | `POST …/assign-nurse/me` → nurse column |
| PATIENT_CARE_TECH (MA) | Hospital-lane `TECHNICIAN` via `assignHospitalRoleToMe` |

No `ClinicUserAssignment` table. Ownership resolver remains authoritative for read projections.

## Capability regression

Unchanged from D4C.2A: Admin on Clinic-only cannot restore ED/Hospital; hybrid requires EMERGENCY line for ED; Lab/Rad/Pharmacy/Billing/PH remain capability ∩ role; direct URL guards held.

## Production migration checklist (no credentials)

1. [ ] `npx prisma migrate status` against production DB — note pending
2. [ ] Confirm migration folder `20261028120000_enterprise_appointment_visit_origin_d4c3` is in the deployed API artifact
3. [ ] Apply: `npm run migrate:deploy --workspace=@medora/api` (or Railway-equivalent `prisma migrate deploy`) **as a release step**, not on process start
4. [ ] Verify `Encounter.visitOrigin` column exists
5. [ ] Verify `Appointment` table exists
6. [ ] `GET /clinic-care/trackboard` → non-500 (200 or auth/business error, not schema miss)
7. [ ] `GET /appointments/today` → non-500
8. [ ] Clinic trackboard shows ambulatory rows when census exists; error banner when API fails
9. [ ] Do **not** use `db push`, `migrate reset`, or production seed for this fix

## Related docs

- Audit: `docs/clinical/clinic-workspace-regression-correction-d4c2a1-audit.md`
- Certification: `docs/certification/MEDUI.D4C.2A.1-certification.md`
- Ops separation: `docs/OPS.md`
