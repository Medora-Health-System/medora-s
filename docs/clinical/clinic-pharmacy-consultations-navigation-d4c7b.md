# MEDUI.D4C.7B — Clinic Pharmacy navigation, inventory-alert privacy, Consultations routing

## Purpose

Finalize Clinic global navigation so ADMIN and PHARMACY can open the enterprise Pharmacy board from Clinic, inventory/expiration alerts stay role-restricted, and Consultations opens the ambulatory encounter worklist → Active Clinic Workspace — without ClinicPharmacy / ClinicConsultation forks.

## Pharmacy authority

Canonical route: `/app/pharmacy` (enterprise board preserved: queue, inventory, dispense, low stock, expiring, worklist, verification).

Clinic entry adapter:

`/app/pharmacy?source=clinic-care&ambulatory=1`

Thin redirect: `/app/clinic-care/pharmacy` → same href via `buildClinicPharmacyEntryHref`.

## Pharmacy menu

- Global sidebar group **PHARMACIE**, primary label FR **Pharmacie** / EN **Pharmacy**.
- Visible only to **ADMIN** and **PHARMACY** (canonical RoleCode; `PHARMACIST` is a soft alias only).
- Facility capability `pharmacyEnabled` required (Admin cannot override absent capability).
- Direct-route guards: `landingRoute` prefixes remain ADMIN/PHARMACY.
- Selected facility preserved via existing session / `x-facility-id`.
- Ambulatory filtering reuses D4C.7 `filterAmbulatoryPharmacyQueueOrders`.

## Inventory-alert privacy

| Surface | Behavior |
|---------|----------|
| Clinic Clinical Board | Never mounts inventory/expiration alerts |
| Pharmacy board | ADMIN + PHARMACY see `PharmacyAlertsCard` |
| ED / Hospital boards | Existing projection; still `canManagePharmacy` |
| API `inventory-low-stock` / `inventory-expiring` | PHARMACY + ADMIN only |
| Admin private Clinic dashboard widget | **Deferred D4C.8** |

No patient names / Rx PHI in alert widgets.

## Consultations

| Step | Behavior |
|------|----------|
| Nav | Clinic Care → `/app/clinic-care/encounters` (typed resolver) |
| List API | `GET /clinic-care/trackboard` (not ED `/trackboard`) |
| Empty | Successful empty copy (not connection error) |
| Failure | Real error + Réessayer |
| Open | `/app/encounters/:id?workspace=ambulatory&section=<role-default>&from=consultations` |

Role defaults: Provider → medical-evaluation; RN/MA → intake; Pharmacy → medications; Front Desk → follow-up; Admin → summary.

No auto-open of first patient. Generic `/app/encounters` retained for ED-only facilities via page gate + legacy list.

## Navigation consistency

ACCUEIL / SOINS / LAB / PHARMACIE / SANTÉ PUBLIQUE as specified. Single Pharmacy authority (no duplicate Clinic pharmacy engine).

## French i18n

Mirrored `clinicCareD4c7b.*` plus Pharmacy nav/home/alerts strings in `uiLabels` / `en.ts` / `fr.ts`. No Pharmacy component fork for Clinic FR.

## Migration / seed

None. Canonical role = `PHARMACY`. Enable facility Pharmacy via service line / care-profile when needed — do not silent-grant.

## Related modules

- `packages/shared/src/auth/clinicCarePharmacyConsultationsNavigationD4c7b.ts`
- D4C.7 pharmacy filter, D4C.5B Active Workspace, D4C.2A nav registry
