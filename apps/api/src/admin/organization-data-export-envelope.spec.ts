import * as crypto from "crypto";
import {
  createEncryptedExportEnvelope,
  parseEncryptedExportEnvelope,
} from "./organization-data-export-envelope";

describe("organization-data-export-envelope", () => {
  it("EXP-25: MED1 round trip preserves algorithm, iv, auth tag, and ciphertext", () => {
    const iv = crypto.randomBytes(12);
    const authTag = crypto.randomBytes(16);
    const ciphertext = crypto.randomBytes(64);

    const envelope = createEncryptedExportEnvelope("AES-256-GCM", iv, authTag, ciphertext);
    const parsed = parseEncryptedExportEnvelope(envelope);

    expect(parsed.algorithm).toBe("AES-256-GCM");
    expect(parsed.iv.equals(iv)).toBe(true);
    expect(parsed.authTag.equals(authTag)).toBe(true);
    expect(parsed.ciphertext.equals(ciphertext)).toBe(true);
  });

  it("EXP-26: malformed/truncated MED1 artifact is rejected", () => {
    const iv = crypto.randomBytes(12);
    const authTag = crypto.randomBytes(16);
    const ciphertext = crypto.randomBytes(32);
    const envelope = createEncryptedExportEnvelope("AES-256-GCM", iv, authTag, ciphertext);
    const truncated = envelope.subarray(0, envelope.length - 1);

    expect(() => parseEncryptedExportEnvelope(truncated)).toThrow();
  });

  it("EXP-27: unknown algorithm identifier is rejected", () => {
    const iv = crypto.randomBytes(12);
    const authTag = crypto.randomBytes(16);
    const ciphertext = crypto.randomBytes(32);
    const envelope = Buffer.from(createEncryptedExportEnvelope("AES-256-GCM", iv, authTag, ciphertext));
    envelope[4] = 0xff;

    expect(() => parseEncryptedExportEnvelope(envelope)).toThrow(/unsupported algorithm identifier/);
  });

  it("EXP-28: trailing or inconsistent ciphertext length is rejected", () => {
    const iv = crypto.randomBytes(12);
    const authTag = crypto.randomBytes(16);
    const ciphertext = crypto.randomBytes(32);
    const envelope = createEncryptedExportEnvelope("AES-256-GCM", iv, authTag, ciphertext);

    const wrongLength = Buffer.from(envelope);
    const lengthOffset = 4 + 1 + 1 + 12 + 1 + 16;
    wrongLength.writeBigUInt64BE(BigInt(ciphertext.length + 3), lengthOffset);
    expect(() => parseEncryptedExportEnvelope(wrongLength)).toThrow();

    const trailing = Buffer.concat([envelope, Buffer.from([0x00])]);
    expect(() => parseEncryptedExportEnvelope(trailing)).toThrow(/trailing envelope bytes/);
  });

  it("EXP-29: AES-256-GCM decrypt round-trip works using only MED1 artifact and one-time secret", () => {
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const plaintext = Buffer.from("sample medora export payload", "utf8");
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const oneTimeSecret = key.toString("base64url");

    const envelope = createEncryptedExportEnvelope("AES-256-GCM", iv, authTag, ciphertext);
    const parsed = parseEncryptedExportEnvelope(envelope);

    const recoveredKey = Buffer.from(oneTimeSecret, "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", recoveredKey, parsed.iv);
    decipher.setAuthTag(parsed.authTag);
    const recovered = Buffer.concat([decipher.update(parsed.ciphertext), decipher.final()]);

    expect(recovered.equals(plaintext)).toBe(true);
  });
});
