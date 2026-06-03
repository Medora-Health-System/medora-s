import { Prisma, type PharmacyVerificationStatus, type PrismaClient } from "@prisma/client";
import { createStructuredLogger } from "../common/logging/structured-logger";
import {
  loadLatestPharmacyVerificationByOrderItemId,
  loadPharmacyVerificationDetailsByOrderItemId,
  type PharmacyVerificationDetailRead,
} from "./medication-safety-governance-read.util";

const pharmacyEnrichmentLog = createStructuredLogger("PharmacyVerificationEnrichment");

/** Prisma / Postgres errors when a table or column is absent (e.g. migration not deployed). */
export function isPrismaSchemaResourceMissingError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return err.code === "P2021" || err.code === "P2022";
  }
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /does not exist in the current database/i.test(msg) ||
    /relation .* does not exist/i.test(msg)
  );
}

function skipReasonFromError(err: unknown): "table_missing" | "schema_drift" {
  const msg = err instanceof Error ? err.message : String(err);
  if (/PharmacyVerification/i.test(msg)) return "table_missing";
  return "schema_drift";
}

/**
 * Optional enrichment — must never block medication label resolution (M1.7A.7).
 */
export async function loadLatestPharmacyVerificationByOrderItemIdSafe(
  prisma: Pick<PrismaClient, "pharmacyVerification">,
  orderItemIds: string[]
): Promise<Map<string, PharmacyVerificationStatus>> {
  try {
    return await loadLatestPharmacyVerificationByOrderItemId(prisma, orderItemIds);
  } catch (err) {
    if (!isPrismaSchemaResourceMissingError(err)) throw err;
    pharmacyEnrichmentLog.warn("pharmacy_verification_enrichment_skipped", {
      reason: skipReasonFromError(err),
      error: err instanceof Error ? err.message : String(err),
      orderItemCount: orderItemIds.length,
    });
    return new Map();
  }
}

/**
 * Optional enrichment — must never block medication label resolution (M1.7A.7).
 */
export async function loadPharmacyVerificationDetailsByOrderItemIdSafe(
  prisma: Pick<PrismaClient, "pharmacyVerification">,
  orderItemIds: string[]
): Promise<Map<string, PharmacyVerificationDetailRead>> {
  try {
    return await loadPharmacyVerificationDetailsByOrderItemId(prisma, orderItemIds);
  } catch (err) {
    if (!isPrismaSchemaResourceMissingError(err)) throw err;
    pharmacyEnrichmentLog.warn("pharmacy_verification_enrichment_skipped", {
      reason: skipReasonFromError(err),
      error: err instanceof Error ? err.message : String(err),
      orderItemCount: orderItemIds.length,
    });
    return new Map();
  }
}
