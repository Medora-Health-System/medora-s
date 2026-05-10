/**
 * Phase 9 — MFA recovery codes.
 *
 * 10 single-use codes generated alongside enrollment (and on regeneration).
 * Plaintext is shown to the user *once* (during enrollment / regeneration);
 * the DB only ever stores argon2id hashes.
 *
 * Format
 *   `XXXX-XXXX-XXXX` (12 base32 chars + dashes for readability). 60 bits of
 *   entropy is plenty given each code is single-use, time-bounded by a user
 *   account, and never accepted after first use.
 *
 * Storage
 *   `User.mfaRecoveryCodesHash` is a JSON array of `{ hash, usedAt }`. We
 *   persist `usedAt` instead of removing rows so an audit trail of code usage
 *   is preserved at the row level (the AuditLog also records each use).
 */

import * as argon2 from "argon2";
import { randomBytes } from "node:crypto";

export const MFA_RECOVERY_CODE_COUNT = 10;
const GROUPS = 3;
const GROUP_LEN = 4;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // base32 minus visually ambiguous chars

export type StoredRecoveryCode = {
  /** Argon2id hash of the plaintext code. Plaintext is never persisted. */
  hash: string;
  /** ISO timestamp set when the code is consumed. `null` until then. */
  usedAt: string | null;
};

export function generateRecoveryCodes(count: number = MFA_RECOVERY_CODE_COUNT): string[] {
  if (!Number.isInteger(count) || count <= 0 || count > 50) {
    throw new Error("generateRecoveryCodes: invalid count");
  }
  const codes: string[] = [];
  while (codes.length < count) {
    const groups: string[] = [];
    for (let g = 0; g < GROUPS; g += 1) {
      let s = "";
      const bytes = randomBytes(GROUP_LEN);
      for (let i = 0; i < GROUP_LEN; i += 1) {
        s += ALPHABET[bytes[i]! % ALPHABET.length];
      }
      groups.push(s);
    }
    const code = groups.join("-");
    if (!codes.includes(code)) codes.push(code);
  }
  return codes;
}

export async function hashRecoveryCodes(codes: string[]): Promise<StoredRecoveryCode[]> {
  const out: StoredRecoveryCode[] = [];
  for (const code of codes) {
    const hash = await argon2.hash(code, { type: argon2.argon2id });
    out.push({ hash, usedAt: null });
  }
  return out;
}

/**
 * Verify a candidate recovery code against the stored hashes. Returns the
 * index of the matched, unused entry, or `null` on miss / already-used. The
 * caller is responsible for atomically marking the entry as used.
 *
 * Implementation detail: we iterate all unused entries even after a match to
 * keep the lookup time relatively constant per call. argon2 verification is
 * intentionally slow; combined with the per-account lockout, this prevents
 * any meaningful brute-force attempt.
 */
export async function findMatchingRecoveryIndex(
  candidate: string,
  stored: StoredRecoveryCode[]
): Promise<number | null> {
  if (typeof candidate !== "string") return null;
  const normalized = candidate.trim().toUpperCase();
  if (normalized.length === 0) return null;
  let matchedIdx: number | null = null;
  for (let i = 0; i < stored.length; i += 1) {
    const entry = stored[i]!;
    if (entry.usedAt) continue;
    let ok = false;
    try {
      ok = await argon2.verify(entry.hash, normalized);
    } catch {
      ok = false;
    }
    if (ok && matchedIdx === null) {
      matchedIdx = i;
    }
  }
  return matchedIdx;
}

/**
 * Validate that a JSON-loaded shape from `User.mfaRecoveryCodesHash` is the
 * expected `StoredRecoveryCode[]` array. Returns `null` on malformed input so
 * callers can treat it as "no codes".
 */
export function parseStoredRecoveryCodes(raw: unknown): StoredRecoveryCode[] | null {
  if (!Array.isArray(raw)) return null;
  const out: StoredRecoveryCode[] = [];
  for (const item of raw) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof (item as { hash?: unknown }).hash !== "string"
    ) {
      return null;
    }
    const usedAtRaw = (item as { usedAt?: unknown }).usedAt;
    const usedAt = usedAtRaw == null
      ? null
      : typeof usedAtRaw === "string"
      ? usedAtRaw
      : null;
    out.push({ hash: (item as { hash: string }).hash, usedAt });
  }
  return out;
}
