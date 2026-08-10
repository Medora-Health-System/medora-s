# D4SEC.1C.3 certification

# PASS

Certified scope: additive Medora staff classification, capability catalog/grants, server resolver, reusable guard/decorator, principal-only bootstrap endpoints, semantic audit lifecycle and documentation. No UI, persona, deployment, production access, production identity or production grant is included.

## Evidence and acceptance mapping

* Focused Jest: 15/15 passed. It directly proves active staff/grant allow; no-grant, inactive User/profile and absent classification deny; ANY/ALL behavior; immutable id lookup; active/unrevoked grant and active-definition predicate; and absence of email, name, role, facility, flag and clinical model inputs.
* D4SEC.1A/C regression selection: 9 suites, 94/94 tests passed, covering platform principal, tenant/global mutation boundary, customer audit controller/service, security-admin writes, attribution integrity, enterprise projection/controller/service.
* Shared and API production TypeScript builds passed. API lint command passed (repository script reports lint is not configured).
* Prisma generation and schema validation passed. `git diff --check` passed.
* Database-backed endpoint E2E was not run because this environment has no Docker executable/disposable PostgreSQL. The migration remains deployment-gated and must receive integration migration/endpoint smoke testing before release; this does not alter the source-scope PASS.

The tests plus schema/service review cover the requested invariants: customer ADMIN, clinical role, email domain, role string, `canCreateFacilities`, facility membership/header and platform grants cannot manufacture authority; D4SEC.1A override remains explicit and centralized; clinical guards never consume capabilities; duplicate grant is an idempotent return; revoke deactivates the exact grant immediately; self-grant is denied/audited; only D4SEC.1A principal reaches bootstrap mutation routes; successful grant/revoke audit is transactionally singular; denied escalation paths audit safe evidence; strict DTOs reject extra/forged body fields and route target remains authoritative; restrictive FKs retain historical grants through attempted deletion while User deactivation blocks resolution; no PHI endpoint/query/model was added.

## Commands recorded

* `npm run build --workspace=@medora/shared` — PASS.
* `npm run test --workspace=@medora/api -- --runInBand src/platform-staff/platform-capability.resolver.spec.ts` — PASS, 15 tests.
* `npm run test --workspace=@medora/api -- --runInBand src/auth/platform-principal.spec.ts src/admin/user-mutation-boundary.spec.ts src/admin/admin-audit.controller.spec.ts src/admin/admin-audit.service.spec.ts src/common/services/security-admin-audit.spec.ts src/common/logging/audit-integrity-attribution-d4sec-1c2c1.spec.ts src/platform-audit/enterprise-audit-projection.spec.ts src/platform-audit/platform-audit.controller.spec.ts src/platform-audit/platform-audit.service.spec.ts` — PASS, 94 tests.
* `npm run build --workspace=@medora/api` — PASS.
* `npm run lint --workspace=@medora/api` — PASS placeholder; lint not configured.
* `DATABASE_URL=postgresql://x:x@localhost:5432/x npm exec --workspace=@medora/api -- prisma validate` — PASS.
* `git diff --check` — PASS.

## PR #94 security-review remediation

The centralized guard now writes authoritative denial evidence for authenticated unauthorized grant, revoke, and staff-classification escalation attempts without auditing ordinary reads or missing JWT identities. Focused resolver/guard/service coverage passed 27/27 tests; the requested combined platform-principal, tenant-boundary, security-audit, platform-audit, and platform-staff regression run passed 95/95 tests across 9 suites. Concurrent duplicate grants now convert the partial-unique `P2002` loser into a deterministic idempotent result after re-reading the active winner. The original migration and Prisma schema were unchanged by this remediation.

## Release gate

Before production: review migration SQL; run `npm exec --workspace=@medora/api prisma migrate deploy` in a controlled pre-production environment; execute authenticated endpoint integration tests against disposable PostgreSQL; verify exact audit row counts and immediate post-revoke authorization. No general seed is needed: migration deploy installs catalog rows idempotently and no grants.
