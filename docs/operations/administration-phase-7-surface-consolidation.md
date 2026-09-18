# Administration Phase 7 — surface consolidation and route ownership

## Purpose

Phase 7 closes the Administration production-hardening program by removing semantic duplication from the Administration landing page after the underlying authority boundaries were certified in Phases 1–6.

This phase changes navigation composition only. It does not change Application Modules, APIs, RBAC, clinical workflows, revenue-cycle behavior, integrations, patient activation, or facility data mutations.

## Before Phase 7

The Administration landing page composed three independently useful surfaces:

1. Facility Configuration Console;
2. App & Facility Control;
3. Legacy Administration Dashboard.

All three exposed overlapping facility-operation links. A single route such as Users, Audit, Reports, Go-live, Enterprise Workflow, Clinical Rules, or Revenue Cycle could therefore appear more than once on the same Administration page.

That duplication blurred ownership even though the backend authority boundaries were already hardened.

## Canonical ownership after Phase 7

### Facility Configuration Console

Owns configuration state only:

- modules;
- Digital Care configuration;
- Patient Portal configuration;
- branding;
- notifications;
- clinical-rule configuration flags;
- scheduling;
- AI configuration;
- security configuration;
- integration configuration;
- revision history, validation, save/discard/restore, and preview.

Its duplicate "Operations" link strip is removed.

### App & Facility Control

Owns facility operational navigation:

- staff / roles / access;
- audit;
- operational reports;
- enterprise workflow;
- enterprise clinical rules;
- go-live readiness;
- billing governance;
- revenue cycle;
- medication governance;
- medication inventory;
- Patient App Access.

No behavior inside these destination modules is changed.

### Residual Administration Dashboard

Owns only the remaining administration domains not represented by the facility control panel:

- platform operations for authorized platform operators;
- connectivity / national access;
- facility directory and facility lifecycle controls for authorized facility creators.

The old duplicate Facility Administration link grid and duplicate Administration hero are removed.

## Regression contract

Phase 7 source-level regression tests assert that:

- canonical facility-operation routes remain present in FacilityAdminControlPanel;
- those routes are absent from the Facility Configuration Console;
- those routes are absent from the residual platform dashboard;
- platform health/compliance, integrations, and facility-directory operations remain present.

## Application Modules boundary

Application Modules behavior and module configuration controls are unchanged. The phase removes only redundant navigation around the Administration landing surface.

## Result

The Administration page now has explicit semantic ownership rather than three competing navigation surfaces:

**configuration → facility operations → platform/connectivity/facility directory**

This is the final consolidation phase of the seven-phase Administration hardening program.
