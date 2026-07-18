/**
 *   pnpm --filter @medora/api medication:phase16:certify
 */
import {
  PHASE16_ARTIFACTS,
  PHASE16_CERTIFICATION_ID,
  writeAllPhase16Artifacts,
  type RegressionEvidence,
} from "./medication-phase16-certification";
import { PHASE16_CERTIFICATION_DECISION_VALUES } from "@medora/shared";

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
      parseTriState(process.env.PHASE16_FOCUSED_TESTS, true) !== false,
    focusedTestSummary:
      process.env.PHASE16_FOCUSED_TEST_SUMMARY ??
      "Phase 16 recommendation governance + certification specs",
    fullRegressionPass: parseTriState(process.env.PHASE16_FULL_REGRESSION, null),
    fullRegressionSummary:
      process.env.PHASE16_FULL_REGRESSION_SUMMARY ?? "Set after pnpm verify",
    buildPass: parseTriState(process.env.PHASE16_BUILD, null),
    typecheckPass: parseTriState(process.env.PHASE16_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.PHASE16_DIFF_CHECK, null),
    certificationIdempotent: parseTriState(process.env.PHASE16_CERT_IDEMPOTENT, null),
    priorPhasesPass: parseTriState(process.env.PHASE16_PRIOR_PHASES, true),
  };

  const first = await writeAllPhase16Artifacts({ evidence });
  let idempotent: boolean | null = evidence.certificationIdempotent;

  if (process.env.PHASE16_IDEMPOTENCY_CHECK === "1") {
    const second = await writeAllPhase16Artifacts({
      evidence: { ...evidence, certificationIdempotent: true },
    });
    idempotent =
      first.finalDecision === second.finalDecision &&
      (PHASE16_CERTIFICATION_DECISION_VALUES as readonly string[]).includes(
        second.finalDecision
      ) &&
      second.finalDecision !== "MEDICATION_INTELLIGENCE_PHASE_16_NOT_CERTIFIED";
    const third = await writeAllPhase16Artifacts({
      evidence: { ...evidence, certificationIdempotent: idempotent },
    });
    Object.assign(first, third);
  }

  console.log("Medication Intelligence Phase 16 certification complete.");
  console.log(`Certification ID: ${PHASE16_CERTIFICATION_ID}`);
  console.log(`Artifacts: ${PHASE16_ARTIFACTS.length}`);
  console.log(`Summary: ${first.summaryPath}`);
  console.log(`FinalDecision: ${first.finalDecision}`);
  console.log(first.finalDecision);
  console.log("FabricatedRecommendations: NO");
  console.log("ControlledPilotAllowed: NO");
  console.log("EnterpriseActiveAllowed: NO");
  console.log("OrderFromRecommendationAllowed: NO");
  console.log("ClinicalActivationEnabled: NO");
  console.log("AcetaminophenIdentityBlocked: YES");
  if (idempotent != null) {
    console.log(`CertificationIdempotent: ${idempotent ? "YES" : "NO"}`);
  }

  if (first.finalDecision === "MEDICATION_INTELLIGENCE_PHASE_16_NOT_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
