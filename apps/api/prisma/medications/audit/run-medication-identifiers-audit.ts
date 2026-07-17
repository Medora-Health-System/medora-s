/**
 * Medication identifier audit runner.
 *   pnpm --filter @medora/api medication:audit:identifiers
 */
import { writeAuditArtifact } from "./medication-audit-types";
import { loadMedicationAuditContext } from "./medication-audit-context";
import {
  buildIdentifierCoverageArtifact,
  buildNdcReadinessArtifact,
  buildRxNormReadinessArtifact,
} from "./medication-identifier-audit";

async function main() {
  const ctx = await loadMedicationAuditContext();
  writeAuditArtifact(
    "medication-identifier-coverage.json",
    {
      ...buildIdentifierCoverageArtifact(ctx.dataSource, ctx.confidence, ctx.metrics),
      duplicateDetection: ctx.duplicateGroups,
    }
  );
  writeAuditArtifact(
    "medication-rxnorm-readiness.json",
    buildRxNormReadinessArtifact(ctx.dataSource, ctx.confidence, ctx.metrics)
  );
  writeAuditArtifact(
    "medication-ndc-readiness.json",
    buildNdcReadinessArtifact(ctx.dataSource, ctx.confidence, ctx.metrics)
  );
  console.log("Medication identifier audit complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
