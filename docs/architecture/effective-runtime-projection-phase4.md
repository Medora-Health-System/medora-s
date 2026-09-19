# MEDORA Phase 4 — Effective Runtime and UI Projection

Phase 4 makes the facility runtime document reflect the effective country + facility capability hierarchy.

## Problem closed

A stored facility configuration can contain child preferences that were previously true even when a parent module was disabled. Returning those raw child values to runtime consumers can expose UI or patient-facing surfaces that should not be available for that facility.

The stored `FacilityConfiguration` remains the facility-owned source document. Phase 4 does not rewrite it. Instead, runtime projection creates a cloned, narrowed effective document.

## Effective runtime

The projection applies:

1. country policy;
2. facility module state;
3. dependent child-surface narrowing.

Examples:

- Radiology OFF => radiology patient results, patient-portal Radiology, Radiology integration and PACS runtime channels OFF.
- Laboratory OFF => laboratory patient results, portal Lab Results and lab integration OFF.
- Pharmacy OFF => pharmacy medication list, portal medications, medication sharing and pharmacy integration OFF.
- Billing OFF => invoices, claims and portal invoices OFF.
- Patient Portal OFF => all patient-portal child surfaces OFF.
- Digital Care OFF => messaging/sharing/remote/digital child surfaces OFF.
- Telemedicine OFF => telehealth child surfaces OFF.
- AI OFF => AI runtime tools OFF.

This means two facilities in the same country can receive different runtime/UI capability documents without separate deployments.

## Server use

`FacilityConfigurationService.runtimeForFacility()` now caches and returns the effective projection while retaining raw stored settings separately for administration and revision history.

Runtime-dependent Digital Care, messaging and result-release paths consume effective settings so a country/facility restriction is not bypassed by a stale child preference.

## Historical configuration

Admin configuration and revision history continue to show the stored facility-owned settings. Effective runtime is separately projected, preventing country policy from silently rewriting facility history.

## Database

No Prisma schema change. No database migration is required for Phase 4.
