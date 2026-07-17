/**
 * Medication HCPCS audit runner.
 *   pnpm --filter @medora/api medication:audit:hcpcs
 */
import { writeAuditArtifact } from "./medication-audit-types";
import { loadMedicationAuditContext } from "./medication-audit-context";
import { buildHcpcsAuditArtifact } from "./medication-identifier-audit";

async function main() {
  const ctx = await loadMedicationAuditContext();
  writeAuditArtifact(
    "medication-hcpcs-audit.json",
    buildHcpcsAuditArtifact(ctx.dataSource, ctx.confidence, ctx.metrics)
  );
  console.log("Medication HCPCS audit complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
