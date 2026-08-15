/**
 * MEDUI.D4C.10C — PostgreSQL transaction-scoped advisory lock for GENERAL_CREATE races.
 * Reuses the same mechanism as platform governance bootstrap (pg_advisory_xact_lock).
 * No migration / no unique(patient, serviceLine, status).
 */

import { createHash } from "crypto";
import {
  buildEnterpriseEncounterCreateLockMaterial,
  D4C10C_CERTIFICATION_ID,
} from "@medora/shared";

export { D4C10C_CERTIFICATION_ID };

type TxWithAdvisoryLock = {
  $executeRawUnsafe: (sql: string, ...values: unknown[]) => Promise<unknown>;
};

export function hashEnterpriseEncounterCreateLockKeys(material: string): {
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
 * Serialize GENERAL_CREATE for the same facility+patient+serviceLine+episode.
 * Distinct service lines take different locks (Clinic ∥ Dental remain concurrent).
 */
export async function acquireEnterpriseEncounterCreateRaceLock(
  tx: TxWithAdvisoryLock,
  input: {
    facilityId: string;
    patientId: string;
    serviceLine: string;
    appointmentId?: string | null;
  }
): Promise<{ key1: number; key2: number; material: string }> {
  const material = buildEnterpriseEncounterCreateLockMaterial(input);
  const { key1, key2 } = hashEnterpriseEncounterCreateLockKeys(material);
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock($1::int, $2::int)", key1, key2);
  return { key1, key2, material };
}
