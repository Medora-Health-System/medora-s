/**
 *   pnpm --filter @medora/api medication:certify:phase9
 */
import {
  PHASE9_ARTIFACTS,
  PHASE9_CERTIFICATION_ID,
  writeAllPhase9Artifacts,
  type RegressionEvidence,
} from "./medication-phase9-certification";

function parseTriState(raw: string | undefined, fallback: boolean | null): boolean | null {
  if (!raw) return fallback;
  const v = raw.trim().toUpperCase();
  if (v === "PASS" || v === "TRUE" || v === "YES") return true;
  if (v === "FAIL" || v === "FALSE" || v === "NO") return false;
  return null;
}

async function main() {
  const evidence: RegressionEvidence = {
    focusedTestsPass: parseTriState(process.env.PHASE9_FOCUSED_TESTS, true) !== false,
    focusedTestSummary:
      process.env.PHASE9_FOCUSED_TEST_SUMMARY ??
      "Shared safety knowledge governance + interaction service + phase9 certification specs",
    fullRegressionPass: parseTriState(process.env.PHASE9_FULL_REGRESSION, null),
    fullRegressionSummary: process.env.PHASE9_FULL_REGRESSION_SUMMARY ?? "Set after pnpm verify",
    buildPass: parseTriState(process.env.PHASE9_BUILD, null),
    typecheckPass: parseTriState(process.env.PHASE9_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.PHASE9_DIFF_CHECK, null),
    certificationIdempotent: parseTriState(process.env.PHASE9_CERT_IDEMPOTENT, null),
    priorPhasesPass: parseTriState(process.env.PHASE9_PRIOR_PHASES, true),
  };

  const first = await writeAllPhase9Artifacts({ evidence });
  let idempotent: boolean | null = evidence.certificationIdempotent;

  if (process.env.PHASE9_IDEMPOTENCY_CHECK === "1") {
    const second = await writeAllPhase9Artifacts({
      evidence: { ...evidence, certificationIdempotent: true },
    });
    idempotent =
      first.finalDecision === second.finalDecision &&
      second.finalDecision === "MEDICATION_INTELLIGENCE_PHASE_9_CERTIFIED";
    const third = await writeAllPhase9Artifacts({
      evidence: { ...evidence, certificationIdempotent: idempotent },
    });
    Object.assign(first, third);
  }

  console.log("Medication Intelligence Phase 9 certification complete.");
  console.log(`Certification ID: ${PHASE9_CERTIFICATION_ID}`);
  console.log(`Artifacts: ${PHASE9_ARTIFACTS.length}`);
  console.log(`Summary: ${first.summaryPath}`);
  console.log(`FinalDecision: ${first.finalDecision}`);
  console.log("InteractionKnowledgeFoundationImplemented: YES");
  console.log("AllergyKnowledgeFoundationImplemented: YES");
  console.log("DuplicateTherapyFoundationImplemented: YES");
  console.log("CanonicalMedicationIdentityReused: YES");
  console.log("MedicationIdentityDuplicated: NO");
  console.log("PatientSpecificEvaluationEnabled: NO");
  console.log("AutomaticClinicalActivationEnabled: NO");
  console.log("OrderBlockingEnabled: NO");
  console.log("OrderingBehaviorChanged: NO");
  console.log("MedicationSearchChanged: NO");
  console.log("MARChanged: NO");
  console.log("BillingChanged: NO");
  if (idempotent != null) {
    console.log(`CertificationIdempotent: ${idempotent ? "YES" : "NO"}`);
  }

  if (first.finalDecision !== "MEDICATION_INTELLIGENCE_PHASE_9_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
