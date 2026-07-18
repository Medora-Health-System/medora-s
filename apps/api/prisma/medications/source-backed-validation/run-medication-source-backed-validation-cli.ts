/**
 * Phase 13 source-backed validation CLI.
 */
import { PrismaClient } from "@prisma/client";
import {
  createOrGetWave1,
  createWave1ReferenceSet,
  executeControlledShadowRun,
  getPhase12Baseline,
  getSourceBackedDashboard,
  investigateIdentityBlockers,
  recalculateSourceReadiness,
  runPhase13Pipeline,
} from "../../../src/medications/source-backed-validation/medication-source-backed-validation.service";

async function resolveActor(prisma: PrismaClient) {
  const envId = process.env.PHASE13_ACTOR_USER_ID?.trim();
  if (envId) {
    const found = await prisma.user.findUnique({
      where: { id: envId },
      select: { id: true },
    });
    if (!found) throw new Error(`PHASE13_ACTOR_USER_ID not found: ${envId}`);
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
      "No active User for Phase 13 CLI actor. Set PHASE13_ACTOR_USER_ID."
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

    if (mode === "identity") {
      console.log(JSON.stringify(await investigateIdentityBlockers(prisma, actor), null, 2));
      return;
    }
    if (mode === "create-wave") {
      console.log(JSON.stringify(await createOrGetWave1(prisma, actor), null, 2));
      return;
    }
    if (mode === "source-readiness") {
      const wave = await createOrGetWave1(prisma, actor);
      console.log(
        JSON.stringify(await recalculateSourceReadiness(prisma, wave.id, actor), null, 2)
      );
      return;
    }
    if (mode === "drafts") {
      const wave = await createOrGetWave1(prisma, actor);
      console.log(
        JSON.stringify(
          {
            items: wave.items.map((i) => ({
              family: i.requestedFamilyName,
              placeholder: i.isPlaceholderDetected,
              sourceStatus: i.sourceStatus,
              approvalStatus: i.approvalStatus,
              blocking: i.blockingReasonCodesJson,
            })),
          },
          null,
          2
        )
      );
      return;
    }
    if (mode === "review-status") {
      const dash = await getSourceBackedDashboard(prisma);
      console.log(
        JSON.stringify(
          {
            ClinicalRecordsApprovedForShadow: dash.ClinicalRecordsApprovedForShadow,
            SourceReadyFamilies: dash.SourceReadyFamilies,
            AcetaminophenResolutionStatus: dash.AcetaminophenResolutionStatus,
            ReadinessResult: dash.ReadinessResult,
          },
          null,
          2
        )
      );
      return;
    }
    if (mode === "eligibility") {
      const dash = await getSourceBackedDashboard(prisma);
      console.log(
        JSON.stringify(
          {
            FamiliesShadowEvaluable: dash.FamiliesShadowEvaluable,
            ClinicalRecordsApprovedForShadow: dash.ClinicalRecordsApprovedForShadow,
          },
          null,
          2
        )
      );
      return;
    }
    if (mode === "create-reference-set") {
      console.log(JSON.stringify(await createWave1ReferenceSet(prisma, actor), null, 2));
      return;
    }
    if (mode === "run-shadow") {
      console.log(JSON.stringify(await executeControlledShadowRun(prisma, actor), null, 2));
      return;
    }
    if (mode === "results" || mode === "gaps") {
      const dash = await getSourceBackedDashboard(prisma);
      console.log(JSON.stringify(dash, null, 2));
      return;
    }
    if (mode === "pipeline") {
      console.log(JSON.stringify(await runPhase13Pipeline(prisma, actor), null, 2));
      return;
    }

    // audit default — run pipeline lightly then print metrics
    await investigateIdentityBlockers(prisma, actor);
    const wave = await createOrGetWave1(prisma, actor);
    await recalculateSourceReadiness(prisma, wave.id, actor);
    await createWave1ReferenceSet(prisma, actor);
    await executeControlledShadowRun(prisma, actor);
    const baseline = await getPhase12Baseline(prisma);
    const dash = await getSourceBackedDashboard(prisma);

    console.log(`Mode: ${mode}`);
    console.log(`RequestedFamilies: ${baseline.RequestedFamilies}`);
    console.log(`ResolvedFamilies: ${baseline.ResolvedFamilies}`);
    console.log(`IdentityBlockedFamilies: ${baseline.IdentityBlockedFamilies}`);
    console.log(`AcetaminophenResolutionStatus: ${dash.AcetaminophenResolutionStatus}`);
    console.log(`Wave1SelectedFamilies: ${dash.Wave1SelectedFamilies}`);
    console.log(`SourceReadyFamilies: ${dash.SourceReadyFamilies}`);
    console.log(`ClinicalRecordsApprovedForShadow: ${dash.ClinicalRecordsApprovedForShadow}`);
    console.log(`SafetyRecordsApprovedForShadow: ${dash.SafetyRecordsApprovedForShadow}`);
    console.log(`FamiliesShadowEvaluable: ${dash.FamiliesShadowEvaluable}`);
    console.log(`ReferenceCases: ${dash.ReferenceCases}`);
    console.log(`ReferenceCasesPassed: ${dash.ReferenceCasesPassed}`);
    console.log(`ExpectedFindings: ${dash.ExpectedFindings}`);
    console.log(`MatchedFindings: ${dash.MatchedFindings}`);
    console.log(`MissedFindings: ${dash.MissedFindings}`);
    console.log(`UnexpectedFindings: ${dash.UnexpectedFindings}`);
    console.log(`ReviewedUnexpectedFindings: ${dash.ReviewedUnexpectedFindings}`);
    console.log(`ConfirmedFalsePositives: ${dash.ConfirmedFalsePositives}`);
    console.log(`CriticalMisses: ${dash.CriticalMisses}`);
    console.log(`EvaluationFailures: ${dash.EvaluationFailures}`);
    console.log(`P95Latency: ${dash.P95Latency}`);
    console.log(`ProviderFacingAlerts: ${dash.ProviderFacingAlerts}`);
    console.log(`OrderBlocks: ${dash.OrderBlocks}`);
    console.log(`ClinicalActivations: ${dash.ClinicalActivations}`);
    console.log(`ReadinessResult: ${dash.ReadinessResult}`);
    console.log(`Wave1Families: ${(dash.Wave1FamilyNames as string[]).join(", ")}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
