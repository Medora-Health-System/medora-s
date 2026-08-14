# MEDUI.D4C.9 — Enterprise Facility Capability Governance (hardening addendum)

**Status:** implemented on branch `d4c9-enterprise-facility-service-line-configuration-billing-workflow`  
**Migration:** NONE  
**AuditAction migration:** NONE (reuse `FACILITY_CARE_PROFILE_UPDATED` + metadata events)

## A. Single configuration authority

`projectEnterpriseFacilityCapabilities()` in
`packages/shared/src/auth/enterpriseFacilityConfigurationAuthorityD4c9.ts`

Reuses:

- D4C.1 module capabilities / optional modules / navigation
- D5A.2 dental specialties
- D4C.9 `resolveEffectiveFacilityBillingWorkflow`

No second feature-matrix / FacilityFeatureOverride / DentalFacility.

Admin facility list returns `enterpriseCapabilities` + `configurationUpdatedAt`.

## B. Platform-wide consumption

| Consumer | Mechanism |
|---|---|
| Web navigation | `/auth/me` service lines + `resolveFacilityNavigation` / path gates |
| Dental API guard | `dentalCareEnabled` from module capabilities |
| Dental create operate | Server asserts dental line before introducing `dentalServiceLineV1` |
| Clinic / appointments | `parseStoredFacilityServiceLines` + module caps |
| Billing create defaults | Effective workflow → site type → `resolveDefaultBillingClassification` |
| Billing readiness/governance | `facilityWorkflowConfigFromRow` → effective resolver |
| Medical record index | OPERATE vs HISTORICAL READ (`dentalCareEnabled` option) |

## C. Atomic update

`updateFacilityServiceConfig` runs facility row update + idempotent department seed + AuditLog in one `$transaction`.

## D. Concurrency

`expectedUpdatedAt` (Facility.updatedAt ISO) + `updateMany` conditional write.  
Conflict code: `FACILITY_CONFIGURATION_CONFLICT`.  
No new version column / no migration.

## E. AuditLog

Action: existing `FACILITY_CARE_PROFILE_UPDATED`.  
Metadata events: `FACILITY_CONFIGURATION_UPDATED`, enable/disable line markers, previous/new service lines & specialties, billing effective before/after, department provisioning, platform-principal flag. PHI-safe.

## F–H. Billing

- Service lines ≠ billing workflow (unchanged).
- Effective workflow is canonical via `resolveEffectiveFacilityBillingWorkflow` / `facilityWorkflowConfigFromRow`.
- LEGACY = inferred for existing; new facilities default explicit `CLINIC_ONLY`.
- Dental CDT coding: not fabricated — readiness/deferral (no licensed CDT pack in MVP).

## I–K. Departments / Orders / Pharmacy

- Idempotent `ensureFacilityServiceLineDepartments` (no delete/reassign).
- No second Orders/Results engines.
- PHARMACY line = internal pharmacy workspace; outpatient Rx independence preserved (D4C.7G).

## L–O. Roles / cache / history / closed charts

- Capability ∩ role ∩ profession preserved (D5A.2).
- Admin save continues to `refreshFromMe` + `medora:session-refresh`.
- Historical encounters never rewritten; CLOSED dental always enterprise record; OPEN dental when disabled → historical enterprise record path.

## R–S. Readiness + safe disable

- Projection `serviceLineReadiness` (DISABLED / ENABLED_READY / ENABLED_ATTENTION).
- Disable requires Admin acknowledgement; server preflight counts open encounters / future appointments → `FACILITY_SERVICE_LINE_DISABLE_ACK_REQUIRED` when ack missing.

## Deferrals

| Item | Reason |
|---|---|
| New AuditAction enum values | Would require Prisma migration — use metadata.event |
| Dedicated configurationVersion column | Use Facility.updatedAt OCC |
| Licensed CDT / dental claim codes | Not in MVP pack — document readiness only |
| Full per-line appointment preflight for Lab/Rad | Soft warning + Clinic/UC/Dental appointment counts |
| Cross-user live cache push | Existing session refresh lifecycle |
