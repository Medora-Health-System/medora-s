# Phase 18 — Platform Admin Production Readiness & Final Acceptance

This is the final acceptance gate for the Platform Admin / corporate staff access workstream. It does not expand authority. It verifies that the production controls introduced in Phases 1–17 remain intact and that a real Technology / IT employee can be provisioned without inheriting clinical, patient-chart, billing, or owner authority.

## Automated acceptance gates

The Phase 18 regression gate must pass in CI and verifies:

- production system health becomes `critical` and go-live becomes `blocked` when production-readiness blockers exist;
- audit failure mode must be fail-closed in production;
- platform alerts must be enabled and have a configured webhook;
- operational projections require explicit facility context and their documented platform capabilities;
- external billing remains `preview_only` unless automation and the vendor webhook are both configured;
- Railway runs `prisma migrate deploy` before application deployment and checks `/health/ready`;
- Technology / IT retains the intended staff/security/catalog/system administration surface while excluding Billing / RCM, compliance-control mutation, and patient/chart/encounter/clinical authority;
- the protected owner is resolved through authoritative platform authority, not an email allowlist;
- delegated self-mutation, self-grant, critical direct grant, owner targeting, and owner-linked privileged-action enumeration remain blocked.

## Production deployment acceptance

After this PR is merged, verify the deployed commit and run the following from the Railway API service shell:

```bash
cd /app/apps/api
pnpm prisma migrate status
```

Acceptance requires Prisma to report no pending migrations. Phase 18 itself introduces no migration.

Verify Railway is using `apps/api/railway.json` (or `apps/api` as the service root) so that the pre-deploy migration gate is active. A successful application start alone is not sufficient evidence if the Railway service is bypassing that config.

## Platform owner acceptance

Using the authoritative platform-owner session:

1. Open Platform Admin and confirm Facilities, Medora Staff, Security, Compliance, Catalog / Configuration, and System Operations render according to owner authority.
2. Confirm System Health and Go-Live show production-readiness state and do not silently downgrade blockers to warnings.
3. Confirm the owner can create a corporate Technology / IT employee through the governed onboarding workflow.
4. Confirm the resulting employee has a corporate workforce profile and the governed Technology / IT access package.
5. Confirm the owner remains visible and manageable only to the owner session as designed.

## Technology / IT employee acceptance

Sign in as the newly created Technology / IT employee and verify both allowed and denied behavior.

Allowed surface:

- view/configure governed facility administration surfaces permitted by the package;
- view/provision Medora staff and use governed capability-management workflows;
- use security operations granted by the package;
- use catalog/configuration operations granted by the package;
- view system health, backup readiness, and go-live monitoring.

Denied / isolated surface:

- no Billing / RCM authority by default;
- no compliance-control mutation by default;
- no patient chart, encounter, or clinical authority from corporate onboarding;
- no ability to discover, target, deactivate, modify, grant to, revoke from, or act through privileged requests involving the protected platform owner;
- no self-grant or self staff-lifecycle mutation;
- no direct delegated grant of CRITICAL capabilities; dual control remains required.

## Facility and data-boundary acceptance

Verify with at least two facilities that facility-scoped operational projections require an explicit facility ID and return only the selected facility's operational data. Corporate platform capability must not be treated as patient/chart authorization.

## Billing safety acceptance

Verify `/platform/operations/billing-mode` from an authorized Billing / RCM account. Production is acceptable only when the displayed mode matches configuration:

- automation disabled -> `preview_only`;
- automation enabled but vendor webhook missing -> `preview_only`;
- automation enabled and vendor webhook configured -> `outbound_enabled`.

Do not enable external transmission as part of this acceptance unless the business has intentionally configured the production vendor integration.

## Final acceptance criteria

The Platform Admin workstream can be declared production-finalized when:

- all required GitHub CI checks are green on the Phase 18 PR;
- production deployment is healthy;
- `pnpm prisma migrate status` reports no pending migrations;
- owner and Technology / IT manual acceptance above pass;
- no Platform Admin production-readiness blocker remains unexplained;
- no regression grants corporate IT patient/chart/clinical or Billing / RCM authority by default.

Any failed item is a release blocker for this workstream until corrected or explicitly deferred with documented ownership and risk acceptance.
