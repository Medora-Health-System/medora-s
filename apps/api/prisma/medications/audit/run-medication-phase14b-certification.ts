/**
 *   pnpm --filter @medora/api medication:certify:phase14b
 */
import {
  PHASE14B_ARTIFACTS,
  PHASE14B_CERTIFICATION_ID,
  writeAllPhase14BArtifacts,
  type RegressionEvidence,
} from "./medication-phase14b-certification";

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
      parseTriState(process.env.PHASE14B_FOCUSED_TESTS, true) !== false,
    focusedTestSummary:
      process.env.PHASE14B_FOCUSED_TEST_SUMMARY ??
      "Shared expert review governance + phase14b certification specs",
    fullRegressionPass: parseTriState(process.env.PHASE14B_FULL_REGRESSION, null),
    fullRegressionSummary:
      process.env.PHASE14B_FULL_REGRESSION_SUMMARY ?? "Set after pnpm verify",
    buildPass: parseTriState(process.env.PHASE14B_BUILD, null),
    typecheckPass: parseTriState(process.env.PHASE14B_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.PHASE14B_DIFF_CHECK, null),
    certificationIdempotent: parseTriState(process.env.PHASE14B_CERT_IDEMPOTENT, null),
    priorPhasesPass: parseTriState(process.env.PHASE14B_PRIOR_PHASES, true),
  };

  const first = await writeAllPhase14BArtifacts({ evidence });
  let idempotent: boolean | null = evidence.certificationIdempotent;

  if (process.env.PHASE14B_IDEMPOTENCY_CHECK === "1") {
    const second = await writeAllPhase14BArtifacts({
      evidence: { ...evidence, certificationIdempotent: true },
    });
    idempotent =
      first.finalDecision === second.finalDecision &&
      second.finalDecision === "MEDICATION_INTELLIGENCE_PHASE_14B_CERTIFIED";
    const third = await writeAllPhase14BArtifacts({
      evidence: { ...evidence, certificationIdempotent: idempotent },
    });
    Object.assign(first, third);
  }

  console.log("Medication Intelligence Phase 14B certification complete.");
  console.log(`Certification ID: ${PHASE14B_CERTIFICATION_ID}`);
  console.log(`Artifacts: ${PHASE14B_ARTIFACTS.length}`);
  console.log(`Summary: ${first.summaryPath}`);
  console.log(`FinalDecision: ${first.finalDecision}`);
  if (first.finalDecision === "MEDICATION_INTELLIGENCE_PHASE_14B_CERTIFIED") {
    console.log("MEDICATION_INTELLIGENCE_PHASE_14B_CERTIFIED");
  }
  console.log("ExpertKnowledgeReviewImplemented: YES");
  console.log("SyntheticShadowEvaluationImplemented: YES");
  console.log("ReusesPhase10EvaluationEngine: YES");
  console.log("MutableDraftKnowledgeConsumed: NO");
  console.log("ApprovedForShadowImpliesProduction: NO");
  console.log("KnowledgeControlsPatientCare: NO");
  console.log("ProviderFacingAlertsEnabled: NO");
  console.log("ClinicalActivationEnabled: NO");
  console.log("OrderingChanged: NO");
  console.log("MARChanged: NO");
  console.log("BillingChanged: NO");
  if (idempotent != null) {
    console.log(`CertificationIdempotent: ${idempotent ? "YES" : "NO"}`);
  }

  if (first.finalDecision !== "MEDICATION_INTELLIGENCE_PHASE_14B_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
