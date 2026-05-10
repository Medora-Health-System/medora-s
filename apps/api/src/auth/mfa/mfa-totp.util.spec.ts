/**
 * Phase 9 — Tests for TOTP wrapper (otplib v13).
 */

import {
  buildOtpAuthUri,
  generateCurrentTotp,
  generateTotpSecret,
  MFA_TOTP_ISSUER,
  verifyTotpAndGetStep,
} from "./mfa-totp.util";

describe("mfa-totp.util", () => {
  it("generates a non-empty base32 secret", () => {
    const s = generateTotpSecret();
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThanOrEqual(16);
    expect(/^[A-Z2-7]+$/.test(s)).toBe(true);
  });

  it("builds an otpauth URI with the Medora-S issuer", () => {
    const s = generateTotpSecret();
    const uri = buildOtpAuthUri("user@example.com", s);
    expect(uri.startsWith("otpauth://totp/")).toBe(true);
    expect(uri).toContain(`secret=${s}`);
    expect(uri).toContain(`issuer=${encodeURIComponent(MFA_TOTP_ISSUER)}`);
  });

  it("verifies a freshly-generated current TOTP and returns its step", () => {
    const s = generateTotpSecret();
    const now = Date.now();
    const code = generateCurrentTotp(s, now);
    const step = verifyTotpAndGetStep(s, code, now);
    expect(step).not.toBeNull();
    expect(step).toBe(Math.floor(now / 1000 / 30));
  });

  it("rejects a wrong code", () => {
    const s = generateTotpSecret();
    expect(verifyTotpAndGetStep(s, "000000")).toBeNull();
  });

  it("rejects malformed input (non-6-digit)", () => {
    const s = generateTotpSecret();
    expect(verifyTotpAndGetStep(s, "12345")).toBeNull();
    expect(verifyTotpAndGetStep(s, "abcdef")).toBeNull();
    expect(verifyTotpAndGetStep(s, "")).toBeNull();
  });

  it("accepts a 6-digit code with spaces (normalized)", () => {
    const s = generateTotpSecret();
    const now = Date.now();
    const code = generateCurrentTotp(s, now);
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
    expect(verifyTotpAndGetStep(s, spaced, now)).not.toBeNull();
  });

  it("two different secrets do not produce mutually-valid codes (overwhelmingly)", () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    const now = Date.now();
    const codeA = generateCurrentTotp(a, now);
    expect(verifyTotpAndGetStep(a, codeA, now)).not.toBeNull();
    // 1 in 1,000,000 chance of collision; vanishingly small in CI
    expect(verifyTotpAndGetStep(b, codeA, now)).toBeNull();
  });

  it("accepts a code from one step earlier (clock-skew tolerance)", () => {
    const s = generateTotpSecret();
    const now = Date.now();
    const earlier = now - 30_000;
    const earlierCode = generateCurrentTotp(s, earlier);
    const step = verifyTotpAndGetStep(s, earlierCode, now);
    expect(step).not.toBeNull();
    expect(step).toBe(Math.floor(earlier / 1000 / 30));
  });
});
