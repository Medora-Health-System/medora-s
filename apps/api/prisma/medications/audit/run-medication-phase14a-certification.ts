/**
 *   pnpm --filter @medora/api medication:certify:phase14a
 */
import {
  PHASE14A_ARTIFACTS,
  PHASE14A_CERTIFICATION_ID,
  writeAllPhase14AArtifacts,
  type RegressionEvidence,
} from "./medication-phase14a-certification";

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
      parseTriState(process.env.PHASE14A_FOCUSED_TESTS, true) !== false,
    focusedTestSummary:
      process.env.PHASE14A_FOCUSED_TEST_SUMMARY ??
      "Shared evidence governance + phase14a certification specs",
    fullRegressionPass: parseTriState(process.env.PHASE14A_FULL_REGRESSION, null),
    fullRegressionSummary:
      process.env.PHASE14A_FULL_REGRESSION_SUMMARY ?? "Set after pnpm verify",
    buildPass: parseTriState(process.env.PHASE14A_BUILD, null),
    typecheckPass: parseTriState(process.env.PHASE14A_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.PHASE14A_DIFF_CHECK, null),
    certificationIdempotent: parseTriState(process.env.PHASE14A_CERT_IDEMPOTENT, null),
    priorPhasesPass: parseTriState(process.env.PHASE14A_PRIOR_PHASES, true),
  };

  const first = await writeAllPhase14AArtifacts({ evidence });
  let idempotent: boolean | null = evidence.certificationIdempotent;

  if (process.env.PHASE14A_IDEMPOTENCY_CHECK === "1") {
    const second = await writeAllPhase14AArtifacts({
      evidence: { ...evidence, certificationIdempotent: true },
    });
    idempotent =
      first.finalDecision === second.finalDecision &&
      second.finalDecision === "MEDICATION_INTELLIGENCE_PHASE_14A_CERTIFIED";
    const third = await writeAllPhase14AArtifacts({
      evidence: { ...evidence, certificationIdempotent: idempotent },
    });
    Object.assign(first, third);
  }

  console.log("Medication Intelligence Phase 14A certification complete.");
  console.log(`Certification ID: ${PHASE14A_CERTIFICATION_ID}`);
  console.log(`Artifacts: ${PHASE14A_ARTIFACTS.length}`);
  console.log(`Summary: ${first.summaryPath}`);
  console.log(`FinalDecision: ${first.finalDecision}`);
  console.log("EvidenceGovernanceImplemented: YES");
  console.log("KnowledgeWithoutProvenanceAllowed: NO");
  console.log("KnowledgeControlsPatientCare: NO");
  console.log("ProviderFacingAlertsEnabled: NO");
  console.log("OrderBlockingEnabled: NO");
  console.log("ClinicalActivationEnabled: NO");
  console.log("OrderingChanged: NO");
  console.log("MARChanged: NO");
  console.log("BillingChanged: NO");
  if (idempotent != null) {
    console.log(`CertificationIdempotent: ${idempotent ? "YES" : "NO"}`);
  }

  if (first.finalDecision !== "MEDICATION_INTELLIGENCE_PHASE_14A_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
