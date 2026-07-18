/**
 * Phase 15 Part 2A — Wave 1 remediation engine.
 * Reads Phase 14B gap registry; never fabricates clinical knowledge.
 */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  PHASE13_WAVE1_KEY,
  PHASE14B_SYNTHETIC_BATCH_KEY,
  PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS,
  PHASE15_PROGRAM_KEY,
  PHASE15_PROGRAM_VERSION,
  PHASE15_WAVE_FAMILY_NAMES,
  assertPhase15NoAcetaminophenResolution,
  assertPhase15NoFabricatedFacts,
  assertPhase15NoWorkflowControl,
  assertPhase15Wave1Only,
  canTransitionRemediationWorkItem,
  classifyPhase14BGapForRemediation,
  evaluateWave1RemediationReadinessTarget,
  requiresAuthoritativeSourceBeforeRemediation,
  type Phase15WorkItemStatus,
} from "@medora/shared";
import { isRemediationAdmin } from "./medication-remediation.roles";
import { isAuthoritativeRegistrationStatus } from "./medication-source-lifecycle.service";
import type { RemediationActor } from "./medication-source-lifecycle.service";

function requireAdmin(actor: RemediationActor) {
  if (!isRemediationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
}

function assertSafetyDefaults() {
  assertPhase15NoWorkflowControl(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.knowledgeControlsPatientCare
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
  await prisma.medicationRemediationAuditEvent.create({
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

async function refreshProgramCounts(
  prisma: PrismaClient,
  programId: string
) {
  const items = await prisma.medicationRemediationWorkItem.findMany({
    where: { programId },
    select: { status: true },
  });
  const openWorkItemCount = items.filter(
    (i) =>
      i.status !== "RESOLVED" &&
      i.status !== "CANCELLED" &&
      i.status !== "DEFERRED"
  ).length;
  const resolvedWorkItemCount = items.filter(
    (i) => i.status === "RESOLVED"
  ).length;
  const blockedWorkItemCount = items.filter(
    (i) => i.status === "BLOCKED_PENDING_AUTHORITATIVE_SOURCE"
  ).length;
  return prisma.medicationRemediationProgram.update({
    where: { id: programId },
    data: {
      openWorkItemCount,
      resolvedWorkItemCount,
      blockedWorkItemCount,
      status:
        openWorkItemCount === 0 && resolvedWorkItemCount > 0
          ? "COMPLETED"
          : blockedWorkItemCount > 0
            ? "BLOCKED"
            : "IN_REMEDIATION",
    },
  });
}

export async function createOrGetRemediationProgram(
  prisma: PrismaClient,
  actor: RemediationActor
) {
  requireAdmin(actor);
  assertSafetyDefaults();

  const existing = await prisma.medicationRemediationProgram.findUnique({
    where: { programKey: PHASE15_PROGRAM_KEY },
  });
  if (existing) return existing;

  const created = await prisma.medicationRemediationProgram.create({
    data: {
      programKey: PHASE15_PROGRAM_KEY,
      name: "Wave 1 authoritative source remediation",
      description:
        "Phase 15 Part 2A remediation of Phase 14B Tier-1 knowledge gaps. No CDS.",
      waveKey: PHASE13_WAVE1_KEY,
      status: "PLANNED",
      programVersion: PHASE15_PROGRAM_VERSION,
      targetFamilyCount: PHASE15_WAVE_FAMILY_NAMES.length,
      clinicalActivationAllowed: false,
      providerFacingAlertsAllowed: false,
      orderBlockingAllowed: false,
      knowledgeControlsPatientCare: false,
      createdByUserId: actor.userId,
    },
  });

  await audit(prisma, {
    programId: created.id,
    entityType: "MedicationRemediationProgram",
    entityId: created.id,
    action: "PROGRAM_CREATED",
    userId: actor.userId,
    after: { programKey: PHASE15_PROGRAM_KEY },
  });

  return created;
}

/** List open Phase 14B shadow gap links for Wave 1 remediation seeding. */
export async function listOpenPhase14BShadowGaps(prisma: PrismaClient) {
  const batch = await prisma.medicationShadowEvaluationBatch.findUnique({
    where: { batchKey: PHASE14B_SYNTHETIC_BATCH_KEY },
  });
  if (!batch) return [];
  return prisma.medicationShadowGapLink.findMany({
    where: { batchId: batch.id, status: "OPEN" },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Seed remediation work items from Phase 14B open gaps.
 * Identity gaps for acetaminophen are never created as resolveable items.
 */
export async function seedRemediationWorkItemsFromPhase14BGaps(
  prisma: PrismaClient,
  actor: RemediationActor
) {
  requireAdmin(actor);
  assertSafetyDefaults();

  const program = await createOrGetRemediationProgram(prisma, actor);
  await prisma.medicationRemediationProgram.update({
    where: { id: program.id },
    data: { status: "SEEDING" },
  });

  const gaps = await listOpenPhase14BShadowGaps(prisma);
  const waveItems = await prisma.medicationKnowledgeApprovalWaveItem.findMany({
    where: { approvalStatus: "APPROVED_FOR_SHADOW" },
    select: { familyKey: true, canonicalConceptId: true },
  });
  const conceptByFamily = new Map(
    waveItems.map((w) => [w.familyKey, w.canonicalConceptId])
  );

  const created = [];
  for (const gap of gaps) {
    const familyKey = gap.familyKey ?? "UNKNOWN";
    if (/acetaminophen/i.test(familyKey) || /acetaminophen/i.test(gap.gapKey)) {
      continue;
    }
    const gapCategory = classifyPhase14BGapForRemediation(gap.gapType);
    if (gapCategory === "IDENTITY") {
      // Identity gaps stay blocked — never attempt acetaminophen-style resolution.
      continue;
    }

    const workItemKey = `P15:${gap.gapKey}`;
    const requiresAuth = requiresAuthoritativeSourceBeforeRemediation({
      gapCategory,
      gapKey: gap.gapKey,
    });
    const initialStatus: Phase15WorkItemStatus = requiresAuth
      ? "BLOCKED_PENDING_AUTHORITATIVE_SOURCE"
      : "OPEN";

    const existing = await prisma.medicationRemediationWorkItem.findUnique({
      where: { workItemKey },
    });
    if (existing) {
      created.push(existing);
      continue;
    }

    const item = await prisma.medicationRemediationWorkItem.create({
      data: {
        programId: program.id,
        workItemKey,
        familyKey,
        canonicalConceptId: conceptByFamily.get(familyKey) ?? null,
        gapCategory,
        shadowGapLinkId: gap.id,
        status: initialStatus,
        severity: gap.severity,
        title: `Remediate ${gapCategory} gap for ${familyKey}`,
        description: gap.description,
        recommendedAction: requiresAuth
          ? "Attach Tier-1/licensed authoritative source metadata; do not fabricate clinical facts."
          : "Triage and remediate root cause without fabricating knowledge.",
        readinessTarget: "QUALIFIED_WITH_COMPLETE_AUTHORITATIVE_KNOWLEDGE",
        requiresAuthoritativeSource: requiresAuth,
        fabricatedKnowledgeForbidden: true,
        createdByUserId: actor.userId,
      },
    });
    created.push(item);

    await audit(prisma, {
      programId: program.id,
      entityType: "MedicationRemediationWorkItem",
      entityId: item.id,
      action: "WORK_ITEM_SEEDED",
      userId: actor.userId,
      after: {
        workItemKey,
        gapCategory,
        status: initialStatus,
        shadowGapLinkId: gap.id,
      },
    });
  }

  const updated = await refreshProgramCounts(prisma, program.id);
  await audit(prisma, {
    programId: program.id,
    entityType: "MedicationRemediationProgram",
    entityId: program.id,
    action: "WORK_ITEMS_SEEDED",
    userId: actor.userId,
    after: { seeded: created.length, status: updated.status },
  });

  return { program: updated, workItems: created };
}

export async function routeRemediationWorkItem(
  prisma: PrismaClient,
  actor: RemediationActor,
  input: {
    workItemId: string;
    assignedToUserId?: string;
    evidenceRegistrationId?: string;
    reason?: string;
  }
) {
  requireAdmin(actor);
  assertSafetyDefaults();

  const item = await prisma.medicationRemediationWorkItem.findUnique({
    where: { id: input.workItemId },
  });
  if (!item) throw new NotFoundException("Élément de remédiation introuvable.");

  if (item.requiresAuthoritativeSource) {
    if (!input.evidenceRegistrationId && !item.evidenceRegistrationId) {
      throw new BadRequestException(
        "Source autoritative requise avant routage (pas de fabrication de connaissances)."
      );
    }
    const regId = input.evidenceRegistrationId ?? item.evidenceRegistrationId!;
    const reg = await prisma.medicationEvidenceSourceRegistration.findUnique({
      where: { id: regId },
    });
    if (!reg || !isAuthoritativeRegistrationStatus(reg.acquisitionStatus)) {
      throw new BadRequestException(
        "L'enregistrement source doit être AUTHORITATIVE_SOURCE_CONFIRMED ou ACCEPTED_FOR_KNOWLEDGE_USE."
      );
    }
  }

  const from = item.status as Phase15WorkItemStatus;
  const targetStatus: Phase15WorkItemStatus = "ROUTED";
  if (from !== "ROUTED" && !canTransitionRemediationWorkItem(from, targetStatus)) {
    throw new BadRequestException(
      `Transition interdite: ${from} → ${targetStatus}`
    );
  }

  const updated = await prisma.medicationRemediationWorkItem.update({
    where: { id: item.id },
    data: {
      status: targetStatus,
      assignedToUserId: input.assignedToUserId ?? item.assignedToUserId,
      evidenceRegistrationId:
        input.evidenceRegistrationId ?? item.evidenceRegistrationId,
      routedAt: new Date(),
    },
  });

  await refreshProgramCounts(prisma, item.programId);
  await audit(prisma, {
    programId: item.programId,
    entityType: "MedicationRemediationWorkItem",
    entityId: item.id,
    action: "WORK_ITEM_ROUTED",
    userId: actor.userId,
    before: { status: from },
    after: { status: updated.status },
    reason: input.reason,
  });

  return updated;
}

export async function transitionRemediationWorkItem(
  prisma: PrismaClient,
  actor: RemediationActor,
  input: {
    workItemId: string;
    toStatus: Phase15WorkItemStatus;
    reason?: string;
    evidenceRegistrationId?: string;
  }
) {
  requireAdmin(actor);
  assertSafetyDefaults();

  const item = await prisma.medicationRemediationWorkItem.findUnique({
    where: { id: input.workItemId },
  });
  if (!item) throw new NotFoundException("Élément de remédiation introuvable.");

  const from = item.status as Phase15WorkItemStatus;
  if (!canTransitionRemediationWorkItem(from, input.toStatus)) {
    throw new BadRequestException(
      `Transition interdite: ${from} → ${input.toStatus}`
    );
  }

  if (
    input.toStatus === "RESOLVED" &&
    item.requiresAuthoritativeSource
  ) {
    const regId = input.evidenceRegistrationId ?? item.evidenceRegistrationId;
    if (!regId) {
      throw new BadRequestException(
        "Résolution refusée sans source autoritative liée."
      );
    }
    const reg = await prisma.medicationEvidenceSourceRegistration.findUnique({
      where: { id: regId },
    });
    if (!reg || !isAuthoritativeRegistrationStatus(reg.acquisitionStatus)) {
      throw new BadRequestException(
        "Résolution refusée: provenance autoritative manquante."
      );
    }
  }

  // Never auto-close Phase 14B gaps by fabricating findings — mark ACCEPTED only
  // when explicitly resolved with authoritative provenance.
  if (input.toStatus === "RESOLVED" && item.shadowGapLinkId) {
    await prisma.medicationShadowGapLink.update({
      where: { id: item.shadowGapLinkId },
      data: { status: "ACCEPTED" },
    });
  }

  const updated = await prisma.medicationRemediationWorkItem.update({
    where: { id: item.id },
    data: {
      status: input.toStatus,
      evidenceRegistrationId:
        input.evidenceRegistrationId ?? item.evidenceRegistrationId,
      resolvedAt: input.toStatus === "RESOLVED" ? new Date() : item.resolvedAt,
    },
  });

  await refreshProgramCounts(prisma, item.programId);
  await audit(prisma, {
    programId: item.programId,
    entityType: "MedicationRemediationWorkItem",
    entityId: item.id,
    action: "WORK_ITEM_TRANSITIONED",
    userId: actor.userId,
    before: { status: from },
    after: { status: updated.status },
    reason: input.reason,
  });

  return updated;
}

export async function getRemediationProgramSnapshot(prisma: PrismaClient) {
  assertSafetyDefaults();
  const program = await prisma.medicationRemediationProgram.findUnique({
    where: { programKey: PHASE15_PROGRAM_KEY },
    include: {
      workItems: { orderBy: { familyKey: "asc" } },
    },
  });
  const openGaps = await listOpenPhase14BShadowGaps(prisma);
  const approvedForShadow =
    await prisma.medicationKnowledgeApprovalWaveItem.count({
      where: { approvalStatus: "APPROVED_FOR_SHADOW" },
    });
  const synthetic = await prisma.medicationShadowEvaluationBatch.findUnique({
    where: { batchKey: PHASE14B_SYNTHETIC_BATCH_KEY },
  });
  const metrics = (synthetic?.metricsJson ?? {}) as Record<string, number>;
  const readiness = evaluateWave1RemediationReadinessTarget({
    approvedForShadow: approvedForShadow >= 8,
    syntheticQualifiedWithGaps: synthetic?.readiness === "QUALIFIED_WITH_GAPS",
    openTier1KnowledgeGaps: openGaps.filter((g) =>
      /POSITIVE_TIER1/i.test(g.gapKey)
    ).length,
    criticalMisses: Number(metrics.criticalMisses ?? 0),
    identityBlocked: false,
  });

  return {
    program,
    openPhase14BGaps: openGaps.length,
    approvedForShadow,
    syntheticReadiness: synthetic?.readiness ?? null,
    readinessTarget: readiness,
    wave1Only: true,
    acetaminophenIdentityBlocked: true,
    clinicalActivation: false,
    fabricatedKnowledgeForbidden: true,
  };
}
