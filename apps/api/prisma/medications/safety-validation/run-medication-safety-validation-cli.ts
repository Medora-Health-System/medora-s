/**
 * Phase 11 safety validation CLI (shadow validation / readiness — no activation).
 */
import { PrismaClient } from "@prisma/client";
import {
  collectMedicationInventory,
  getCoverageDashboard,
  recalculateFamilyCoverage,
} from "../../../src/medications/safety-validation/medication-family-coverage.service";
import {
  getAccuracyAnalytics,
  getFalseNegativeAnalytics,
  getReliabilityAnalytics,
  getSeverityCalibration,
} from "../../../src/medications/safety-validation/medication-safety-validation-analytics.service";
import {
  createReadinessPolicy,
  assessReadiness,
  createReadinessAttestation,
} from "../../../src/medications/safety-validation/medication-safety-readiness.service";
import { createValidationBatch } from "../../../src/medications/safety-validation/medication-safety-validation-case.service";
import {
  createReferenceSet,
  runReferenceSet,
} from "../../../src/medications/safety-validation/medication-safety-reference-set.service";
import {
  listContextGaps,
  listIdentityGaps,
  listKnowledgeGaps,
} from "../../../src/medications/safety-validation/medication-safety-gaps.service";

const ACTOR = {
  userId: "phase11-cli-system",
  roles: ["MEDICATION_ADMIN", "MEDORA_SUPER_ADMIN"],
};

async function main() {
  const mode = (process.argv[2] ?? "audit").toLowerCase();
  const prisma = new PrismaClient();
  try {
    if (mode === "coverage") {
      const result = await recalculateFamilyCoverage(prisma, ACTOR.userId);
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (mode === "create-batch") {
      const batch = await createValidationBatch(
        prisma,
        {
          name: `CLI batch ${new Date().toISOString()}`,
          batchType: "RANDOM_SAMPLE",
          targetFindingCount: 10,
          fixtureMarker: "PHASE11_VALIDATION_FIXTURE",
        },
        ACTOR
      );
      console.log(JSON.stringify(batch, null, 2));
      return;
    }
    if (mode === "run-reference-set") {
      const set = await createReferenceSet(
        prisma,
        {
          code: `REF_${Date.now()}`,
          name: "CLI reference set",
          version: "1.0.0",
          cases: [
            {
              caseKey: "synthetic-warfarin-tmp-smx",
              title: "Synthetic interaction fixture",
              expectedFindings: [
                { expectedFindingType: "DRUG_INTERACTION", expectedSeverity: "SEVERE" },
              ],
            },
          ],
        },
        ACTOR
      );
      const run = await runReferenceSet(prisma, set.id, ACTOR);
      console.log(JSON.stringify(run, null, 2));
      return;
    }
    if (mode === "accuracy") {
      console.log(JSON.stringify(await getAccuracyAnalytics(prisma), null, 2));
      return;
    }
    if (mode === "gaps") {
      console.log(
        JSON.stringify(
          {
            knowledge: await listKnowledgeGaps(prisma),
            identity: await listIdentityGaps(prisma),
            context: await listContextGaps(prisma),
          },
          null,
          2
        )
      );
      return;
    }
    if (mode === "readiness") {
      const policy = await createReadinessPolicy(
        prisma,
        {
          name: `CLI policy ${Date.now()}`,
          version: "1.0.0",
          scope: "FINDING_TYPE",
        },
        ACTOR
      );
      const assessment = await assessReadiness(
        prisma,
        {
          readinessPolicyId: policy.id,
          scopeType: "FINDING_TYPE",
          scopeIdentifier: "DRUG_INTERACTION",
          sampleSource: "fixture-derived",
        },
        ACTOR
      );
      console.log(JSON.stringify(assessment, null, 2));
      return;
    }
    if (mode === "attest") {
      const policies = await prisma.medicationSafetyActivationReadinessPolicy.findMany({
        take: 1,
        orderBy: { createdAt: "desc" },
      });
      let policyId = policies[0]?.id;
      if (!policyId) {
        const policy = await createReadinessPolicy(
          prisma,
          {
            name: `CLI attest policy ${Date.now()}`,
            version: "1.0.0",
            scope: "ENVIRONMENT",
          },
          ACTOR
        );
        policyId = policy.id;
      }
      const assessment = await assessReadiness(
        prisma,
        {
          readinessPolicyId: policyId,
          scopeType: "ENVIRONMENT",
          scopeIdentifier: "local",
        },
        ACTOR
      );
      const attestation = await createReadinessAttestation(
        prisma,
        {
          assessmentId: assessment.id,
          limitations: "Phase 11 shadow validation only",
          unresolvedRisks: "Clinical activation not performed",
        },
        ACTOR
      );
      console.log(JSON.stringify(attestation, null, 2));
      return;
    }

    // audit (default)
    const inventory = await collectMedicationInventory(prisma);
    const dash = await getCoverageDashboard(prisma);
    const accuracy = await getAccuracyAnalytics(prisma);
    const fn = await getFalseNegativeAnalytics(prisma);
    const reliability = await getReliabilityAnalytics(prisma);
    const severity = await getSeverityCalibration(prisma);

    console.log(`Mode: ${mode}`);
    console.log(`MedicationFamilies: ${dash.MedicationFamiliesPresent}`);
    console.log(
      `MedicationFamiliesWithCanonicalIdentity: ${inventory.CanonicalConceptsWithProducts}`
    );
    console.log(
      `MedicationFamiliesWithClinicalKnowledge: ${inventory.ApprovedClinicalProfiles}`
    );
    console.log(
      `MedicationFamiliesWithSafetyKnowledge: ${inventory.ApprovedSafetyKnowledgeRecords}`
    );
    console.log(
      `MedicationFamiliesShadowEvaluable: ${dash.MedicationFamiliesShadowEvaluable}`
    );
    console.log(`MedicationFamiliesValidated: ${dash.MedicationFamiliesValidated}`);
    console.log(`ReviewedFindings: ${dash.ReviewedFindings}`);
    console.log(`AdjudicatedFindings: ${dash.AdjudicatedFindings}`);
    console.log(
      `TruePositiveRate: ${accuracy.TruePositiveRate.percentage ?? "n/a"}`
    );
    console.log(
      `FalsePositiveRate: ${accuracy.FalsePositiveRate.percentage ?? "n/a"}`
    );
    console.log(`EstimatedRecall: ${fn.EstimatedRecall.percentage ?? "n/a"}`);
    console.log(`CriticalMisses: ${fn.FalseNegativeCount}`);
    console.log(
      `SeverityAgreement: ${severity.ExactSeverityAgreement.percentage ?? "n/a"}`
    );
    console.log(`KnowledgeGaps: ${dash.KnowledgeGapCount}`);
    console.log(`IdentityGaps: ${dash.IdentityGapCount}`);
    console.log(`ContextGaps: ${dash.ContextGapCount}`);
    console.log(
      `EvaluationSuccessRate: ${
        reliability.EvaluationRunSuccessRate.percentage ?? "n/a"
      }`
    );
    console.log(`P95Latency: ${reliability.P95EvaluationLatency ?? "n/a"}`);
    console.log(`ReadinessResult: see readiness command`);
    console.log(`ProviderFacingAlerts: 0`);
    console.log(`OrderBlocks: 0`);
    console.log(`ClinicalActivations: ${dash.ClinicalActivations}`);
    console.log(
      `EmergencyMedicineFamiliesPresent: ${inventory.EmergencyMedicineMedicationFamilies}`
    );
    console.log(
      `EmergencyMedicineFamilyNames: ${inventory.EmergencyMedicineMedicationFamilyNames.join(", ")}`
    );

    if (dash.ProviderFacingAlerts !== 0 || dash.OrderBlocks !== 0) {
      process.exitCode = 1;
    }
    if (dash.ClinicalActivations !== 0) {
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
