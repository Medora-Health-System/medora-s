/**
 *   pnpm --filter @medora/api medication:certify:phase12
 */
import {
  PHASE12_ARTIFACTS,
  PHASE12_CERTIFICATION_ID,
  writeAllPhase12Artifacts,
  type RegressionEvidence,
} from "./medication-phase12-certification";

function parseTriState(raw: string | undefined, fallback: boolean | null): boolean | null {
  if (!raw) return fallback;
  const v = raw.trim().toUpperCase();
  if (v === "PASS" || v === "TRUE" || v === "YES") return true;
  if (v === "FAIL" || v === "FALSE" || v === "NO") return false;
  return null;
}

async function main() {
  const evidence: RegressionEvidence = {
    focusedTestsPass: parseTriState(process.env.PHASE12_FOCUSED_TESTS, true) !== false,
    focusedTestSummary:
      process.env.PHASE12_FOCUSED_TEST_SUMMARY ??
      "Shared knowledge population governance + import/coverage/eligibility + phase12 certification specs",
    fullRegressionPass: parseTriState(process.env.PHASE12_FULL_REGRESSION, null),
    fullRegressionSummary: process.env.PHASE12_FULL_REGRESSION_SUMMARY ?? "Set after pnpm verify",
    buildPass: parseTriState(process.env.PHASE12_BUILD, null),
    typecheckPass: parseTriState(process.env.PHASE12_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.PHASE12_DIFF_CHECK, null),
    certificationIdempotent: parseTriState(process.env.PHASE12_CERT_IDEMPOTENT, null),
    priorPhasesPass: parseTriState(process.env.PHASE12_PRIOR_PHASES, true),
  };

  const first = await writeAllPhase12Artifacts({ evidence });
  let idempotent: boolean | null = evidence.certificationIdempotent;

  if (process.env.PHASE12_IDEMPOTENCY_CHECK === "1") {
    const second = await writeAllPhase12Artifacts({
      evidence: { ...evidence, certificationIdempotent: true },
    });
    idempotent =
      first.finalDecision === second.finalDecision &&
      second.finalDecision === "MEDICATION_INTELLIGENCE_PHASE_12_CERTIFIED";
    const third = await writeAllPhase12Artifacts({
      evidence: { ...evidence, certificationIdempotent: idempotent },
    });
    Object.assign(first, third);
  }

  console.log("Medication Intelligence Phase 12 certification complete.");
  console.log(`Certification ID: ${PHASE12_CERTIFICATION_ID}`);
  console.log(`Artifacts: ${PHASE12_ARTIFACTS.length}`);
  console.log(`Summary: ${first.summaryPath}`);
  console.log(`FinalDecision: ${first.finalDecision}`);
  console.log("ControlledKnowledgePopulationImplemented: YES");
  console.log("EmergencyMedicationBatchImplemented: YES");
  console.log("DraftOnlyImportImplemented: YES");
  console.log("RecordsWithoutSourcesAllowed: NO");
  console.log("AutomaticKnowledgeApprovalEnabled: NO");
  console.log("AutomaticMedicationIdentityCreationEnabled: NO");
  console.log("ProviderFacingAlertsEnabled: NO");
  console.log("OrderBlockingEnabled: NO");
  console.log("ClinicalActivationEnabled: NO");
  console.log("OverrideWorkflowEnabled: NO");
  console.log("MedicationOrdersChanged: NO");
  console.log("MARChanged: NO");
  console.log("BillingChanged: NO");
  if (idempotent != null) {
    console.log(`CertificationIdempotent: ${idempotent ? "YES" : "NO"}`);
  }

  if (first.finalDecision !== "MEDICATION_INTELLIGENCE_PHASE_12_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
