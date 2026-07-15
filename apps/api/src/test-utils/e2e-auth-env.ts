/**
 * Isolated auth environment for integration/e2e specs.
 *
 * Production `.env` may set `MFA_REQUIRED_ROLES` (e.g. PROVIDER, PHARMACY) so password
 * login returns MFA challenge/enrollment JWTs instead of `accessToken`. RBAC and
 * facility-isolation suites need normal session tokens to exercise RolesGuard — not
 * MFA enrollment. This does not weaken JwtStrategy, RolesGuard, or facility checks.
 */
export function applyE2eAuthTestEnv(): void {
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "test_access_secret";
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test_refresh_secret";
  process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? "15m";
  process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? "14d";
  process.env.TOKEN_ISSUER = process.env.TOKEN_ISSUER ?? "medora-s";
  /**
   * Force empty MFA-required role set for this process (overrides `.env` loaded by ConfigModule).
   * Invalid tokens are ignored by `getRequiredMfaRoles` → no enrollment gate during login.
   */
  process.env.MFA_REQUIRED_ROLES = "__E2E_NO_MFA_ENROLLMENT__";
  /**
   * Deterministic e2e: force-disable background pollers / prewarm / alerts.
   * Worker-focused suites may re-enable a specific flag after calling this helper.
   * Do not use `??` here — local `.env` must not keep schedulers armed during e2e.
   */
  process.env.MEDORA_BACKGROUND_WORKERS_ENABLED = "false";
  process.env.CLEARINGHOUSE_RETRY_WORKER_ENABLED = "false";
  process.env.MEDICATION_DOSE_STATUS_PROMOTION_ENABLED = "false";
  process.env.MEDICATION_DOSE_HORIZON_MAINTENANCE_ENABLED = "false";
  process.env.MEDORA_REGISTRY_PREWARM_ENABLED = "false";
  process.env.MEDORA_ALERT_ENABLED = "false";
}

export function assertE2eLoginAccessToken(
  body: Record<string, unknown>,
  username: string
): string {
  const token = body.accessToken;
  if (typeof token !== "string" || !token.trim()) {
    throw new Error(
      `Expected accessToken for ${username}; got ${JSON.stringify(body)}. ` +
        "If mfaEnrollmentRequired/mfaRequired is set, apply applyE2eAuthTestEnv() before AppModule bootstrap."
    );
  }
  return token;
}
