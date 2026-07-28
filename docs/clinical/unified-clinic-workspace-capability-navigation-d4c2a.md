# MEDUI.D4C.2A — Unified Clinic Workspace & Capability-Based Navigation

## Goal

One Clinic Care workspace with capability-based navigation:

`visibleNavigation = facilityEnabledModules ∩ roleAuthorizedModules ∩ userAssignments`

**Admin does not override absent facility capability.**

## Architecture

### Capability resolver (shared)

`packages/shared/src/auth/clinicWorkspaceCapabilityNavigationD4c2a.ts` extends D4C.1:

- `resolveCapabilityAwareNavigation` / `resolveCapabilityAwareNavigationAreas` → wraps `resolveFacilityNavigation`
- `CLINIC_WORKSPACE_NAV_REGISTRY` — single typed registry for top + side nav
- `resolveClinicWorkspaceLandingPath` — role landings inside Clinic
- `isFacilityCareSettingPathAllowed` — direct URL care-setting gates
- `isClinicWorkspacePathAllowed` — nested Clinic path × role access

### Facility capability matrix (care settings)

| Facility profile | Clinic Care | ED | Hospital/Obs | Lab/Rad/Pharm/Billing/PH |
|------------------|-------------|----|--------------|---------------------------|
| CLINIC | On | Off unless EMERGENCY line | Off unless Obs/IP lines | Optional modules / lines |
| URGENT_CARE | On | Off unless EMERGENCY line | Off unless Obs line | Optional modules / lines |
| Hybrid UC+ED | On | On when EMERGENCY line | Only if Obs/IP lines present | Never infer Hospital from Lab/Pharmacy/Billing |
| HOSPITAL / FSER | Per lines/profile | Typically on | Typically on | Per lines/modules |

### Authorization matrix (Clinic shell tabs — examples)

| Role | Trackboard | Registration | Nursing | Provider | Billing |
|------|------------|--------------|---------|----------|---------|
| ADMIN | ✔ | ✔ | ✔ | ✔ | if billing module |
| PROVIDER | ✔ | ✖ | ✖ | ✔ | ✖ |
| RN | ✔ | ✔ | ✔ | ✖ | ✖ |
| FRONT_DESK | ✔ | ✔ | ✖ | ✖ | if billing module |
| LAB/RAD tech | ✔ (safe) | ✖ | tech-safe | ✖ | ✖ |

### Unified Clinic shell

- Nested layout: `apps/web/app/app/clinic-care/layout.tsx`
- Shell: `ClinicCareShell` + `ClinicCareTopNav` + `ClinicCareSideNav`
- Subroutes replace center panel only
- KPIs (six D4C.2 metrics) remain on Trackboard / Today's Visits panels

### Routes

`/app/clinic-care`, `/registration`, `/todays-visits`, `/nursing`, `/provider`, `/patients`, `/encounters`, `/follow-up`, `/billing`, `/laboratory`, `/radiology`, `/pharmacy`, `/public-health`, `/administration`

### Default landings (Clinic facility)

| Role | Landing |
|------|---------|
| ADMIN | `/app/clinic-care` (Trackboard) |
| FRONT_DESK | `/app/clinic-care/registration` |
| PROVIDER | `/app/clinic-care/provider` |
| RN | `/app/clinic-care/nursing` |
| BILLING | `/app/clinic-care/billing` |
| PHARMACY | `/app/clinic-care/pharmacy` |

### Direct-route enforcement

- Web: `landingRoute.ts` capability gate (Admin included)
- API: `TrackboardReadAccessGuard` requires `edEnabled` (or Obs/IP for inpatient board)

### Regression preservation

- D4C.2 KPIs / trackboard projection unchanged
- D4C.3 registration / appointments unchanged
- ED / Hospital / FSER remain for capable facilities
- Haiti PH remains capability + jurisdiction gated (D4C.1)

## Schema

**MEDUI.D4C.2A requires no Prisma migration.**
