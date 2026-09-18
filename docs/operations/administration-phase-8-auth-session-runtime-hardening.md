# Administration Phase 8 — Authentication, Session, and Runtime Trust Hardening

Phase 8 starts after the Administration/Hospital Operations authority consolidation. Its scope is the backend trust boundary used by every Medora hospital workflow: authentication, session renewal, credential mutation abuse resistance, and untrusted request metadata.

## Repository audit

The authentication path was reviewed from HTTP controller through JWT/session persistence:

- login already has endpoint throttling plus the FailedLoginTracker;
- access JWT validation requires an access token type, a session id, an active user, and an active/non-expired AuthSession;
- login and post-MFA login hash refresh tokens with Argon2 and revoke prior active sessions;
- refresh verifies issuer/type/user/session/expiry and the stored refresh-token hash before rotation;
- logout verifies the presented refresh token before revoking its session;
- forgot-password is explicitly throttled;
- production exception handling and structured logging remain PHI-safe.

## Findings repaired

### AUTH-8.1 — refresh endpoint did not apply its existing endpoint-specific throttle

The repository defined AUTH_THROTTLE_REFRESH but the controller did not attach ThrottlerGuard/@Throttle to POST /auth/refresh. Refresh is now explicitly protected at 120 requests/minute per throttler tracker.

### AUTH-8.2 — reset-password had no endpoint abuse control

POST /auth/reset-password accepts a public reset credential and performs a security-sensitive credential mutation. It now has an explicit 10 requests / 15 minute throttle.

### AUTH-8.3 — change-password had no endpoint abuse control

POST /auth/change-password is authenticated, but credential rotation should not be an unbounded operation. It now has an explicit 10 requests / 15 minute throttle in addition to JWT authentication.

### RUNTIME-8.1 — x-request-id crossed the trust boundary without validation

The API echoed arbitrary client x-request-id values into the response and structured operational logs. The request id is now accepted only when it is 1–128 characters and contains a bounded printable identifier alphabet (letters, digits, dot, underscore, colon, hyphen); otherwise the server replaces it with a UUID. This prevents newline/delimiter log-forging and oversized correlation metadata.

## Regression gate

A controller metadata regression test locks explicit throttles on login, refresh, forgot-password, reset-password, and change-password.

## Deliberate non-change

The global 50 MB JSON/urlencoded body ceiling and default 10,000/minute throttler remain unchanged in this phase. Those broad defaults require endpoint-class inventory before reduction because diagnostic attachments and hospital workflows may have legitimate larger payloads. A blanket limit change without that inventory could reduce clinical availability.

Application Modules and internal Medora billing are outside this phase.
