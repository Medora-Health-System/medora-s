/**
 * Phase 6 — chart export signature utility tests.
 *
 * Confirms:
 *  - Deterministic signing across calls (same secret + same hash → same sig)
 *  - Different secret → different signature
 *  - Different hash → different signature
 *  - verifyManifestSignature accepts a freshly produced signature
 *  - verifyManifestSignature rejects malformed / tampered / wrong-secret values
 *  - getChartExportSigningSecret fails closed in production
 *  - getChartExportSigningSecret returns null in non-production when missing
 */

import {
  CHART_EXPORT_SIGNATURE_VERSION,
  ChartExportSigningSecretMissingError,
  getChartExportSigningSecret,
  manifestSignatureVersion,
  signManifestHash,
  verifyManifestSignature,
} from "./chart-export-signature.util";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const SECRET_A = "secret-A-must-be-long-enough-to-feel-real";
const SECRET_B = "secret-B-distinct-from-A";

describe("signManifestHash", () => {
  it("is deterministic for the same secret + hash", () => {
    const s1 = signManifestHash(SECRET_A, HASH_A);
    const s2 = signManifestHash(SECRET_A, HASH_A);
    expect(s1).toBe(s2);
  });

  it("starts with the current signature version followed by ':'", () => {
    const s = signManifestHash(SECRET_A, HASH_A);
    expect(s.startsWith(`${CHART_EXPORT_SIGNATURE_VERSION}:`)).toBe(true);
    const hex = s.split(":")[1];
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different signatures for different secrets", () => {
    expect(signManifestHash(SECRET_A, HASH_A)).not.toBe(signManifestHash(SECRET_B, HASH_A));
  });

  it("produces different signatures for different hashes", () => {
    expect(signManifestHash(SECRET_A, HASH_A)).not.toBe(signManifestHash(SECRET_A, HASH_B));
  });

  it("rejects an obviously malformed manifestHash", () => {
    expect(() => signManifestHash(SECRET_A, "not-hex")).toThrow();
    expect(() => signManifestHash(SECRET_A, "ABCDEF")).toThrow();
    expect(() => signManifestHash(SECRET_A, "A".repeat(64))).toThrow();
  });

  it("rejects empty secret", () => {
    expect(() => signManifestHash("", HASH_A)).toThrow(ChartExportSigningSecretMissingError);
  });
});

describe("verifyManifestSignature", () => {
  it("accepts a signature produced by the same secret + hash", () => {
    const sig = signManifestHash(SECRET_A, HASH_A);
    expect(verifyManifestSignature(SECRET_A, HASH_A, sig)).toBe(true);
  });

  it("rejects a signature for a different hash (tampered manifest)", () => {
    const sig = signManifestHash(SECRET_A, HASH_A);
    expect(verifyManifestSignature(SECRET_A, HASH_B, sig)).toBe(false);
  });

  it("rejects a signature produced by a different secret (forged)", () => {
    const sig = signManifestHash(SECRET_B, HASH_A);
    expect(verifyManifestSignature(SECRET_A, HASH_A, sig)).toBe(false);
  });

  it("rejects an unknown signature version", () => {
    const sig = signManifestHash(SECRET_A, HASH_A);
    const tampered = sig.replace(/^v1:/, "v9:");
    expect(verifyManifestSignature(SECRET_A, HASH_A, tampered)).toBe(false);
  });

  it("rejects malformed signatures without throwing", () => {
    expect(verifyManifestSignature(SECRET_A, HASH_A, "")).toBe(false);
    expect(verifyManifestSignature(SECRET_A, HASH_A, "no-colon")).toBe(false);
    expect(verifyManifestSignature(SECRET_A, HASH_A, ":only-suffix")).toBe(false);
    expect(verifyManifestSignature(SECRET_A, HASH_A, "v1:not-hex!")).toBe(false);
    expect(verifyManifestSignature(SECRET_A, HASH_A, null)).toBe(false);
    expect(verifyManifestSignature(SECRET_A, HASH_A, undefined)).toBe(false);
  });

  it("rejects when the secret is empty (cannot verify without authority)", () => {
    const sig = signManifestHash(SECRET_A, HASH_A);
    expect(verifyManifestSignature("", HASH_A, sig)).toBe(false);
  });

  it("rejects when the manifestHash is malformed", () => {
    const sig = signManifestHash(SECRET_A, HASH_A);
    expect(verifyManifestSignature(SECRET_A, "not-hex", sig)).toBe(false);
  });
});

describe("manifestSignatureVersion", () => {
  it("extracts the version prefix from a valid signature", () => {
    const sig = signManifestHash(SECRET_A, HASH_A);
    expect(manifestSignatureVersion(sig)).toBe(CHART_EXPORT_SIGNATURE_VERSION);
  });

  it("returns null for malformed input (no version leak)", () => {
    expect(manifestSignatureVersion(null)).toBeNull();
    expect(manifestSignatureVersion("")).toBeNull();
    expect(manifestSignatureVersion("noColon")).toBeNull();
  });
});

describe("getChartExportSigningSecret", () => {
  it("returns the trimmed secret when present", () => {
    expect(getChartExportSigningSecret({ CHART_EXPORT_SIGNING_SECRET: "  abc  " })).toBe("abc");
  });

  it("returns null in non-production when the secret is missing or blank", () => {
    expect(getChartExportSigningSecret({ NODE_ENV: "test" })).toBeNull();
    expect(getChartExportSigningSecret({ NODE_ENV: "development" })).toBeNull();
    expect(
      getChartExportSigningSecret({ NODE_ENV: "test", CHART_EXPORT_SIGNING_SECRET: "  " })
    ).toBeNull();
  });

  it("FAILS CLOSED in production when the secret is missing or blank", () => {
    expect(() => getChartExportSigningSecret({ NODE_ENV: "production" })).toThrow(
      ChartExportSigningSecretMissingError
    );
    expect(() =>
      getChartExportSigningSecret({ NODE_ENV: "production", CHART_EXPORT_SIGNING_SECRET: "" })
    ).toThrow(ChartExportSigningSecretMissingError);
    expect(() =>
      getChartExportSigningSecret({
        NODE_ENV: "production",
        CHART_EXPORT_SIGNING_SECRET: "   ",
      })
    ).toThrow(ChartExportSigningSecretMissingError);
  });
});
