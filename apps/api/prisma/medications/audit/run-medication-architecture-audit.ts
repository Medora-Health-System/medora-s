/**
 * Medication architecture audit runner.
 *   pnpm --filter @medora/api medication:audit:architecture
 */
import { writeAuditArtifact } from "./medication-audit-types";
import { loadMedicationAuditContext } from "./medication-audit-context";
import {
  buildDataModelInventory,
  buildEngineArchitectureInventory,
} from "./medication-architecture-inventory";

async function main() {
  const ctx = await loadMedicationAuditContext();
  writeAuditArtifact(
    "medication-engine-architecture-inventory.json",
    buildEngineArchitectureInventory(ctx.dataSource, ctx.confidence, ctx.metrics)
  );
  writeAuditArtifact(
    "medication-data-model-inventory.json",
    buildDataModelInventory(ctx.dataSource, ctx.confidence, ctx.metrics)
  );
  console.log("Medication architecture audit complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
