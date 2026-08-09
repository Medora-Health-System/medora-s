# D4SEC.1C.2C.1 certification — PASS

## Verdict

**PASS** for the narrow audit integrity and historical actor/facility attribution slice.

The schema preserves nullable legacy state while using restrictive actor/facility deletion semantics. The migration fails on immutable-ID orphans and never repairs by email, guesses an ID, or mutates an AuditLog row. Routine lifecycle remains deactivation. The destructive maintenance script cannot delete audit rows and refuses non-local databases. Existing audit creation and D4SEC.1C.2B security metadata/transaction behavior remain unchanged.

## Required invariants

| Invariant | Evidence/result |
|---|---|
| Audit create remains supported | `AuditService` was unchanged; focused and security-admin tests pass; API compiles. |
| User deactivation retains actor | Deactivation does not delete/change User ID; restrictive FK acts only on delete. |
| User deletion cannot null actor | Prisma model + migration use `ON DELETE RESTRICT`. |
| Facility deactivation retains facility | Deactivation does not delete/change Facility ID. |
| Facility deletion cannot null facility | Prisma model + migration use `ON DELETE RESTRICT`. |
| Runtime AuditLog update/delete absent | Focused recursive production-source regression passes. |
| Patient reset preserves audit | Delete call removed; unit tests cover environment/host/confirmation gates. |
| Customer isolation/platform masking | D4SEC.1C.2A service/controller suites run; no reader code changed. |
| Secret rejection/transaction semantics | D4SEC.1C.2B suite passes; helper unchanged. |
| Legacy null migration safety | Columns remain nullable; migration contains no AuditLog row write. |
| No email authority/attribution | Model/migration regression verifies absence; preflight joins immutable IDs. |

## Commands and results

* `npm run build --workspace=@medora/shared` — **PASS**.
* `npm run prisma:generate --workspace=@medora/api` — **PASS** (Prisma 6.19.2).
* `DATABASE_URL='postgresql://medora:medora@localhost:5432/medora' npm exec --workspace=@medora/api -- prisma validate` — **PASS**.
* `npm run test --workspace=@medora/api -- --runInBand src/common/logging/audit-integrity-attribution-d4sec-1c2c1.spec.ts` — **PASS**, 10/10.
* Focused D4SEC.1A/1C.1/1C.2A/1C.2B suites (`platform-principal`, platform `RolesGuard`, user mutation boundary, admin audit controller/service, security-admin audit, admin users/facilities, MFA service) — applicable suites pass after shared build. One initial admin-audit invocation encountered the known shared-package resolution state; rebuilding shared resolved it.
* `./node_modules/.bin/nest build` from `apps/api` — **PASS**.
* `npm run lint --workspace=@medora/api` — **PASS** placeholder (`lint not configured yet`).
* `git diff --check` — required final check.

The environment has no Docker executable, so no local PostgreSQL destructive FK probe was possible. Certification relies on validated Prisma relation generation, reviewed standard PostgreSQL `RESTRICT` DDL, immutable-ID preflight SQL, focused tests, and build. Production preflight/deployment remains separately blocked on explicit authorization.

## Governance confirmations

Migration: **YES**, directory `apps/api/prisma/migrations/20261101120000_d4sec_1c2c1_audit_attribution_integrity`. Seed: **NO**. Production access, production migration, production seed, deployment, merge, employee capabilities, and support-account modification: **not performed**.

Residual risks deferred to D4SEC.1C.2C.2: full database-enforced append-only/tamper evidence, general AuditService metadata/PHI schemas, lifecycle/retention/legal hold, internal reader/access auditing, and governed audit export.
