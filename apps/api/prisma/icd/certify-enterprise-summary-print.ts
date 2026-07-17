/**
 * Enterprise summary print adapter certification for diagnostic intelligence.
 *   pnpm --filter @medora/api clinical:summary-print:enterprise-certify
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_ADAPTERS = [
  "../../../web/src/features/emergency/EmergencyClinicalDataSummary.tsx",
  "../../../web/src/features/emergency/encounterClinicalRecordAdapter.ts",
  "../../../web/src/features/emergency/providerDischargeDocumentationSummary.ts",
  "../../../web/src/features/emergency/edClinicalDataSummaryProjection.test.ts",
  "../../../web/src/components/encounters/DischargePrintLayout.tsx",
];

function main() {
  const failures: string[] = [];
  for (const rel of REQUIRED_ADAPTERS) {
    const path = resolve(__dirname, rel);
    if (!existsSync(path)) failures.push(`Missing summary adapter: ${rel}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    requiredAdapters: REQUIRED_ADAPTERS.length,
    missing: failures,
    pass: failures.length === 0,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 2);
}

main();
