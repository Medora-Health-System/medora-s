import { runMedicationValidationReleaseRemediation, type RemediationMode } from "./medication-validation-release-remediation";

async function main() {
  const mode = (process.argv[2] || "DRY_RUN").toUpperCase() as RemediationMode;
  if (!["AUDIT", "DRY_RUN", "APPLY", "VERIFY"].includes(mode)) {
    console.error("Usage: ts-node ...run-medication-validation-release-remediation-cli.ts [AUDIT|DRY_RUN|APPLY|VERIFY]");
    process.exit(2);
  }
  const report = await runMedicationValidationReleaseRemediation(mode);
  console.log(JSON.stringify(report, null, 2));
  if (report.idempotency && (report.idempotency as { pass?: boolean }).pass === false) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
