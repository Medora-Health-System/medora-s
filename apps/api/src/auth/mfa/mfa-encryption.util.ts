/**
 * Phase 9 — MFA secret encryption.
 *
 * Why encrypt at rest?
 *   The TOTP shared secret (RFC 6238) is sufficient by itself to compute valid
 *   6-digit codes. A DB read leak that exposes plaintext secrets would let any
 *   attacker bypass MFA silently. We therefore encrypt the secret with a
 *   server-only key (`MFA_SECRET_ENCRYPTION_KEY`) before storage.
 *
 * Cipher
 *   AES-256-GCM. Random 12-byte IV per record (NIST SP 800-38D). 16-byte
 *   authentication tag binds ciphertext + IV; tampering produces a verify
 *   error on decrypt.
 *
 * Storage format
 *   `v1:<base64(iv)>:<base64(ciphertext)>:<base64(authTag)>` — self-describing,
 *   leaves room for a `v2` rotation strategy later without breaking history.
 *
 * Fail-closed (production)
 *   `getMfaEncryptionKey()` throws when the env var is absent / empty / wrong
 *   length in production. Non-production may run with the key absent (this
 *   path is intentionally limited to development; see service callers).
 *
 * No re-invented crypto
 *   Uses Node's built-in `crypto` (`createCipheriv`/`createDecipheriv`).
 */

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

export const MFA_SECRET_ENCRYPTION_VERSION = "v1" as const;
export const MFA_SECRET_ENCRYPTION_ALGORITHM = "AES-256-GCM" as const;

const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class MfaEncryptionKeyMissingError extends Error {
  constructor() {
    super(
      "MFA_SECRET_ENCRYPTION_KEY is required to enroll or read MFA secrets in production"
    );
    this.name = "MfaEncryptionKeyMissingError";
  }
}

export class MfaEncryptionKeyInvalidError extends Error {
  constructor() {
    super(
      "MFA_SECRET_ENCRYPTION_KEY must be a base64-encoded 32-byte key (256 bits)"
    );
    this.name = "MfaEncryptionKeyInvalidError";
  }
}

/**
 * Returns the configured encryption key, or `null` outside production when the
 * env var is absent. Throws in production when the key is missing or malformed.
 */
export function getMfaEncryptionKey(env: NodeJS.ProcessEnv = process.env): Buffer | null {
  const raw = env.MFA_SECRET_ENCRYPTION_KEY;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (trimmed.length === 0) {
    if (env.NODE_ENV === "production") {
      throw new MfaEncryptionKeyMissingError();
    }
    return null;
  }
  let buf: Buffer;
  try {
    buf = Buffer.from(trimmed, "base64");
  } catch {
    throw new MfaEncryptionKeyInvalidError();
  }
  if (buf.length !== KEY_BYTES) {
    throw new MfaEncryptionKeyInvalidError();
  }
  return buf;
}

export function encryptMfaSecret(key: Buffer, plaintext: string): string {
  if (key.length !== KEY_BYTES) throw new MfaEncryptionKeyInvalidError();
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("encryptMfaSecret: plaintext must be a non-empty string");
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    MFA_SECRET_ENCRYPTION_VERSION,
    iv.toString("base64"),
    ct.toString("base64"),
    tag.toString("base64"),
  ].join(":");
}

export function decryptMfaSecret(key: Buffer, payload: string): string {
  if (key.length !== KEY_BYTES) throw new MfaEncryptionKeyInvalidError();
  if (typeof payload !== "string" || payload.length === 0) {
    throw new Error("decryptMfaSecret: payload must be a non-empty string");
  }
  const parts = payload.split(":");
  if (parts.length !== 4) throw new Error("decryptMfaSecret: malformed payload");
  const [version, ivB64, ctB64, tagB64] = parts;
  if (version !== MFA_SECRET_ENCRYPTION_VERSION) {
    throw new Error("decryptMfaSecret: unsupported version");
  }
  const iv = Buffer.from(ivB64!, "base64");
  const ct = Buffer.from(ctB64!, "base64");
  const tag = Buffer.from(tagB64!, "base64");
  if (iv.length !== IV_BYTES) throw new Error("decryptMfaSecret: invalid iv");
  if (tag.length !== TAG_BYTES) throw new Error("decryptMfaSecret: invalid auth tag");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

/**
 * Constant-time comparison of two equal-length base64 strings. Used for unit
 * tests / utilities; AES-GCM auth tag verification is already constant-time
 * inside Node `crypto`.
 */
export function constantTimeEqualBase64(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  const ab = Buffer.from(a, "base64");
  const bb = Buffer.from(b, "base64");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
