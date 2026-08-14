# MEDUI.D4C.9 — Certification

**Feature:** Enterprise Facility Capability Governance  
**Branch:** `d4c9-enterprise-facility-service-line-configuration-billing-workflow`  
**Base:** `origin/main` @ `f4cd29077` (includes D5A.4)  
**Status:** **CERTIFIED WITH DOCUMENTED DEFERRALS** — pending human review  
**Commit / push:** **NONE**

## Verdict

**MEDUI.D4C.9 — ENTERPRISE FACILITY CAPABILITY GOVERNANCE — CERTIFIED WITH DOCUMENTED DEFERRALS**

**Re-certified after MEDUI.D4C.9A** (Dental DepartmentCode provisioning correction).

Not a UI-only checkbox milestone. Persisted facility configuration is the platform authority for navigation, guards, capabilities, departments, billing effective workflow, audit, and historical-record access.

## Validation

| Check | Result |
|---|---|
| shared / api / web build | **PASS** |
| web `tsc --noEmit` | **PASS** |
| shared D4C.9 authority + matrix + billing tests | **30 PASS** |
| prisma validate | **PASS** (Migration **NONE**) |
| `git diff --check` | **PASS** |

## Delivered (hardening addendum)

- `projectEnterpriseFacilityCapabilities` — single authoritative projection
- Transactional service-config update (facility + department seed + audit)
- Optimistic concurrency via `expectedUpdatedAt` → `FACILITY_CONFIGURATION_CONFLICT`
- Disable preflight + Admin acknowledgement
- Billing consumers use effective-workflow resolver (`facilityWorkflowConfigFromRow`)
- Encounter/appointment create uses effective billing site type
- Dental operate gate on introducing `dentalServiceLineV1`
- Historical OPEN dental routes to enterprise record when Dental disabled
- Richer AuditLog metadata (no new AuditAction / no migration)
- Admin UI readiness strip + OCC + ack checkbox + structured error codes
- Enterprise test matrix (§T) in shared package

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|---|---|---|---|---|
| Facility service lines | `Facility.serviceLinesJson` / D4C.1 | ✔ | ✔ (OCC, readiness) | ✔ |
| Module capabilities | `resolveFacilityModuleCapabilitiesD4c1` | ✔ | ✔ (projection) | ✔ |
| Dental navigation/caps | D5A.2 | ✔ | ✔ (historical read) | ✔ |
| Billing workflow | `resolveEffectiveFacilityBillingWorkflow` | ✔ | ✔ (consumers) | ✔ |
| Departments | `ensureFacilityServiceLineDepartments` | ✔ | ✔ (in TX) | ✔ |
| AuditLog | `FACILITY_CARE_PROFILE_UPDATED` | ✔ | ✔ (metadata) | ✔ |
| Patient medical record | D4C.8C | ✔ | ✔ (operate vs historical) | ✔ |
| Orders / Results | existing engines | ✔ | — | ✔ |
| Pharmacy outpatient Rx | D4C.7G | ✔ | — | ✔ |

## Documented deferrals

See `docs/clinical/enterprise-facility-capability-governance-d4c9-hardening.md`.

## Manual UAT (minimum)

1. Existing Clinic enables Dental → same facilityId; Dental nav + guard; Clinic remains.
2. Concurrent Admin save with stale `expectedUpdatedAt` → conflict, no silent overwrite.
3. Disable Dental with open work → ack required; historical CLOSED dental still opens.
4. Billing remains CLINIC_ONLY when Dental enabled; new Clinic encounter classification unchanged.
5. Pharmacy line off → internal Pharmacy hidden; ambulatory Rx still available where previously independent.
