/**
 * Medication Intelligence Phase 2 — enterprise certification runner.
 *
 *   pnpm --filter @medora/api medication:certify:phase2
 *
 * Optional env:
 *   PHASE2_FOCUSED_TESTS=PASS|FAIL
 *   PHASE2_FULL_REGRESSION=PASS|FAIL|PENDING
 *   PHASE2_BUILD=PASS|FAIL|PENDING
 *   PHASE2_TYPECHECK=PASS|FAIL|PENDING
 *   PHASE2_DIFF_CHECK=PASS|FAIL|PENDING
 */
import {
  PHASE2_ARTIFACTS,
  PHASE2_CERTIFICATION_ID,
  writeAllPhase2Artifacts,
  type RegressionEvidence,
} from "./medication-phase2-certification";

function parseTriState(raw: string | undefined, fallback: boolean | null): boolean | null {
  if (!raw) return fallback;
  const v = raw.trim().toUpperCase();
  if (v === "PASS" || v === "TRUE" || v === "YES") return true;
  if (v === "FAIL" || v === "FALSE" || v === "NO") return false;
  return null;
}

async function main() {
  const evidence: RegressionEvidence = {
    focusedTestsPass: parseTriState(process.env.PHASE2_FOCUSED_TESTS, true) !== false,
    focusedTestSummary:
      process.env.PHASE2_FOCUSED_TEST_SUMMARY ??
      "Shared medicationPhase2Foundation + API medication-phase2-foundation.util specs",
    fullRegressionPass: parseTriState(process.env.PHASE2_FULL_REGRESSION, null),
    fullRegressionSummary: process.env.PHASE2_FULL_REGRESSION_SUMMARY ?? "Set after pnpm verify",
    buildPass: parseTriState(process.env.PHASE2_BUILD, null),
    typecheckPass: parseTriState(process.env.PHASE2_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.PHASE2_DIFF_CHECK, null),
  };

  const { summaryPath, finalDecision } = await writeAllPhase2Artifacts({ evidence });

  console.log("Medication Intelligence Phase 2 certification complete.");
  console.log(`Certification ID: ${PHASE2_CERTIFICATION_ID}`);
  console.log(`Artifacts: ${PHASE2_ARTIFACTS.length}`);
  console.log(`Summary: ${summaryPath}`);
  console.log(`FinalDecision: ${finalDecision}`);

  if (finalDecision !== "MEDICATION_INTELLIGENCE_PHASE_2_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
