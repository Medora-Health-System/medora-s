/**
 * Stable API-facing MFA / auth error codes (English snake_case).
 * HTTP layer and clients map these to localized copy — no French literals in JSON.
 */

export const MFA_GRANT_INVALID = "MFA_GRANT_INVALID" as const;
