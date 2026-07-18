/**
 * Phase 15 Part 2C — governed remediation execution, quality, shadow, synthetic report.
 * Does not fabricate Tier-1 clinical facts. Prefer truthful DEFERRED when evidence absent.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  PHASE13_WAVE1_KEY,
  PHASE14B_SYNTHETIC_BATCH_KEY,
  PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS,
  PHASE15_CERTIFICATION_ID,
  PHASE15_PART2C_IMPLEMENTATION_ID,
  PHASE15_PROGRAM_KEY,
  PHASE15_WAVE_FAMILY_NAMES,
  assertPhase15NoAcetaminophenResolution,
  assertPhase15NoClinicalActivation,
  assertPhase15NoFabricatedFacts,
  assertPhase15NoWorkflowControl,
  assertPhase15Wave1Only,
  canPromoteToAuthoritativeSourceConfirmed,
  isTier1OrLicensedSource,
  isTier1PositiveKnowledgeGap,
  type Phase15SourceTier,
} from "@medora/shared";
import { calculateFamilyQualityScores } from "../expert-review/medication-expert-review.service";
import { qualifyWave1ForShadow } from "../expert-review/medication-expert-review.service";
import { recalculateCompletenessScores } from "../evidence-governance/medication-evidence-governance.service";
import {
  analyzeSyntheticShadowBatch,
  deterministicRerunSyntheticShadow,
  getSyntheticShadowDashboard,
} from "../shadow-evaluation/medication-shadow-evaluation.service";
import { isRemediationAdmin } from "./medication-remediation.roles";
import {
  getPhase15OperationalBaseline,
  listRemediationWorkItems,
} from "./medication-phase15-remediation-orchestrator.service";
import { transitionRemediationWorkItem } from "./medication-remediation.service";
import type { RemediationActor } from "./medication-source-lifecycle.service";

const ARTIFACT_DIR = resolve(
  __dirname,
  "../../../prisma/medications/audit-summaries"
);

function requireAdmin(actor: RemediationActor) {
  if (!isRemediationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
}

function assertSafety() {
  assertPhase15NoWorkflowControl(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.knowledgeControlsPatientCare
  );
  assertPhase15NoClinicalActivation(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.clinicalActivationEnabled
  );
  assertPhase15NoFabricatedFacts(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.fabricateUnsupportedFacts
  );
  assertPhase15Wave1Only(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.expandBeyondWave1
  );
  assertPhase15NoAcetaminophenResolution(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.resolveAcetaminophenIdentity
  );
}

function writeArtifact(name: string, payload: unknown) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const path = resolve(ARTIFACT_DIR, name);
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return path;
}

async function audit(
  prisma: PrismaClient,
  input: {
    programId?: string | null;
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    after?: unknown;
    reason?: string;
  }
) {
  await prisma.medicationRemediationAuditEvent.create({
    data: {
      programId: input.programId ?? undefined,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      afterState: (input.after as Prisma.InputJsonValue) ?? undefined,
      performedByUserId: input.userId,
      reason: input.reason,
    },
  });
}

export async function writePhase15PreRemediationBaseline(prisma: PrismaClient) {
  assertSafety();
  const baseline = await getPhase15OperationalBaseline(prisma);
  const path = writeArtifact("medication-phase15-pre-remediation-baseline.json", {
    ...baseline,
    part: "PART_2C_PRE_REMEDIATION",
    certificationId: PHASE15_CERTIFICATION_ID,
  });
  return { path, baseline };
}

export async function previewPhase15Part2CRemediation(prisma: PrismaClient) {
  assertSafety();
  const items = await listRemediationWorkItems(prisma);
  const regs = await prisma.medicationEvidenceSourceRegistration.findMany();
  const tier1Eligible = regs.filter((r) => {
    try {
      return canPromoteToAuthoritativeSourceConfirmed({
        sourceTier: r.sourceTier as Phase15SourceTier,
        licensingStatus:
          (r.licensingStatus as "LICENSED" | "PUBLIC_DOMAIN" | "RESTRICTED" | "UNKNOWN") ??
          "UNKNOWN",
        reviewStatus:
          (r.reviewStatus as "APPROVED" | "PENDING" | "REJECTED") ?? "PENDING",
        lifecycleStatus: "NORMALIZED",
      });
    } catch {
      return isTier1OrLicensedSource(r.sourceTier as Phase15SourceTier);
    }
  });

  const plan = items.map((item) => {
    const canRemediate =
      tier1Eligible.length > 0 &&
      item.status !== "RESOLVED" &&
      item.status !== "DEFERRED";
    return {
      workItemId: item.id,
      workItemKey: item.workItemKey,
      familyKey: item.familyKey,
      gapCategory: item.gapCategory,
      currentStatus: item.status,
      proposedOutcome: canRemediate ? "REMEDIATED" : "DEFERRED",
      reason: canRemediate
        ? "Tier-1/licensed authoritative source available for governed completion"
        : "No Tier-1/licensed authoritative source available; fabricating positive Tier-1 findings is forbidden",
      authoritativeSourceAvailable: tier1Eligible.length > 0,
      shadowRequalificationRequired: canRemediate,
      newSnapshotRequired: canRemediate,
      mutates: false,
    };
  });

  const payload = {
    implementationId: PHASE15_PART2C_IMPLEMENTATION_ID,
    generatedAt: new Date().toISOString(),
    waveKey: PHASE13_WAVE1_KEY,
    tier1EligibleSourceCount: tier1Eligible.length,
    institutionalOnlySources: regs.filter((r) =>
      String(r.sourceTier).includes("TIER_5")
    ).length,
    plan,
    summary: {
      wouldRemediate: plan.filter((p) => p.proposedOutcome === "REMEDIATED")
        .length,
      wouldDefer: plan.filter((p) => p.proposedOutcome === "DEFERRED").length,
      fabricateFacts: false,
    },
  };
  const path = writeArtifact(
    "medication-phase15-remediation-preview.json",
    payload
  );
  return { path, preview: payload };
}

/**
 * Execute governed remediation: DEFER when Tier-1 unavailable (truthful).
 * Never fabricates clinical knowledge.
 */
export async function executePhase15Part2CRemediation(
  prisma: PrismaClient,
  actor: RemediationActor
) {
  requireAdmin(actor);
  assertSafety();

  const program = await prisma.medicationRemediationProgram.findUnique({
    where: { programKey: PHASE15_PROGRAM_KEY },
  });
  if (!program) {
    throw new BadRequestException("Programme Phase 15 introuvable — lancer refresh d’abord.");
  }

  const items = await prisma.medicationRemediationWorkItem.findMany({
    where: {
      programId: program.id,
      status: {
        in: [
          "OPEN",
          "TRIAGED",
          "ROUTED",
          "IN_REMEDIATION",
          "BLOCKED_PENDING_AUTHORITATIVE_SOURCE",
          "AWAITING_QUALITY_RECALC",
        ],
      },
    },
  });

  const regs = await prisma.medicationEvidenceSourceRegistration.findMany();
  const hasTier1 = regs.some((r) =>
    isTier1OrLicensedSource(r.sourceTier as Phase15SourceTier)
  );

  const results: Array<{
    workItemId: string;
    familyKey: string;
    outcome: string;
    result: string;
  }> = [];

  for (const item of items) {
    if (/acetaminophen/i.test(item.familyKey)) {
      results.push({
        workItemId: item.id,
        familyKey: item.familyKey,
        outcome: "OUT_OF_SCOPE",
        result: "NO_CHANGE",
      });
      continue;
    }

    if (!hasTier1) {
      // Already deferred → no-op
      if (item.status === "DEFERRED") {
        results.push({
          workItemId: item.id,
          familyKey: item.familyKey,
          outcome: "DEFERRED",
          result: "ALREADY_COMPLETE",
        });
        continue;
      }
      // Transition path to DEFERRED (may need TRIAGED first from BLOCKED)
      let status = item.status;
      try {
        if (status === "BLOCKED_PENDING_AUTHORITATIVE_SOURCE") {
          // BLOCKED → DEFERRED is allowed per canTransition
          await transitionRemediationWorkItem(prisma, actor, {
            workItemId: item.id,
            toStatus: "DEFERRED",
            reason:
              "Phase 15 Part 2C governed deferral: Tier-1/licensed authoritative source not available in repository. Positive clinical expected findings not fabricated.",
          });
          status = "DEFERRED";
        } else if (status !== "DEFERRED") {
          await transitionRemediationWorkItem(prisma, actor, {
            workItemId: item.id,
            toStatus: "DEFERRED",
            reason:
              "Phase 15 Part 2C governed deferral: insufficient authoritative evidence for domain completion.",
          });
          status = "DEFERRED";
        }
      } catch {
        // If direct transition blocked, triage then defer
        try {
          if (status === "OPEN") {
            await transitionRemediationWorkItem(prisma, actor, {
              workItemId: item.id,
              toStatus: "TRIAGED",
              reason: "Part 2C triage before governed deferral",
            });
          }
          await transitionRemediationWorkItem(prisma, actor, {
            workItemId: item.id,
            toStatus: "DEFERRED",
            reason:
              "Phase 15 Part 2C governed deferral: Tier-1 authoritative source unavailable.",
          });
          status = "DEFERRED";
        } catch (e2) {
          results.push({
            workItemId: item.id,
            familyKey: item.familyKey,
            outcome: "BLOCKED",
            result: String(e2 instanceof Error ? e2.message : e2),
          });
          continue;
        }
      }

      // Gap reconciliation: link work item; leave gap OPEN (deficiency not resolved)
      if (item.shadowGapLinkId) {
        await audit(prisma, {
          programId: program.id,
          entityType: "MedicationShadowGapLink",
          entityId: item.shadowGapLinkId,
          action: "GAP_RECONCILED_DEFERRED",
          userId: actor.userId,
          after: {
            workItemId: item.id,
            gapClosed: false,
            outcome: "GOVERNED_DEFERRED",
            note: "Root cause (missing Tier-1 positive knowledge) not resolved; deferred transparently.",
          },
          reason: "Part 2C gap reconciliation",
        });
      }

      results.push({
        workItemId: item.id,
        familyKey: item.familyKey,
        outcome: "DEFERRED",
        result: "UPDATED",
      });
    } else {
      results.push({
        workItemId: item.id,
        familyKey: item.familyKey,
        outcome: "BLOCKED",
        result: "Tier-1 path reserved for licensed source attach (Part 2C does not auto-complete without explicit governed facts)",
      });
    }
  }

  const deferred = results.filter((r) => r.outcome === "DEFERRED").length;
  const remediated = results.filter((r) => r.outcome === "REMEDIATED").length;
  const blocked = results.filter((r) => r.outcome === "BLOCKED").length;

  await prisma.medicationRemediationProgram.update({
    where: { id: program.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      metricsJson: {
        part2c: true,
        deferred,
        remediated,
        blocked,
        fabricateFacts: false,
      } as Prisma.InputJsonValue,
      openWorkItemCount: 0,
      resolvedWorkItemCount: remediated,
      blockedWorkItemCount: 0,
    },
  });

  // Refresh counts from actual statuses
  const all = await prisma.medicationRemediationWorkItem.findMany({
    where: { programId: program.id },
    select: { status: true },
  });
  await prisma.medicationRemediationProgram.update({
    where: { id: program.id },
    data: {
      openWorkItemCount: all.filter(
        (i) =>
          i.status !== "RESOLVED" &&
          i.status !== "CANCELLED" &&
          i.status !== "DEFERRED"
      ).length,
      resolvedWorkItemCount: all.filter((i) => i.status === "RESOLVED").length,
      blockedWorkItemCount: all.filter(
        (i) => i.status === "BLOCKED_PENDING_AUTHORITATIVE_SOURCE"
      ).length,
    },
  });

  const payload = {
    implementationId: PHASE15_PART2C_IMPLEMENTATION_ID,
    generatedAt: new Date().toISOString(),
    results,
    summary: { deferred, remediated, blocked, fabricateFacts: false },
  };
  const path = writeArtifact(
    "medication-phase15-remediation-results.json",
    payload
  );
  return { path, ...payload };
}

export async function runPhase15QualityRecalculation(
  prisma: PrismaClient,
  actor: RemediationActor
) {
  requireAdmin(actor);
  assertSafety();
  const completeness = await recalculateCompletenessScores(prisma, actor);
  const quality = await calculateFamilyQualityScores(prisma, actor);
  const payload = {
    generatedAt: new Date().toISOString(),
    completenessFamilies: completeness.length,
    qualityScoresCalculated: quality.qualityScoresCalculated,
    scores: quality.scores.map((s) => ({
      familyKey: s.familyKey,
      overallScore: s.overallScore,
      clinicalScore: s.clinicalScore,
      safetyScore: s.safetyScore,
      evidenceScore: s.evidenceScore,
      reviewScore: s.reviewScore,
      consistencyScore: s.consistencyScore,
    })),
    note: "Historical scores preserved via new rows / updates per Phase 14A/14B engines.",
  };
  const path = writeArtifact("medication-phase15-quality-report.json", payload);
  return { path, ...payload };
}

export async function runPhase15ShadowRequalification(
  prisma: PrismaClient,
  actor: RemediationActor
) {
  requireAdmin(actor);
  assertSafety();
  // No approved knowledge content change under governed deferral → reuse snapshots.
  // Still invoke qualification read path for families already APPROVED_FOR_SHADOW.
  const beforeSnaps = await prisma.medicationShadowSnapshot.count();
  const qual = await qualifyWave1ForShadow(prisma, actor).catch((e) => ({
    error: e instanceof Error ? e.message : String(e),
    results: [] as Array<{ familyKey: string; status: string }>,
  }));
  const afterSnaps = await prisma.medicationShadowSnapshot.count();
  const payload = {
    generatedAt: new Date().toISOString(),
    snapshotsBefore: beforeSnaps,
    snapshotsAfter: afterSnaps,
    newSnapshotsCreated: Math.max(0, afterSnaps - beforeSnaps),
    qualification: qual,
    familySnapshotOutcomes: PHASE15_WAVE_FAMILY_NAMES.map((name) => ({
      familyName: name,
      snapshotResult:
        afterSnaps === beforeSnaps ? "REUSED_SNAPSHOT" : "NEW_SNAPSHOT",
      note: "Governed deferral does not alter approved shadow knowledge content",
    })),
    clinicalActivationAllowed: false,
  };
  const path = writeArtifact(
    "medication-phase15-shadow-requalification.json",
    payload
  );
  return { path, ...payload };
}

export async function runPhase15SyntheticEvaluationReport(
  prisma: PrismaClient,
  actor: RemediationActor
) {
  requireAdmin(actor);
  assertSafety();
  // No snapshot content change → do not re-execute Phase 10; report live CERTIFIED batch + determinism.
  const dashboard = await getSyntheticShadowDashboard(prisma);
  let analyzed = null;
  try {
    analyzed = await analyzeSyntheticShadowBatch(prisma, actor);
  } catch {
    analyzed = null;
  }
  const determinism = await deterministicRerunSyntheticShadow(prisma, actor);
  const batch = await prisma.medicationShadowEvaluationBatch.findUnique({
    where: { batchKey: PHASE14B_SYNTHETIC_BATCH_KEY },
  });
  const metrics = (batch?.metricsJson ?? {}) as Record<string, number>;
  const payload = {
    generatedAt: new Date().toISOString(),
    executionPolicy: "NO_ELIGIBLE_CHANGE_REUSE_PRIOR_SYNTHETIC_BATCH",
    batchStatus: batch?.status ?? null,
    readiness: batch?.readiness ?? null,
    metrics,
    dashboard,
    determinism,
    analyzedStatus: analyzed?.status ?? null,
    criticalMisses: Number(metrics.criticalMisses ?? 0),
    unexpectedFindings: Number(metrics.unexpectedFindings ?? 0),
    note: "Synthetic re-execution skipped: no immutable snapshot content change under governed deferral.",
  };
  const path = writeArtifact(
    "medication-phase15-synthetic-shadow-results.json",
    payload
  );
  return { path, ...payload };
}

export async function writePhase15ReadinessReport(prisma: PrismaClient) {
  const baseline = await getPhase15OperationalBaseline(prisma);
  const deferredWork = await prisma.medicationRemediationWorkItem.count({
    where: {
      program: { programKey: PHASE15_PROGRAM_KEY },
      status: "DEFERRED",
    },
  });
  const openGaps = await prisma.medicationShadowGapLink.count({
    where: {
      batch: { batchKey: PHASE14B_SYNTHETIC_BATCH_KEY },
      status: "OPEN",
    },
  });
  const payload = {
    generatedAt: new Date().toISOString(),
    certificationId: PHASE15_CERTIFICATION_ID,
    readiness: "QUALIFIED_WITH_GOVERNED_DEFERRALS",
    operationalReadiness: baseline.liveBaseline.OperationalReadiness,
    deferredWorkItems: deferredWork,
    openPhase14BGaps: openGaps,
    openTier1KnowledgeGaps: baseline.liveBaseline.OpenTier1KnowledgeGaps,
    wave1Families: baseline.liveBaseline.Wave1Families,
    approvedForShadow: baseline.liveBaseline.ApprovedForShadow,
    acetaminophenIdentityBlocked: true,
    clinicalActivations: 0,
    providerAlerts: 0,
    orderBlocks: 0,
    productionCds: "OFF",
    phase15CertifiedClaim: false,
    note: "Final certification decision emitted by medication:phase15:certify",
  };
  const path = writeArtifact(
    "medication-phase15-readiness-report.json",
    payload
  );
  return { path, ...payload };
}

export async function runPhase15Part2CPipeline(
  prisma: PrismaClient,
  actor: RemediationActor
) {
  requireAdmin(actor);
  assertSafety();
  const pre = await writePhase15PreRemediationBaseline(prisma);
  const preview = await previewPhase15Part2CRemediation(prisma);
  const executed = await executePhase15Part2CRemediation(prisma, actor);
  const quality = await runPhase15QualityRecalculation(prisma, actor);
  const shadow = await runPhase15ShadowRequalification(prisma, actor);
  const synthetic = await runPhase15SyntheticEvaluationReport(prisma, actor);
  const readiness = await writePhase15ReadinessReport(prisma);
  return { pre, preview, executed, quality, shadow, synthetic, readiness };
}
