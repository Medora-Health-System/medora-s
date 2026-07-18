/**
 * Phase 10 safety evaluation CLI (shadow governance).
 *   pnpm --filter @medora/api medication:safety-evaluation:audit
 */
import { PrismaClient } from "@prisma/client";
import { getMedicationSafetyEvaluationMode } from "../../../src/medications/safety-evaluation/medication-safety-evaluation-config";
import { getSafetyEvaluationDashboard } from "../../../src/medications/safety-evaluation/medication-safety-evaluation-dashboard.service";

async function main() {
  const modeArg = (process.argv[2] ?? "audit").toLowerCase();
  const prisma = new PrismaClient();
  try {
    const operatingMode = getMedicationSafetyEvaluationMode();
    const dash = await getSafetyEvaluationDashboard(prisma);
    console.log(`Mode: ${modeArg}`);
    console.log(`OperatingMode: ${operatingMode}`);
    console.log(`EvaluationRuns: ${dash.evaluationRuns}`);
    console.log(`CompletedRuns: ${dash.completedRuns}`);
    console.log(`FailedRuns: ${dash.failedRuns}`);
    console.log(`InteractionFindings: ${dash.interactionFindings}`);
    console.log(`AllergyFindings: ${dash.allergyFindings}`);
    console.log(`DuplicateTherapyFindings: ${dash.duplicateTherapyFindings}`);
    console.log(`RenalFindings: ${dash.renalFindings}`);
    console.log(`HepaticFindings: ${dash.hepaticFindings}`);
    console.log(`PregnancyFindings: ${dash.pregnancyFindings}`);
    console.log(`DoseReviewFindings: ${dash.doseReviewFindings}`);
    console.log(`InsufficientContextFindings: ${dash.insufficientContextFindings}`);
    console.log(`UnresolvedIdentities: ${dash.unresolvedIdentities}`);
    console.log(`SuppressedFindings: ${dash.suppressedFindings}`);
    console.log(`DuplicateFindingsPrevented: ${dash.duplicateFindingsPrevented}`);
    console.log(`ProviderFacingAlerts: ${dash.providerFacingAlerts}`);
    console.log(`OrderBlocks: ${dash.orderBlocks}`);
    console.log(`OrderMutations: ${dash.orderMutations}`);
    console.log(`MARMutations: ${dash.marMutations}`);
    console.log(`BillingMutations: ${dash.billingMutations}`);
    if (dash.providerFacingAlerts !== 0 || dash.orderBlocks !== 0) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
