/**
 * Phase 9 — Stateless MFA challenge / enrollment grant tokens.
 *
 * After a successful password verification, the user is **not** issued normal
 * access/refresh tokens until either (a) a TOTP code is verified or (b) the
 * user enrolls MFA (when their roles require it). The interim is represented
 * by a short-lived JWT signed with the existing JWT refresh secret but with a
 * distinct `type` claim. Reusing the refresh secret avoids a third
 * environment variable; the type claim makes confused-deputy attacks
 * impossible (refresh / access strategies reject these types).
 *
 *   * `mfa_challenge`  — issued when MFA is enrolled; consumed by `verify`.
 *   * `mfa_enrollment` — issued when MFA is required by role but not yet
 *                        enrolled; consumed by `enroll/init` + `enroll/verify`.
 *
 * TTLs are short (5 / 15 minutes). Replay risk is bounded by:
 *   * the short TTL,
 *   * single-active-session enforcement (consuming one issues a new session
 *     and revokes prior ones),
 *   * per-user TOTP step replay protection on `User.mfaLastUsedStep`.
 */

import type { JwtService } from "@nestjs/jwt";

export const MFA_CHALLENGE_TYPE = "mfa_challenge" as const;
export const MFA_ENROLLMENT_TYPE = "mfa_enrollment" as const;
export type MfaGrantType = typeof MFA_CHALLENGE_TYPE | typeof MFA_ENROLLMENT_TYPE;

export const MFA_CHALLENGE_TTL = "5m" as const;
export const MFA_ENROLLMENT_TTL = "15m" as const;

export type MfaGrantPayload = {
  /** User id. */
  sub: string;
  username: string;
  iss: string;
  type: MfaGrantType;
  jti: string;
};

export function signMfaGrant(
  jwt: JwtService,
  payload: Omit<MfaGrantPayload, "iss"> & { iss: string },
  secret: string,
  expiresIn: typeof MFA_CHALLENGE_TTL | typeof MFA_ENROLLMENT_TTL
): string {
  // Cast mirrors `AuthService.signToken` — `expiresIn` accepts plain strings
  // like `"5m"` at runtime although `ms` typings demand a `StringValue`.
  return jwt.sign(payload as unknown as Record<string, unknown>, {
    secret,
    expiresIn: expiresIn as unknown as never,
  });
}

export function verifyMfaGrant(
  jwt: JwtService,
  token: string,
  secret: string,
  issuer: string,
  expectedType: MfaGrantType
): MfaGrantPayload {
  const decoded = jwt.verify<MfaGrantPayload>(token, { secret, issuer });
  if (!decoded || decoded.type !== expectedType) {
    throw new Error("invalid_mfa_grant_type");
  }
  if (typeof decoded.sub !== "string" || decoded.sub.length === 0) {
    throw new Error("invalid_mfa_grant_subject");
  }
  return decoded;
}
