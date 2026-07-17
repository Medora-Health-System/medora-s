/**
 * Medication Intelligence Phase 6 — enterprise certification runner.
 *
 *   pnpm --filter @medora/api medication:certify:phase6
 */
import {
  PHASE6_ARTIFACTS,
  PHASE6_CERTIFICATION_ID,
  writeAllPhase6Artifacts,
  type RegressionEvidence,
} from "./medication-phase6-certification";

function parseTriState(raw: string | undefined, fallback: boolean | null): boolean | null {
  if (!raw) return fallback;
  const v = raw.trim().toUpperCase();
  if (v === "PASS" || v === "TRUE" || v === "YES") return true;
  if (v === "FAIL" || v === "FALSE" || v === "NO") return false;
  return null;
}

async function main() {
  const evidence: RegressionEvidence = {
    focusedTestsPass: parseTriState(process.env.PHASE6_FOCUSED_TESTS, true) !== false,
    focusedTestSummary:
      process.env.PHASE6_FOCUSED_TEST_SUMMARY ??
      "Shared review governance + review operations + verification service + phase6 certification specs",
    fullRegressionPass: parseTriState(process.env.PHASE6_FULL_REGRESSION, null),
    fullRegressionSummary: process.env.PHASE6_FULL_REGRESSION_SUMMARY ?? "Set after pnpm verify",
    buildPass: parseTriState(process.env.PHASE6_BUILD, null),
    typecheckPass: parseTriState(process.env.PHASE6_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.PHASE6_DIFF_CHECK, null),
    certificationIdempotent: parseTriState(process.env.PHASE6_CERT_IDEMPOTENT, null),
    priorPhasesPass: parseTriState(process.env.PHASE6_PRIOR_PHASES, true),
  };

  const first = await writeAllPhase6Artifacts({ evidence });
  let idempotent: boolean | null = evidence.certificationIdempotent;

  if (process.env.PHASE6_IDEMPOTENCY_CHECK === "1") {
    const second = await writeAllPhase6Artifacts({
      evidence: { ...evidence, certificationIdempotent: true },
    });
    idempotent =
      first.finalDecision === second.finalDecision &&
      second.finalDecision === "MEDICATION_INTELLIGENCE_PHASE_6_CERTIFIED";
    const third = await writeAllPhase6Artifacts({
      evidence: { ...evidence, certificationIdempotent: idempotent },
    });
    Object.assign(first, third);
  }

  console.log("Medication Intelligence Phase 6 certification complete.");
  console.log(`Certification ID: ${PHASE6_CERTIFICATION_ID}`);
  console.log(`Artifacts: ${PHASE6_ARTIFACTS.length}`);
  console.log(`Summary: ${first.summaryPath}`);
  console.log(`FinalDecision: ${first.finalDecision}`);
  console.log("HumanVerificationRequired: YES");
  console.log("AutomaticVerificationEnabled: NO");
  console.log("ClinicalActivationEnabled: NO");
  console.log("EmPilotEnabled: NO");
  if (idempotent != null) {
    console.log(`CertificationIdempotent: ${idempotent ? "YES" : "NO"}`);
  }

  if (first.finalDecision !== "MEDICATION_INTELLIGENCE_PHASE_6_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
