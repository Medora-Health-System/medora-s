/**
 * Phase 5F — deterministic JSON canonicalization + SHA-256 hashing for the
 * immutable encounter chart export snapshot.
 *
 * Why a custom canonicalizer (not `JSON.stringify`):
 *   - Object key order is implementation-defined and PostgreSQL JSONB does not
 *     preserve key order. We must hash a stable representation so the same
 *     manifest always hashes to the same value regardless of round-trip.
 *
 * Rules:
 *   - Object keys are sorted lexicographically (UTF-16 code-unit order, the
 *     default `Array#sort` order — same on every Node version we support).
 *   - Arrays preserve element order.
 *   - `undefined` values are dropped from objects (matches `JSON.stringify`)
 *     and replaced with `null` inside arrays (matches `JSON.stringify`).
 *   - Functions / symbols are dropped from objects (matches `JSON.stringify`).
 *   - Non-finite numbers and bigints throw — they should never appear in our
 *     manifest and silently substituting them would make integrity weaker.
 *   - No whitespace is emitted; numbers and strings use `JSON.stringify` so
 *     escape rules match the JSON spec.
 *
 * Hashing:
 *   - SHA-256 over the canonical UTF-8 bytes of the JSON. Hex-encoded for
 *     human auditability and easy storage in `text` columns / logs.
 */

import { createHash } from "node:crypto";

/**
 * Returns a stable, deterministic JSON encoding of `value`.
 *
 * @throws when the input contains a non-finite number or a bigint.
 */
export function canonicalizeForHash(value: unknown): string {
  return canonicalize(value);
}

function canonicalize(value: unknown): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) {
        throw new Error("canonicalizeForHash: non-finite number is not JSON-serialisable");
      }
      return JSON.stringify(value);
    case "string":
      return JSON.stringify(value);
    case "bigint":
      throw new Error("canonicalizeForHash: bigint is not JSON-serialisable");
    case "undefined":
      // `undefined` should be filtered by callers (object props skipped, array
      // members coerced to `null` — see below). Defensive fallback: treat as null.
      return "null";
    case "function":
    case "symbol":
      throw new Error(`canonicalizeForHash: ${typeof value} is not JSON-serialisable`);
    case "object":
      break;
    default:
      throw new Error(`canonicalizeForHash: unsupported value type ${typeof value}`);
  }

  if (Array.isArray(value)) {
    const parts: string[] = [];
    for (const el of value) {
      // Match JSON.stringify: undefined / function / symbol entries become null.
      if (el === undefined || typeof el === "function" || typeof el === "symbol") {
        parts.push("null");
      } else {
        parts.push(canonicalize(el));
      }
    }
    return "[" + parts.join(",") + "]";
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const key of keys) {
    const v = obj[key];
    // Match JSON.stringify: undefined / function / symbol props are dropped.
    if (v === undefined || typeof v === "function" || typeof v === "symbol") continue;
    parts.push(JSON.stringify(key) + ":" + canonicalize(v));
  }
  return "{" + parts.join(",") + "}";
}

/** SHA-256 (hex, lowercase) of an arbitrary string treated as UTF-8 bytes. */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Convenience: canonicalize + sha256 for a value. */
export function hashCanonicalJson(value: unknown): { canonicalJson: string; hash: string } {
  const canonicalJson = canonicalizeForHash(value);
  return { canonicalJson, hash: sha256Hex(canonicalJson) };
}
