# MEDUI.D4C.9 — Facility service-line configuration & billing workflow

## Purpose

Allow an existing facility to evolve service lines (e.g. add Dental) without cloning the facility, and make billing workflow explicit/deterministic.

## Service-line editor

Administration → Facility configuration → **Services & configuration**

- Reuses `FacilityTypeServiceLineFields`
- Saves via `PATCH /admin/facilities/:id/service-config`
- Dental specialties when DENTAL enabled
- Disable warns: navigation only — historical records retained
- After save: `refreshFromMe` + `medora:session-refresh`

## Billing workflow

| Context | Behavior |
|---|---|
| New facility | Explicit modes only; default CLINIC_ONLY; no LEGACY radio |
| Existing LEGACY (null mode) | Infer from `billingSiteType`; show configured/effective/source |
| Unresolved | `source: UNRESOLVED` — Admin must select explicit mode |

`resolveEffectiveFacilityBillingWorkflow` is authoritative for projection. Inferred mode is not auto-persisted.

## Separation

Service lines ≠ billing workflow. Adding Dental does not rewrite billing mode.

## Enterprise hardening

See `docs/clinical/enterprise-facility-capability-governance-d4c9-hardening.md` for capability authority, OCC, audit, billing consumers, historical read, and disable preflight.

## Auth

Facility ADMIN / platform principal only (existing `assertCanManageFacilityBilling`).
