/**
 * Phase 14B Part 3 synthetic shadow evaluation CLI.
 */
import { PrismaClient } from "@prisma/client";
import {
  analyzeSyntheticShadowBatch,
  certifySyntheticShadowBatch,
  executeSyntheticShadowBatch,
  getSyntheticShadowDashboard,
  runPhase14BSyntheticPipeline,
  validateSyntheticShadowBatch,
} from "../../../src/medications/shadow-evaluation/medication-shadow-evaluation.service";

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
      "No active User for Phase 14B CLI. Set PHASE14B_ACTOR_USER_ID."
    );
  }
  return {
    userId: user.id,
    roles: ["MEDICATION_ADMIN", "MEDORA_SUPER_ADMIN"],
  };
}

async function main() {
  const mode = (process.argv[2] ?? "report").toLowerCase();
  const prisma = new PrismaClient();
  try {
    const actor = await resolveActor(prisma);

    if (mode === "preview" || mode === "validate") {
      console.log(
        JSON.stringify(await validateSyntheticShadowBatch(prisma, actor), null, 2)
      );
      return;
    }
    if (mode === "execute") {
      console.log(
        JSON.stringify(await executeSyntheticShadowBatch(prisma, actor), null, 2)
      );
      return;
    }
    if (mode === "analyze") {
      console.log(
        JSON.stringify(await analyzeSyntheticShadowBatch(prisma, actor), null, 2)
      );
      return;
    }
    if (mode === "certify" || mode === "pipeline") {
      console.log(
        JSON.stringify(
          mode === "pipeline"
            ? await runPhase14BSyntheticPipeline(prisma, actor)
            : await certifySyntheticShadowBatch(prisma, actor),
          null,
          2
        )
      );
      return;
    }
    if (mode === "gaps") {
      const dash = await getSyntheticShadowDashboard(prisma);
      console.log(JSON.stringify(dash.GapLinks, null, 2));
      return;
    }

    const dash = await getSyntheticShadowDashboard(prisma);
    console.log(`Mode: ${mode}`);
    console.log(`BatchKey: ${dash.BatchKey}`);
    console.log(`BatchStatus: ${dash.BatchStatus}`);
    console.log(`Readiness: ${dash.Readiness}`);
    console.log(`ApprovedForShadow: ${dash.ApprovedForShadow}`);
    console.log(`ShadowSnapshots: ${dash.ShadowSnapshots}`);
    console.log(`FamiliesExecuted: ${dash.FamiliesExecuted}`);
    console.log(`FamiliesPassed: ${dash.FamiliesPassed}`);
    console.log(
      `FamiliesPassedWithNoncriticalGaps: ${dash.FamiliesPassedWithNoncriticalGaps}`
    );
    console.log(
      `FamiliesRequiringRemediation: ${dash.FamiliesRequiringRemediation}`
    );
    console.log(`ReferenceCases: ${dash.ReferenceCases}`);
    console.log(`MatchedFindings: ${dash.MatchedFindings}`);
    console.log(`MissedFindings: ${dash.MissedFindings}`);
    console.log(`UnexpectedFindings: ${dash.UnexpectedFindings}`);
    console.log(`CriticalMisses: ${dash.CriticalMisses}`);
    console.log(`DeferredDomainSkips: ${dash.DeferredDomainSkips}`);
    console.log(`OpenGaps: ${dash.OpenGaps}`);
    console.log(`ClinicalActivation: ${dash.ClinicalActivation}`);
    console.log(`ProviderFacingAlerts: ${dash.ProviderFacingAlerts}`);
    console.log(`OrderBlocks: ${dash.OrderBlocks}`);
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
