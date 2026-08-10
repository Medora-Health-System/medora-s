# D4SEC.1C.4A — Session-bound MFA step-up audit

This is the required preimplementation record for session-bound authentication and MFA step-up. The final source audit and certification are recorded separately under `docs/security/audit` and `docs/certification`.

## Audit result

The existing `User.mfaLastVerifiedAt` is global. A successful MFA check in one browser could therefore not safely prove that a different authenticated session performed step-up. Access JWTs also lacked the refresh session identifier, so privileged request authorization could not identify the browser session. The privileged Medora staff classification and capability grant/revoke routes had authoritative-principal checks but no recent-MFA check.

## Implemented boundary

* `AuthSession.mfaVerifiedAt` and `mfaMethod` store assurance for one active session. No existing user-global timestamp is used to authorize privileged work.
* Newly issued and refreshed access JWTs carry the same `sid` as their refresh session. JWT validation rejects a referenced session when it is missing, revoked, expired, or owned by another user, and exposes only the verified session state to guards.
* `POST /auth/mfa/step-up` accepts a TOTP from an already authenticated session, applies replay protection through the existing verifier, conditionally updates only that active user/session pair, and returns a replacement access token for the same `sid`. Recovery codes are intentionally excluded from privileged step-up.
* Medora staff classification, capability grant, and capability revoke now require session MFA no older than `MFA_STEP_UP_MAX_AGE_SECONDS` (default 300 seconds). Missing, legacy, and stale assurance fail closed and use the existing PHI-safe critical denial audit.

## Deferred

This slice does not implement dual approval, ticket workflow, persona delegation, support/PHI purpose binding, or expand which staff capabilities may perform principal-only mutations. Those remain D4SEC.1C.4+ work.
