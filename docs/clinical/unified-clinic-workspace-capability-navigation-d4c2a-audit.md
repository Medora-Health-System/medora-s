# MEDUI.D4C.2A — Audit: Unified Clinic Workspace & Capability-Based Navigation

**Date:** 2026-07-27
**Branch:** `d4c2a-unified-clinic-workspace-capability-navigation`
**Baseline:** D4C.3 merged into `origin/main` (PR #63)

## Scope audited

Facility capabilities (D4C.1), global sidebar, Clinic Care shell (D4C.2), Registration (D4C.3), ED/Hospital shell patterns, roles, web route guards, API trackboard guard.

## Findings summary

| # | Issue | Severity | Root cause |
|---|--------|----------|------------|
| 1 | Admin sees ED/Hospital on Clinic-only facility | High | Web sidebar used `getVisibleNavigationAreas` (Admin bypass). D4C.1 `resolveFacilityNavigation` already filtered ambulatory care settings but was unused by the shell. |
| 2 | Top nav bounces out of Clinic workspace | High | D4C.2 `SHELL_NAV` linked to global `/app/nursing`, `/app/provider`, `/app/patients`, etc. No nested Clinic layout. |
| 3 | Clinic not unified across Registration / Today's Visits / modules | High | Only `/app/clinic-care` + `/registration`; shell chrome lived only on trackboard page; Today's Visits was an in-page filter, not a route. |
| 4 | Capability vs role separation weak | High | Capabilities modeled in D4C.1/shared + Clinic Care API guard; global nav + Admin route guard were role-first. |

## Facility capability model (pre-existing)

- `Facility.facilityType`, `serviceLinesJson`, `facilityCareProfileJson` (D4C.1 — **no new Prisma fields required**)
- Shared: `resolveFacilityModuleCapabilitiesD4c1`, `resolveFacilityNavigation`, `resolveClinicCareWorkspaceRoleAccess`

## Navigation before D4C.2A

- Sidebar: `sidebarNavConfig.ts` + `navigationVisibility.ts` → `getVisibleNavigationAreas`
- Admin early-return skipped facility service-line filter in profession resolver
- Route guard: `getRouteGuardRedirect` returned `null` for Admin unconditionally

## ED / Hospital shell pattern to reuse

- `HospitalCareShell` + section nav + path helpers (component shell; not always Next nested layout)
- Clinic mirrors this with nested `clinic-care/layout.tsx` + `ClinicCareShell`

## Schema decision

**MEDUI.D4C.2A requires no Prisma migration.** Capabilities already persist in D4C.1 JSON + service lines.

## Remediation implemented in D4C.2A

1. Shared capability navigation registry + resolver (`clinicWorkspaceCapabilityNavigationD4c2a.ts`)
2. Web sidebar + landing + route guard wired to capability-aware resolution (Admin included)
3. Unified Clinic nested shell + top/side nav registry under `/app/clinic-care/*`
4. Trackboard API guard enforces `edEnabled` / hospital observation-inpatient capabilities
5. `/auth/me` exposes `careProfileJson` + `facilityCountry` for client resolvers
