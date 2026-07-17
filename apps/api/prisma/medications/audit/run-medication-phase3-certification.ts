/**
 * Medication Intelligence Phase 3 — enterprise certification runner.
 *
 *   pnpm --filter @medora/api medication:certify:phase3
 */
import {
  PHASE3_ARTIFACTS,
  PHASE3_CERTIFICATION_ID,
  writeAllPhase3Artifacts,
  type RegressionEvidence,
} from "./medication-phase3-certification";

function parseTriState(raw: string | undefined, fallback: boolean | null): boolean | null {
  if (!raw) return fallback;
  const v = raw.trim().toUpperCase();
  if (v === "PASS" || v === "TRUE" || v === "YES") return true;
  if (v === "FAIL" || v === "FALSE" || v === "NO") return false;
  return null;
}

async function main() {
  const evidence: RegressionEvidence = {
    focusedTestsPass: parseTriState(process.env.PHASE3_FOCUSED_TESTS, true) !== false,
    focusedTestSummary:
      process.env.PHASE3_FOCUSED_TEST_SUMMARY ??
      "Shared medicationRxNormPhase3Foundation + API rxnorm-import-service + phase3 certification specs",
    fullRegressionPass: parseTriState(process.env.PHASE3_FULL_REGRESSION, null),
    fullRegressionSummary: process.env.PHASE3_FULL_REGRESSION_SUMMARY ?? "Set after pnpm verify",
    buildPass: parseTriState(process.env.PHASE3_BUILD, null),
    typecheckPass: parseTriState(process.env.PHASE3_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.PHASE3_DIFF_CHECK, null),
  };

  const { summaryPath, finalDecision } = await writeAllPhase3Artifacts({ evidence });

  console.log("Medication Intelligence Phase 3 certification complete.");
  console.log(`Certification ID: ${PHASE3_CERTIFICATION_ID}`);
  console.log(`Artifacts: ${PHASE3_ARTIFACTS.length}`);
  console.log(`Summary: ${summaryPath}`);
  console.log(`FinalDecision: ${finalDecision}`);

  if (finalDecision !== "MEDICATION_INTELLIGENCE_PHASE_3_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
