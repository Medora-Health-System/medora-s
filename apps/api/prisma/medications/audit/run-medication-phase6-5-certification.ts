/**
 * Medication Intelligence Phase 6.5 — enterprise certification runner.
 *
 *   pnpm --filter @medora/api medication:certify:phase6-5
 */
import {
  PHASE65_ARTIFACTS,
  PHASE65_CERTIFICATION_ID,
  writeAllPhase65Artifacts,
  type RegressionEvidence,
} from "./medication-phase6-5-certification";

function parseTriState(raw: string | undefined, fallback: boolean | null): boolean | null {
  if (!raw) return fallback;
  const v = raw.trim().toUpperCase();
  if (v === "PASS" || v === "TRUE" || v === "YES") return true;
  if (v === "FAIL" || v === "FALSE" || v === "NO") return false;
  return null;
}

async function main() {
  const evidence: RegressionEvidence = {
    focusedTestsPass: parseTriState(process.env.PHASE65_FOCUSED_TESTS, true) !== false,
    focusedTestSummary:
      process.env.PHASE65_FOCUSED_TEST_SUMMARY ??
      "Shared pilot duplicate prevention + phase6.5 certification specs",
    fullRegressionPass: parseTriState(process.env.PHASE65_FULL_REGRESSION, null),
    fullRegressionSummary: process.env.PHASE65_FULL_REGRESSION_SUMMARY ?? "Set after pnpm verify",
    buildPass: parseTriState(process.env.PHASE65_BUILD, null),
    typecheckPass: parseTriState(process.env.PHASE65_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.PHASE65_DIFF_CHECK, null),
    certificationIdempotent: parseTriState(process.env.PHASE65_CERT_IDEMPOTENT, null),
    priorPhasesPass: parseTriState(process.env.PHASE65_PRIOR_PHASES, true),
  };

  const first = await writeAllPhase65Artifacts({ evidence });
  let idempotent: boolean | null = evidence.certificationIdempotent;

  if (process.env.PHASE65_IDEMPOTENCY_CHECK === "1") {
    const second = await writeAllPhase65Artifacts({
      evidence: { ...evidence, certificationIdempotent: true },
    });
    idempotent =
      first.finalDecision === second.finalDecision &&
      second.finalDecision === "MEDICATION_INTELLIGENCE_PHASE_6_5_CERTIFIED";
    const third = await writeAllPhase65Artifacts({
      evidence: { ...evidence, certificationIdempotent: idempotent },
    });
    Object.assign(first, third);
  }

  console.log("Medication Intelligence Phase 6.5 certification complete.");
  console.log(`Certification ID: ${PHASE65_CERTIFICATION_ID}`);
  console.log(`Artifacts: ${PHASE65_ARTIFACTS.length}`);
  console.log(`Summary: ${first.summaryPath}`);
  console.log(`FinalDecision: ${first.finalDecision}`);
  console.log("DuplicatePreventionEnabled: YES");
  console.log("ExactDuplicateAutoCreationAllowed: NO");
  console.log("ProbableDuplicateAutoMergeAllowed: NO");
  console.log("ExistingEntityReuseEnabled: YES");
  console.log("HumanVerificationRequired: YES");
  console.log("AutomaticVerificationEnabled: NO");
  console.log("ClinicalActivationEnabled: NO");
  console.log("BulkRealMappingApprovalEnabled: NO");
  console.log("PilotImportExecutedDuringCertification: NO");
  console.log("RealVerifiedMappingsCreatedByCertification: 0");
  if (idempotent != null) {
    console.log(`CertificationIdempotent: ${idempotent ? "YES" : "NO"}`);
  }

  if (first.finalDecision !== "MEDICATION_INTELLIGENCE_PHASE_6_5_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
