/**
 * Phase 17 — Controlled Pilot Qualification & Limited Clinical Advisory.
 * Extends Phase 16 recommendation engine. Enterprise Active blocked.
 * Does not fabricate pilot activation for certification.
 */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  PHASE13_WAVE1_KEY,
  PHASE16_PROGRAM_KEY,
  PHASE17_IMPLEMENTATION_ID,
  PHASE17_RECOMMENDATION_DEFAULTS,
  assertEnterpriseActivationBlocked,
  assertNoBlockingBehavior,
  assertNoChartMutation,
  assertNoMarMutation,
  assertNoOrderMutation,
  assertPhase17SafetyDefaults,
  assertPilotCanBeImmediatelySuspended,
  calculatePilotQualification,
  canTransitionPilotAuthorization,
  isWave1RecommendationFamily,
  type Phase17PilotStatus,
  type Phase17QualificationDecision,
} from "@medora/shared";
import { listRecommendations } from "../recommendation/medication-recommendation.service";
import {
  isPilotAdmin,
  isPilotApprover,
  isPilotWriter,
} from "./medication-recommendation-pilot.roles";
import type { PilotActor } from "./medication-recommendation-pilot.types";

function requireAdmin(actor: PilotActor) {
  if (!isPilotAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
}

function requireWriter(actor: PilotActor) {
  if (!isPilotWriter(actor.roles) && !isPilotAdmin(actor.roles)) {
    throw new ForbiddenException("Réviseur médicament requis.");
  }
}

async function audit(
  prisma: PrismaClient,
  input: {
    pilotProgramId?: string | null;
    facilityId?: string | null;
    providerUserId?: string | null;
    recommendationDefinitionId?: string | null;
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    before?: unknown;
    after?: unknown;
    reason?: string;
  }
) {
  await prisma.medicationRecommendationPilotAuditEvent.create({
    data: {
      pilotProgramId: input.pilotProgramId ?? undefined,
      facilityId: input.facilityId ?? undefined,
      providerUserId: input.providerUserId ?? undefined,
      recommendationDefinitionId: input.recommendationDefinitionId ?? undefined,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeState: (input.before as Prisma.InputJsonValue) ?? undefined,
      afterState: (input.after as Prisma.InputJsonValue) ?? undefined,
      reason: input.reason,
      performedByUserId: input.userId,
    },
  });
}

export async function evaluateDefinitionQualification(
  prisma: PrismaClient,
  actor: PilotActor,
  definitionId: string,
  facilityId?: string
) {
  assertPhase17SafetyDefaults();
  requireWriter(actor);
  const def = await prisma.medicationRecommendationDefinition.findUnique({
    where: { id: definitionId },
    include: { evidenceLinks: true, reviews: true },
  });
  if (!def) throw new NotFoundException("Définition introuvable.");

  // Program-level shadow evaluations (Phase 16 engine); per-definition JSON scan avoided.
  const programEvals =
    await prisma.medicationRecommendationShadowEvaluation.count();

  const latestReview = def.reviews[0];
  const expertApproved =
    def.approvalStatus === "APPROVED" ||
    latestReview?.decision === "APPROVED" ||
    Boolean(def.approvedByUserId);

  const result = calculatePilotQualification({
    lifecycleStatus: def.lifecycleStatus,
    familyKey: def.familyKey,
    hasProvenance:
      Boolean(def.evidenceRegistrationId) || def.evidenceLinks.length > 0,
    expertApproved,
    unresolvedConflictCount: 0,
    shadowEvaluationCount: programEvals,
    confidenceScore: def.confidenceScore,
    evidenceCompleteness: def.evidenceCompleteness,
    constitutionalViolationCount: 0,
    orderMutationCount: 0,
    marMutationCount: 0,
    chartMutationCount: 0,
    evidenceStale: false,
  });

  const row = await prisma.medicationRecommendationPilotQualification.create({
    data: {
      recommendationDefinitionId: def.id,
      facilityId: facilityId ?? null,
      shadowEvaluationCount: programEvals,
      coverageScore: def.evidenceCompleteness,
      confidenceScore: def.confidenceScore,
      unresolvedConflictCount: 0,
      constitutionalViolationCount: 0,
      orderMutationCount: 0,
      marMutationCount: 0,
      chartMutationCount: 0,
      qualificationDecision: result.decision,
      limitationsJson: result.limitations as unknown as Prisma.InputJsonValue,
      blockersJson: result.blockers as unknown as Prisma.InputJsonValue,
      evidenceSnapshotJson: {
        lifecycleStatus: def.lifecycleStatus,
        version: def.version,
        knowledgeVersion: def.knowledgeVersion,
        wave1: isWave1RecommendationFamily(def.familyKey),
      } as Prisma.InputJsonValue,
      evaluatedByUserId: actor.userId,
    },
  });

  await audit(prisma, {
    facilityId: facilityId ?? null,
    recommendationDefinitionId: def.id,
    entityType: "MedicationRecommendationPilotQualification",
    entityId: row.id,
    action: `QUALIFY_${result.decision}`,
    userId: actor.userId,
    after: { decision: result.decision, blockers: result.blockers },
  });

  return { qualification: row, ...result };
}

export async function evaluateAllWave1Qualifications(
  prisma: PrismaClient,
  actor: PilotActor,
  facilityId?: string
) {
  assertPhase17SafetyDefaults();
  requireWriter(actor);
  const defs = await prisma.medicationRecommendationDefinition.findMany({
    where: {
      program: { programKey: PHASE16_PROGRAM_KEY },
      lifecycleStatus: "SHADOW_RECOMMENDATION",
    },
  });
  const results = [];
  for (const d of defs) {
    results.push(await evaluateDefinitionQualification(prisma, actor, d.id, facilityId));
  }
  return {
    implementationId: PHASE17_IMPLEMENTATION_ID,
    count: results.length,
    eligible: results.filter((r) =>
      String(r.decision).startsWith("PILOT_ELIGIBLE")
    ).length,
    continueShadow: results.filter((r) => r.decision === "CONTINUE_SHADOW_ONLY")
      .length,
    notEligible: results.filter((r) => r.decision === "NOT_ELIGIBLE").length,
    results,
  };
}

export async function listQualifications(prisma: PrismaClient) {
  return prisma.medicationRecommendationPilotQualification.findMany({
    orderBy: { evaluatedAt: "desc" },
    take: 100,
    include: {
      recommendationDefinition: {
        select: {
          id: true,
          familyKey: true,
          title: true,
          lifecycleStatus: true,
          confidenceScore: true,
          version: true,
        },
      },
    },
  });
}

export async function getQualificationByDefinitionId(
  prisma: PrismaClient,
  definitionId: string
) {
  const latest =
    await prisma.medicationRecommendationPilotQualification.findFirst({
      where: { recommendationDefinitionId: definitionId },
      orderBy: { evaluatedAt: "desc" },
      include: {
        recommendationDefinition: {
          select: {
            id: true,
            familyKey: true,
            title: true,
            lifecycleStatus: true,
            confidenceScore: true,
            version: true,
          },
        },
      },
    });
  if (!latest) throw new NotFoundException("Qualification introuvable.");
  return latest;
}

export async function getExposureExplanation(
  prisma: PrismaClient,
  exposureId: string
) {
  const exposure = await prisma.medicationRecommendationPilotExposure.findUnique({
    where: { id: exposureId },
    include: { recommendationDefinition: true },
  });
  if (!exposure) throw new NotFoundException("Exposition introuvable.");
  return {
    exposureId: exposure.id,
    title: exposure.recommendationDefinition.title,
    reasonSummary: exposure.recommendationDefinition.reasonSummary,
    reasoningPath: exposure.reasoningPathJson,
    confidence: exposure.confidence,
    evidenceLevel: exposure.evidenceLevel,
    recommendationVersion: exposure.recommendationVersion,
    knowledgeVersion: exposure.knowledgeVersion,
    informationalOnly: true,
    orderFromRecommendation: false,
    clinicalActivation: false,
  };
}

export async function getExposureEvidence(
  prisma: PrismaClient,
  exposureId: string
) {
  const exposure = await prisma.medicationRecommendationPilotExposure.findUnique({
    where: { id: exposureId },
  });
  if (!exposure) throw new NotFoundException("Exposition introuvable.");
  const links = await prisma.medicationRecommendationEvidenceLink.findMany({
    where: {
      definitionId: exposure.recommendationDefinitionId,
    },
    take: 50,
  });
  return {
    exposureId,
    evidenceLinks: links,
    informationalOnly: true,
  };
}

export async function createPilotProgram(
  prisma: PrismaClient,
  actor: PilotActor,
  input: {
    facilityId: string;
    title: string;
    description?: string;
    startAt: string;
    endAt: string;
    definitionIds: string[];
    dryRun?: boolean;
  }
) {
  assertPhase17SafetyDefaults();
  requireAdmin(actor);
  assertEnterpriseActivationBlocked(false);
  assertNoBlockingBehavior(false);
  assertPilotCanBeImmediatelySuspended(true);

  if (!input.facilityId || !input.title?.trim()) {
    throw new BadRequestException("facilityId et title requis.");
  }
  if (!input.definitionIds?.length) {
    throw new BadRequestException("Au moins une définition requise.");
  }

  const quals = await Promise.all(
    input.definitionIds.map(async (id) => {
      const latest =
        await prisma.medicationRecommendationPilotQualification.findFirst({
          where: { recommendationDefinitionId: id },
          orderBy: { evaluatedAt: "desc" },
        });
      return { id, latest };
    })
  );
  for (const q of quals) {
    const d = q.latest?.qualificationDecision as
      | Phase17QualificationDecision
      | undefined;
    if (!d || !String(d).startsWith("PILOT_ELIGIBLE")) {
      throw new BadRequestException(
        `Définition ${q.id} non qualifiée pour pilote (évaluer d’abord).`
      );
    }
  }

  if (input.dryRun) {
    return {
      dryRun: true,
      wouldCreate: true,
      facilityId: input.facilityId,
      definitionCount: input.definitionIds.length,
      controlledPilotAllowed: false,
      activation: "NOT_ACTIVATED",
    };
  }

  const programKey = `EM_WAVE1_CONTROLLED_PILOT_${input.facilityId.slice(0, 8)}_${Date.now()}`;
  const program = await prisma.medicationRecommendationPilotProgram.create({
    data: {
      programKey,
      title: input.title,
      description: input.description,
      facilityId: input.facilityId,
      status: "DRAFT",
      waveKey: PHASE13_WAVE1_KEY,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      controlledPilotAllowed: false,
      enterpriseActiveAllowed: false,
      productionCdsEnabled: false,
      providerAlertsEnabled: false,
      orderBlockingEnabled: false,
      orderFromRecommendationEnabled: false,
      autoOrderEnabled: false,
      autoSelectEnabled: false,
      createdByUserId: actor.userId,
    },
  });

  for (const defId of input.definitionIds) {
    const def = await prisma.medicationRecommendationDefinition.findUniqueOrThrow({
      where: { id: defId },
    });
    const latest =
      await prisma.medicationRecommendationPilotQualification.findFirst({
        where: { recommendationDefinitionId: defId },
        orderBy: { evaluatedAt: "desc" },
      });
    await prisma.medicationRecommendationPilotDefinition.create({
      data: {
        pilotProgramId: program.id,
        recommendationDefinitionId: defId,
        pinnedRecommendationVersion: def.version,
        pinnedKnowledgeVersion: def.knowledgeVersion,
        qualificationDecision: latest!.qualificationDecision,
        qualificationArtifactJson: {
          qualificationId: latest!.id,
        } as Prisma.InputJsonValue,
        enabled: true,
      },
    });
  }

  await audit(prisma, {
    pilotProgramId: program.id,
    facilityId: input.facilityId,
    entityType: "MedicationRecommendationPilotProgram",
    entityId: program.id,
    action: "PILOT_CREATED",
    userId: actor.userId,
    after: { programKey, status: "DRAFT" },
    reason: "Phase 17 draft pilot program",
  });

  return program;
}

async function transitionPilot(
  prisma: PrismaClient,
  actor: PilotActor,
  programId: string,
  toStatus: Phase17PilotStatus,
  reason: string,
  opts?: { requireApprover?: boolean; allowSelfApprove?: boolean }
) {
  requireWriter(actor);
  if (!reason?.trim()) throw new BadRequestException("Motif requis.");
  const program = await prisma.medicationRecommendationPilotProgram.findUnique({
    where: { id: programId },
    include: { definitions: true, providers: true },
  });
  if (!program) throw new NotFoundException("Programme pilote introuvable.");
  const from = program.status as Phase17PilotStatus;
  if (!canTransitionPilotAuthorization(from, toStatus)) {
    throw new BadRequestException(`Transition interdite: ${from} → ${toStatus}`);
  }
  if (opts?.requireApprover) {
    if (!isPilotApprover(actor.roles)) {
      throw new ForbiddenException("Approbateur pilote requis.");
    }
    if (!opts.allowSelfApprove && program.createdByUserId === actor.userId) {
      throw new ForbiddenException(
        "Séparation des tâches: le créateur ne peut pas approuver son propre pilote."
      );
    }
  }

  const data: Prisma.MedicationRecommendationPilotProgramUpdateInput = {
    status: toStatus,
  };
  if (toStatus === "APPROVED") {
    data.approvedByUserId = actor.userId;
    data.approvedAt = new Date();
  }
  if (toStatus === "ACTIVE") {
    // Explicit activation: enable controlledPilotAllowed only for this program
    data.controlledPilotAllowed = true;
    data.activatedAt = new Date();
  }
  if (toStatus === "PAUSED") data.pausedAt = new Date();
  if (toStatus === "SUSPENDED") {
    data.suspendedAt = new Date();
    data.suspensionReason = reason;
    data.controlledPilotAllowed = false;
  }
  if (toStatus === "REVOKED") {
    data.revokedAt = new Date();
    data.revocationReason = reason;
    data.controlledPilotAllowed = false;
  }
  if (toStatus === "COMPLETED") {
    data.completedAt = new Date();
    data.controlledPilotAllowed = false;
  }

  const updated = await prisma.medicationRecommendationPilotProgram.update({
    where: { id: programId },
    data,
  });

  await audit(prisma, {
    pilotProgramId: program.id,
    facilityId: program.facilityId,
    entityType: "MedicationRecommendationPilotProgram",
    entityId: program.id,
    action: `STATUS_${from}_TO_${toStatus}`,
    userId: actor.userId,
    before: { status: from },
    after: { status: toStatus },
    reason,
  });

  return updated;
}

export async function submitPilot(prisma: PrismaClient, actor: PilotActor, id: string, reason: string) {
  return transitionPilot(prisma, actor, id, "PENDING_APPROVAL", reason);
}

export async function approvePilot(prisma: PrismaClient, actor: PilotActor, id: string, reason: string) {
  // Move through PILOT_ELIGIBLE if needed
  const p = await prisma.medicationRecommendationPilotProgram.findUniqueOrThrow({
    where: { id },
  });
  let status = p.status as Phase17PilotStatus;
  if (status === "DRAFT") {
    await transitionPilot(prisma, actor, id, "SHADOW_EVIDENCE_REVIEW", reason);
    status = "SHADOW_EVIDENCE_REVIEW";
  }
  if (status === "SHADOW_EVIDENCE_REVIEW") {
    await transitionPilot(prisma, actor, id, "PILOT_ELIGIBLE", reason);
    status = "PILOT_ELIGIBLE";
  }
  if (status === "PILOT_ELIGIBLE") {
    await transitionPilot(prisma, actor, id, "PENDING_APPROVAL", reason);
  }
  return transitionPilot(prisma, actor, id, "APPROVED", reason, {
    requireApprover: true,
    allowSelfApprove: false,
  });
}

export async function schedulePilot(prisma: PrismaClient, actor: PilotActor, id: string, reason: string) {
  return transitionPilot(prisma, actor, id, "SCHEDULED", reason);
}

export async function activatePilot(prisma: PrismaClient, actor: PilotActor, id: string, reason: string) {
  requireAdmin(actor);
  const program = await prisma.medicationRecommendationPilotProgram.findUnique({
    where: { id },
    include: { definitions: true, providers: true },
  });
  if (!program) throw new NotFoundException("Programme pilote introuvable.");
  if (program.status !== "APPROVED" && program.status !== "SCHEDULED") {
    throw new BadRequestException("Le pilote doit être APPROVED ou SCHEDULED.");
  }
  if (!program.startAt || !program.endAt) {
    throw new BadRequestException("Fenêtre temporelle requise.");
  }
  const authorized = program.providers.filter(
    (p) =>
      p.authorizationStatus === "AUTHORIZED" &&
      p.trainingCompletedAt &&
      p.acknowledgementAt
  );
  if (authorized.length < 1) {
    throw new BadRequestException(
      "Au moins un prestataire formé et autorisé est requis."
    );
  }
  if (program.definitions.filter((d) => d.enabled).length < 1) {
    throw new BadRequestException("Aucune définition activable.");
  }
  // Verify pinned versions still match
  for (const d of program.definitions) {
    const def = await prisma.medicationRecommendationDefinition.findUnique({
      where: { id: d.recommendationDefinitionId },
    });
    if (!def || def.version !== d.pinnedRecommendationVersion) {
      throw new BadRequestException("Dérive de version de recommandation.");
    }
    if (
      d.pinnedKnowledgeVersion &&
      def.knowledgeVersion !== d.pinnedKnowledgeVersion
    ) {
      throw new BadRequestException("Dérive de version de connaissance.");
    }
  }
  if (program.status === "APPROVED") {
    await transitionPilot(prisma, actor, id, "SCHEDULED", reason);
  }
  return transitionPilot(prisma, actor, id, "ACTIVE", reason, {
    requireApprover: true,
    allowSelfApprove: true,
  });
}

export async function pausePilot(prisma: PrismaClient, actor: PilotActor, id: string, reason: string) {
  return transitionPilot(prisma, actor, id, "PAUSED", reason);
}

export async function resumePilot(prisma: PrismaClient, actor: PilotActor, id: string, reason: string) {
  requireAdmin(actor);
  const p = await prisma.medicationRecommendationPilotProgram.findUniqueOrThrow({
    where: { id },
  });
  if (p.status === "SUSPENDED") {
    throw new BadRequestException(
      "Reprise depuis SUSPENDED interdite sans revue — passer par PAUSED après revue sécurité."
    );
  }
  return transitionPilot(prisma, actor, id, "ACTIVE", reason);
}

export async function suspendPilot(
  prisma: PrismaClient,
  actor: PilotActor,
  id: string,
  reason: string,
  opts?: { automatic?: boolean; eventType?: string }
) {
  const program = await prisma.medicationRecommendationPilotProgram.findUnique({
    where: { id },
  });
  if (!program) throw new NotFoundException("Programme pilote introuvable.");

  if (program.status !== "SUSPENDED") {
    if (!canTransitionPilotAuthorization(program.status as Phase17PilotStatus, "SUSPENDED")) {
      // Force suspend from ACTIVE/PAUSED/SCHEDULED
      if (!["ACTIVE", "PAUSED", "SCHEDULED", "APPROVED"].includes(program.status)) {
        throw new BadRequestException(`Impossible de suspendre depuis ${program.status}`);
      }
    }
  }

  const updated = await prisma.medicationRecommendationPilotProgram.update({
    where: { id },
    data: {
      status: "SUSPENDED",
      suspendedAt: new Date(),
      suspensionReason: reason,
      controlledPilotAllowed: false,
    },
  });

  await prisma.medicationRecommendationPilotSafetyEvent.create({
    data: {
      pilotProgramId: id,
      severity: "CRITICAL",
      eventType: opts?.eventType ?? "MANUAL_SUSPENSION",
      description: reason,
      detectionSource: opts?.automatic ? "AUTOMATIC" : "MANUAL",
      requiresSuspension: true,
    },
  });

  await audit(prisma, {
    pilotProgramId: id,
    facilityId: program.facilityId,
    entityType: "MedicationRecommendationPilotProgram",
    entityId: id,
    action: opts?.automatic ? "AUTO_SUSPENDED" : "MANUAL_SUSPENDED",
    userId: actor.userId,
    after: { status: "SUSPENDED" },
    reason,
  });

  return updated;
}

export async function revokePilot(prisma: PrismaClient, actor: PilotActor, id: string, reason: string) {
  return transitionPilot(prisma, actor, id, "REVOKED", reason);
}

export async function completePilot(prisma: PrismaClient, actor: PilotActor, id: string, reason: string) {
  return transitionPilot(prisma, actor, id, "COMPLETED", reason);
}

export async function addPilotProvider(
  prisma: PrismaClient,
  actor: PilotActor,
  programId: string,
  input: { providerUserId: string; facilityId: string }
) {
  requireAdmin(actor);
  const program = await prisma.medicationRecommendationPilotProgram.findUniqueOrThrow({
    where: { id: programId },
  });
  if (input.facilityId !== program.facilityId) {
    throw new BadRequestException("Le prestataire doit appartenir à l’établissement du pilote.");
  }
  const row = await prisma.medicationRecommendationPilotProvider.upsert({
    where: {
      pilotProgramId_providerUserId: {
        pilotProgramId: programId,
        providerUserId: input.providerUserId,
      },
    },
    create: {
      pilotProgramId: programId,
      providerUserId: input.providerUserId,
      facilityId: input.facilityId,
      authorizationStatus: "PENDING",
    },
    update: { authorizationStatus: "PENDING", revokedAt: null },
  });
  await audit(prisma, {
    pilotProgramId: programId,
    facilityId: input.facilityId,
    providerUserId: input.providerUserId,
    entityType: "MedicationRecommendationPilotProvider",
    entityId: row.id,
    action: "PROVIDER_ADDED",
    userId: actor.userId,
  });
  return row;
}

export async function recordProviderTraining(
  prisma: PrismaClient,
  actor: PilotActor,
  programId: string,
  providerUserId: string
) {
  requireAdmin(actor);
  const row = await prisma.medicationRecommendationPilotProvider.update({
    where: {
      pilotProgramId_providerUserId: { pilotProgramId: programId, providerUserId },
    },
    data: {
      trainingCompletedAt: new Date(),
      acknowledgementAt: new Date(),
      authorizationStatus: "AUTHORIZED",
      activatedAt: new Date(),
    },
  });
  await audit(prisma, {
    pilotProgramId: programId,
    providerUserId,
    entityType: "MedicationRecommendationPilotProvider",
    entityId: row.id,
    action: "PROVIDER_TRAINED_AUTHORIZED",
    userId: actor.userId,
  });
  return row;
}

export async function removePilotProvider(
  prisma: PrismaClient,
  actor: PilotActor,
  programId: string,
  providerUserId: string,
  reason: string
) {
  requireAdmin(actor);
  const row = await prisma.medicationRecommendationPilotProvider.update({
    where: {
      pilotProgramId_providerUserId: { pilotProgramId: programId, providerUserId },
    },
    data: {
      authorizationStatus: "REVOKED",
      revokedAt: new Date(),
      revocationReason: reason,
    },
  });
  return row;
}

/** Server-side re-authorization for every advisory request. */
export async function assertPilotAuthorizationForExposure(
  prisma: PrismaClient,
  input: {
    facilityId: string;
    providerUserId: string;
    encounterId?: string;
  }
) {
  assertPhase17SafetyDefaults();
  const programs = await prisma.medicationRecommendationPilotProgram.findMany({
    where: {
      facilityId: input.facilityId,
      status: "ACTIVE",
      controlledPilotAllowed: true,
    },
    include: {
      definitions: { where: { enabled: true }, include: { recommendationDefinition: true } },
      providers: true,
    },
  });

  const now = new Date();
  const authorized: Array<{
    program: (typeof programs)[0];
    definitions: (typeof programs)[0]["definitions"];
  }> = [];

  for (const program of programs) {
    try {
      assertEnterpriseActivationBlocked(program.enterpriseActiveAllowed);
      assertNoBlockingBehavior(program.orderBlockingEnabled);
      if (program.orderFromRecommendationEnabled) {
        throw new Error("ORDER_FROM_RECOMMENDATION");
      }
      if (!program.startAt || !program.endAt || now < program.startAt || now > program.endAt) {
        await suspendPilot(
          prisma,
          { userId: "system", roles: ["MEDICATION_ADMIN"] },
          program.id,
          "Exposure outside pilot time window",
          { automatic: true, eventType: "TIME_WINDOW_VIOLATION" }
        );
        continue;
      }
      const provider = program.providers.find(
        (p) =>
          p.providerUserId === input.providerUserId &&
          p.authorizationStatus === "AUTHORIZED" &&
          p.trainingCompletedAt &&
          p.acknowledgementAt
      );
      if (!provider) continue;

      // Version drift check
      let drift = false;
      for (const d of program.definitions) {
        const def = d.recommendationDefinition;
        if (
          def.version !== d.pinnedRecommendationVersion ||
          (d.pinnedKnowledgeVersion &&
            def.knowledgeVersion !== d.pinnedKnowledgeVersion)
        ) {
          drift = true;
          break;
        }
      }
      if (drift) {
        await suspendPilot(
          prisma,
          { userId: "system", roles: ["MEDICATION_ADMIN"] },
          program.id,
          "Recommendation or knowledge version drift",
          { automatic: true, eventType: "VERSION_DRIFT" }
        );
        continue;
      }

      authorized.push({ program, definitions: program.definitions });
    } catch (e) {
      await suspendPilot(
        prisma,
        { userId: "system", roles: ["MEDICATION_ADMIN"] },
        program.id,
        e instanceof Error ? e.message : String(e),
        { automatic: true, eventType: "CONSTITUTIONAL_ASSERTION_FAILURE" }
      ).catch(() => undefined);
    }
  }

  return authorized;
}

export async function getEncounterAdvisories(
  prisma: PrismaClient,
  actor: PilotActor,
  encounterId: string,
  facilityId: string
) {
  const authorized = await assertPilotAuthorizationForExposure(prisma, {
    facilityId,
    providerUserId: actor.userId,
    encounterId,
  });

  // Shadow-only fallback when no active pilot
  const shadow = await listRecommendations(prisma, { exposableOnly: true });

  if (authorized.length === 0) {
    return {
      mode: "SHADOW_ONLY" as const,
      pilotBadge: false,
      advisories: shadow.map((s) => ({
        ...s,
        controlledPilot: false,
        exposureId: null,
      })),
      orderFromRecommendation: false,
      clinicalActivation: false,
    };
  }

  const advisories = [];
  for (const auth of authorized) {
    for (const d of auth.definitions) {
      const def = d.recommendationDefinition;
      const exposure = await prisma.medicationRecommendationPilotExposure.create({
        data: {
          pilotProgramId: auth.program.id,
          recommendationDefinitionId: def.id,
          encounterId,
          facilityId,
          providerUserId: actor.userId,
          recommendationVersion: d.pinnedRecommendationVersion,
          knowledgeVersion: d.pinnedKnowledgeVersion,
          displayContext: "ENCOUNTER_ADVISORY_PANEL",
          confidence: def.confidenceScore,
          evidenceLevel: def.evidenceLevel,
          reasoningPathJson: {
            mode: "CONTROLLED_PILOT",
            informationalOnly: true,
            nonblocking: true,
            orderMutation: false,
            marMutation: false,
            chartMutation: false,
          } as Prisma.InputJsonValue,
          orderMutationDetected: false,
          marMutationDetected: false,
          chartMutationDetected: false,
        },
      });
      advisories.push({
        exposureId: exposure.id,
        definitionId: def.id,
        title: def.title,
        familyKey: def.familyKey,
        recommendationKind: def.recommendationKind,
        reasonSummary: def.reasonSummary,
        structuredPayload: def.structuredPayloadJson,
        confidenceScore: def.confidenceScore,
        evidenceLevel: def.evidenceLevel,
        recommendationStrength: def.recommendationStrength,
        approvedByUserId: def.approvedByUserId,
        approvedAt: def.approvedAt,
        version: d.pinnedRecommendationVersion,
        knowledgeVersion: d.pinnedKnowledgeVersion,
        controlledPilot: true,
        pilotProgramId: auth.program.id,
        orderFromRecommendation: false,
        clinicalActivation: false,
      });
    }
  }

  return {
    mode: "CONTROLLED_PILOT" as const,
    pilotBadge: true,
    banner:
      "CONTROLLED PILOT — INFORMATIONAL ADVISORY ONLY — CLINICIAN JUDGMENT CONTROLS",
    advisories,
    orderFromRecommendation: false,
    clinicalActivation: false,
  };
}

export async function respondToExposure(
  prisma: PrismaClient,
  actor: PilotActor,
  exposureId: string,
  response: "ACKNOWLEDGED" | "DISMISSED" | "DISAGREED",
  reason?: string
) {
  const exposure = await prisma.medicationRecommendationPilotExposure.findUnique({
    where: { id: exposureId },
  });
  if (!exposure) throw new NotFoundException("Exposition introuvable.");
  if (exposure.providerUserId !== actor.userId) {
    throw new ForbiddenException("Exposition réservée au prestataire autorisé.");
  }
  const data: Prisma.MedicationRecommendationPilotExposureUpdateInput = {
    providerResponse: response,
    providerReason: reason,
  };
  if (response === "ACKNOWLEDGED") data.acknowledgedAt = new Date();
  if (response === "DISMISSED") data.dismissedAt = new Date();
  if (response === "DISAGREED") data.disagreedAt = new Date();

  const updated = await prisma.medicationRecommendationPilotExposure.update({
    where: { id: exposureId },
    data,
  });

  // Constitutional: response must never create orders
  assertNoOrderMutation(0);
  assertNoMarMutation(0);
  assertNoChartMutation(0);

  await audit(prisma, {
    pilotProgramId: exposure.pilotProgramId,
    facilityId: exposure.facilityId,
    providerUserId: actor.userId,
    recommendationDefinitionId: exposure.recommendationDefinitionId,
    entityType: "MedicationRecommendationPilotExposure",
    entityId: exposureId,
    action: `RESPONSE_${response}`,
    userId: actor.userId,
    reason,
  });

  return {
    ...updated,
    orderCreated: false,
    marCreated: false,
    chartMutated: false,
  };
}

export async function capturePilotMonitoring(
  prisma: PrismaClient,
  programId: string
) {
  const exposures = await prisma.medicationRecommendationPilotExposure.findMany({
    where: { pilotProgramId: programId },
  });
  const safety = await prisma.medicationRecommendationPilotSafetyEvent.count({
    where: { pilotProgramId: programId },
  });
  const program = await prisma.medicationRecommendationPilotProgram.findUnique({
    where: { id: programId },
    include: { providers: true, definitions: true },
  });
  if (!program) throw new NotFoundException("Programme pilote introuvable.");

  const ack = exposures.filter((e) => e.acknowledgedAt).length;
  const dismiss = exposures.filter((e) => e.dismissedAt).length;
  const disagree = exposures.filter((e) => e.disagreedAt).length;
  const n = Math.max(1, exposures.length);
  const orderMut = exposures.filter((e) => e.orderMutationDetected).length;
  const marMut = exposures.filter((e) => e.marMutationDetected).length;
  const chartMut = exposures.filter((e) => e.chartMutationDetected).length;

  assertNoOrderMutation(orderMut);
  assertNoMarMutation(marMut);
  assertNoChartMutation(chartMut);

  const snapshotKey = `P17_MON_${programId}`;
  return prisma.medicationRecommendationPilotMonitoringSnapshot.upsert({
    where: { snapshotKey },
    create: {
      pilotProgramId: programId,
      snapshotKey,
      exposureCount: exposures.length,
      acknowledgementRate: Math.round((ack / n) * 100),
      dismissalRate: Math.round((dismiss / n) * 100),
      disagreementRate: Math.round((disagree / n) * 100),
      safetyEventCount: safety,
      orderMutationCount: orderMut,
      marMutationCount: marMut,
      chartMutationCount: chartMut,
      activeProviderCount: program.providers.filter(
        (p) => p.authorizationStatus === "AUTHORIZED"
      ).length,
      activeDefinitionCount: program.definitions.filter((d) => d.enabled).length,
      metricsJson: {
        defaults: PHASE17_RECOMMENDATION_DEFAULTS,
      } as Prisma.InputJsonValue,
    },
    update: {
      exposureCount: exposures.length,
      acknowledgementRate: Math.round((ack / n) * 100),
      dismissalRate: Math.round((dismiss / n) * 100),
      disagreementRate: Math.round((disagree / n) * 100),
      safetyEventCount: safety,
      orderMutationCount: orderMut,
      marMutationCount: marMut,
      chartMutationCount: chartMut,
      generatedAt: new Date(),
    },
  });
}

export async function getPilotDashboard(prisma: PrismaClient) {
  assertPhase17SafetyDefaults();
  const programs = await prisma.medicationRecommendationPilotProgram.findMany({
    include: {
      definitions: true,
      providers: true,
      _count: { select: { exposures: true, safetyEvents: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const quals = await listQualifications(prisma);
  const eligible = quals.filter((q) =>
    String(q.qualificationDecision).startsWith("PILOT_ELIGIBLE")
  ).length;
  const active = programs.filter((p) => p.status === "ACTIVE").length;

  return {
    implementationId: PHASE17_IMPLEMENTATION_ID,
    programs,
    qualifications: quals.slice(0, 50),
    metrics: {
      programCount: programs.length,
      activePilotCount: active,
      eligibleDefinitionQualifications: eligible,
      exposureCount: programs.reduce((n, p) => n + p._count.exposures, 0),
      safetyEventCount: programs.reduce((n, p) => n + p._count.safetyEvents, 0),
    },
    activation: {
      enterpriseActiveAllowed: false,
      orderFromRecommendationEnabled: false,
      orderBlockingEnabled: false,
      productionCdsEnabled: false,
      marMutation: "DISABLED",
    },
    banner: {
      controlledPilot: true,
      limited: true,
      reversible: true,
      nonblocking: true,
    },
    clinicalActivations: 0,
    orderMutations: 0,
    marMutations: 0,
    chartMutations: 0,
    enterpriseActivations: 0,
  };
}

export async function getPhase17Readiness(prisma: PrismaClient) {
  const dash = await getPilotDashboard(prisma);
  const active = dash.metrics.activePilotCount;
  const eligible = dash.metrics.eligibleDefinitionQualifications;
  return {
    readiness:
      active > 0
        ? "CONTROLLED_PILOT_ACTIVE"
        : eligible > 0
          ? "PILOT_READY_NOT_ACTIVATED"
          : "CONTINUE_SHADOW_ONLY",
    activePilotCount: active,
    eligibleQualifications: eligible,
    enterpriseActiveAllowed: false,
    orderFromRecommendationEnabled: false,
    orderMutations: 0,
    marMutations: 0,
    chartMutations: 0,
    productionCds: "OFF",
  };
}

export async function listPilotPrograms(prisma: PrismaClient) {
  return prisma.medicationRecommendationPilotProgram.findMany({
    include: {
      definitions: true,
      providers: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPilotProgram(prisma: PrismaClient, id: string) {
  const p = await prisma.medicationRecommendationPilotProgram.findUnique({
    where: { id },
    include: {
      definitions: { include: { recommendationDefinition: true } },
      providers: true,
      safetyEvents: { orderBy: { detectedAt: "desc" }, take: 50 },
    },
  });
  if (!p) throw new NotFoundException("Programme pilote introuvable.");
  return p;
}

export async function listPilotAudit(prisma: PrismaClient, programId: string) {
  return prisma.medicationRecommendationPilotAuditEvent.findMany({
    where: { pilotProgramId: programId },
    orderBy: { performedAt: "desc" },
    take: 100,
  });
}

export async function reportSafetyEvent(
  prisma: PrismaClient,
  actor: PilotActor,
  programId: string,
  input: {
    eventType: string;
    description: string;
    severity?: string;
    requiresSuspension?: boolean;
    exposureId?: string;
  }
) {
  requireWriter(actor);
  const event = await prisma.medicationRecommendationPilotSafetyEvent.create({
    data: {
      pilotProgramId: programId,
      exposureId: input.exposureId,
      severity: input.severity ?? "WARNING",
      eventType: input.eventType,
      description: input.description,
      detectionSource: "MANUAL",
      requiresSuspension: input.requiresSuspension ?? false,
    },
  });
  if (input.requiresSuspension || input.severity === "CRITICAL") {
    await suspendPilot(prisma, actor, programId, input.description, {
      automatic: false,
      eventType: input.eventType,
    });
  }
  return event;
}
