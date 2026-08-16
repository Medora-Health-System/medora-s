/**
 * MEDUI.D4A.4.3A — PostgreSQL transaction-scoped advisory lock for exclusive bed claims.
 * Reuses pg_advisory_xact_lock (same mechanism as D4C.10C encounter-create / governance bootstrap).
 * Serializes competing exclusive assignments to the same facility canonical bed key.
 */

import { createHash } from "crypto";

export const D4A43A_CERTIFICATION_ID = "MEDUI.D4A.4.3A" as const;

type TxWithAdvisoryLock = {
  $executeRawUnsafe: (sql: string, ...values: unknown[]) => Promise<unknown>;
};

export function buildBedAssignmentLockMaterial(input: {
  facilityId: string;
  canonicalBedKey: string;
}): string {
  return [
    D4A43A_CERTIFICATION_ID,
    "BED_ASSIGN",
    input.facilityId.trim(),
    input.canonicalBedKey.trim(),
  ].join("|");
}

export function hashBedAssignmentLockKeys(material: string): {
  key1: number;
  key2: number;
} {
  const digest = createHash("sha256").update(material, "utf8").digest();
  return {
    key1: digest.readInt32BE(0),
    key2: digest.readInt32BE(4),
  };
}

/**
 * Serialize exclusive room/bed assignment for one facility + canonical bed key (e.g. `MS:4`).
 * Override / waiting-room / clear-room paths do not take this lock.
 */
export async function acquireBedAssignmentRaceLock(
  tx: TxWithAdvisoryLock,
  input: {
    facilityId: string;
    canonicalBedKey: string;
  }
): Promise<{ key1: number; key2: number; material: string }> {
  const material = buildBedAssignmentLockMaterial(input);
  const { key1, key2 } = hashBedAssignmentLockKeys(material);
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock($1::int, $2::int)", key1, key2);
  return { key1, key2, material };
}
