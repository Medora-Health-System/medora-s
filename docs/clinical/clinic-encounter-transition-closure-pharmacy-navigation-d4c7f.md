# MEDUI.D4C.7F — Ambulatory encounter transition UX, closure override, navigation icons, Pharmacy access

## Purpose

1. Auditable closure override for overridable pending clinical items  
2. Instant idempotent encounter action transitions  
3. Distinct sidebar icons (no production question marks)  
4. Full enterprise Pharmacy for ADMIN+capability and PHARMACY  

## Authority

- **One** lifecycle: `Encounter.status` via `EncountersService.close`  
- Thin ambulatory adapter only — no `closeClinicEncounterWithOverride` / `ClinicClosure*` / `ClinicPharmacy*`  

## Closure preflight / override

Typed error / projection:

- `code: ENCOUNTER_PENDING_ITEMS`
- `pending: { laboratory, imaging, medications, procedures, results, criticalResults, followUps }`
- `overrideAllowed`, `nonOverridable`, `acknowledgementVersion`

Close body:

- `acknowledgePendingItems: true`
- `acknowledgementVersion: D4C7F_PENDING_ACK_V1`
- `pendingItemsOverrideReason: PROVIDER_ACCEPTED_PENDING_ITEMS`

Server enforces PROVIDER (or MEDORA_SUPER_ADMIN) for explicit pending override.  
Non-overridable infusion cannot be acknowledged away.

Pending orders/results are **preserved** after close (not cancelled/completed/administered).

## Action control

- Immediate disable + FR pending labels (`Clôture en cours…`, etc.)  
- Duplicate click blocked via `workflowBusy`  
- Server response updates local encounter projection then `load()`  
- Cache invalidation reuses D4C.7D `invalidateClinicCareAmbulatoryLifecycleCache` on close **and** workflow PATCH  

## Icons

`SidebarNavIcons` resolves Twemoji by pathname (`resolveSidebarNavIconPathname`):

| Nav | Icon key |
|-----|----------|
| Clinic Care / Soins cliniques | chart `1f4ca` |
| Nursing (clinic-care alias) | heart `1fac0` |
| Provider | clinician `1f9d1-…` |
| Consultations | document `1f4c4` |
| Lab worklist (+ qs) | test tube `1f9ea` |
| Pharmacy (+ qs) | pill `1f48a` |

## Pharmacy navigation

When Clinic Care + `pharmacyEnabled`:

- `/app/pharmacy`, worklist, inventory, dispense, low-stock, expiring → `source=clinic-care&ambulatory=1`  
- Direct routes remain ADMIN/PHARMACY (`landingRoute`)  
- Capability required — Admin cannot invent Pharmacy service line  

## Modules

- `packages/shared/.../enterpriseClinicEncounterTransitionClosurePharmacyNavigationD4c7f.ts`  
- API: disposition readiness pending split + close enforcement  
- Web: modal, workspace actions, apiClient blocker serialization, icons, nav rewrite  

## Related

- D4C.7D lifecycle close  
- D4C.7E MAR/Rx separation  
- D4C.7B Pharmacy nav  
- D4C.7C Lab/Rad rewrite  
