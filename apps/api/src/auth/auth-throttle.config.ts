/**
 * Per-endpoint limits (default throttler name). IPs from `trust proxy` + X-Forwarded-For.
 * - login: brute-force resistance
 * - refresh: high volume from legitimate session polling
 * - forgot-password: abuse / email flooding
 */
export const AUTH_THROTTLE_LOGIN = { default: { limit: 20, ttl: 60_000 } };
export const AUTH_THROTTLE_REFRESH = { default: { limit: 120, ttl: 60_000 } };
export const AUTH_THROTTLE_FORGOT_PASSWORD = { default: { limit: 5, ttl: 15 * 60_000 } };

/** Password reset tokens are public credentials: keep guessing/replay pressure low. */
export const AUTH_THROTTLE_RESET_PASSWORD = { default: { limit: 10, ttl: 15 * 60_000 } };

/** Authenticated credential rotation should never be a high-frequency operation. */
export const AUTH_THROTTLE_CHANGE_PASSWORD = { default: { limit: 10, ttl: 15 * 60_000 } };
