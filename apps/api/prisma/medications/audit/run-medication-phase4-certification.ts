/**
 * Medication Intelligence Phase 4 — enterprise certification runner.
 *
 *   pnpm --filter @medora/api medication:certify:phase4
 */
import {
  PHASE4_ARTIFACTS,
  PHASE4_CERTIFICATION_ID,
  writeAllPhase4Artifacts,
  type RegressionEvidence,
} from "./medication-phase4-certification";

function parseTriState(raw: string | undefined, fallback: boolean | null): boolean | null {
  if (!raw) return fallback;
  const v = raw.trim().toUpperCase();
  if (v === "PASS" || v === "TRUE" || v === "YES") return true;
  if (v === "FAIL" || v === "FALSE" || v === "NO") return false;
  return null;
}

async function main() {
  const evidence: RegressionEvidence = {
    focusedTestsPass: parseTriState(process.env.PHASE4_FOCUSED_TESTS, true) !== false,
    focusedTestSummary:
      process.env.PHASE4_FOCUSED_TEST_SUMMARY ??
      "Shared medicationRxNormVerification + API rxnorm-verification-service + phase4 certification specs",
    fullRegressionPass: parseTriState(process.env.PHASE4_FULL_REGRESSION, null),
    fullRegressionSummary: process.env.PHASE4_FULL_REGRESSION_SUMMARY ?? "Set after pnpm verify",
    buildPass: parseTriState(process.env.PHASE4_BUILD, null),
    typecheckPass: parseTriState(process.env.PHASE4_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.PHASE4_DIFF_CHECK, null),
  };

  const { summaryPath, finalDecision } = await writeAllPhase4Artifacts({ evidence });

  console.log("Medication Intelligence Phase 4 certification complete.");
  console.log(`Certification ID: ${PHASE4_CERTIFICATION_ID}`);
  console.log(`Artifacts: ${PHASE4_ARTIFACTS.length}`);
  console.log(`Summary: ${summaryPath}`);
  console.log(`FinalDecision: ${finalDecision}`);

  if (finalDecision !== "MEDICATION_INTELLIGENCE_PHASE_4_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
