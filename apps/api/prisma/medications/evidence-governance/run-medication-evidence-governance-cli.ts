/**
 * Phase 14A evidence governance CLI.
 */
import { PrismaClient } from "@prisma/client";
import {
  completeWave1KnowledgeProvenance,
  createOrGetEvidenceBatch,
  getEvidenceGovernanceDashboard,
  recalculateCompletenessScores,
  registerEvidenceSources,
  runPhase14APipeline,
} from "../../../src/medications/evidence-governance/medication-evidence-governance.service";

async function resolveActor(prisma: PrismaClient) {
  const envId = process.env.PHASE14A_ACTOR_USER_ID?.trim();
  if (envId) {
    const found = await prisma.user.findUnique({
      where: { id: envId },
      select: { id: true },
    });
    if (!found) throw new Error(`PHASE14A_ACTOR_USER_ID not found: ${envId}`);
    return {
      userId: found.id,
      roles: ["MEDICATION_ADMIN", "MEDORA_SUPER_ADMIN"],
    };
  }
  const user = await prisma.user.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!user) {
    throw new Error(
      "No active User for Phase 14A CLI actor. Set PHASE14A_ACTOR_USER_ID."
    );
  }
  return {
    userId: user.id,
    roles: ["MEDICATION_ADMIN", "MEDORA_SUPER_ADMIN"],
  };
}

async function main() {
  const mode = (process.argv[2] ?? "audit").toLowerCase();
  const prisma = new PrismaClient();
  try {
    const actor = await resolveActor(prisma);

    if (mode === "register-sources") {
      console.log(JSON.stringify(await registerEvidenceSources(prisma, actor), null, 2));
      return;
    }
    if (mode === "complete-provenance" || mode === "complete") {
      console.log(
        JSON.stringify(await completeWave1KnowledgeProvenance(prisma, actor), null, 2)
      );
      return;
    }
    if (mode === "completeness") {
      console.log(
        JSON.stringify(await recalculateCompletenessScores(prisma, actor), null, 2)
      );
      return;
    }
    if (mode === "pipeline") {
      console.log(JSON.stringify(await runPhase14APipeline(prisma, actor), null, 2));
      return;
    }
    if (mode === "batch") {
      console.log(JSON.stringify(await createOrGetEvidenceBatch(prisma, actor), null, 2));
      return;
    }

    // audit — ensure pipeline then print metrics
    await runPhase14APipeline(prisma, actor);
    const dash = await getEvidenceGovernanceDashboard(prisma);
    console.log(`Mode: ${mode}`);
    console.log(`BatchKey: ${dash.BatchKey}`);
    console.log(`BatchStatus: ${dash.BatchStatus}`);
    console.log(`Wave1Families: ${(dash.Wave1Families as string[]).join(", ")}`);
    console.log(`TargetFamilyCount: ${dash.TargetFamilyCount}`);
    console.log(`FamiliesWithProvenance: ${dash.FamiliesWithProvenance}`);
    console.log(`EvidenceLinksCreated: ${dash.EvidenceLinksCreated}`);
    console.log(`PlaceholdersRetired: ${dash.PlaceholdersRetired}`);
    console.log(`SourceRegistrations: ${dash.SourceRegistrations}`);
    console.log(`AverageOverallCompleteness: ${dash.AverageOverallCompleteness}`);
    console.log(`AverageProvenanceScore: ${dash.AverageProvenanceScore}`);
    console.log(`KnowledgeWithoutProvenance: ${dash.KnowledgeWithoutProvenance}`);
    console.log(`ClinicalApprovedForShadow: ${dash.ClinicalApprovedForShadow}`);
    console.log(`ProviderFacingAlerts: ${dash.ProviderFacingAlerts}`);
    console.log(`OrderBlocks: ${dash.OrderBlocks}`);
    console.log(`ClinicalActivations: ${dash.ClinicalActivations}`);
    console.log(`OrderingChanged: ${dash.OrderingChanged}`);
    console.log(`MARChanged: ${dash.MARChanged}`);
    console.log(`BillingChanged: ${dash.BillingChanged}`);
    console.log(`KnowledgeControlsPatientCare: ${dash.KnowledgeControlsPatientCare}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
