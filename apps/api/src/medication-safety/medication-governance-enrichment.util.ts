import type { PrismaClient } from "@prisma/client";
import { createStructuredLogger } from "../common/logging/structured-logger";
import {
  isPrismaSchemaResourceMissingError,
} from "./pharmacy-verification-enrichment.util";
import {
  loadMedicationSafetyGovernanceByCatalogId,
  type MedicationSafetyGovernanceRead,
} from "./medication-safety-governance-read.util";

const governanceEnrichmentLog = createStructuredLogger("MedicationGovernanceEnrichment");

/**
 * Optional enrichment — must never block medication label resolution (M1.7A.7).
 */
export async function loadMedicationSafetyGovernanceByCatalogIdSafe(
  prisma: Pick<PrismaClient, "catalogMedication" | "medicationProduct">,
  catalogMedicationIds: string[]
): Promise<Map<string, MedicationSafetyGovernanceRead>> {
  try {
    return await loadMedicationSafetyGovernanceByCatalogId(prisma, catalogMedicationIds);
  } catch (err) {
    if (!isPrismaSchemaResourceMissingError(err)) throw err;
    governanceEnrichmentLog.warn("medication_governance_enrichment_skipped", {
      reason: "schema_drift",
      error: err instanceof Error ? err.message : String(err),
      catalogMedicationCount: catalogMedicationIds.length,
    });
    return new Map();
  }
}
