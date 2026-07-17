/**
 * Medication localization audit runner.
 *   pnpm --filter @medora/api medication:audit:localization
 */
import { writeAuditArtifact } from "./medication-audit-types";
import { loadMedicationAuditContext } from "./medication-audit-context";
import { buildLocalizationAuditArtifact } from "./medication-search-probes";

async function main() {
  const ctx = await loadMedicationAuditContext();
  writeAuditArtifact(
    "medication-localization-audit.json",
    buildLocalizationAuditArtifact(ctx.dataSource, ctx.confidence, ctx.metrics.liveCounts)
  );
  console.log("Medication localization audit complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
