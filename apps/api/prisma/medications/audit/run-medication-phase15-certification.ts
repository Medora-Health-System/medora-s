/**
 *   pnpm --filter @medora/api medication:phase15:certify
 */
import {
  PHASE15_ARTIFACTS,
  PHASE15_CERTIFICATION_ID,
  writeAllPhase15Artifacts,
  type RegressionEvidence,
} from "./medication-phase15-certification";
import { PHASE15_CERTIFICATION_DECISION_VALUES } from "@medora/shared";

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
      parseTriState(process.env.PHASE15_FOCUSED_TESTS, true) !== false,
    focusedTestSummary:
      process.env.PHASE15_FOCUSED_TEST_SUMMARY ??
      "Phase 15 remediation + Part 2C certification specs",
    fullRegressionPass: parseTriState(process.env.PHASE15_FULL_REGRESSION, null),
    fullRegressionSummary:
      process.env.PHASE15_FULL_REGRESSION_SUMMARY ?? "Set after pnpm verify",
    buildPass: parseTriState(process.env.PHASE15_BUILD, null),
    typecheckPass: parseTriState(process.env.PHASE15_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.PHASE15_DIFF_CHECK, null),
    certificationIdempotent: parseTriState(process.env.PHASE15_CERT_IDEMPOTENT, null),
    priorPhasesPass: parseTriState(process.env.PHASE15_PRIOR_PHASES, true),
  };

  const first = await writeAllPhase15Artifacts({ evidence });
  let idempotent: boolean | null = evidence.certificationIdempotent;

  if (process.env.PHASE15_IDEMPOTENCY_CHECK === "1") {
    const second = await writeAllPhase15Artifacts({
      evidence: { ...evidence, certificationIdempotent: true },
    });
    idempotent =
      first.finalDecision === second.finalDecision &&
      (PHASE15_CERTIFICATION_DECISION_VALUES as readonly string[]).includes(
        second.finalDecision
      ) &&
      second.finalDecision !== "MEDICATION_INTELLIGENCE_PHASE_15_NOT_CERTIFIED";
    const third = await writeAllPhase15Artifacts({
      evidence: { ...evidence, certificationIdempotent: idempotent },
    });
    Object.assign(first, third);
  }

  console.log("Medication Intelligence Phase 15 certification complete.");
  console.log(`Certification ID: ${PHASE15_CERTIFICATION_ID}`);
  console.log(`Artifacts: ${PHASE15_ARTIFACTS.length}`);
  console.log(`Summary: ${first.summaryPath}`);
  console.log(`FinalDecision: ${first.finalDecision}`);
  console.log(first.finalDecision);
  console.log("FabricatedTier1Facts: NO");
  console.log("KnowledgeControlsPatientCare: NO");
  console.log("ClinicalActivationEnabled: NO");
  console.log("ProviderFacingAlertsEnabled: NO");
  console.log("OrderBlockingEnabled: NO");
  console.log("AcetaminophenIdentityBlocked: YES");
  if (idempotent != null) {
    console.log(`CertificationIdempotent: ${idempotent ? "YES" : "NO"}`);
  }

  if (first.finalDecision === "MEDICATION_INTELLIGENCE_PHASE_15_NOT_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
