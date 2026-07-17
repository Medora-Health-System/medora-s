/**
 * Medication search audit runner.
 *   pnpm --filter @medora/api medication:audit:search
 */
import { writeAuditArtifact } from "./medication-audit-types";
import { loadMedicationAuditContext } from "./medication-audit-context";
import { buildSearchAuditArtifact } from "./medication-search-probes";

async function main() {
  const ctx = await loadMedicationAuditContext();
  writeAuditArtifact(
    "medication-search-audit.json",
    buildSearchAuditArtifact(ctx.dataSource, ctx.confidence, ctx.searchProbes)
  );
  console.log("Medication search audit complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
