const ENVELOPE_MAGIC = "MED1";
const ENVELOPE_MAGIC_BYTES = Buffer.from(ENVELOPE_MAGIC, "ascii");
const ENVELOPE_VERSION_ALGORITHM_AES_256_GCM = 0x01;
const AES_256_GCM_IV_BYTES = 12;
const AES_256_GCM_AUTH_TAG_BYTES = 16;
const HEADER_FIXED_BYTES = 4 + 1 + 1;
const LENGTH_FIELD_BYTES = 8;

export function createEncryptedExportEnvelope(
  algorithm: "AES-256-GCM",
  iv: Buffer,
  authTag: Buffer,
  ciphertext: Buffer
): Buffer {
  if (algorithm !== "AES-256-GCM") {
    throw new Error("createEncryptedExportEnvelope: unsupported algorithm");
  }
  if (!Buffer.isBuffer(iv) || iv.length !== AES_256_GCM_IV_BYTES) {
    throw new Error("createEncryptedExportEnvelope: invalid AES-256-GCM iv");
  }
  if (!Buffer.isBuffer(authTag) || authTag.length !== AES_256_GCM_AUTH_TAG_BYTES) {
    throw new Error("createEncryptedExportEnvelope: invalid AES-256-GCM auth tag");
  }
  if (!Buffer.isBuffer(ciphertext)) {
    throw new Error("createEncryptedExportEnvelope: ciphertext must be a Buffer");
  }

  const totalSize = HEADER_FIXED_BYTES + iv.length + 1 + authTag.length + LENGTH_FIELD_BYTES + ciphertext.length;
  const envelope = Buffer.allocUnsafe(totalSize);

  let offset = 0;
  ENVELOPE_MAGIC_BYTES.copy(envelope, offset);
  offset += ENVELOPE_MAGIC_BYTES.length;
  envelope.writeUInt8(ENVELOPE_VERSION_ALGORITHM_AES_256_GCM, offset);
  offset += 1;
  envelope.writeUInt8(iv.length, offset);
  offset += 1;
  iv.copy(envelope, offset);
  offset += iv.length;
  envelope.writeUInt8(authTag.length, offset);
  offset += 1;
  authTag.copy(envelope, offset);
  offset += authTag.length;
  envelope.writeBigUInt64BE(BigInt(ciphertext.length), offset);
  offset += LENGTH_FIELD_BYTES;
  ciphertext.copy(envelope, offset);

  return envelope;
}

export function parseEncryptedExportEnvelope(envelope: Buffer): {
  algorithm: "AES-256-GCM";
  iv: Buffer;
  authTag: Buffer;
  ciphertext: Buffer;
} {
  if (!Buffer.isBuffer(envelope)) {
    throw new Error("parseEncryptedExportEnvelope: envelope must be a Buffer");
  }
  if (envelope.length < HEADER_FIXED_BYTES + 1 + AES_256_GCM_AUTH_TAG_BYTES + LENGTH_FIELD_BYTES) {
    throw new Error("parseEncryptedExportEnvelope: envelope is truncated");
  }

  let offset = 0;
  const magic = envelope.subarray(offset, offset + ENVELOPE_MAGIC_BYTES.length);
  if (!magic.equals(ENVELOPE_MAGIC_BYTES)) {
    throw new Error("parseEncryptedExportEnvelope: unsupported envelope magic/version");
  }
  offset += ENVELOPE_MAGIC_BYTES.length;

  const algorithmId = envelope.readUInt8(offset);
  offset += 1;
  if (algorithmId !== ENVELOPE_VERSION_ALGORITHM_AES_256_GCM) {
    throw new Error("parseEncryptedExportEnvelope: unsupported algorithm identifier");
  }

  const ivLength = envelope.readUInt8(offset);
  offset += 1;
  if (ivLength !== AES_256_GCM_IV_BYTES) {
    throw new Error("parseEncryptedExportEnvelope: invalid AES-256-GCM iv length");
  }
  if (offset + ivLength > envelope.length) {
    throw new Error("parseEncryptedExportEnvelope: envelope is truncated before iv");
  }
  const iv = Buffer.from(envelope.subarray(offset, offset + ivLength));
  offset += ivLength;

  if (offset + 1 > envelope.length) {
    throw new Error("parseEncryptedExportEnvelope: envelope is truncated before auth tag length");
  }
  const authTagLength = envelope.readUInt8(offset);
  offset += 1;
  if (authTagLength !== AES_256_GCM_AUTH_TAG_BYTES) {
    throw new Error("parseEncryptedExportEnvelope: invalid AES-256-GCM auth tag length");
  }
  if (offset + authTagLength > envelope.length) {
    throw new Error("parseEncryptedExportEnvelope: envelope is truncated before auth tag");
  }
  const authTag = Buffer.from(envelope.subarray(offset, offset + authTagLength));
  offset += authTagLength;

  if (offset + LENGTH_FIELD_BYTES > envelope.length) {
    throw new Error("parseEncryptedExportEnvelope: envelope is truncated before ciphertext length");
  }
  const ciphertextLengthBig = envelope.readBigUInt64BE(offset);
  offset += LENGTH_FIELD_BYTES;
  if (ciphertextLengthBig > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("parseEncryptedExportEnvelope: ciphertext length exceeds supported size");
  }
  const ciphertextLength = Number(ciphertextLengthBig);
  if (ciphertextLength < 0) {
    throw new Error("parseEncryptedExportEnvelope: invalid ciphertext length");
  }
  if (offset + ciphertextLength !== envelope.length) {
    if (offset + ciphertextLength > envelope.length) {
      throw new Error("parseEncryptedExportEnvelope: envelope is truncated before ciphertext");
    }
    throw new Error("parseEncryptedExportEnvelope: trailing envelope bytes are not allowed");
  }
  const ciphertext = Buffer.from(envelope.subarray(offset, offset + ciphertextLength));

  return {
    algorithm: "AES-256-GCM",
    iv,
    authTag,
    ciphertext,
  };
}
