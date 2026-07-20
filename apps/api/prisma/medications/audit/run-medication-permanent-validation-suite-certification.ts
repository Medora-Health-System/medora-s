/**
 * pnpm --filter @medora/api medication:validate:certify
 */
import { writePermanentMedicationValidationSuiteCertification } from "./medication-permanent-validation-suite-certification";
import { PERMANENT_MEDICATION_VALIDATION_SUITE_CERTIFICATION_ID } from "@medora/shared";

function parsePass(raw: string | undefined, fallback: boolean): boolean {
  if (!raw) return fallback;
  const v = raw.trim().toUpperCase();
  if (v === "FAIL" || v === "FALSE" || v === "NO") return false;
  return true;
}

async function main() {
  const result = await writePermanentMedicationValidationSuiteCertification({
    negativeRegressionTestPass: parsePass(process.env.PERMANENT_NEG_REGRESSION, true),
    criticalSuitePass:
      process.env.PERMANENT_CRITICAL_SUITE === undefined
        ? null
        : parsePass(process.env.PERMANENT_CRITICAL_SUITE, true),
    focusedTestsPass: parsePass(process.env.PERMANENT_FOCUSED_TESTS, true),
  });
  console.log("Permanent Medication Validation Suite certification complete.");
  console.log(`Certification ID: ${PERMANENT_MEDICATION_VALIDATION_SUITE_CERTIFICATION_ID}`);
  console.log(`Summary: ${result.summaryPath}`);
  console.log(`FinalDecision: ${result.finalDecision}`);
  if (result.finalDecision === "PERMANENT_MEDICATION_VALIDATION_SUITE_NOT_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
