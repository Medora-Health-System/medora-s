# Phase 6 — Delegated Country Administration Boundary

## Purpose

Phase 5 certified the clinical tenant boundary: exact facility membership authorizes facility-scoped clinical access, while country configuration controls workflow availability and is not an access credential.

Phase 6 defines the separate corporate administration boundary needed for delegated Medora operators. It intentionally does **not** change clinical authorization.

## Certified invariants

1. **Clinical access remains exact-facility.** A country assignment must never satisfy `RolesGuard`, `FacilityMembershipGuard`, or any facility-scoped database predicate.
2. **The authoritative platform principal remains global.** Existing platform-principal authority is not narrowed by delegated country scope.
3. **Delegated corporate operators are least-privilege.** Country scope may constrain corporate/admin operations only after the operation has independently passed platform capability authorization.
4. **Country scope is deny-by-default.** A delegated operator without an explicit country assignment cannot act through a country-scoped administrative path.
5. **No wildcard-by-omission.** Missing, null, empty, malformed, or unsupported country scope must not mean “all countries.”
6. **No privilege composition.** Country scope grants geography only; it does not grant a platform capability, staff persona, clinical role, facility membership, or patient access.
7. **Facility targets are resolved server-side.** A country-scoped administrative action targeting a facility must derive the facility country from the database; callers cannot authorize themselves by supplying a country string.
8. **Cross-country mutation is prohibited.** A delegated operator scoped to one country cannot mutate corporate resources belonging to another country.
9. **Audit attribution is mandatory.** Country-scoped privileged mutations must record actor, target, effective country, operation, outcome, reason, and ticket/reference when supplied.
10. **Lifecycle changes are explicit.** Granting, changing, and revoking delegated geography must be auditable security events; revocation must fail closed immediately for subsequent requests.

## Model boundary

`MedoraStaffProfile` continues to represent corporate staff identity/persona.

`PlatformCapabilityGrant` continues to represent *what* a corporate operator may do.

Delegated country scope represents *where* an otherwise-authorized corporate operator may perform specifically designated administrative operations.

These authorities must remain orthogonal:

```
allowed = platformCapability(operation)
       && delegatedCountryScope(targetCountry)
```

For the authoritative platform principal, existing global authority remains unchanged.

## Explicit non-goals

Phase 6 country scope must not:

- authorize clinical chart access;
- create or imply `UserRole` membership;
- bypass facility membership;
- replace facility-scoped predicates;
- alter facility feature/module configuration semantics;
- create a second feature matrix;
- turn a country into a tenant;
- silently narrow the existing authoritative global platform principal.

## Implementation gate

Before production enablement of delegated country administration, implementation must include:

- an explicit persisted country-scope authority with immutable grant/revoke attribution;
- a central resolver/guard used by every designated country-scoped corporate endpoint;
- server-side target-country resolution;
- fail-closed tests for absent scope, wrong country, inactive staff, revoked scope, and capability-without-geography;
- tests proving geography-without-capability is denied;
- tests proving country scope never authorizes clinical/facility access;
- audit tests for allow and deny outcomes;
- migration/backfill behavior that grants **no delegated country authority by default**.

Until those controls are implemented and certified, existing global platform administration remains the only production authority and no endpoint may infer delegated country access from country configuration, request headers, facility selection, or clinical membership.
