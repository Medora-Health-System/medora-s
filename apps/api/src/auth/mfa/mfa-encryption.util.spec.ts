/**
 * Phase 9 — Tests for the MFA secret encryption utility (AES-256-GCM).
 */

import { randomBytes } from "node:crypto";
import {
  decryptMfaSecret,
  encryptMfaSecret,
  getMfaEncryptionKey,
  MfaEncryptionKeyInvalidError,
  MfaEncryptionKeyMissingError,
  MFA_SECRET_ENCRYPTION_VERSION,
} from "./mfa-encryption.util";

function makeKey(): Buffer {
  return randomBytes(32);
}

function makeKeyB64(): string {
  return makeKey().toString("base64");
}

describe("mfa-encryption.util", () => {
  describe("getMfaEncryptionKey", () => {
    it("returns null in non-production when env is unset", () => {
      const env = { NODE_ENV: "test" } as NodeJS.ProcessEnv;
      expect(getMfaEncryptionKey(env)).toBeNull();
    });

    it("throws MfaEncryptionKeyMissingError in production when env is unset", () => {
      const env = { NODE_ENV: "production" } as NodeJS.ProcessEnv;
      expect(() => getMfaEncryptionKey(env)).toThrow(MfaEncryptionKeyMissingError);
    });

    it("throws MfaEncryptionKeyInvalidError on wrong-length key", () => {
      const env = {
        NODE_ENV: "test",
        MFA_SECRET_ENCRYPTION_KEY: Buffer.from("short").toString("base64"),
      } as NodeJS.ProcessEnv;
      expect(() => getMfaEncryptionKey(env)).toThrow(MfaEncryptionKeyInvalidError);
    });

    it("returns a 32-byte buffer when the key is well-formed", () => {
      const env = {
        NODE_ENV: "test",
        MFA_SECRET_ENCRYPTION_KEY: makeKeyB64(),
      } as NodeJS.ProcessEnv;
      const key = getMfaEncryptionKey(env);
      expect(key).toBeInstanceOf(Buffer);
      expect(key?.length).toBe(32);
    });
  });

  describe("encryptMfaSecret / decryptMfaSecret", () => {
    it("round-trips a TOTP secret", () => {
      const key = makeKey();
      const ct = encryptMfaSecret(key, "JBSWY3DPEHPK3PXP");
      expect(ct.startsWith(`${MFA_SECRET_ENCRYPTION_VERSION}:`)).toBe(true);
      const pt = decryptMfaSecret(key, ct);
      expect(pt).toBe("JBSWY3DPEHPK3PXP");
    });

    it("produces different ciphertext for repeated encryption (random IV)", () => {
      const key = makeKey();
      const a = encryptMfaSecret(key, "JBSWY3DPEHPK3PXP");
      const b = encryptMfaSecret(key, "JBSWY3DPEHPK3PXP");
      expect(a).not.toBe(b);
    });

    it("rejects decryption with a different key", () => {
      const k1 = makeKey();
      const k2 = makeKey();
      const ct = encryptMfaSecret(k1, "JBSWY3DPEHPK3PXP");
      expect(() => decryptMfaSecret(k2, ct)).toThrow();
    });

    it("rejects tampered ciphertext (auth tag fails)", () => {
      const key = makeKey();
      const ct = encryptMfaSecret(key, "JBSWY3DPEHPK3PXP");
      const parts = ct.split(":");
      // mutate one base64 ciphertext byte (decoded length stays the same)
      const ctBuf = Buffer.from(parts[2]!, "base64");
      ctBuf[0] = ctBuf[0]! ^ 0x01;
      parts[2] = ctBuf.toString("base64");
      const tampered = parts.join(":");
      expect(() => decryptMfaSecret(key, tampered)).toThrow();
    });

    it("rejects malformed payloads", () => {
      const key = makeKey();
      expect(() => decryptMfaSecret(key, "not-a-payload")).toThrow();
      expect(() => decryptMfaSecret(key, "v2:aa:bb:cc")).toThrow();
    });

    it("rejects empty plaintext", () => {
      const key = makeKey();
      expect(() => encryptMfaSecret(key, "")).toThrow();
    });
  });
});
