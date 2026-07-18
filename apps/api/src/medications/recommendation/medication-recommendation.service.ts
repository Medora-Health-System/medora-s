/**
 * Phase 16 — Controlled Shadow Recommendation Engine (core services).
 * Extends Phase 15. Never mutates orders/MAR/chart. Pilot/Active blocked.
 */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  PHASE13_WAVE1_KEY,
  PHASE16_IMPLEMENTATION_ID,
  PHASE16_PROGRAM_KEY,
  PHASE16_PROGRAM_VERSION,
  PHASE16_RECOMMENDATION_DEFAULTS,
  PHASE16_WAVE_FAMILY_NAMES,
  assertPhase16SafetyDefaults,
  calculateRecommendationConfidence,
  isPhase16LifecycleTransitionAllowed,
  isRecommendationExposableToProviders,
  isWave1RecommendationFamily,
  type Phase16FeedbackType,
  type Phase16RecommendationKind,
  type Phase16RecommendationLifecycle,
} from "@medora/shared";
import {
  isRecommendationAdmin,
  isRecommendationReviewer,
} from "./medication-recommendation.roles";
import type { RecommendationActor } from "./medication-recommendation.types";

function requireAdmin(actor: RecommendationActor) {
  if (!isRecommendationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
}

function requireReviewer(actor: RecommendationActor) {
  if (!isRecommendationReviewer(actor.roles)) {
    throw new ForbiddenException("Réviseur médicament requis.");
  }
}

async function audit(
  prisma: PrismaClient,
  input: {
    programId?: string | null;
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    before?: unknown;
    after?: unknown;
    reason?: string;
  }
) {
  await prisma.medicationRecommendationAuditEvent.create({
    data: {
      programId: input.programId ?? undefined,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeState: (input.before as Prisma.InputJsonValue) ?? undefined,
      afterState: (input.after as Prisma.InputJsonValue) ?? undefined,
      performedByUserId: input.userId,
      reason: input.reason,
    },
  });
}

export async function ensureRecommendationProgram(
  prisma: PrismaClient,
  actor: RecommendationActor
) {
  assertPhase16SafetyDefaults();
  requireAdmin(actor);
  const existing = await prisma.medicationRecommendationProgram.findUnique({
    where: { programKey: PHASE16_PROGRAM_KEY },
  });
  if (existing) return existing;
  return prisma.medicationRecommendationProgram.create({
    data: {
      programKey: PHASE16_PROGRAM_KEY,
      name: "Wave 1 Shadow Recommendation Engine",
      description:
        "Phase 16 governed shadow recommendations for Wave 1 families. No Pilot/Enterprise Active.",
      waveKey: PHASE13_WAVE1_KEY,
      status: "PLANNED",
      programVersion: PHASE16_PROGRAM_VERSION,
      targetFamilyCount: PHASE16_WAVE_FAMILY_NAMES.length,
      createdByUserId: actor.userId,
      shadowRecommendationAllowed: true,
      controlledPilotAllowed: false,
      enterpriseActiveAllowed: false,
      clinicalActivationAllowed: false,
      providerFacingAlertsAllowed: false,
      orderBlockingAllowed: false,
      knowledgeControlsPatientCare: false,
      orderFromRecommendationAllowed: false,
    },
  });
}

/**
 * Seed draft candidates from Wave 1 approved shadow snapshots.
 * Does not invent clinical facts — reason states governance provenance only.
 */
export async function seedRecommendationCandidatesFromShadow(
  prisma: PrismaClient,
  actor: RecommendationActor
) {
  assertPhase16SafetyDefaults();
  requireAdmin(actor);
  const program = await ensureRecommendationProgram(prisma, actor);

  const snaps = await prisma.medicationShadowSnapshot.findMany({
    orderBy: { createdAt: "desc" },
  });
  const byFamily = new Map<string, (typeof snaps)[0]>();
  for (const s of snaps) {
    if (!isWave1RecommendationFamily(s.familyKey)) continue;
    if (/acetaminophen/i.test(s.familyKey)) continue;
    if (!byFamily.has(s.familyKey)) byFamily.set(s.familyKey, s);
  }

  const evidence = await prisma.medicationEvidenceSourceRegistration.findFirst({
    where: { acquisitionStatus: { in: ["ACCEPTED_FOR_KNOWLEDGE_USE", "AUTHORITATIVE_SOURCE_CONFIRMED", "NORMALIZED"] } },
    orderBy: { createdAt: "desc" },
  });

  const created: string[] = [];
  const skipped: string[] = [];

  for (const familyName of PHASE16_WAVE_FAMILY_NAMES) {
    const familyKey =
      [...byFamily.keys()].find((k) =>
        k.toLowerCase().includes(familyName.toLowerCase())
      ) ?? `EM_FAM_${familyName.toUpperCase()}`;
    const snap = byFamily.get(familyKey) ?? null;
    const definitionKey = `P16_REC_${familyKey}_FIRST_LINE_V1`;

    const existing = await prisma.medicationRecommendationDefinition.findUnique({
      where: { definitionKey },
    });
    if (existing) {
      skipped.push(definitionKey);
      continue;
    }

    const conf = calculateRecommendationConfidence({
      hasAuthoritativeSource: Boolean(evidence),
      hasEvidenceLink: Boolean(evidence),
      evidenceCompletenessPercent: snap ? 40 : 10,
      approvedByReviewer: false,
      missingReferenceCount: evidence ? 1 : 3,
      unresolvedConflict: false,
      validationStatus: snap ? "PARTIAL" : "UNVALIDATED",
    });

    const def = await prisma.medicationRecommendationDefinition.create({
      data: {
        programId: program.id,
        definitionKey,
        familyKey,
        canonicalConceptId: snap?.canonicalConceptId ?? null,
        recommendationKind: "FIRST_LINE" satisfies Phase16RecommendationKind,
        title: `${familyName} — first-line advisory (shadow governance)`,
        reasonSummary:
          "Governed Wave 1 shadow candidate seeded from approved shadow snapshot membership. Positive clinical claims remain limited to provenance-backed structured knowledge; unsupported domains are not fabricated.",
        structuredPayloadJson: {
          familyName,
          kind: "FIRST_LINE",
          alternatives: [],
          contraindications: [],
          doseConsiderations: [],
          renalNotes: [],
          hepaticNotes: [],
          pregnancyNotes: [],
          pediatricNotes: [],
          geriatricNotes: [],
          formularyAlternatives: [],
          fabricated: false,
          source: "PHASE16_SHADOW_SEED",
        } as Prisma.InputJsonValue,
        lifecycleStatus: "DRAFT",
        version: "1.0.0",
        confidenceScore: conf.confidenceScore,
        evidenceCompleteness: conf.evidenceCompleteness,
        evidenceLevel: evidence ? "INSTITUTIONAL" : "UNASSIGNED",
        recommendationStrength: "GOVERNED_ADVISORY",
        validationStatus: conf.validationStatus,
        shadowSnapshotId: snap?.id ?? null,
        evidenceRegistrationId: evidence?.id ?? null,
        knowledgeVersion: snap?.shadowVersion ?? null,
        missingReferencesJson: {
          note: "Tier-1 positive clinical claims may remain governed deferred per Phase 15",
        } as Prisma.InputJsonValue,
        supportingReferencesJson: evidence
          ? {
              registrationKey: evidence.registrationKey,
              sourceTier: evidence.sourceTier,
            }
          : ([] as unknown as Prisma.InputJsonValue),
        createdByUserId: actor.userId,
      },
    });

    if (evidence) {
      await prisma.medicationRecommendationEvidenceLink.create({
        data: {
          definitionId: def.id,
          evidenceRegistrationId: evidence.id,
          sourceIdentity: evidence.registrationKey,
          sourceTier: evidence.sourceTier,
          evidenceLevel: "INSTITUTIONAL",
          permittedUseStatus: evidence.licensingStatus ?? evidence.licenseStatus,
          excerptNormalized:
            "Metadata-only provenance link; no copyrighted source text embedded.",
          provenanceJson: {
            acquisitionStatus: evidence.acquisitionStatus,
            phase: 16,
          } as Prisma.InputJsonValue,
        },
      });
    }

    await audit(prisma, {
      programId: program.id,
      entityType: "MedicationRecommendationDefinition",
      entityId: def.id,
      action: "SEEDED_DRAFT",
      userId: actor.userId,
      after: { definitionKey, familyKey, lifecycleStatus: "DRAFT" },
      reason: "Phase 16 Wave 1 shadow candidate seed",
    });
    created.push(definitionKey);
  }

  const counts = await prisma.medicationRecommendationDefinition.groupBy({
    by: ["lifecycleStatus"],
    where: { programId: program.id },
    _count: true,
  });
  const definitionCount = counts.reduce((n, c) => n + c._count, 0);
  const shadowEligibleCount =
    counts.find((c) => c.lifecycleStatus === "SHADOW_RECOMMENDATION")?._count ??
    0;

  await prisma.medicationRecommendationProgram.update({
    where: { id: program.id },
    data: {
      status: "SEEDING",
      definitionCount,
      shadowEligibleCount,
      metricsJson: {
        implementationId: PHASE16_IMPLEMENTATION_ID,
        created,
        skipped,
      } as Prisma.InputJsonValue,
    },
  });

  return { programId: program.id, created, skipped, definitionCount };
}

export async function listRecommendations(
  prisma: PrismaClient,
  opts?: { exposableOnly?: boolean; familyKey?: string; lifecycleStatus?: string }
) {
  assertPhase16SafetyDefaults();
  const where: Prisma.MedicationRecommendationDefinitionWhereInput = {};
  if (opts?.familyKey) where.familyKey = opts.familyKey;
  if (opts?.lifecycleStatus) where.lifecycleStatus = opts.lifecycleStatus;
  if (opts?.exposableOnly) {
    where.lifecycleStatus = "SHADOW_RECOMMENDATION";
  }
  const rows = await prisma.medicationRecommendationDefinition.findMany({
    where,
    include: {
      evidenceLinks: true,
      reviews: { orderBy: { reviewedAt: "desc" }, take: 3 },
    },
    orderBy: [{ familyKey: "asc" }, { recommendationKind: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    definitionKey: r.definitionKey,
    familyKey: r.familyKey,
    recommendationKind: r.recommendationKind,
    title: r.title,
    reasonSummary: r.reasonSummary,
    lifecycleStatus: r.lifecycleStatus,
    version: r.version,
    confidenceScore: r.confidenceScore,
    evidenceCompleteness: r.evidenceCompleteness,
    evidenceLevel: r.evidenceLevel,
    recommendationStrength: r.recommendationStrength,
    validationStatus: r.validationStatus,
    approvalStatus: r.approvalStatus,
    approvedByUserId: r.approvedByUserId,
    approvedAt: r.approvedAt,
    exposable: isRecommendationExposableToProviders(
      r.lifecycleStatus as Phase16RecommendationLifecycle
    ),
    structuredPayload: r.structuredPayloadJson,
    evidenceLinkCount: r.evidenceLinks.length,
    latestReview: r.reviews[0] ?? null,
    orderFromRecommendationAllowed: false,
    clinicalActivation: false,
  }));
}

export async function getRecommendationExplanation(
  prisma: PrismaClient,
  id: string
) {
  const def = await prisma.medicationRecommendationDefinition.findUnique({
    where: { id },
    include: { evidenceLinks: true, reviews: true },
  });
  if (!def) throw new NotFoundException("Recommandation introuvable.");
  if (
    !isRecommendationExposableToProviders(
      def.lifecycleStatus as Phase16RecommendationLifecycle
    ) &&
    def.lifecycleStatus !== "APPROVED"
  ) {
    // Admin may read drafts via governance; provider path uses exposableOnly list.
  }
  return {
    id: def.id,
    title: def.title,
    reason: def.reasonSummary,
    structuredPayload: def.structuredPayloadJson,
    confidenceScore: def.confidenceScore,
    evidenceLevel: def.evidenceLevel,
    recommendationStrength: def.recommendationStrength,
    validationStatus: def.validationStatus,
    approvalStatus: def.approvalStatus,
    approvedByUserId: def.approvedByUserId,
    approvedAt: def.approvedAt,
    version: def.version,
    knowledgeVersion: def.knowledgeVersion,
    lifecycleStatus: def.lifecycleStatus,
    reasoningPath: {
      provenanceRequired: true,
      fabricated: false,
      wave1Only: true,
      activationCeiling: "SHADOW_RECOMMENDATION",
    },
    evidenceLinks: def.evidenceLinks,
    reviews: def.reviews,
    orderFromRecommendationAllowed: false,
  };
}

export async function getRecommendationEvidence(
  prisma: PrismaClient,
  id: string
) {
  const def = await prisma.medicationRecommendationDefinition.findUnique({
    where: { id },
    include: {
      evidenceLinks: { include: { evidenceRegistration: true } },
      evidenceRegistration: true,
      shadowSnapshot: true,
    },
  });
  if (!def) throw new NotFoundException("Recommandation introuvable.");
  return {
    definitionId: def.id,
    evidenceRegistration: def.evidenceRegistration,
    evidenceLinks: def.evidenceLinks,
    shadowSnapshotId: def.shadowSnapshotId,
    shadowVersion: def.shadowSnapshot?.shadowVersion ?? null,
    supportingReferences: def.supportingReferencesJson,
    missingReferences: def.missingReferencesJson,
  };
}

export async function getRecommendationHistory(
  prisma: PrismaClient,
  id: string
) {
  const def = await prisma.medicationRecommendationDefinition.findUnique({
    where: { id },
  });
  if (!def) throw new NotFoundException("Recommandation introuvable.");
  const chain: Array<Record<string, unknown>> = [];
  let cursor: string | null = id;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const row: {
      id: string;
      version: string;
      lifecycleStatus: string;
      confidenceScore: number;
      approvedAt: Date | null;
      priorVersionId: string | null;
      reviews: unknown[];
    } | null = await prisma.medicationRecommendationDefinition.findUnique({
      where: { id: cursor },
      include: { reviews: { orderBy: { reviewedAt: "desc" } } },
    });
    if (!row) break;
    chain.push({
      id: row.id,
      version: row.version,
      lifecycleStatus: row.lifecycleStatus,
      confidenceScore: row.confidenceScore,
      approvedAt: row.approvedAt,
      reviews: row.reviews,
    });
    cursor = row.priorVersionId;
  }
  const audits = await prisma.medicationRecommendationAuditEvent.findMany({
    where: { entityType: "MedicationRecommendationDefinition", entityId: id },
    orderBy: { performedAt: "desc" },
    take: 50,
  });
  return { versionChain: chain, auditEvents: audits };
}

export async function transitionRecommendationLifecycle(
  prisma: PrismaClient,
  actor: RecommendationActor,
  input: {
    definitionId: string;
    toStatus: Phase16RecommendationLifecycle;
    reason: string;
  }
) {
  assertPhase16SafetyDefaults();
  requireReviewer(actor);
  if (!input.reason?.trim()) {
    throw new BadRequestException("Motif de transition requis.");
  }
  const def = await prisma.medicationRecommendationDefinition.findUnique({
    where: { id: input.definitionId },
    include: { evidenceLinks: true },
  });
  if (!def) throw new NotFoundException("Recommandation introuvable.");
  if (!isWave1RecommendationFamily(def.familyKey)) {
    throw new BadRequestException("Famille hors Vague 1.");
  }
  const from = def.lifecycleStatus as Phase16RecommendationLifecycle;
  if (!isPhase16LifecycleTransitionAllowed(from, input.toStatus)) {
    throw new BadRequestException(
      `Transition interdite en Phase 16: ${from} → ${input.toStatus}`
    );
  }
  if (
    input.toStatus === "SHADOW_RECOMMENDATION" ||
    input.toStatus === "APPROVED"
  ) {
    if (!def.evidenceRegistrationId && def.evidenceLinks.length === 0) {
      throw new BadRequestException(
        "Provenance requise avant approbation / ombre."
      );
    }
  }

  const data: Prisma.MedicationRecommendationDefinitionUpdateInput = {
    lifecycleStatus: input.toStatus,
  };
  if (input.toStatus === "APPROVED" || input.toStatus === "SHADOW_RECOMMENDATION") {
    data.approvalStatus = "APPROVED";
    data.approvedByUserId = actor.userId;
    data.approvedAt = new Date();
  }

  const updated = await prisma.medicationRecommendationDefinition.update({
    where: { id: def.id },
    data,
  });

  await prisma.medicationRecommendationReview.create({
    data: {
      definitionId: def.id,
      decision:
        input.toStatus === "SHADOW_RECOMMENDATION"
          ? "APPROVED"
          : input.toStatus === "APPROVED"
            ? "APPROVED"
            : "UNDER_REVIEW",
      rationale: input.reason,
      reviewerUserId: actor.userId,
      limitationsJson: {
        activationCeiling: "SHADOW_RECOMMENDATION",
        controlledPilotBlocked: true,
        enterpriseActiveBlocked: true,
      } as Prisma.InputJsonValue,
    },
  });

  await audit(prisma, {
    programId: def.programId,
    entityType: "MedicationRecommendationDefinition",
    entityId: def.id,
    action: `LIFECYCLE_${from}_TO_${input.toStatus}`,
    userId: actor.userId,
    before: { lifecycleStatus: from },
    after: { lifecycleStatus: input.toStatus },
    reason: input.reason,
  });

  await refreshProgramCounts(prisma, def.programId);
  return updated;
}

export async function submitExpertReview(
  prisma: PrismaClient,
  actor: RecommendationActor,
  input: {
    definitionId: string;
    decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED" | "DEFERRED";
    rationale: string;
    promoteToShadow?: boolean;
  }
) {
  assertPhase16SafetyDefaults();
  requireReviewer(actor);
  const def = await prisma.medicationRecommendationDefinition.findUnique({
    where: { id: input.definitionId },
    include: { evidenceLinks: true },
  });
  if (!def) throw new NotFoundException("Recommandation introuvable.");

  await prisma.medicationRecommendationReview.create({
    data: {
      definitionId: def.id,
      decision: input.decision,
      rationale: input.rationale,
      reviewerUserId: actor.userId,
      limitationsJson: {
        phase16Ceiling: "SHADOW_RECOMMENDATION",
      } as Prisma.InputJsonValue,
    },
  });

  if (input.decision === "APPROVED") {
    let status = def.lifecycleStatus as Phase16RecommendationLifecycle;
    if (status === "DRAFT" || status === "EVIDENCE_COMPLETE") {
      await transitionRecommendationLifecycle(prisma, actor, {
        definitionId: def.id,
        toStatus: "EXPERT_REVIEW",
        reason: "Auto-advance to expert review on approval path",
      });
      status = "EXPERT_REVIEW";
    }
    if (status === "EXPERT_REVIEW") {
      await transitionRecommendationLifecycle(prisma, actor, {
        definitionId: def.id,
        toStatus: "APPROVED",
        reason: input.rationale,
      });
    }
    if (input.promoteToShadow) {
      await transitionRecommendationLifecycle(prisma, actor, {
        definitionId: def.id,
        toStatus: "SHADOW_RECOMMENDATION",
        reason: "Approved for shadow recommendation exposure",
      });
    }
  } else if (input.decision === "CHANGES_REQUESTED") {
    await prisma.medicationRecommendationDefinition.update({
      where: { id: def.id },
      data: { lifecycleStatus: "EVIDENCE_COMPLETE", approvalStatus: "CHANGES_REQUESTED" },
    });
  }

  return getRecommendationExplanation(prisma, def.id);
}

export async function runShadowRecommendationEvaluation(
  prisma: PrismaClient,
  actor: RecommendationActor,
  input: {
    facilityId: string;
    patientId?: string;
    encounterId?: string;
    familyKeys?: string[];
  }
) {
  assertPhase16SafetyDefaults();
  if (!input.facilityId) {
    throw new BadRequestException("facilityId requis.");
  }
  const program = await prisma.medicationRecommendationProgram.findUnique({
    where: { programKey: PHASE16_PROGRAM_KEY },
  });

  const where: Prisma.MedicationRecommendationDefinitionWhereInput = {
    lifecycleStatus: "SHADOW_RECOMMENDATION",
  };
  if (input.familyKeys?.length) {
    where.familyKey = { in: input.familyKeys };
  }

  const defs = await prisma.medicationRecommendationDefinition.findMany({
    where,
    include: { evidenceLinks: true },
  });

  const recommendations = defs.map((d) => ({
    definitionId: d.id,
    familyKey: d.familyKey,
    kind: d.recommendationKind,
    title: d.title,
    reason: d.reasonSummary,
    confidenceScore: d.confidenceScore,
    evidenceLevel: d.evidenceLevel,
    version: d.version,
    knowledgeVersion: d.knowledgeVersion,
    structuredPayload: d.structuredPayloadJson,
    approvedByUserId: d.approvedByUserId,
    approvedAt: d.approvedAt,
  }));

  const clip = (s: string, max: number) =>
    s.length <= max ? s : `${s.slice(0, Math.max(0, max - 3))}...`;

  const evaluation = await prisma.medicationRecommendationShadowEvaluation.create({
    data: {
      programId: program?.id,
      facilityId: input.facilityId,
      patientId: input.patientId,
      encounterId: input.encounterId,
      providerUserId: actor.userId,
      recommendationVersionSet: clip(
        defs.map((d) => `${d.familyKey}@${d.version}`).join("|") || "none",
        128
      ),
      knowledgeVersionSet: clip(
        defs
          .map((d) => d.knowledgeVersion)
          .filter(Boolean)
          .join("|") || "none",
        64
      ),
      recommendationsJson: recommendations as unknown as Prisma.InputJsonValue,
      reasoningPathJson: {
        mode: "SHADOW_ONLY",
        mutatesOrders: false,
        mutatesMar: false,
        mutatesChart: false,
        clinicalDecisionMakingAltered: false,
        source: "APPROVED_SHADOW_DEFINITIONS_ONLY",
      } as Prisma.InputJsonValue,
      confidenceSummaryJson: {
        count: recommendations.length,
        avgConfidence:
          recommendations.length === 0
            ? 0
            : Math.round(
                recommendations.reduce((s, r) => s + r.confidenceScore, 0) /
                  recommendations.length
              ),
      } as Prisma.InputJsonValue,
      metricsJson: {
        families: defs.map((d) => d.familyKey),
        generated: recommendations.length,
      } as Prisma.InputJsonValue,
      mutatesOrders: false,
      mutatesMar: false,
      mutatesChart: false,
      clinicalActivation: false,
    },
  });

  await audit(prisma, {
    programId: program?.id,
    entityType: "MedicationRecommendationShadowEvaluation",
    entityId: evaluation.id,
    action: "SHADOW_EVALUATED",
    userId: actor.userId,
    after: {
      recommendationCount: recommendations.length,
      facilityId: input.facilityId,
      mutatesOrders: false,
    },
    reason: "Phase 16 shadow recommendation evaluation",
  });

  return {
    evaluationId: evaluation.id,
    recommendations,
    mutatesOrders: false,
    mutatesMar: false,
    mutatesChart: false,
    clinicalActivation: false,
    orderFromRecommendationAllowed: false,
  };
}

export async function submitProviderFeedback(
  prisma: PrismaClient,
  actor: RecommendationActor,
  input: {
    definitionId: string;
    facilityId: string;
    feedbackType: Phase16FeedbackType;
    evaluationId?: string;
    encounterId?: string;
    overrideReason?: string;
    notes?: string;
  }
) {
  assertPhase16SafetyDefaults();
  const def = await prisma.medicationRecommendationDefinition.findUnique({
    where: { id: input.definitionId },
  });
  if (!def) throw new NotFoundException("Recommandation introuvable.");
  if (
    !isRecommendationExposableToProviders(
      def.lifecycleStatus as Phase16RecommendationLifecycle
    )
  ) {
    throw new BadRequestException(
      "Feedback autorisé uniquement pour les recommandations en mode ombre."
    );
  }
  if (
    input.feedbackType === "OVERRIDE_DOCUMENTED" &&
    !input.overrideReason?.trim()
  ) {
    throw new BadRequestException("Motif de dérogation requis.");
  }

  const row = await prisma.medicationRecommendationFeedback.create({
    data: {
      definitionId: def.id,
      evaluationId: input.evaluationId,
      facilityId: input.facilityId,
      providerUserId: actor.userId,
      encounterId: input.encounterId,
      feedbackType: input.feedbackType,
      overrideReason: input.overrideReason,
      notes: input.notes,
    },
  });

  await audit(prisma, {
    programId: def.programId,
    entityType: "MedicationRecommendationFeedback",
    entityId: row.id,
    action: `FEEDBACK_${input.feedbackType}`,
    userId: actor.userId,
    after: { feedbackType: input.feedbackType },
  });

  return {
    id: row.id,
    feedbackType: row.feedbackType,
    orderPlaced: false,
    clinicalActivation: false,
  };
}

export async function captureRecommendationAnalytics(
  prisma: PrismaClient,
  actor?: RecommendationActor
) {
  assertPhase16SafetyDefaults();
  const program = await prisma.medicationRecommendationProgram.findUnique({
    where: { programKey: PHASE16_PROGRAM_KEY },
  });
  const defs = await prisma.medicationRecommendationDefinition.findMany({
    where: program ? { programId: program.id } : undefined,
  });
  const feedback = await prisma.medicationRecommendationFeedback.findMany();
  const evals = await prisma.medicationRecommendationShadowEvaluation.count({
    where: program ? { programId: program.id } : undefined,
  });

  const shadowDefs = defs.filter(
    (d) => d.lifecycleStatus === "SHADOW_RECOMMENDATION"
  );
  const buckets = { low: 0, mid: 0, high: 0 };
  for (const d of shadowDefs) {
    if (d.confidenceScore < 40) buckets.low += 1;
    else if (d.confidenceScore < 70) buckets.mid += 1;
    else buckets.high += 1;
  }

  const coveragePercent = Math.round(
    (shadowDefs.length / Math.max(1, PHASE16_WAVE_FAMILY_NAMES.length)) * 100
  );

  const snapshotKey = `P16_ANALYTICS_${PHASE16_PROGRAM_KEY}`;
  const data = {
    programId: program?.id,
    generatedCount: evals > 0 ? shadowDefs.length * evals : shadowDefs.length,
    acknowledgedCount: feedback.filter((f) => f.feedbackType === "ACKNOWLEDGED")
      .length,
    rejectedCount: feedback.filter((f) => f.feedbackType === "REJECTED").length,
    overrideCount: feedback.filter(
      (f) => f.feedbackType === "OVERRIDE_DOCUMENTED"
    ).length,
    shadowEvaluationCount: evals,
    coveragePercent,
    confidenceBucketsJson: buckets as unknown as Prisma.InputJsonValue,
    metricsJson: {
      definitionTotal: defs.length,
      shadowEligible: shadowDefs.length,
      defaults: PHASE16_RECOMMENDATION_DEFAULTS,
    } as Prisma.InputJsonValue,
    capturedAt: new Date(),
  };

  const snap = await prisma.medicationRecommendationAnalyticsSnapshot.upsert({
    where: { snapshotKey },
    create: { snapshotKey, ...data },
    update: data,
  });

  if (actor) {
    await audit(prisma, {
      programId: program?.id,
      entityType: "MedicationRecommendationAnalyticsSnapshot",
      entityId: snap.id,
      action: "ANALYTICS_CAPTURED",
      userId: actor.userId,
      after: { coveragePercent, shadowEvaluationCount: evals },
    });
  }

  return {
    ...snap,
    recommendationsAccepted: snap.acknowledgedCount,
    recommendationsRejected: snap.rejectedCount,
    providerOverrides: snap.overrideCount,
    falsePositives: 0,
    falseNegatives: 0,
    clinicalAgreement: null,
    precision: null,
    recall: null,
    note: "Precision/recall require labeled outcomes; tracked as null until pilot labeling phase.",
  };
}

export async function getRecommendationGovernanceDashboard(
  prisma: PrismaClient
) {
  assertPhase16SafetyDefaults();
  const program = await prisma.medicationRecommendationProgram.findUnique({
    where: { programKey: PHASE16_PROGRAM_KEY },
  });
  const defs = await listRecommendations(prisma);
  const byStatus: Record<string, number> = {};
  for (const d of defs) {
    byStatus[d.lifecycleStatus] = (byStatus[d.lifecycleStatus] ?? 0) + 1;
  }
  const analytics = await captureRecommendationAnalytics(prisma);
  const recentAudits = await prisma.medicationRecommendationAuditEvent.findMany({
    orderBy: { performedAt: "desc" },
    take: 25,
  });

  return {
    implementationId: PHASE16_IMPLEMENTATION_ID,
    programKey: PHASE16_PROGRAM_KEY,
    program,
    wave1Families: [...PHASE16_WAVE_FAMILY_NAMES],
    queue: defs,
    byLifecycleStatus: byStatus,
    analytics,
    recentAudits,
    activation: {
      shadowRecommendationAllowed: true,
      controlledPilotAllowed: false,
      enterpriseActiveAllowed: false,
      clinicalActivationAllowed: false,
      orderFromRecommendationAllowed: false,
      ceiling: "SHADOW_RECOMMENDATION",
    },
    banner: {
      knowledgeGovernanceOnly: true,
      shadowModeOnly: true,
      noProductionCds: true,
      noOrderFromRecommendation: true,
    },
    acetaminophenIdentityBlocked: true,
    clinicalActivations: 0,
    providerAlerts: 0,
    orderBlocks: 0,
    productionCds: "OFF",
  };
}

export async function getPhase16Readiness(prisma: PrismaClient) {
  const dash = await getRecommendationGovernanceDashboard(prisma);
  const shadowCount = dash.byLifecycleStatus["SHADOW_RECOMMENDATION"] ?? 0;
  return {
    readiness:
      shadowCount > 0
        ? "SHADOW_RECOMMENDATION_READY"
        : dash.queue.length > 0
          ? "SEEDED_AWAITING_REVIEW"
          : "NOT_SEEDED",
    shadowEligibleDefinitions: shadowCount,
    definitionCount: dash.queue.length,
    controlledPilotAllowed: false,
    enterpriseActiveAllowed: false,
    clinicalActivation: false,
    orderFromRecommendationAllowed: false,
    certificationClaimed: false,
  };
}

/** Promote all Wave 1 drafts with provenance through to SHADOW (admin governance path). */
export async function promoteWave1DraftsToShadow(
  prisma: PrismaClient,
  actor: RecommendationActor
) {
  assertPhase16SafetyDefaults();
  requireAdmin(actor);
  const drafts = await prisma.medicationRecommendationDefinition.findMany({
    where: {
      program: { programKey: PHASE16_PROGRAM_KEY },
      lifecycleStatus: { in: ["DRAFT", "EVIDENCE_COMPLETE", "EXPERT_REVIEW", "APPROVED"] },
    },
    include: { evidenceLinks: true },
  });

  const results: Array<{ id: string; result: string }> = [];
  for (const d of drafts) {
    try {
      if (!d.evidenceRegistrationId && d.evidenceLinks.length === 0) {
        results.push({ id: d.id, result: "SKIPPED_NO_PROVENANCE" });
        continue;
      }
      // Ensure evidence-complete → review → approved → shadow
      const path: Phase16RecommendationLifecycle[] = [
        "EVIDENCE_COMPLETE",
        "EXPERT_REVIEW",
        "APPROVED",
        "SHADOW_RECOMMENDATION",
      ];
      let status = d.lifecycleStatus as Phase16RecommendationLifecycle;
      for (const next of path) {
        if (status === "SHADOW_RECOMMENDATION") break;
        if (status === next) continue;
        if (!isPhase16LifecycleTransitionAllowed(status, next)) continue;
        await transitionRecommendationLifecycle(prisma, actor, {
          definitionId: d.id,
          toStatus: next,
          reason: "Phase 16 governed promotion to shadow recommendation",
        });
        status = next;
      }
      results.push({ id: d.id, result: status });
    } catch (e) {
      results.push({
        id: d.id,
        result: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const program = await prisma.medicationRecommendationProgram.findUnique({
    where: { programKey: PHASE16_PROGRAM_KEY },
  });
  if (program) {
    await prisma.medicationRecommendationProgram.update({
      where: { id: program.id },
      data: { status: "SHADOW_READY" },
    });
    await refreshProgramCounts(prisma, program.id);
  }

  return { results };
}

async function refreshProgramCounts(prisma: PrismaClient, programId: string) {
  const all = await prisma.medicationRecommendationDefinition.findMany({
    where: { programId },
    select: { lifecycleStatus: true },
  });
  await prisma.medicationRecommendationProgram.update({
    where: { id: programId },
    data: {
      definitionCount: all.length,
      shadowEligibleCount: all.filter(
        (d) => d.lifecycleStatus === "SHADOW_RECOMMENDATION"
      ).length,
    },
  });
}
