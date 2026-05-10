/**
 * Phase 9 — Tests for recovery codes (generate, hash, single-use match).
 */

import {
  findMatchingRecoveryIndex,
  generateRecoveryCodes,
  hashRecoveryCodes,
  MFA_RECOVERY_CODE_COUNT,
  parseStoredRecoveryCodes,
} from "./mfa-recovery-codes.util";

describe("mfa-recovery-codes.util", () => {
  it("generates 10 unique codes by default with the expected shape", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(MFA_RECOVERY_CODE_COUNT);
    for (const c of codes) {
      expect(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c)).toBe(true);
    }
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("rejects invalid count", () => {
    expect(() => generateRecoveryCodes(0)).toThrow();
    expect(() => generateRecoveryCodes(-3)).toThrow();
    expect(() => generateRecoveryCodes(100)).toThrow();
  });

  it("hashes codes (no plaintext leakage in hash strings)", async () => {
    const codes = generateRecoveryCodes(3);
    const hashed = await hashRecoveryCodes(codes);
    expect(hashed).toHaveLength(3);
    for (let i = 0; i < codes.length; i += 1) {
      expect(hashed[i]!.usedAt).toBeNull();
      expect(hashed[i]!.hash).not.toBe(codes[i]);
      expect(hashed[i]!.hash.startsWith("$argon2")).toBe(true);
    }
  });

  it("matches a code by hash and reports the index", async () => {
    const codes = generateRecoveryCodes(3);
    const hashed = await hashRecoveryCodes(codes);
    const idx = await findMatchingRecoveryIndex(codes[1]!, hashed);
    expect(idx).toBe(1);
  });

  it("does not match a used code", async () => {
    const codes = generateRecoveryCodes(2);
    const hashed = await hashRecoveryCodes(codes);
    hashed[0]!.usedAt = new Date().toISOString();
    const idx = await findMatchingRecoveryIndex(codes[0]!, hashed);
    expect(idx).toBeNull();
  });

  it("returns null on miss", async () => {
    const codes = generateRecoveryCodes(2);
    const hashed = await hashRecoveryCodes(codes);
    const idx = await findMatchingRecoveryIndex("ZZZZ-ZZZZ-ZZZZ", hashed);
    expect(idx).toBeNull();
  });

  it("normalises (case + whitespace) candidate codes before matching", async () => {
    const codes = generateRecoveryCodes(1);
    const hashed = await hashRecoveryCodes(codes);
    const messy = `  ${codes[0]!.toLowerCase()}  `;
    const idx = await findMatchingRecoveryIndex(messy, hashed);
    expect(idx).toBe(0);
  });

  it("parses stored shape; returns null for malformed", () => {
    const ok = parseStoredRecoveryCodes([{ hash: "x", usedAt: null }]);
    expect(ok).toEqual([{ hash: "x", usedAt: null }]);
    expect(parseStoredRecoveryCodes(null)).toBeNull();
    expect(parseStoredRecoveryCodes("oops")).toBeNull();
    expect(parseStoredRecoveryCodes([{ usedAt: null }])).toBeNull();
  });
});
