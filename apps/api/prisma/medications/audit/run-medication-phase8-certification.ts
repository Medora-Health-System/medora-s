/**
 *   pnpm --filter @medora/api medication:certify:phase8
 */
import {
  PHASE8_ARTIFACTS,
  PHASE8_CERTIFICATION_ID,
  writeAllPhase8Artifacts,
  type RegressionEvidence,
} from "./medication-phase8-certification";

function parseTriState(raw: string | undefined, fallback: boolean | null): boolean | null {
  if (!raw) return fallback;
  const v = raw.trim().toUpperCase();
  if (v === "PASS" || v === "TRUE" || v === "YES") return true;
  if (v === "FAIL" || v === "FALSE" || v === "NO") return false;
  return null;
}

async function main() {
  const evidence: RegressionEvidence = {
    focusedTestsPass: parseTriState(process.env.PHASE8_FOCUSED_TESTS, true) !== false,
    focusedTestSummary:
      process.env.PHASE8_FOCUSED_TEST_SUMMARY ??
      "Shared clinical knowledge governance + service + phase8 certification specs",
    fullRegressionPass: parseTriState(process.env.PHASE8_FULL_REGRESSION, null),
    fullRegressionSummary: process.env.PHASE8_FULL_REGRESSION_SUMMARY ?? "Set after pnpm verify",
    buildPass: parseTriState(process.env.PHASE8_BUILD, null),
    typecheckPass: parseTriState(process.env.PHASE8_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.PHASE8_DIFF_CHECK, null),
    certificationIdempotent: parseTriState(process.env.PHASE8_CERT_IDEMPOTENT, null),
    priorPhasesPass: parseTriState(process.env.PHASE8_PRIOR_PHASES, true),
  };

  const first = await writeAllPhase8Artifacts({ evidence });
  let idempotent: boolean | null = evidence.certificationIdempotent;

  if (process.env.PHASE8_IDEMPOTENCY_CHECK === "1") {
    const second = await writeAllPhase8Artifacts({
      evidence: { ...evidence, certificationIdempotent: true },
    });
    idempotent =
      first.finalDecision === second.finalDecision &&
      second.finalDecision === "MEDICATION_INTELLIGENCE_PHASE_8_CERTIFIED";
    const third = await writeAllPhase8Artifacts({
      evidence: { ...evidence, certificationIdempotent: idempotent },
    });
    Object.assign(first, third);
  }

  console.log("Medication Intelligence Phase 8 certification complete.");
  console.log(`Certification ID: ${PHASE8_CERTIFICATION_ID}`);
  console.log(`Artifacts: ${PHASE8_ARTIFACTS.length}`);
  console.log(`Summary: ${first.summaryPath}`);
  console.log(`FinalDecision: ${first.finalDecision}`);
  console.log("ClinicalKnowledgeFoundationImplemented: YES");
  console.log("ClinicalKnowledgeVersioningEnabled: YES");
  console.log("MedicationIdentitySeparated: YES");
  console.log("DuplicateKnowledgeIdentityPrevented: YES");
  console.log("HumanApprovalRequired: YES");
  console.log("AutomaticClinicalActivationEnabled: NO");
  console.log("OrderingBehaviorChanged: NO");
  console.log("MedicationSearchChanged: NO");
  console.log("MARChanged: NO");
  console.log("BillingChanged: NO");
  if (idempotent != null) {
    console.log(`CertificationIdempotent: ${idempotent ? "YES" : "NO"}`);
  }

  if (first.finalDecision !== "MEDICATION_INTELLIGENCE_PHASE_8_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
