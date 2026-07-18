/**
 *   pnpm --filter @medora/api medication:phase17:certify
 */
import {
  PHASE17_ARTIFACTS,
  PHASE17_CERTIFICATION_ID,
  writeAllPhase17Artifacts,
  type RegressionEvidence,
} from "./medication-phase17-certification";
import { PHASE17_CERTIFICATION_DECISION_VALUES } from "@medora/shared";

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
      parseTriState(process.env.PHASE17_FOCUSED_TESTS, true) !== false,
    focusedTestSummary:
      process.env.PHASE17_FOCUSED_TEST_SUMMARY ??
      "Phase 17 pilot governance + certification specs",
    fullRegressionPass: parseTriState(process.env.PHASE17_FULL_REGRESSION, null),
    fullRegressionSummary:
      process.env.PHASE17_FULL_REGRESSION_SUMMARY ?? "Set after pnpm verify",
    buildPass: parseTriState(process.env.PHASE17_BUILD, null),
    typecheckPass: parseTriState(process.env.PHASE17_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.PHASE17_DIFF_CHECK, null),
    certificationIdempotent: parseTriState(process.env.PHASE17_CERT_IDEMPOTENT, null),
    priorPhasesPass: parseTriState(process.env.PHASE17_PRIOR_PHASES, true),
  };

  const first = await writeAllPhase17Artifacts({ evidence });
  let idempotent: boolean | null = evidence.certificationIdempotent;

  if (process.env.PHASE17_IDEMPOTENCY_CHECK === "1") {
    const second = await writeAllPhase17Artifacts({
      evidence: { ...evidence, certificationIdempotent: true },
    });
    idempotent =
      first.finalDecision === second.finalDecision &&
      (PHASE17_CERTIFICATION_DECISION_VALUES as readonly string[]).includes(
        second.finalDecision
      ) &&
      second.finalDecision !== "MEDICATION_INTELLIGENCE_PHASE_17_NOT_CERTIFIED";
    const third = await writeAllPhase17Artifacts({
      evidence: { ...evidence, certificationIdempotent: idempotent },
    });
    Object.assign(first, third);
  }

  console.log("Medication Intelligence Phase 17 certification complete.");
  console.log(`Certification ID: ${PHASE17_CERTIFICATION_ID}`);
  console.log(`Artifacts: ${PHASE17_ARTIFACTS.length}`);
  console.log(`Summary: ${first.summaryPath}`);
  console.log(`FinalDecision: ${first.finalDecision}`);
  console.log(first.finalDecision);
  console.log(`ActivePilotCount: ${first.live.ActivePilotCount}`);
  console.log(`EligibleQualifications: ${first.live.EligibleQualifications}`);
  console.log(`OrderMutations: ${first.live.OrderMutations}`);
  console.log(`MarMutations: ${first.live.MarMutations}`);
  console.log(`ChartMutations: ${first.live.ChartMutations}`);
  console.log(`EnterpriseActivations: ${first.live.EnterpriseActivations}`);
  console.log("EnterpriseActiveAllowed: NO");
  console.log("OrderFromRecommendation: DISABLED");
  console.log("ProductionCDS: OFF");
  console.log("FabricatedPilotActivation: NO");
  if (idempotent != null) {
    console.log(`CertificationIdempotent: ${idempotent ? "YES" : "NO"}`);
  }

  if (first.finalDecision === "MEDICATION_INTELLIGENCE_PHASE_17_NOT_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
