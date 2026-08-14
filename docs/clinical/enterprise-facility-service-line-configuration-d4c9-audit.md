# MEDUI.D4C.9 — Facility service-line configuration audit

**Branch:** `d4c9-enterprise-facility-service-line-configuration-billing-workflow`  
**Base:** `origin/main` (includes D5A.4)

## Defect A — Existing facility cannot evolve service lines

| Finding | Evidence |
|---|---|
| Create path supports service lines + dental specialties | `AddFacilityModal` + `FacilityTypeServiceLineFields` |
| Existing facility UI only had billing identity + operational address | `admin/users/page.tsx` |
| API already supports update | `PATCH /admin/facilities/:id/service-config` |
| Persistence | `Facility.serviceLinesJson` + `facilityCareProfileJson.dentalSpecialties` |
| Department seed idempotent on update | `ensureFacilityServiceLineDepartments` |
| Navigation recomputes from `/auth/me` serviceLines | `refreshFromMe` + `medora:session-refresh` |

**Fix:** Reuse `FacilityTypeServiceLineFields` in `FacilityServiceConfigModal` → existing PATCH. No second authority.

## Defect B — LEGACY billing workflow

| Finding | Evidence |
|---|---|
| LEGACY is UI unset (`""` → null), not a Prisma enum | `FacilityBillingWorkflowFields` |
| GET re-infers from `billingSiteType`, so LEGACY never “sticks” | `resolveFacilityBillingWorkflowConfig` |
| Create already substituted profile default when null | `getDefaultBillingClassificationModeForProfile` |

**Fix:** Create forbids LEGACY option and defaults to `CLINIC_ONLY`. Edit shows configured vs effective via `resolveEffectiveFacilityBillingWorkflow`. UNRESOLVED when inference fails.

## Specialty vs service line

- **Service lines:** MedoraServiceLine registry (Clinic, Dental, Lab, …)
- **Dental specialties:** care-profile `dentalSpecialties` (D5A.2)
- Internal Medicine remains under Clinic Care specialty configuration — not a duplicate top-level service line

## Migration / seed

NONE — reuse existing columns and endpoints.

## Architectural forks (STOP)

`FacilityFeatureOverride` · `DentalFacility` · `ClinicFacility` · parallel config audit tables
