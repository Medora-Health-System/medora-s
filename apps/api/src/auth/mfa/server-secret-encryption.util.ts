import {
  decryptMfaSecret,
  encryptMfaSecret,
  getMfaEncryptionKey,
  MfaEncryptionKeyMissingError,
} from "./mfa-encryption.util";

type WrappedServerSecretPayload = {
  ciphertext: string;
};

export class ServerSecretEncryptionKeyUnavailableError extends Error {
  constructor() {
    super("Server secret encryption key is required.");
    this.name = "ServerSecretEncryptionKeyUnavailableError";
  }
}

export function getServerSecretEncryptionKeyOrFail(
  env: NodeJS.ProcessEnv = process.env
): Buffer {
  const key = getMfaEncryptionKey(env);
  if (!key) {
    throw new ServerSecretEncryptionKeyUnavailableError();
  }
  return key;
}

export function wrapServerSecret(
  plaintextSecret: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  const key = getServerSecretEncryptionKeyOrFail(env);
  const ciphertext = encryptMfaSecret(key, plaintextSecret);
  return JSON.stringify({ ciphertext } satisfies WrappedServerSecretPayload);
}

export function unwrapServerSecret(
  wrappedSecretJson: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  if (typeof wrappedSecretJson !== "string" || wrappedSecretJson.trim().length === 0) {
    throw new Error("unwrapServerSecret: wrapped secret is required");
  }

  let payload: WrappedServerSecretPayload;
  try {
    payload = JSON.parse(wrappedSecretJson) as WrappedServerSecretPayload;
  } catch {
    throw new Error("unwrapServerSecret: malformed wrapped secret payload");
  }

  if (typeof payload?.ciphertext !== "string" || payload.ciphertext.length === 0) {
    throw new Error("unwrapServerSecret: wrapped secret payload is invalid");
  }

  const key = getServerSecretEncryptionKeyOrFail(env);
  return decryptMfaSecret(key, payload.ciphertext);
}

export {
  MfaEncryptionKeyMissingError,
};
