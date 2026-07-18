/**
 * Phase 12 knowledge population CLI.
 */
import { PrismaClient } from "@prisma/client";
import {
  createOrGetEmKnowledgeBatch,
  dryRunKnowledgePopulation,
  executeDraftKnowledgePopulation,
  getKnowledgePopulationDashboard,
  listConflicts,
  previewKnowledgePopulation,
  recalculateShadowEligibility,
  resolveBatchIdentities,
  validatePhase12Manifest,
} from "../../../src/medications/knowledge-population/medication-knowledge-population.service";
import { recalculateFamilyCoverage } from "../../../src/medications/safety-validation/medication-family-coverage.service";

async function resolveActor(prisma: PrismaClient) {
  const envId = process.env.PHASE12_ACTOR_USER_ID?.trim();
  if (envId) {
    const found = await prisma.user.findUnique({ where: { id: envId }, select: { id: true } });
    if (!found) throw new Error(`PHASE12_ACTOR_USER_ID not found: ${envId}`);
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
      "No active User row for Phase 12 CLI actor (required for audit FK). Set PHASE12_ACTOR_USER_ID."
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
    if (mode === "manifest") {
      console.log(JSON.stringify(validatePhase12Manifest(), null, 2));
      return;
    }

    const ACTOR = await resolveActor(prisma);
    const batch = await createOrGetEmKnowledgeBatch(prisma, ACTOR);

    if (mode === "resolve") {
      console.log(JSON.stringify(await resolveBatchIdentities(prisma, batch.id, ACTOR), null, 2));
      return;
    }
    if (mode === "preview") {
      await resolveBatchIdentities(prisma, batch.id, ACTOR);
      console.log(JSON.stringify(await previewKnowledgePopulation(prisma, batch.id, ACTOR), null, 2));
      return;
    }
    if (mode === "dry-run") {
      await resolveBatchIdentities(prisma, batch.id, ACTOR);
      console.log(JSON.stringify(await dryRunKnowledgePopulation(prisma, batch.id, ACTOR), null, 2));
      return;
    }
    if (mode === "execute-drafts") {
      await resolveBatchIdentities(prisma, batch.id, ACTOR);
      await dryRunKnowledgePopulation(prisma, batch.id, ACTOR);
      console.log(
        JSON.stringify(await executeDraftKnowledgePopulation(prisma, batch.id, ACTOR), null, 2)
      );
      return;
    }
    if (mode === "duplicates") {
      const b = await prisma.medicationKnowledgePopulationBatch.findUnique({
        where: { id: batch.id },
      });
      console.log(JSON.stringify({ ExactDuplicates: b?.duplicateCount ?? 0 }, null, 2));
      return;
    }
    if (mode === "conflicts") {
      console.log(JSON.stringify(await listConflicts(prisma, batch.id), null, 2));
      return;
    }
    if (mode === "coverage") {
      console.log(JSON.stringify(await recalculateFamilyCoverage(prisma, ACTOR.userId), null, 2));
      return;
    }
    if (mode === "shadow-eligibility") {
      console.log(
        JSON.stringify(await recalculateShadowEligibility(prisma, batch.id, ACTOR), null, 2)
      );
      return;
    }
    if (mode === "reference-cases") {
      console.log(
        JSON.stringify(
          {
            note: "Reference cases created via Phase 11 reference-set APIs against approved knowledge only.",
            created: 0,
          },
          null,
          2
        )
      );
      return;
    }

    // audit default — ensure batch exists and report
    const resolved = await resolveBatchIdentities(prisma, batch.id, ACTOR);
    const dash = await getKnowledgePopulationDashboard(prisma);
    console.log(`Mode: ${mode}`);
    console.log(`BatchKey: ${resolved.batchKey}`);
    console.log(`FamiliesRequested: ${resolved.targetFamilyCount}`);
    console.log(`FamiliesResolved: ${resolved.resolvedFamilyCount}`);
    console.log(`FamiliesUnresolved: ${resolved.unresolvedFamilyCount}`);
    console.log(`ClinicalRecordsDraft: ${dash.ClinicalDraftRecords}`);
    console.log(`ClinicalRecordsApproved: ${dash.ClinicalApprovedRecords}`);
    console.log(`SafetyRecordsDraft: ${dash.SafetyDraftRecords}`);
    console.log(`SafetyRecordsApproved: ${dash.SafetyApprovedRecords}`);
    console.log(`SourceVersions: ${dash.SourceVersionsRegistered}`);
    console.log(`RecordsWithoutSources: ${dash.RecordsWithoutSources}`);
    console.log(`ExactDuplicates: ${dash.ExactDuplicatesPrevented}`);
    console.log(`NormalizedDuplicates: ${dash.NormalizedDuplicatesPrevented}`);
    console.log(`ReversedPairDuplicates: ${dash.ReversedPairDuplicatesPrevented}`);
    console.log(`PotentialConflicts: ${dash.OpenConflicts}`);
    console.log(`BlockingConflicts: ${dash.BlockingConflicts}`);
    console.log(
      `FamiliesWithApprovedClinicalProfiles: ${dash.FamiliesWithApprovedClinicalProfiles}`
    );
    console.log(
      `FamiliesWithApprovedSafetyKnowledge: ${dash.FamiliesWithApprovedSafetyKnowledge}`
    );
    console.log(`ShadowEvaluableFamilies: ${dash.ShadowEvaluableFamilies}`);
    console.log(`ValidatedFamilies: ${dash.ValidatedFamilies}`);
    console.log(`ProviderFacingAlerts: ${dash.ProviderFacingAlerts}`);
    console.log(`OrderBlocks: ${dash.OrderBlocks}`);
    console.log(`ClinicalActivations: ${dash.ClinicalActivations}`);
    const blocked = resolved.items
      .filter((i) => i.resolutionStatus === "IDENTITY_REVIEW_REQUIRED")
      .map((i) => i.requestedFamilyName);
    console.log(`IdentityReviewRequired: ${blocked.join(", ") || "(none)"}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
