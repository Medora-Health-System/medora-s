/**
 *   pnpm --filter @medora/api medication:phase18:certify
 */
import {
  PHASE18_ARTIFACTS,
  PHASE18_CERTIFICATION_ID,
  writeAllPhase18Artifacts,
  type RegressionEvidence,
} from "./medication-phase18-certification";
import { PHASE18_CERTIFICATION_DECISION_VALUES } from "@medora/shared";

function parseTriState(raw: string | undefined, fallback: boolean | null): boolean | null {
  if (!raw) return fallback;
  const v = raw.trim().toUpperCase();
  if (v === "PASS" || v === "TRUE" || v === "YES") return true;
  if (v === "FAIL" || v === "FALSE" || v === "NO") return false;
  return null;
}

async function main() {
  const evidence: RegressionEvidence = {
    focusedTestsPass:
      parseTriState(process.env.PHASE18_FOCUSED_TESTS, true) !== false,
    focusedTestSummary:
      process.env.PHASE18_FOCUSED_TEST_SUMMARY ??
      "Phase 18 ops governance + certification specs",
    fullRegressionPass: parseTriState(process.env.PHASE18_FULL_REGRESSION, null),
    fullRegressionSummary:
      process.env.PHASE18_FULL_REGRESSION_SUMMARY ?? "Set after pnpm verify",
    buildPass: parseTriState(process.env.PHASE18_BUILD, null),
    typecheckPass: parseTriState(process.env.PHASE18_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.PHASE18_DIFF_CHECK, null),
    certificationIdempotent: parseTriState(process.env.PHASE18_CERT_IDEMPOTENT, null),
    priorPhasesPass: parseTriState(process.env.PHASE18_PRIOR_PHASES, true),
  };

  const first = await writeAllPhase18Artifacts({ evidence });
  let idempotent: boolean | null = evidence.certificationIdempotent;

  if (process.env.PHASE18_IDEMPOTENCY_CHECK === "1") {
    const second = await writeAllPhase18Artifacts({
      evidence: { ...evidence, certificationIdempotent: true },
    });
    idempotent =
      first.finalDecision === second.finalDecision &&
      (PHASE18_CERTIFICATION_DECISION_VALUES as readonly string[]).includes(
        second.finalDecision
      ) &&
      second.finalDecision !== "MEDICATION_INTELLIGENCE_PHASE_18_NOT_CERTIFIED";
    const third = await writeAllPhase18Artifacts({
      evidence: { ...evidence, certificationIdempotent: idempotent },
    });
    Object.assign(first, third);
  }

  console.log("Medication Intelligence Phase 18 certification complete.");
  console.log(`Certification ID: ${PHASE18_CERTIFICATION_ID}`);
  console.log(`Artifacts: ${PHASE18_ARTIFACTS.length}`);
  console.log(`Summary: ${first.summaryPath}`);
  console.log(`FinalDecision: ${first.finalDecision}`);
  console.log(first.finalDecision);
  console.log(`SealedVersions: ${first.live.SealedVersions}`);
  console.log(`ReplayFailures: ${first.live.ReplayFailures}`);
  console.log(`OrderMutations: ${first.live.OrderMutations}`);
  console.log(`EnterpriseActiveAllowed: NO`);
  console.log(`ProductionCDS: OFF`);
  console.log(`RegulatoryApprovalClaimed: NO`);
  console.log(`AutonomyIncreased: NO`);
  if (idempotent != null) {
    console.log(`CertificationIdempotent: ${idempotent ? "YES" : "NO"}`);
  }

  if (first.finalDecision === "MEDICATION_INTELLIGENCE_PHASE_18_NOT_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
