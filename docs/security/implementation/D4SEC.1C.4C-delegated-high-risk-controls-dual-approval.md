# D4SEC.1C.4C implementation

Implemented the centralized risk/scope policy, strict DTOs, seven request endpoints, dedicated approval authority, additive Prisma request state, session-specific MFA revalidation, explicit transitions, conditional execution claim, execution-time authority/target/capability checks, transactional provision/grant adapters, and safe security-admin events.

Endpoints: `POST/GET /platform/privileged-action-requests`, `GET /platform/privileged-action-requests/:id`, and `POST .../:id/approve|reject|cancel|execute`. Lists are capped at 100 and omit session IDs and digest. Unknown DTO fields fail validation. Requesters cannot target themselves; requesters and elevation targets cannot approve. Approval capability is revalidated at execution.

Migration: `20261104120000_d4sec_1c4c_delegated_high_risk_dual_control`. Local: `npm run prisma:migrate --workspace=@medora/api`. Production (REPORT ONLY, after authorization): `npm run prisma:migrate:deploy --workspace=@medora/api`. Rollback before use drops the new table/types and catalog definition; after requests exist, retain/export security history and use a governed forward migration rather than destructive rollback. Seed required: **NO**.

Residual risks and deferred adapters are recorded in the audit. No dashboard/frontend work was performed.
