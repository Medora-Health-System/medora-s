# MEDUI.D4C.7B — Audit

## Git verification (start)

```
branch: d4c7b-clinic-pharmacy-consultations-navigation
status: clean working tree
HEAD == origin/main (326c7b361) including D4C.7A / D4C.7 / D4C.5B.3 / D4C.6
fetch: origin/main current
```

No unrelated dirty work. No ClinicPharmacy / ClinicConsultation forks proposed.

## Screenshot defects

### A — Pharmacy missing from Clinic left nav

Enterprise `/app/pharmacy` existed; Clinic-capable facilities with `pharmacyEnabled` did not surface a clear **Pharmacie** entry with Clinic ambulatory context. Global sidebar pharmacy items were labeled “File pharmacie” and only appeared when facility PHARMACY capability was on (correct gate). Clinic top-tab already redirected to enterprise pharmacy with `ambulatory=1` only.

### B — Consultations load failure

Global **Consultations** → `/app/encounters` → `GET /trackboard?status=OPEN` → `TrackboardReadAccessGuard` requires `edEnabled` → **403** on clinic-only facilities → UI `"Impossible de charger les consultations."`

Root cause: **wrong care-setting API** (ED trackboard), not schema/session/cache.

### C — Patient open path

Patient click from Clinic trackboard already opened Active Clinic Workspace. Consultations menu did not use the same ambulatory list → workspace journey.

## STOP / role / capability findings

| Check | Result |
|-------|--------|
| Canonical pharmacy role | **`PHARMACY`** (Prisma `RoleCode`). Soft alias `PHARMACIST` accepted in helpers only — **not seeded**. No migration. |
| Facility pharmacy capability | `pharmacyEnabled` via PHARMACY service line or `optionalModules.pharmacy`. CLINIC defaults **omit** PHARMACY — **no silent seed**. Facilities must enable Pharmacy capability for nav/API. |
| Duplicate engines | Absent — reuse enterprise Pharmacy + clinic-care encounters projection. |

## Root cause (Consultations)

Documented above: ED-gated `/trackboard` used for Clinic Consultations nav.

## Corrections applied

1. Care-setting sidebar href rewriter (`resolveClinicCareAwareSidebarHref`) — Consultations → `/app/clinic-care/encounters`; Pharmacy → `/app/pharmacy?source=clinic-care&ambulatory=1` when clinic + pharmacyEnabled; Nursing/Provider → clinic-care when clinic-only.
2. `/app/encounters` page gate redirects Clinic Care facilities to ambulatory list; ED-only keeps legacy open list.
3. Ambulatory encounters view: always `/clinic-care/trackboard`; role-aware open path + `from=consultations`; distinct empty vs error+retry.
4. Inventory alert APIs restricted to `PHARMACY` + `ADMIN`; PharmacyAlertsCard gated with `canManagePharmacy`; Clinical Board never mounts alerts.
5. FR/EN Pharmacy nav + board labels localized (Pharmacie, Alertes de pharmacie, etc.).
6. Admin private dashboard inventory widget **deferred D4C.8**.

## Inventory-alert privacy

- Shared Clinic Clinical Board: **no** low-stock / expiring widgets.
- ADMIN/PHARMACY: alerts inside Pharmacy (+ existing ED/Hospital boards when `canManagePharmacy`).
- PROVIDER/RN: no alert API access for low-stock/expiring.

## Deferrals

| Item | ID |
|------|-----|
| Private Admin Clinic dashboard inventory/expiration widget | D4C.8 |
| Enabling Pharmacy on Clinic facilities without PHARMACY capability | Facility config — do not silent-seed |
