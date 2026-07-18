/**
 * Phase 14B expert review / shadow qualification CLI.
 */
import { PrismaClient } from "@prisma/client";
import {
  calculateFamilyQualityScores,
  completeClinicalDomainReviews,
  completeSafetyDomainReviews,
  getExpertReviewDashboard,
  listReviewConflicts,
  qualifyWave1ForShadow,
  runCrossDomainValidation,
  runPhase14BPipeline,
  seedDomainReviews,
} from "../../../src/medications/expert-review/medication-expert-review.service";

async function resolveActor(prisma: PrismaClient) {
  const envId = process.env.PHASE14B_ACTOR_USER_ID?.trim();
  if (envId) {
    const found = await prisma.user.findUnique({
      where: { id: envId },
      select: { id: true },
    });
    if (!found) throw new Error(`PHASE14B_ACTOR_USER_ID not found: ${envId}`);
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
      "No active User for Phase 14B CLI actor. Set PHASE14B_ACTOR_USER_ID."
    );
  }
  return {
    userId: user.id,
    roles: ["MEDICATION_ADMIN", "MEDORA_SUPER_ADMIN"],
  };
}

async function main() {
  const mode = (process.argv[2] ?? "review-report").toLowerCase();
  const prisma = new PrismaClient();
  try {
    const actor = await resolveActor(prisma);

    if (mode === "review" || mode === "pipeline") {
      console.log(JSON.stringify(await runPhase14BPipeline(prisma, actor), null, 2));
      return;
    }
    if (mode === "seed") {
      console.log(JSON.stringify(await seedDomainReviews(prisma, actor), null, 2));
      return;
    }
    if (mode === "clinical") {
      console.log(
        JSON.stringify(await completeClinicalDomainReviews(prisma, actor), null, 2)
      );
      return;
    }
    if (mode === "safety") {
      console.log(
        JSON.stringify(await completeSafetyDomainReviews(prisma, actor), null, 2)
      );
      return;
    }
    if (mode === "consistency") {
      console.log(
        JSON.stringify(await runCrossDomainValidation(prisma, actor), null, 2)
      );
      return;
    }
    if (mode === "quality") {
      console.log(
        JSON.stringify(await calculateFamilyQualityScores(prisma, actor), null, 2)
      );
      return;
    }
    if (mode === "shadow" || mode === "approve-shadow") {
      console.log(JSON.stringify(await qualifyWave1ForShadow(prisma, actor), null, 2));
      return;
    }
    if (mode === "review-conflicts" || mode === "conflicts") {
      console.log(JSON.stringify(await listReviewConflicts(prisma), null, 2));
      return;
    }

    // review-report / audit
    const dash = await getExpertReviewDashboard(prisma);
    console.log(`Mode: ${mode}`);
    console.log(`ProgramKey: ${dash.ProgramKey}`);
    console.log(`BatchStatus: ${dash.BatchStatus}`);
    console.log(`Wave1Families: ${(dash.Wave1Families as string[]).join(", ")}`);
    console.log(`Wave1FamiliesReviewed: ${dash.Wave1FamiliesReviewed}`);
    console.log(`Wave1FamiliesApprovedForShadow: ${dash.Wave1FamiliesApprovedForShadow}`);
    console.log(`Wave1FamiliesDeferred: ${dash.Wave1FamiliesDeferred}`);
    console.log(`ClinicalDomainsReviewed: ${dash.ClinicalDomainsReviewed}`);
    console.log(`SafetyDomainsReviewed: ${dash.SafetyDomainsReviewed}`);
    console.log(`QualityScoresCalculated: ${dash.QualityScoresCalculated}`);
    console.log(`ShadowSnapshotsCreated: ${dash.ShadowSnapshotsCreated}`);
    console.log(`ReviewConflictsOpen: ${dash.ReviewConflictsOpen}`);
    console.log(`AuditEntriesCreated: ${dash.AuditEntriesCreated}`);
    console.log(`ClinicalActivation: ${dash.ClinicalActivation}`);
    console.log(`ProviderFacingAlerts: ${dash.ProviderFacingAlerts}`);
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
