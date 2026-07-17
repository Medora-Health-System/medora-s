/**
 * Medication catalog audit runner.
 *   pnpm --filter @medora/api medication:audit:catalog
 */
import { writeAuditArtifact } from "./medication-audit-types";
import { loadMedicationAuditContext } from "./medication-audit-context";
import { buildCatalogInventoryArtifact } from "./medication-catalog-metrics";

async function main() {
  const ctx = await loadMedicationAuditContext();
  writeAuditArtifact(
    "medication-catalog-inventory.json",
    {
      ...buildCatalogInventoryArtifact(ctx.metrics),
      duplicateDetection: ctx.duplicateGroups,
    }
  );
  console.log("Medication catalog audit complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
