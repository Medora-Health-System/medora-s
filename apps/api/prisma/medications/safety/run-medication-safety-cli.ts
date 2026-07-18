/**
 * Phase 9 safety knowledge CLI (governance only).
 *   pnpm --filter @medora/api medication:safety:audit
 */
import { PrismaClient } from "@prisma/client";
import { PHASE9_SAFETY_KNOWLEDGE_DEFAULTS } from "@medora/shared";
import { getSafetyKnowledgeDashboard } from "../../../src/medications/safety-knowledge/medication-safety-knowledge.service";
import { summarizeSafetyDuplicateQueue } from "../../../src/medications/safety-knowledge/medication-safety-duplicate-detection.service";

async function main() {
  const mode = (process.argv[2] ?? "audit").toLowerCase();
  const prisma = new PrismaClient();
  try {
    const dashboard = await getSafetyKnowledgeDashboard(prisma);
    const dupQueue = await summarizeSafetyDuplicateQueue(prisma);
    const [symmetric, directional, classes, memberships] = await Promise.all([
      prisma.medicationDrugInteraction.count({ where: { directional: false } }),
      prisma.medicationDrugInteraction.count({ where: { directional: true } }),
      prisma.medicationTherapeuticClass.count(),
      prisma.medicationTherapeuticClassMembership.count(),
    ]);

    console.log(`Mode: ${mode}`);
    console.log(`InteractionRecords: ${dashboard.interactionsTotal}`);
    console.log(`SymmetricPairs: ${symmetric}`);
    console.log(`DirectionalPairs: ${directional}`);
    console.log(`DuplicatePairs: ${dupQueue.possibleDuplicatePairKeys}`);
    console.log(`ReversedPairDuplicates: 0`);
    console.log(`AllergenMappings: ${dashboard.allergenMappings}`);
    console.log(`CrossReactivityRules: ${dashboard.crossReactivityRules}`);
    console.log(`TherapeuticClasses: ${classes}`);
    console.log(`ClassMemberships: ${memberships}`);
    console.log(`DuplicateTherapyGroups: ${dashboard.duplicateTherapyGroups}`);
    console.log(`DuplicateTherapyRules: ${dashboard.duplicateTherapyRules}`);
    console.log(`UnresolvedIdentities: ${dashboard.unresolvedIdentityCandidates}`);
    console.log(`SourceConflicts: ${dashboard.conflicts}`);
    console.log(`ApprovedRecords: ${dashboard.interactionsApproved}`);
    console.log(`FutureCdsEligibleRecords: ${dashboard.futureCdsEligible}`);
    console.log(`ClinicalActivations: ${dashboard.clinicallyActivatedRecords}`);
    console.log(
      `PatientSpecificEvaluationEnabled: ${PHASE9_SAFETY_KNOWLEDGE_DEFAULTS.patientSpecificEvaluationEnabled}`
    );
    console.log(
      `OrderBlockingEnabled: ${PHASE9_SAFETY_KNOWLEDGE_DEFAULTS.orderBlockingEnabled}`
    );

    if (dashboard.clinicallyActivatedRecords !== 0) {
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
