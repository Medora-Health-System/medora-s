# D4SEC.1C.4A — Session-bound MFA step-up implementation

This is the required implementation record for session-bound authentication and MFA step-up.

Session assurance is persisted on `AuthSession` and keyed by the `sid` shared by the access and refresh tokens. `POST /auth/mfa/step-up` is authenticated and throttled, requires TOTP, preserves TOTP replay protection, updates only a live session owned by the caller, and returns a replacement access token without rotating or creating a session.

The centralized platform capability guard enforces a five-minute default freshness window before authoritative staff classification and capability mutations. The window can be shortened or lengthened with the positive numeric `MFA_STEP_UP_MAX_AGE_SECONDS` value; invalid values retain the safe default. Session revocation and expiry invalidate both normal JWT validation and step-up assurance.

Database deployment requires migration `20260810120000_session_bound_mfa_step_up` before the updated API starts.
