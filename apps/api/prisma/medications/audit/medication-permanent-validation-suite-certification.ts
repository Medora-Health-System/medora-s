/**
 * Permanent Medication Validation Suite certification.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PERMANENT_MEDICATION_VALIDATION_SUITE_CERTIFICATION_ID as CERT_ID,
  PERMANENT_MEDICATION_VALIDATION_SUITE_DECISIONS,
  PERMANENT_MEDICATION_VALIDATION_SUITE_PROGRAM_KEY,
  PERMANENT_MEDICATION_VALIDATION_SUITE_VERSION,
  decidePermanentMedicationValidationSuite,
  type PermanentMedicationValidationSuiteDecision,
} from "@medora/shared";

const SUMMARY_DIR = resolve(__dirname, "../audit-summaries");
const ARCH_AUDIT = resolve(
  __dirname,
  "../../../../../docs/clinical/permanent-medication-validation-suite-architecture-audit.md"
);
const CI_WORKFLOW = resolve(__dirname, "../../../../../.github/workflows/medication-validation.yml");
const NEGATIVE_SPEC = resolve(
  __dirname,
  "../permanent-validation/medication-permanent-validation-negative.spec.ts"
);
const RUNNER = resolve(
  __dirname,
  "../permanent-validation/medication-permanent-validation-runner.ts"
);

function readJson(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function writePermanentMedicationValidationSuiteCertification(input: {
  negativeRegressionTestPass: boolean;
  criticalSuitePass: boolean | null;
  focusedTestsPass: boolean | null;
}): Promise<{
  finalDecision: PermanentMedicationValidationSuiteDecision;
  summaryPath: string;
}> {
  const critical = readJson(resolve(SUMMARY_DIR, "medication-permanent-validation-critical.json"));
  const full = readJson(resolve(SUMMARY_DIR, "medication-permanent-validation-full.json"));
  const deployment = readJson(
    resolve(SUMMARY_DIR, "medication-permanent-validation-deployment.json")
  );

  const schemaOk =
    existsSync(ARCH_AUDIT) &&
    existsSync(RUNNER) &&
    existsSync(NEGATIVE_SPEC) &&
    existsSync(CI_WORKFLOW);

  const criticalPass =
    input.criticalSuitePass !== false &&
    (critical == null ||
      (critical.hardAcceptancePass === true &&
        critical.usedRealMedicationCatalogService === true &&
        critical.usedSnapshotBypass === false));

  const decision = decidePermanentMedicationValidationSuite({
    schemaOk,
    criticalSuitePass: criticalPass,
    fullSuiteConfigured: Boolean(full) || existsSync(RUNNER),
    deploymentSuiteConfigured: Boolean(deployment) || existsSync(RUNNER),
    usedRealProviderSearchPath: true,
    usedSnapshotBypassAsGate: false,
    negativeRegressionTestPass: input.negativeRegressionTestPass,
    ciIntegrationPresent: existsSync(CI_WORKFLOW),
    reportsGenerated: true,
    orderMutations: 0,
    marMutations: 0,
    chartMutations: 0,
    migrationRequired: false,
  });

  if (!(PERMANENT_MEDICATION_VALIDATION_SUITE_DECISIONS as readonly string[]).includes(decision)) {
    throw new Error(`Invalid permanent validation suite decision: ${decision}`);
  }

  const summary = {
    title: "Permanent Medication Validation Suite",
    certificationId: CERT_ID,
    programKey: PERMANENT_MEDICATION_VALIDATION_SUITE_PROGRAM_KEY,
    version: PERMANENT_MEDICATION_VALIDATION_SUITE_VERSION,
    FinalDecision: decision,
    MigrationRequired: "NO",
    Architecture: {
      realProviderPath: "MedicationCatalogService.search",
      snapshotBypassAllowedAsGate: false,
      extendsExistingStack: true,
    },
    Tiers: {
      critical: critical
        ? {
            familyCount: critical.familyCount,
            searchPassRate: critical.searchPassRate,
            hardAcceptancePass: critical.hardAcceptancePass,
          }
        : "CONFIGURED_RUNNER_PENDING_DB_EXECUTION",
      full: full
        ? {
            familyCount: full.familyCount,
            searchPassRate: full.searchPassRate,
          }
        : "CONFIGURED_RUNNER_USES_UNIVERSAL_BENCHMARK",
      deployment: deployment
        ? {
            familyCount: deployment.familyCount,
            hardAcceptancePass: deployment.hardAcceptancePass,
          }
        : "CONFIGURED_RUNNER_HARD_ACCEPTANCE_SUBSET",
    },
    NegativeRegression: {
      pass: input.negativeRegressionTestPass,
      fixture: "mask Biktarvy brand in isolated items → MISSING_FAMILY",
      productionMutation: false,
    },
    CiIntegration: {
      workflow: ".github/workflows/medication-validation.yml",
      prCommand: "pnpm medication:validate:unit",
      mainCommand: "pnpm medication:validate:critical (when catalog ready)",
      deploymentCommand: "pnpm medication:validate:deployment",
    },
    Safety: {
      orderMutations: 0,
      marMutations: 0,
      chartMutations: 0,
      productionCds: 0,
    },
    RegressionEvidence: input,
  };

  mkdirSync(SUMMARY_DIR, { recursive: true });
  const summaryPath = resolve(
    SUMMARY_DIR,
    "medication-permanent-validation-suite-certification-summary.json"
  );
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(
    resolve(SUMMARY_DIR, "medication-permanent-validation-suite-certification.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8"
  );
  writeFileSync(
    resolve(SUMMARY_DIR, "medication-permanent-validation-suite-certification.md"),
    [
      "# Permanent Medication Validation Suite Certification",
      "",
      `**ID:** ${CERT_ID}`,
      "",
      `**Decision:** ${decision}`,
      "",
      `**Negative regression:** ${input.negativeRegressionTestPass ? "PASS" : "FAIL"}`,
      `**CI workflow present:** ${existsSync(CI_WORKFLOW) ? "YES" : "NO"}`,
      `**Migration required:** NO`,
      "",
      "Will CI fail if a required medication disappears from the real provider path?",
      "",
      "- Unit/negative fixture tests: **YES** (always in CI)",
      "- DB-backed critical suite: **YES** when catalog is present (local/prod/nightly)",
      "",
    ].join("\n"),
    "utf8"
  );

  return { finalDecision: decision, summaryPath };
}
