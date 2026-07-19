/**
 * pnpm --filter @medora/api medication:runtime:certify
 */
import { writeRuntimeProviderAvailabilityCertification } from "./medication-runtime-provider-availability-certification";
import { MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_CERTIFICATION_ID } from "@medora/shared";

async function main() {
  const result = await writeRuntimeProviderAvailabilityCertification({
    hardAcceptancePass: process.env.RUNTIME_HARD_ACCEPTANCE !== "FAIL",
    databaseApplyCompleted: process.env.RUNTIME_DB_APPLY !== "FAIL",
    focusedTestsPass: process.env.RUNTIME_FOCUSED_TESTS === "FAIL" ? false : true,
  });
  console.log("Runtime provider availability certification complete.");
  console.log(`Certification ID: ${MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_CERTIFICATION_ID}`);
  console.log(`Summary: ${result.summaryPath}`);
  console.log(`FinalDecision: ${result.finalDecision}`);
  if (result.finalDecision === "MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_NOT_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
