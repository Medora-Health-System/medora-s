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


## Enterprise backend expansion

Phase 7 is not treated as a cosmetic close-out. The pull request is held in draft while Administration and Hospital Operations are reviewed as a security boundary for systems processing personal and clinical information.

The repository-level review covers the API bootstrap, JWT/session validation, RolesGuard facility membership resolution, audit/logging controls, hospital-care controllers, inpatient/observation operations, and operational-governance query paths.

### Hospital Operations findings repaired in this phase

1. The Operational Governance controller exposed workforce/audit readers (staff analytics, chart-access history, audit center, and role timeline) to PROVIDER and RN in addition to ADMIN. These readers expose workforce activity and, for chart access, patient/encounter linkage and IP-derived audit evidence. They are now ADMIN-only under the existing facility-scoped RolesGuard.
2. Chart-access audit attribution accepted an optional client-supplied patientId after validating only the encounter. A caller could therefore create an internally inconsistent audit record by pairing an authorized encounter with another patient identifier. The service now treats the encounter as canonical: a conflicting patientId is rejected and the persisted audit event always uses Encounter.patientId.
3. Regression tests lock both minimum-necessary reader roles and canonical chart-access patient attribution.

### Existing enterprise controls confirmed

- JWT access tokens are session-bound and rejected when the backing AuthSession is revoked or expired.
- RolesGuard resolves active facility membership against an active facility instead of trusting a role string from the token.
- Platform-principal access is an explicit route opt-in and still requires an active facility context.
- Hospital operational controllers derive facility context from the authenticated request after RolesGuard normalization.
- Operational-governance Prisma reads inspected in this phase carry facilityId predicates.
- Structured logging applies PHI redaction and the HTTP request logger records normalized paths rather than query strings.
- Production exception responses suppress raw server exception details.

### Repository-scale hardening backlog

The API currently contains more than one hundred controllers and more than two hundred services. Enterprise certification must therefore remain a repository-wide control program rather than a claim based on Administration pages alone. Subsequent gates should inventory every controller and mutation for authentication, explicit authorization, tenant derivation, object-level authorization, auditability, input limits, idempotency/concurrency, and PHI-safe failure behavior.

Global runtime controls also require a dedicated gate: the current default throttler ceiling and global request-body ceiling are intentionally broad and should be replaced with endpoint-class limits only after upload/clinical payload requirements are inventoried so emergency workflows are not broken by a blanket reduction.
