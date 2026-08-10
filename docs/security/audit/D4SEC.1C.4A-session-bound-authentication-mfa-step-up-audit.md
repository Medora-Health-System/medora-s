# D4SEC.1C.4A — Session-bound authentication and MFA step-up audit

## Scope and findings

Source commit `a65fce6755d01d0044a23f1bc17bfe51bab4d0d5` was audited directly. Access JWT issuance and refresh carry the persistent `AuthSession.id` as `sid`. `JwtStrategy` constrains the lookup by `sid`, JWT `sub`, `revokedAt: null`, and `expiresAt > now`; a missing match fails authentication before platform authority is evaluated. Assurance is read from that database row, not from claims, headers, `User.mfaLastVerifiedAt`, email, facility context, `canCreateFacilities` alone, or a role alone.

PR #95 follow-up makes the transition strict: every access JWT without `sid` fails with `SESSION_BOUND_TOKEN_REQUIRED`. There is no compatibility cutoff, fabricated session, or client-controlled fallback. Repository production configuration defaults access JWTs to **8 hours** (`apps/api/.env.example` and `AuthService.accessTtl`). Consequently users holding pre-deployment sid-less access tokens must log in again after deployment; normal password and MFA-completed login both create an `AuthSession` and issue a matching sid-bearing access token. Reauthentication is intentionally preferred over preserving an eight-hour revocation gap.

The authenticated and throttled `POST /auth/mfa/step-up` accepts only a normalized six-digit TOTP. Existing replay prevention runs before the conditional session update. The update repeats the user/session ownership, active, and expiry predicates; failure creates no token or assurance. Recovery codes cannot be submitted to this route. The centralized platform guard enforces a positive configured `MFA_STEP_UP_MAX_AGE_SECONDS`, falling back to 300 seconds, after D4SEC.1A authority/capability resolution and before the protected mutation.

Two genuine gaps were found during certification:

1. `JwtStrategy` rejected a missing user but did not reject an existing inactive user. It now fails authentication before session or platform-principal evaluation.
2. Self-service MFA disable cleared user MFA fields but did not invalidate session-bound assurance. Disable now atomically clears MFA/legacy refresh state, revokes every active `AuthSession`, and writes the existing safe MFA-disabled audit in the same transaction. Existing admin MFA reset already revoked sessions.

## Revocation and credential-change composition

Logout revokes the presented session. Password change and password-reset flows revoke all user sessions; administrator password reset does likewise. Administrator MFA reset revokes all sessions. MFA disable now revokes all sessions. These paths need not null `mfaVerifiedAt`: `JwtStrategy` requires `revokedAt: null`, so the still-unexpired JWT and its stored proof become unusable immediately. This is the intended revocation architecture and avoids redundant writes.

## Required proof matrix

| Required proof | Evidence |
|---|---|
| Revoked, expired, nonexistent, or other-user `sid` rejected | `jwt.strategy.spec.ts`; ownership/active/expiry query assertion and no-match rejection |
| Inactive user rejected | `jwt.strategy.spec.ts` |
| Session A cannot promote Session B | exact-session update predicate in `mfa.service.spec.ts`; Session B/header fabrication denial in guard spec |
| Older than five minutes rejected; fresh accepted | `platform-capabilities.guard.spec.ts` |
| Logout/admin revocation/password change/reset invalidates proof | revocation source paths plus revoked-session JWT regression; effectiveness is through mandatory active-session validation |
| MFA reset/disable invalidates proof | admin-reset session test, new disable revocation test, and revoked-session JWT regression |
| Invalid TOTP creates no proof | controller behavior test verifies neither bind nor token mint runs |
| Claims, timestamps, headers cannot fabricate MFA | JWT test uses only DB assurance; guard test ignores forged headers |
| Platform principal cannot bypass session validity | inactive/revoked complete-principal JWT tests and server guard ordering |

## Authority and audit review

D4SEC.1A remains the sole principal override: active user, `canCreateFacilities`, and active `MEDORA_SUPER_ADMIN` assignment are all required. Neither flag nor assignment semantics changed, and no email is queried. D4SEC.1C.3 capability resolution remains facility-independent and unchanged. Step-up is an ordinary authenticated MFA route and requires no platform capability, so bootstrap administration has no circular dependency.

Step-up and denial audits were inspected for secret handling. Submitted TOTP, MFA secret/ciphertext, recovery codes, access/refresh tokens, passwords/hashes, authorization headers, API keys, and PHI are not passed to audit metadata or structured logs. The forged-authorization regression also confirms request headers are not copied into denial audit data.

## Migration review

Migration `20260810120000_session_bound_mfa_step_up` is additive: two nullable columns and the same composite index declared in `schema.prisma`. It contains no destructive statement, backfill, seed, or data rewrite. Prisma generation and schema validation pass. The complete migration chain was not executed because this environment has no Docker executable, PostgreSQL client, or reachable PostgreSQL service; disposable-database deployment and status remain a pre-production release gate.
