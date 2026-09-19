# MEDORA Country Configuration Authority — Phase 2

## Purpose

Phase 2 introduces one shared country policy authority above the existing facility configuration authority.

Precedence:

```
Medora global safety/deployment gate
  -> country policy / eligibility
  -> facility type + service lines
  -> FacilityConfiguration
  -> role / profession / department authorization
  -> encounter/resource facility boundary
```

## Rules

- `Facility.country` remains the jurisdiction source of truth.
- UI locale never determines jurisdiction.
- `FacilityConfiguration` remains the single facility-owned configuration document.
- Country policy is not a second facility matrix and does not create country-specific clinical engines.
- A country policy may prohibit a capability.
- A facility may narrow an allowed capability.
- A facility may not re-enable a country-prohibited capability.
- Role/profession authority may further narrow access but may not resurrect a disabled capability.
- Unknown legacy countries preserve existing facility behavior in Phase 2 and are surfaced as `UNCONFIGURED_COUNTRY`; this avoids breaking existing tenants while country onboarding governance is expanded.

## Initial registry

Canonical codes:

- United States: `US`
- Dominican Republic: `DO`
- Haiti: `HT`

Accepted legacy/input aliases are normalized in memory only. Existing `Facility.country` database values are not rewritten.

Presentation defaults:

- US -> English
- DO -> Spanish
- HT -> French

These are defaults only. They do not make language a jurisdiction signal.

## Conservative clinical policy

Phase 2 intentionally does not invent legal or regulatory prohibitions. All current top-level clinical modules remain country-eligible in US, DO and HT unless a documented requirement later establishes a prohibition.

This keeps country governance explicit without silently disabling patient care based on assumptions.

## Effective capability

`resolveEffectiveFacilityModuleCapability` combines country eligibility with the facility's existing module configuration.

Example:

- Haiti Clinic A: Radiology enabled -> effective enabled.
- Haiti Clinic B: Radiology disabled -> effective disabled.
- If a future documented Haiti policy prohibited a module, both facilities would resolve disabled regardless of their local setting.

`applyCountryPolicyToFacilityConfiguration` applies only country prohibitions to a cloned configuration. It never mutates the canonical facility-owned settings.

## Scope boundary

Phase 2 establishes the shared authority and precedence contract. It does not yet replace every deployment-wide feature flag or wire every clinical API to this resolver. That end-to-end enforcement is handled in later phases, beginning with the known Care Plan and ancillary-module gaps identified in Phase 1.

## Database

No Prisma migration. No country configuration table is introduced in Phase 2. The initial country policy registry is code-governed because there is no validated requirement yet for customer-editable country law/regulatory policy. Facility-owned settings remain database-backed in `FacilityConfiguration`.
