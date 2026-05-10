/**
 * Phase 6 — server-side HMAC-SHA256 signature for immutable chart export snapshots.
 *
 * Why a signature in addition to SHA-256 of the canonical manifest?
 *   - SHA-256 alone proves *consistency*: the bytes you read are the bytes
 *     that were hashed. Anyone with DB write access can recompute the hash
 *     after tampering and the row will still pass `recomputedHash ===
 *     manifestHash`.
 *   - HMAC-SHA256 with a server-only secret additionally proves *authorship*:
 *     a valid signature means a Medora server (holding the secret) actually
 *     issued this artifact. Tampering at rest cannot forge a new signature.
 *
 * Format
 *   `<sigVersion>:<hex>` — self-describing, lets us rotate or change the
 *   underlying primitive without breaking historical rows.
 *
 * Rotation
 *   This MVP supports a single secret. The signature version field reserves
 *   space for a future rotation strategy (e.g. accepting `v1` and `v2` during
 *   a window). Out of scope for Phase 6.
 *
 * Fail-closed semantics
 *   `getChartExportSigningSecret()` throws in production when the secret is
 *   absent / empty. Production deployments must set
 *   `CHART_EXPORT_SIGNING_SECRET` before issuing snapshots. In non-production,
 *   the secret is optional so dev / CI workflows still function; created
 *   snapshots simply have a `null` signature there.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** Current signature scheme version. Stored alongside each signed value. */
export const CHART_EXPORT_SIGNATURE_VERSION = "v1" as const;

/** Algorithm label, exposed in audit metadata. Never the secret. */
export const CHART_EXPORT_SIGNATURE_ALGORITHM = "HMAC-SHA256" as const;

/** Marker used by the service layer when verification fails. */
export const RECORD_EXPORT_SIGNATURE_MISMATCH = "RECORD_EXPORT_SIGNATURE_MISMATCH" as const;

export class ChartExportSigningSecretMissingError extends Error {
  constructor() {
    super(
      "CHART_EXPORT_SIGNING_SECRET is required to create or verify chart export snapshots in production"
    );
    this.name = "ChartExportSigningSecretMissingError";
  }
}

/**
 * Returns the configured HMAC secret, or `null` when intentionally absent
 * outside production. Throws in production when the secret is missing or
 * blank — production deployments must not silently skip signing.
 */
export function getChartExportSigningSecret(
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const raw = env.CHART_EXPORT_SIGNING_SECRET;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (trimmed.length > 0) return trimmed;
  if (env.NODE_ENV === "production") {
    throw new ChartExportSigningSecretMissingError();
  }
  return null;
}

/**
 * Compute the HMAC-SHA256 signature of `manifestHash` (lowercase hex SHA-256).
 * Returns `<version>:<hex>`.
 */
export function signManifestHash(secret: string, manifestHash: string): string {
  if (!secret) throw new ChartExportSigningSecretMissingError();
  if (!/^[0-9a-f]{64}$/.test(manifestHash)) {
    throw new Error("signManifestHash: expected 64-character lowercase hex SHA-256");
  }
  const hex = createHmac("sha256", secret).update(manifestHash, "utf8").digest("hex");
  return `${CHART_EXPORT_SIGNATURE_VERSION}:${hex}`;
}

/**
 * Constant-time verify a `<version>:<hex>` signature against `manifestHash`.
 * Returns `false` (never throws) for any malformed input or mismatch — the
 * caller decides how to escalate (the service layer treats `false` as an
 * integrity failure on a *signed* row).
 */
export function verifyManifestSignature(
  secret: string,
  manifestHash: string,
  signature: string | null | undefined
): boolean {
  if (!secret || !signature) return false;
  if (!/^[0-9a-f]{64}$/.test(manifestHash)) return false;
  const idx = signature.indexOf(":");
  if (idx <= 0) return false;
  const version = signature.slice(0, idx);
  if (version !== CHART_EXPORT_SIGNATURE_VERSION) return false;
  const hex = signature.slice(idx + 1);
  if (!/^[0-9a-f]+$/.test(hex) || hex.length % 2 !== 0) return false;

  const expected = createHmac("sha256", secret).update(manifestHash, "utf8").digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(hex, "hex");
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/**
 * Returns the signature scheme version embedded in `<version>:<hex>` strings,
 * or `null` if the input is malformed. Useful for PHI-safe audit metadata.
 */
export function manifestSignatureVersion(signature: string | null | undefined): string | null {
  if (!signature) return null;
  const idx = signature.indexOf(":");
  if (idx <= 0) return null;
  return signature.slice(0, idx);
}
