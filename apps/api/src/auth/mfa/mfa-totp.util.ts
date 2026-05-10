/**
 * Phase 9 — TOTP (RFC 6238) wrapper around `otpauth`.
 *
 * `otpauth` ships a clean CJS build with no transitive ESM-only deps, which
 * keeps Jest happy and our footprint small. We expose only the few helpers
 * the service needs.
 *
 * Standard authenticator-app settings:
 *   * Algorithm: SHA-1 (default; Google / Microsoft Authenticator, Authy,
 *     1Password, Bitwarden all default here).
 *   * Digits: 6.
 *   * Period: 30 seconds.
 *   * Window: ±1 step (≈30s clock skew tolerance).
 */

import { Secret, TOTP } from "otpauth";

const TOTP_ALGORITHM = "SHA1";
const TOTP_DIGITS = 6;
const TOTP_PERIOD_SECONDS = 30;
/** ±2 steps (~60s) — modest skew tolerance without weakening replay bounds materially. */
const TOTP_WINDOW_STEPS = 2;

export const MFA_TOTP_ISSUER = "Medora-S";

/**
 * Normalize user input: strip non-digits so "123 456" → "123456".
 * Returns null unless exactly six digits remain (RFC 6238 typical TOTP).
 */
export function normalizeTotpCodeInput(raw: string | undefined | null): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length === 6 ? digits : null;
}

/** Generate a new base32 TOTP secret (160 bits, RFC 4226 §4). */
export function generateTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

/** Build an otpauth URI consumed by `qrcode` to render a QR. */
export function buildOtpAuthUri(label: string, secret: string): string {
  const totp = new TOTP({
    issuer: MFA_TOTP_ISSUER,
    label,
    issuerInLabel: true,
    secret: Secret.fromBase32(secret),
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD_SECONDS,
  });
  return totp.toString();
}

/**
 * Verify a TOTP code against the secret and return the absolute step counter
 * (`floor(epochSeconds / period)`) of the accepted code, or `null` on failure.
 *
 * `nowMs` is injectable for tests.
 */
export function verifyTotpAndGetStep(
  secret: string,
  token: string,
  nowMs: number = Date.now()
): number | null {
  if (typeof secret !== "string" || secret.length === 0) return null;
  const normalized = normalizeTotpCodeInput(token);
  if (normalized == null) return null;
  const tokenDigits = normalized;

  let key: Secret;
  try {
    key = Secret.fromBase32(secret);
  } catch {
    return null;
  }

  let delta: number | null;
  try {
    delta = TOTP.validate({
      token: tokenDigits,
      secret: key,
      algorithm: TOTP_ALGORITHM,
      digits: TOTP_DIGITS,
      period: TOTP_PERIOD_SECONDS,
      timestamp: nowMs,
      window: TOTP_WINDOW_STEPS,
    });
  } catch {
    return null;
  }
  if (delta == null) return null;

  // `validate` returns the delta in steps. The accepted absolute step is the
  // current period counter plus that delta.
  const currentStep = Math.floor(nowMs / 1000 / TOTP_PERIOD_SECONDS);
  return currentStep + delta;
}

/** Convenience: generate the current TOTP for a secret. Used in tests. */
export function generateCurrentTotp(secret: string, nowMs: number = Date.now()): string {
  return TOTP.generate({
    secret: Secret.fromBase32(secret),
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD_SECONDS,
    timestamp: nowMs,
  });
}

export const MFA_TOTP_OPTIONS = {
  algorithm: TOTP_ALGORITHM,
  digits: TOTP_DIGITS,
  stepSeconds: TOTP_PERIOD_SECONDS,
  windowSteps: TOTP_WINDOW_STEPS,
} as const;
